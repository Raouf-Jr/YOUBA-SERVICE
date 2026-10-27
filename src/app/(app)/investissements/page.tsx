import { PiggyBank } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { BarList, Meter, StatTile } from "@/components/stats";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth/dal";
import { listInvestments } from "@/lib/data/expenses";
import { investmentOverview } from "@/lib/data/stats";
import { getDb } from "@/lib/db";
import { addMonths, formatDate, formatMonthLong, today } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/format";
import { payback } from "@/lib/stats";
import { InvestmentForm, InvestmentRowActions } from "./investment-form";

export const metadata: Metadata = { title: "Investissements" };

export default function InvestmentsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={3} />}>
      <Investments />
    </Suspense>
  );
}

async function Investments() {
  const user = await requireOwner();
  const t = today(user.shop.timezone);
  const db = await getDb();
  const [items, overview] = await Promise.all([listInvestments(db, user.shop.id), investmentOverview(db, user.shop.id, t)]);
  const money = (v: number) => formatMoney(v, user.shop.currency);
  const p = payback(overview.invested, overview.cumulativeProfit, overview.recentMonthlyProfit);

  const byCategory = new Map<string, number>();
  for (const i of items) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + i.amount);
  const categories = [...byCategory].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="Investissements"
        description="Ce que vous avez mis dans la boutique, et ce que vos bénéfices vous ont déjà rendu."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile label="Total investi" value={money(overview.invested)} footer={<span className="text-xs text-muted">{items.length} investissement{items.length > 1 ? "s" : ""}</span>} />
        <StatTile
          label="Bénéfice cumulé"
          swatch="var(--series-profit)"
          value={money(overview.cumulativeProfit)}
          footer={<span className="text-xs text-muted">Ventes − dépenses depuis le début</span>}
        />
        <StatTile
          className="col-span-2 lg:col-span-1"
          label="Bénéfice mensuel moyen"
          value={money(overview.recentMonthlyProfit)}
          footer={<span className="text-xs text-muted">Sur les 3 derniers mois</span>}
        />
      </div>

      {overview.invested > 0 && (
        <Card className="mb-4 p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm text-ink-2">Investissement remboursé</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight">{formatPercent(p.ratio)}</p>
            </div>
            <p className="tabular text-sm text-ink-2">
              {money(p.recovered)} / {money(overview.invested)}
            </p>
          </div>
          <Meter ratio={p.ratio} color="var(--series-profit)" track="var(--series-profit-soft)" label="Part de l'investissement remboursée" />
          <p className="mt-4 text-sm text-ink-2">
            {p.remaining === 0 ? (
              <>🎉 Votre investissement est entièrement remboursé. Tout le bénéfice est désormais du gain.</>
            ) : p.monthsLeft != null ? (
              <>
                Il reste <strong className="text-ink">{money(p.remaining)}</strong> à récupérer. Au rythme des 3 derniers mois, ce sera
                fait vers <strong className="text-ink">{formatMonthLong(addMonths(t, p.monthsLeft))}</strong> (≈ {p.monthsLeft} mois).
              </>
            ) : (
              <>
                Il reste <strong className="text-ink">{money(p.remaining)}</strong> à récupérer. Le bénéfice récent est nul ou négatif :
                impossible d&apos;estimer une date pour l&apos;instant.
              </>
            )}
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Nouvel investissement" description="Équipement, travaux, stock de départ…" />
            <div className="p-5">
              <InvestmentForm todayISO={t} />
            </div>
          </Card>
          {categories.length > 0 && (
            <Card>
              <CardHeader title="Par catégorie" />
              <div className="p-3 sm:p-4">
                <BarList
                  color="var(--series-profit)"
                  items={categories.map(([label, value]) => ({
                    label,
                    value,
                    display: money(value),
                    detail: formatPercent(value / overview.invested),
                  }))}
                />
              </div>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader title="Historique" />
          {items.length === 0 ? (
            <EmptyState icon={<PiggyBank className="size-5" />} title="Aucun investissement enregistré">
              Notez ce que vous avez dépensé pour ouvrir ou équiper la boutique : vous saurez quand c&apos;est remboursé.
            </EmptyState>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{i.label}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <Badge>{i.category}</Badge>
                      {formatDate(i.date)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-semibold">{money(i.amount)}</span>
                  <InvestmentRowActions
                    investment={{ id: i.id, date: i.date, label: i.label, category: i.category, amount: i.amount }}
                    todayISO={t}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
