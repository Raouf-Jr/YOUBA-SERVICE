import { ChartColumn, FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EvolutionChart } from "@/components/evolution-chart";
import { PeriodFilter } from "@/components/period-filter";
import { PageSkeleton } from "@/components/skeleton";
import { StatTile } from "@/components/stats";
import { buttonClass, Card, CardHeader, cx, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listProducts } from "@/lib/data/products";
import { dailyTotals, firstDate, productTotals, sumTotals } from "@/lib/data/reports";
import { getDb } from "@/lib/db";
import { formatDate, formatDayLong, formatRange, granularityFor, today } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { periodQuery, periodTitle, resolvePeriod } from "@/lib/period";
import { buildSeries } from "@/lib/stats";
import { ProductSelect } from "./product-select";

export const metadata: Metadata = { title: "Rapports" };

const PRESETS = ["mois", "mois-dernier", "7j", "30j", "annee", "tout"];
const BY = { day: "Par jour", week: "Par semaine", month: "Par mois" } as const;

export default function ReportsPage({ searchParams }: PageProps<"/rapports">) {
  return (
    <Suspense fallback={<PageSkeleton tiles={3} />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({ searchParams }: Pick<PageProps<"/rapports">, "searchParams">) {
  const user = await requireUser();
  const params = await searchParams;
  const db = await getDb();
  const [since, products] = await Promise.all([firstDate(db), listProducts(db, { includeArchived: true })]);
  const period = resolvePeriod(params, today(user.shop.timezone), since, "mois");
  const product = products.find((p) => p.id === params.produit);
  const [totals, daily] = await Promise.all([
    productTotals(db, period.range, product?.id),
    dailyTotals(db, period.range, product?.id),
  ]);

  const money = (n: number) => formatMoney(n, user.shop.currency);
  const signed = (n: number) => `${n > 0 ? "+" : ""}${money(n)}`;
  const tone = (n: number) => (n > 0 ? "text-good" : n < 0 ? "text-bad" : "text-ink");

  const rows = totals.filter((t) => t.revenue || t.expense).sort((a, b) => b.profit - a.profit);
  const sum = sumTotals(rows);
  const openings = rows.filter((r) => r.opening);
  const granularity = granularityFor(period.range);
  const series = buildSeries(
    period.range,
    granularity,
    daily.map((d) => ({ date: d.date, amount: d.revenue })),
    daily.map((d) => ({ date: d.date, amount: d.expense })),
  );
  const days = [...daily].reverse();

  const periodParams: Record<string, string> =
    period.key === "perso" ? { du: period.range.from, au: period.range.to } : { periode: period.key };
  const exportHref = `/rapports/export?${periodQuery(period)}${product ? `&produit=${product.id}` : ""}`;

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

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Recettes" swatch="var(--series-revenue)" value={money(sum.revenue)} footer={<Hint>L&apos;argent rentré</Hint>} />
        <StatTile label="Dépenses" swatch="var(--series-expenses)" value={money(sum.expense)} footer={<Hint>L&apos;argent sorti</Hint>} />
        <StatTile
          label="Bénéfice"
          swatch="var(--series-profit)"
          value={<span className={tone(sum.profit)}>{signed(sum.profit)}</span>}
          footer={<Hint>Recettes − dépenses</Hint>}
          className="col-span-2 sm:col-span-1"
        />
      </div>
      {openings.length > 0 && (
        <p className="mb-5 rounded-xl bg-subtle px-4 py-3 text-sm text-ink-2">
          Ces totaux comprennent des comptes repris d&apos;avant l&apos;application :{" "}
          {openings
            .map((r) => `${r.name} au ${formatDate(r.opening!.date)} (recettes ${money(r.opening!.revenue)}, dépenses ${money(r.opening!.expense)})`)
            .join(" ; ")}
          .
        </p>
      )}

      {rows.length === 0 ? (
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
          {daily.length > 0 && (
            <Card className="mb-5 overflow-hidden">
              <CardHeader title="Évolution" description={BY[granularity]} />
              <div className="px-2 pt-2 pb-4 sm:px-4">
                <EvolutionChart points={series} currency={user.shop.currency} />
              </div>
            </Card>
          )}

          <Card className="mb-5">
            <CardHeader title="Par produit" description="Du produit qui rapporte le plus au moins." />
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
                        Recettes {money(r.revenue)} · Dépenses {money(r.expense)}
                      </p>
                      <span className="hidden text-right text-sm text-ink md:block">{money(r.revenue)}</span>
                      <span className="hidden text-right text-sm text-ink md:block">{money(r.expense)}</span>
                      <span className={cx("hidden text-right text-sm font-semibold md:block", tone(r.profit))}>{signed(r.profit)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="tabular flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-b-2xl border-t border-line bg-subtle/60 px-5 py-3.5 md:grid md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] md:gap-4">
                <span className="font-semibold text-ink">Total</span>
                <span className="text-sm text-ink-2 md:hidden">
                  {money(sum.revenue)} − {money(sum.expense)} ={" "}
                  <strong className={tone(sum.profit)}>{signed(sum.profit)}</strong>
                </span>
                <span className="hidden text-right text-sm font-semibold text-ink md:block">{money(sum.revenue)}</span>
                <span className="hidden text-right text-sm font-semibold text-ink md:block">{money(sum.expense)}</span>
                <span className={cx("hidden text-right text-sm font-semibold md:block", tone(sum.profit))}>{signed(sum.profit)}</span>
              </div>
            </div>
          </Card>

          {days.length > 0 && (
            <Card>
              <details open={days.length <= 31} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-5">
                  <span>
                    <span className="block text-[0.9375rem] font-semibold text-ink">Jour par jour</span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {days.length} jour{days.length > 1 ? "s" : ""} saisi{days.length > 1 ? "s" : ""}, le plus récent en haut.
                    </span>
                  </span>
                  <span className="mt-0.5 shrink-0 text-sm font-medium text-accent-text">
                    <span className="group-open:hidden">Afficher</span>
                    <span className="hidden group-open:inline">Masquer</span>
                  </span>
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {days.map((d) => {
                    const result = d.revenue - d.expense;
                    return (
                      <li key={d.date}>
                        <Link href={`/saisie?date=${d.date}`} className="tabular block px-5 py-3 transition-colors hover:bg-subtle/60">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-medium text-ink">{formatDayLong(d.date)}</span>
                            <span className={cx("shrink-0 text-sm font-semibold", tone(result))}>{signed(result)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted">
                            Recettes {money(d.revenue)} · Dépenses {money(d.expense)}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted">{children}</span>;
}
