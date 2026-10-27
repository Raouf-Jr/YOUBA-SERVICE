import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { EvolutionChart } from "@/components/evolution-chart";
import { PeriodFilter } from "@/components/period-filter";
import { PrintButton } from "@/components/print-button";
import { PageSkeleton } from "@/components/skeleton";
import { BarList } from "@/components/stats";
import { Card, CardHeader, EmptyState, PageHeader, cx } from "@/components/ui";
import { requireOwner } from "@/lib/auth/dal";
import { paymentLabel } from "@/lib/constants";
import { expensesByCategory } from "@/lib/data/expenses";
import * as stats from "@/lib/data/stats";
import { getDb } from "@/lib/db";
import { eachMonth, formatDate, formatMonthLong, formatRange, granularityFor, today } from "@/lib/dates";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { periodQuery, periodTitle, resolvePeriod } from "@/lib/period";
import { buildSeries } from "@/lib/stats";

export const metadata: Metadata = { title: "Rapports" };

export default function ReportsPage({ searchParams }: PageProps<"/rapports">) {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({ searchParams }: { searchParams: PageProps<"/rapports">["searchParams"] }) {
  const user = await requireOwner();
  const params = await searchParams;
  const db = await getDb();
  const shopId = user.shop.id;
  const t = today(user.shop.timezone);
  const since = await stats.firstActivity(db, shopId);
  const period = resolvePeriod(params, t, since, "annee");
  const { range } = period;

  const [totals, monthly, products, categories, payments, revenue, expenses] = await Promise.all([
    stats.totals(db, shopId, range),
    stats.monthlySummary(db, shopId, range),
    stats.productStats(db, shopId, range),
    expensesByCategory(db, shopId, range),
    stats.paymentBreakdown(db, shopId, range),
    stats.dailyRevenue(db, shopId, range),
    stats.dailyExpenses(db, shopId, range),
  ]);

  const money = (v: number) => formatMoney(v, user.shop.currency);
  const granularity = granularityFor(range);
  const series = buildSeries(range, granularity, revenue, expenses);
  const rev = new Map(monthly.revenue.map((r) => [r.month, r]));
  const exp = new Map(monthly.expenses.map((e) => [e.month, e.expenses]));
  const months = eachMonth(range).map((m) => {
    const r = rev.get(m)?.revenue ?? 0;
    const e = exp.get(m) ?? 0;
    return { month: m, revenue: r, expenses: e, profit: r - e, items: rev.get(m)?.items ?? 0 };
  });
  const grossMargin = totals.costedRevenue - totals.costOfGoods;
  const q = periodQuery(period);
  const empty = totals.lines === 0 && totals.expenses === 0;

  return (
    <>
      <PageHeader
        title="Rapports"
        description={`${periodTitle(period)} · ${formatRange(range)}`}
        actions={
          <>
            <details className="group relative">
              <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-line-strong bg-card px-4 text-[0.9375rem] font-medium text-ink hover:bg-subtle [&::-webkit-details-marker]:hidden">
                <Download className="size-4" /> Exporter (Excel)
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-line bg-card p-1.5 shadow-pop">
                {[
                  ["ventes", "Toutes les ventes"],
                  ["depenses", "Toutes les dépenses"],
                  ["mensuel", "Résumé mois par mois"],
                  ["produits", "Ventes par produit"],
                ].map(([type, label]) => (
                  <a
                    key={type}
                    href={`/rapports/export?type=${type}&${q}`}
                    className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-subtle"
                    download
                  >
                    {label} <span className="text-muted">.csv</span>
                  </a>
                ))}
              </div>
            </details>
            <PrintButton />
          </>
        }
      />

      <div className="print-only mb-6">
        <p className="text-xl font-semibold">{user.shop.name} — Rapport d&apos;activité</p>
        <p className="text-sm">
          {formatRange(range)} · édité le {formatDate(t)}
        </p>
      </div>

      <PeriodFilter period={period} basePath="/rapports" />

      {empty ? (
        <Card>
          <EmptyState title="Aucune activité sur cette période">Choisissez une autre période ou commencez à saisir vos ventes.</EmptyState>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card>
              <CardHeader title="Compte de résultat simplifié" />
              <dl className="tabular px-5 pt-4 pb-5 text-sm">
                <Line label="Chiffre d'affaires" value={money(totals.revenue)} strong swatch="var(--series-revenue)" />
                <Line label="Dépenses" value={`− ${money(totals.expenses)}`} swatch="var(--series-expenses)" />
                <div className="ml-4 border-l border-line pl-3">
                  {categories.map((c) => (
                    <Line key={c.category} label={c.category} value={money(c.amount)} muted />
                  ))}
                </div>
                <div className="mt-2 border-t border-line pt-3">
                  <Line
                    label="Bénéfice net"
                    value={money(totals.profit)}
                    strong
                    big
                    tone={totals.profit < 0 ? "bad" : undefined}
                    swatch="var(--series-profit)"
                  />
                  <Line label="Marge nette" value={totals.revenue ? formatPercent(totals.profit / totals.revenue) : "—"} muted />
                </div>
                {totals.costedRevenue > 0 && (
                  <div className="mt-4 rounded-xl bg-subtle px-3 py-2.5 text-xs text-ink-2">
                    <p className="mb-1 font-medium text-ink">Marge sur les produits vendus</p>
                    Ventes {money(totals.costedRevenue)} − coût d&apos;achat {money(totals.costOfGoods)} ={" "}
                    <strong className="text-ink">{money(grossMargin)}</strong> ({formatPercent(grossMargin / totals.costedRevenue)}).
                    {totals.costedRevenue < totals.revenue && " Calculée sur les produits dont le prix d'achat est connu."}
                  </div>
                )}
              </dl>
            </Card>

            <Card className="print-plain">
              <CardHeader title="Évolution" description={granularity === "month" ? "Par mois" : granularity === "week" ? "Par semaine" : "Par jour"} />
              <div className="px-3 pt-4 pb-4 sm:px-5">
                {series.length > 1 ? (
                  <EvolutionChart points={series} currency={user.shop.currency} height={250} />
                ) : (
                  <EmptyState title="Période trop courte pour une courbe" />
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Mois par mois" />
            <div className="mt-3 overflow-x-auto">
              <table className="tabular w-full min-w-[40rem] text-right text-sm whitespace-nowrap">
                <thead className="border-y border-line bg-subtle/50 text-xs text-muted">
                  <tr>
                    <Th left>Mois</Th>
                    <Th>Chiffre d&apos;affaires</Th>
                    <Th>Dépenses</Th>
                    <Th>Bénéfice</Th>
                    <Th>Marge</Th>
                    <Th>Articles</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {months.map((m) => (
                    <tr key={m.month} className="hover:bg-subtle/50">
                      <Td left>{formatMonthLong(m.month)}</Td>
                      <Td>{money(m.revenue)}</Td>
                      <Td>{money(m.expenses)}</Td>
                      <Td className={cx("font-medium", m.profit < 0 && "text-bad")}>{money(m.profit)}</Td>
                      <Td className="text-ink-2">{m.revenue ? formatPercent(m.profit / m.revenue) : "—"}</Td>
                      <Td className="text-ink-2">{formatNumber(m.items)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-line-strong font-semibold">
                  <tr>
                    <Td left>Total</Td>
                    <Td>{money(totals.revenue)}</Td>
                    <Td>{money(totals.expenses)}</Td>
                    <Td className={totals.profit < 0 ? "text-bad" : undefined}>{money(totals.profit)}</Td>
                    <Td>{totals.revenue ? formatPercent(totals.profit / totals.revenue) : "—"}</Td>
                    <Td>{formatNumber(totals.items)}</Td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Ventes par produit" description={`${products.length} produit${products.length > 1 ? "s" : ""} vendu${products.length > 1 ? "s" : ""}`} />
            <div className="mt-3 overflow-x-auto">
              <table className="tabular w-full min-w-[34rem] text-right text-sm whitespace-nowrap">
                <thead className="border-y border-line bg-subtle/50 text-xs text-muted">
                  <tr>
                    <Th left>Produit</Th>
                    <Th>Quantité</Th>
                    <Th>Chiffre d&apos;affaires</Th>
                    <Th>Part</Th>
                    <Th>Marge</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {products.map((p) => (
                    <tr key={p.name} className="hover:bg-subtle/50">
                      <Td left className="max-w-64 truncate">
                        {p.name}
                      </Td>
                      <Td className="text-ink-2">
                        {formatNumber(p.quantity)} {p.unit ?? ""}
                      </Td>
                      <Td className="font-medium">{money(p.revenue)}</Td>
                      <Td className="text-ink-2">{totals.revenue ? formatPercent(p.revenue / totals.revenue) : "—"}</Td>
                      <Td className={p.margin != null && p.margin < 0 ? "text-bad" : undefined}>
                        {p.margin != null ? money(p.margin) : <span className="text-muted">—</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Dépenses par catégorie" />
              <div className="p-3 sm:p-4">
                {categories.length ? (
                  <BarList
                    color="var(--series-expenses)"
                    items={categories.map((c) => ({
                      label: c.category,
                      value: c.amount,
                      display: money(c.amount),
                      detail: totals.expenses ? formatPercent(c.amount / totals.expenses) : undefined,
                    }))}
                  />
                ) : (
                  <EmptyState title="Aucune dépense" />
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Modes de paiement" />
              <div className="p-3 sm:p-4">
                {payments.length ? (
                  <BarList
                    color="var(--series-revenue)"
                    items={payments.map((p) => ({
                      label: paymentLabel(p.method),
                      value: p.amount,
                      display: money(p.amount),
                      detail: totals.revenue ? formatPercent(p.amount / totals.revenue) : undefined,
                    }))}
                  />
                ) : (
                  <EmptyState title="Aucune vente" />
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Line({
  label,
  value,
  strong,
  big,
  muted,
  tone,
  swatch,
}: {
  label: string;
  value: string;
  strong?: boolean;
  big?: boolean;
  muted?: boolean;
  tone?: "bad";
  swatch?: string;
}) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-1", muted && "text-ink-2")}>
      <dt className={cx("flex items-center gap-2", strong && "font-medium text-ink", muted && "text-xs")}>
        {swatch && <span aria-hidden className="size-2.5 rounded-full" style={{ background: swatch }} />}
        {label}
      </dt>
      <dd className={cx(strong && "font-semibold", big && "text-lg", muted && "text-xs", tone === "bad" && "text-bad")}>{value}</dd>
    </div>
  );
}

function Th({ children, left }: { children: ReactNode; left?: boolean }) {
  return <th className={cx("px-4 py-2.5 font-medium first:pl-5 last:pr-5", left && "text-left")}>{children}</th>;
}

function Td({ children, left, className }: { children: ReactNode; left?: boolean; className?: string }) {
  return <td className={cx("px-4 py-2.5 first:pl-5 last:pr-5", left && "text-left text-ink", className)}>{children}</td>;
}
