import { ChartColumn, FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Calculation, type CalcLine } from "@/components/calculation";
import { EvolutionChart } from "@/components/evolution-chart";
import { PeriodFilter } from "@/components/period-filter";
import { PageSkeleton } from "@/components/skeleton";
import { buttonClass, Card, CardHeader, cx, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listGeneralExpenses } from "@/lib/data/general-expenses";
import { listProducts } from "@/lib/data/products";
import { dailyTotals, firstDate, productTotals, sumTotals } from "@/lib/data/reports";
import { getDb } from "@/lib/db";
import { formatDate, formatRange, granularityFor, today } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { periodQuery, periodTitle, resolvePeriod } from "@/lib/period";
import { buildSeries } from "@/lib/stats";
import { ProductSelect } from "./product-select";

export const metadata: Metadata = { title: "Rapports" };

const PRESETS = ["mois", "mois-dernier", "annee", "tout"];
const BY = { day: "Par jour", week: "Par semaine", month: "Par mois" } as const;

export default function ReportsPage({ searchParams }: PageProps<"/rapports">) {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({ searchParams }: Pick<PageProps<"/rapports">, "searchParams">) {
  const user = await requireUser();
  const { currency } = user.shop;
  const params = await searchParams;
  const db = await getDb();
  const [since, products] = await Promise.all([firstDate(db), listProducts(db, { includeArchived: true })]);
  const period = resolvePeriod(params, today(user.shop.timezone), since, "mois");
  const product = products.find((p) => p.id === params.produit);
  const [totals, daily, spent] = await Promise.all([
    productTotals(db, period.range, product?.id),
    dailyTotals(db, period.range, product?.id),
    // Money taken from the overall profit concerns the whole shop, not one product.
    product ? Promise.resolve([]) : listGeneralExpenses(db, period.range),
  ]);

  const money = (n: number) => formatMoney(n, currency);
  const signed = (n: number) => `${n > 0 ? "+" : ""}${money(n)}`;
  const tone = (n: number) => (n > 0 ? "text-good" : n < 0 ? "text-bad" : "text-ink");

  const rows = totals.filter((t) => t.revenue || t.expense).sort((a, b) => b.profit - a.profit);
  const sum = sumTotals(rows);
  const spentTotal = spent.reduce((s, g) => s + g.amount, 0);
  const lines: CalcLine[] = [
    { sign: "", label: "Recettes", hint: "L'argent qui est rentré", amount: sum.revenue },
    { sign: "−", label: product ? "Dépenses" : "Dépenses des produits", hint: "L'argent qui est sorti pour les produits", amount: sum.expense },
    { sign: "=", label: product ? `Bénéfice de ${product.name}` : "Bénéfice des produits", amount: sum.profit },
    ...(product
      ? []
      : ([
          { sign: "−", label: "Dépenses sur le bénéfice", hint: "Loyer, électricité, maison… (page Bilan)", amount: spentTotal },
          { sign: "=", label: "Ce qui reste", amount: sum.profit - spentTotal },
        ] satisfies CalcLine[])),
  ];
  const series = buildSeries(
    period.range,
    granularityFor(period.range),
    daily.map((d) => ({ date: d.date, amount: d.revenue })),
    daily.map((d) => ({ date: d.date, amount: d.expense })),
  );
  const periodParams: Record<string, string> =
    period.key === "perso" ? { du: period.range.from, au: period.range.to } : { periode: period.key };
  const exportHref = `/rapports/export?${periodQuery(period)}${product ? `&produit=${product.id}` : ""}`;
  const empty = rows.length === 0 && spent.length === 0;

  return (
    <>
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">Rapports</h1>
          <p className="mt-1 text-[0.9375rem] text-ink-2">
            {periodTitle(period)} · {formatRange(period.range)}
            {product && <> · {product.name}</>}
          </p>
        </div>
        <a href={exportHref} download className={buttonClass("secondary", "lg", "no-print w-full sm:w-auto")}>
          <FileSpreadsheet className="text-good" />
          Télécharger en Excel
        </a>
      </header>

      <Card className="no-print mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <PeriodFilter period={period} basePath="/rapports" presets={PRESETS} keep={{ produit: product?.id }} />
          {products.length > 1 && <ProductSelect products={products} value={product?.id} keep={periodParams} />}
        </div>
      </Card>

      {empty ? (
        <Card>
          <EmptyState icon={<ChartColumn className="size-5" />} title="Rien sur cette période">
            Choisissez une autre période, ou notez vos journées dans{" "}
            <Link href="/saisie" className="font-medium text-accent-text underline underline-offset-4">
              Saisie
            </Link>
            .
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="mb-5 p-5 sm:p-6">
            <h2 className="mb-3 text-[0.9375rem] font-semibold text-ink">Résultat de la période</h2>
            <Calculation lines={lines} currency={currency} />
          </Card>

          {daily.length > 1 && (
            <Card className="mb-5 overflow-hidden">
              <CardHeader title="Évolution" description={BY[granularityFor(period.range)]} />
              <div className="px-2 pt-2 pb-4 sm:px-4">
                <EvolutionChart points={series} currency={currency} />
              </div>
            </Card>
          )}

          {rows.length > 0 && (
            <Card className="mb-5">
              <CardHeader title="Par produit" description="Du produit qui rapporte le plus à celui qui rapporte le moins." />
              <div className="mt-3 border-t border-line">
                <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] gap-4 px-5 py-2.5 text-xs font-medium text-muted md:grid">
                  <span>Produit</span>
                  <span className="text-right">Recettes</span>
                  <span className="text-right">Dépenses</span>
                  <span className="text-right">Bénéfice</span>
                </div>
                <ul className="divide-y divide-line md:border-t md:border-line">
                  {rows.map((r) => (
                    <li key={r.productId}>
                      <Link
                        href={`/produits/${r.productId}`}
                        className="tabular block px-5 py-3 transition-colors hover:bg-subtle/60 md:grid md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] md:items-baseline md:gap-4"
                      >
                        <div className="flex items-baseline justify-between gap-3 md:block">
                          <span className="min-w-0 truncate font-medium text-ink">
                            {r.name}
                            {r.archived && <span className="font-normal text-muted"> (plus vendu)</span>}
                          </span>
                          <span className={cx("shrink-0 font-semibold md:hidden", tone(r.profit))}>{signed(r.profit)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-ink-2 md:hidden">
                          Recettes {money(r.revenue)} − Dépenses {money(r.expense)}
                        </p>
                        <span className="hidden text-right text-sm text-ink md:block">{money(r.revenue)}</span>
                        <span className="hidden text-right text-sm text-ink md:block">{money(r.expense)}</span>
                        <span className={cx("hidden text-right text-sm font-semibold md:block", tone(r.profit))}>{signed(r.profit)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {spent.length > 0 && (
            <Card>
              <CardHeader title="Dépenses sur le bénéfice" description="Sur cette période. Pour en ajouter : page Bilan." />
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {spent.map((g) => (
                  <li key={g.id} className="tabular flex items-baseline justify-between gap-3 px-5 py-2.5">
                    <span className="min-w-0 truncate text-sm text-ink">
                      {g.label} <span className="text-muted">· {formatDate(g.date)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-ink">{money(g.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
