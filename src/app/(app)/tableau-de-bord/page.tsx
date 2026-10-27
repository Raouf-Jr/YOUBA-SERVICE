import { ArrowRight, Package, PiggyBank, Plus, Receipt, ShoppingCart, Target, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EvolutionChart } from "@/components/evolution-chart";
import { PeriodFilter } from "@/components/period-filter";
import { PageSkeleton } from "@/components/skeleton";
import { BarList, Delta, Meter, StatTile } from "@/components/stats";
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireOwner, type CurrentUser } from "@/lib/auth/dal";
import { expensesByCategory } from "@/lib/data/expenses";
import { listProducts } from "@/lib/data/products";
import * as stats from "@/lib/data/stats";
import { getDb } from "@/lib/db";
import {
  daysInRange,
  endOfMonth,
  formatBucket,
  formatRange,
  granularityFor,
  previousRange,
  startOfMonth,
  today,
} from "@/lib/dates";
import { change, formatCompact, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { periodTitle, resolvePeriod } from "@/lib/period";
import { buildSeries, payback } from "@/lib/stats";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage({ searchParams }: PageProps<"/tableau-de-bord">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/tableau-de-bord">["searchParams"] }) {
  const user = await requireOwner();
  const params = await searchParams;
  const db = await getDb();
  const shopId = user.shop.id;
  const t = today(user.shop.timezone);
  const since = await stats.firstActivity(db, shopId);
  const period = resolvePeriod(params, t, since, "30j");
  const { range } = period;
  const granularity = granularityFor(range);
  const month = { from: startOfMonth(t), to: t };

  const [current, previous, revenue, expenses, topProducts, categories, lowStock, investment, monthTotals, products] =
    await Promise.all([
      stats.totals(db, shopId, range),
      stats.totals(db, shopId, previousRange(range)),
      stats.dailyRevenue(db, shopId, range),
      stats.dailyExpenses(db, shopId, range),
      stats.productStats(db, shopId, range, 6),
      expensesByCategory(db, shopId, range),
      stats.lowStockProducts(db, shopId),
      stats.investmentOverview(db, shopId, t),
      stats.totals(db, shopId, month),
      listProducts(db, shopId),
    ]);

  const series = buildSeries(range, granularity, revenue, expenses);
  const money = (v: number) => formatMoney(v, user.shop.currency);
  const days = daysInRange(range);
  const firstName = user.name.split(" ")[0];
  const isNew = since == null;

  return (
    <>
      <PageHeader
        eyebrow={greeting(firstName)}
        title={user.shop.name}
        description={`${periodTitle(period)} · ${formatRange(range)}`}
        actions={
          <>
            <LinkButton href="/depenses" variant="secondary">
              <Receipt /> Dépense
            </LinkButton>
            <LinkButton href="/ventes">
              <Plus /> Saisir les ventes
            </LinkButton>
          </>
        }
      />

      {isNew && <Onboarding hasProducts={products.length > 0} />}

      <PeriodFilter period={period} basePath="/tableau-de-bord" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="col-span-2 flex flex-col justify-between p-5 sm:p-6">
          <div>
            <p className="text-sm text-ink-2">Bénéfice net</p>
            <p
              className={`mt-1 text-4xl font-semibold tracking-tight sm:text-5xl ${current.profit < 0 ? "text-bad" : "text-ink"}`}
            >
              {money(current.profit)}
            </p>
            <Delta className="mt-3" value={change(current.profit, previous.profit)} />
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-muted">Moyenne / jour</dt>
              <dd className="tabular mt-0.5 font-medium">{formatCompact(current.profit / days)}</dd>
            </div>
            <div>
              <dt className="text-muted">Articles vendus</dt>
              <dd className="tabular mt-0.5 font-medium">{formatNumber(current.items)}</dd>
            </div>
            <div>
              <dt className="text-muted">Marge produits</dt>
              <dd className="tabular mt-0.5 font-medium">
                {current.costedRevenue > 0
                  ? formatPercent((current.costedRevenue - current.costOfGoods) / current.costedRevenue)
                  : "—"}
              </dd>
            </div>
          </dl>
        </Card>
        <StatTile
          label="Chiffre d'affaires"
          swatch="var(--series-revenue)"
          value={money(current.revenue)}
          delta={<Delta value={change(current.revenue, previous.revenue)} suffix="" />}
          trend={series.length > 2 ? series.map((p) => p.revenue) : undefined}
        />
        <StatTile
          label="Dépenses"
          swatch="var(--series-expenses)"
          value={money(current.expenses)}
          delta={<Delta value={change(current.expenses, previous.expenses)} upIsGood={false} suffix="" />}
          trend={series.length > 2 ? series.map((p) => p.expenses) : undefined}
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Évolution"
          description={
            granularity === "day" ? "Par jour" : granularity === "week" ? "Par semaine" : "Par mois"
          }
        />
        <div className="px-3 pt-4 pb-4 sm:px-5">
          {series.length > 1 ? (
            <>
              <EvolutionChart points={series} currency={user.shop.currency} />
              <details className="no-print mt-3 px-2 text-sm">
                <summary className="cursor-pointer text-muted hover:text-ink">Voir les chiffres en tableau</summary>
                <div className="mt-3 max-h-80 overflow-auto">
                  <table className="tabular w-full text-right text-sm">
                    <thead className="sticky top-0 bg-card text-xs text-muted">
                      <tr>
                        <th className="py-2 text-left font-medium">Période</th>
                        <th className="py-2 font-medium">CA</th>
                        <th className="py-2 font-medium">Dépenses</th>
                        <th className="py-2 font-medium">Bénéfice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((p) => (
                        <tr key={p.date} className="border-t border-line">
                          <td className="py-1.5 text-left text-ink-2">{formatBucket(p.date, granularity)}</td>
                          <td className="py-1.5">{money(p.revenue)}</td>
                          <td className="py-1.5">{money(p.expenses)}</td>
                          <td className={`py-1.5 font-medium ${p.profit < 0 ? "text-bad" : ""}`}>{money(p.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <EmptyState title="Une seule journée sélectionnée">
              Choisissez « 7 jours » ou plus pour voir la courbe d&apos;évolution.
            </EmptyState>
          )}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Meilleurs produits"
            description="Par chiffre d'affaires"
            action={
              <Link href="/rapports" className="text-sm font-medium text-accent-text hover:underline">
                Détails
              </Link>
            }
          />
          <div className="p-3 sm:p-4">
            {topProducts.length ? (
              <BarList
                color="var(--series-revenue)"
                items={topProducts.map((p) => ({
                  label: p.name,
                  value: p.revenue,
                  display: money(p.revenue),
                  detail: current.revenue ? formatPercent(p.revenue / current.revenue) : undefined,
                }))}
              />
            ) : (
              <EmptyState icon={<ShoppingCart className="size-5" />} title="Aucune vente sur la période" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Dépenses par catégorie"
            description={current.expenses ? `Total ${money(current.expenses)}` : undefined}
            action={
              <Link href="/depenses" className="text-sm font-medium text-accent-text hover:underline">
                Gérer
              </Link>
            }
          />
          <div className="p-3 sm:p-4">
            {categories.length ? (
              <BarList
                color="var(--series-expenses)"
                items={categories.slice(0, 6).map((c) => ({
                  label: c.category,
                  value: c.amount,
                  display: money(c.amount),
                  detail: current.expenses ? formatPercent(c.amount / current.expenses) : undefined,
                }))}
              />
            ) : (
              <EmptyState icon={<Receipt className="size-5" />} title="Aucune dépense sur la période" />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GoalCard user={user} monthRevenue={monthTotals.revenue} todayISO={t} />
        <InvestmentCard money={money} {...investment} />
        <StockCard items={lowStock} />
      </div>
    </>
  );
}

function greeting(firstName: string) {
  return `Bonjour ${firstName} 👋`;
}

function Onboarding({ hasProducts }: { hasProducts: boolean }) {
  const steps = [
    { done: hasProducts, href: "/produits", Icon: Package, title: "Ajoutez vos produits", text: "Nom, prix de vente et prix d'achat." },
    { done: false, href: "/ventes", Icon: ShoppingCart, title: "Saisissez vos ventes du jour", text: "Les quantités vendues, chaque soir." },
    { done: false, href: "/depenses", Icon: Receipt, title: "Notez vos dépenses", text: "Loyer, transport, marchandises…" },
    { done: false, href: "/investissements", Icon: PiggyBank, title: "Indiquez votre investissement", text: "Pour suivre votre rentabilité." },
  ];
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="border-b border-line bg-accent-soft/60 px-5 py-4">
        <p className="font-semibold text-ink">Bienvenue ! Démarrez en 4 étapes</p>
        <p className="text-sm text-ink-2">Vos courbes et statistiques apparaîtront dès vos premières ventes.</p>
      </div>
      <ol className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ done, href, Icon, title, text }, i) => (
          <li key={href} className="bg-card">
            <Link href={href} className="group flex h-full items-start gap-3 p-4 transition-colors hover:bg-subtle">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done ? "bg-good-soft text-good" : "bg-subtle text-ink-2"}`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <Icon className="size-4 text-muted" /> {title}
                </span>
                <span className="mt-0.5 block text-sm text-muted">{text}</span>
              </span>
              <ArrowRight className="ml-auto size-4 shrink-0 self-center text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function GoalCard({ user, monthRevenue, todayISO }: { user: CurrentUser; monthRevenue: number; todayISO: string }) {
  const goal = user.shop.monthlyGoal;
  const money = (v: number) => formatMoney(v, user.shop.currency);
  if (!goal) {
    return (
      <Card>
        <CardHeader title="Objectif du mois" />
        <EmptyState
          icon={<Target className="size-5" />}
          title="Fixez-vous un objectif de ventes"
          action={
            <LinkButton href="/parametres#objectif" variant="soft" size="sm">
              Définir un objectif
            </LinkButton>
          }
        >
          Suivez chaque jour votre progression vers le chiffre d&apos;affaires visé.
        </EmptyState>
      </Card>
    );
  }
  const ratio = monthRevenue / goal;
  const remaining = Math.max(0, goal - monthRevenue);
  const daysLeft = daysInRange({ from: todayISO, to: endOfMonth(todayISO) });
  return (
    <Card>
      <CardHeader title="Objectif du mois" description={`${money(goal)} de ventes`} />
      <div className="px-5 pt-4 pb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-2xl font-semibold tracking-tight">{formatPercent(Math.min(ratio, 9.99))}</span>
          <span className="tabular text-sm text-ink-2">{money(monthRevenue)}</span>
        </div>
        <Meter ratio={ratio} color="var(--series-revenue)" track="var(--series-revenue-soft)" label="Progression de l'objectif" />
        <p className="mt-3 text-sm text-ink-2">
          {remaining === 0 ? (
            <>🎉 Objectif atteint ! Bravo.</>
          ) : (
            <>
              Encore <strong className="font-semibold text-ink">{money(remaining)}</strong> en {daysLeft} jour
              {daysLeft > 1 ? "s" : ""}, soit {money(remaining / daysLeft)} par jour.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}

function InvestmentCard({
  money,
  invested,
  cumulativeProfit,
  recentMonthlyProfit,
}: {
  money: (v: number) => string;
  invested: number;
  cumulativeProfit: number;
  recentMonthlyProfit: number;
}) {
  if (!invested) {
    return (
      <Card>
        <CardHeader title="Retour sur investissement" />
        <EmptyState
          icon={<PiggyBank className="size-5" />}
          title="Combien avez-vous investi ?"
          action={
            <LinkButton href="/investissements" variant="soft" size="sm">
              Ajouter un investissement
            </LinkButton>
          }
        >
          Équipement, aménagement, stock de départ… Voyez quand il sera remboursé.
        </EmptyState>
      </Card>
    );
  }
  const p = payback(invested, cumulativeProfit, recentMonthlyProfit);
  return (
    <Card>
      <CardHeader title="Retour sur investissement" description={`${money(invested)} investis`} />
      <div className="px-5 pt-4 pb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-2xl font-semibold tracking-tight">{formatPercent(p.ratio)}</span>
          <span className="tabular text-sm text-ink-2">{money(p.recovered)} récupérés</span>
        </div>
        <Meter ratio={p.ratio} color="var(--series-profit)" track="var(--series-profit-soft)" label="Part de l'investissement récupérée" />
        <p className="mt-3 text-sm text-ink-2">
          {p.remaining === 0 ? (
            <>🎉 Investissement entièrement remboursé par vos bénéfices.</>
          ) : p.monthsLeft != null ? (
            <>
              Reste {money(p.remaining)}. Au rythme actuel, remboursé dans environ{" "}
              <strong className="font-semibold text-ink">
                {p.monthsLeft} mois
              </strong>
              .
            </>
          ) : (
            <>Reste {money(p.remaining)}. Le bénéfice récent ne permet pas encore d&apos;estimer la date.</>
          )}
        </p>
      </div>
    </Card>
  );
}

function StockCard({ items }: { items: Awaited<ReturnType<typeof stats.lowStockProducts>> }) {
  return (
    <Card className="md:col-span-2 xl:col-span-1">
      <CardHeader
        title="Stock à surveiller"
        action={
          <Link href="/produits?filtre=alerte" className="text-sm font-medium text-accent-text hover:underline">
            Voir le stock
          </Link>
        }
      />
      {items.length ? (
        <ul className="px-3 pt-3 pb-3">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <TriangleAlert className={`size-4 shrink-0 ${item.stock <= 0 ? "text-bad" : "text-warn"}`} />
                <span className="truncate text-sm text-ink">{item.name}</span>
              </span>
              <Badge tone={item.stock <= 0 ? "bad" : "warn"}>
                {item.stock <= 0 ? "Rupture" : `${formatNumber(item.stock)} ${item.unit}`}
              </Badge>
            </li>
          ))}
          {items.length > 5 && <li className="px-2 pt-1 text-sm text-muted">+ {items.length - 5} autre(s)</li>}
        </ul>
      ) : (
        <EmptyState icon={<Package className="size-5" />} title="Aucune alerte">
          Les produits suivis en stock apparaissent ici quand ils passent sous leur seuil.
        </EmptyState>
      )}
    </Card>
  );
}
