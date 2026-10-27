import { ShoppingCart, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import { ConfirmAction } from "@/components/form-bits";
import { PendingEntries } from "@/components/pending-entries";
import { PageSkeleton } from "@/components/skeleton";
import { Badge, Card, CardHeader, EmptyState, PageHeader, cx } from "@/components/ui";
import { deleteSale } from "@/lib/actions/sales";
import { requireUser } from "@/lib/auth/dal";
import { paymentLabel } from "@/lib/constants";
import { listProducts } from "@/lib/data/products";
import { listSalesForDay, recentDailyRevenue } from "@/lib/data/sales";
import { getDb } from "@/lib/db";
import { addDays, formatDayLong, isISODate, today } from "@/lib/dates";
import { formatCompact, formatMoney, formatNumber } from "@/lib/format";
import { SalesEntry } from "./sales-entry";

export const metadata: Metadata = { title: "Ventes du jour" };

export default function SalesPage({ searchParams }: PageProps<"/ventes">) {
  return (
    <Suspense fallback={<PageSkeleton tiles={3} />}>
      <Sales searchParams={searchParams} />
    </Suspense>
  );
}

async function Sales({ searchParams }: { searchParams: PageProps<"/ventes">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const t = today(user.shop.timezone);
  const requested = typeof params.date === "string" ? params.date : "";
  const date = isISODate(requested) && requested <= t ? requested : t;
  const db = await getDb();
  const [products, daySales, week] = await Promise.all([
    listProducts(db, user.shop.id),
    listSalesForDay(db, user.shop.id, date),
    recentDailyRevenue(db, user.shop.id, addDays(date, -6), date),
  ]);

  const money = (v: number) => formatMoney(v, user.shop.currency);
  const total = daySales.reduce((s, x) => s + x.total, 0);
  const items = daySales.reduce((s, x) => s + x.quantity, 0);
  const byMethod = new Map<string, number>();
  for (const s of daySales) byMethod.set(s.paymentMethod, (byMethod.get(s.paymentMethod) ?? 0) + s.total);
  const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: user.shop.timezone });
  const multiUser = new Set(daySales.map((s) => s.seller)).size > 1;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));
  const weekMap = new Map(week.map((w) => [w.date, w.amount]));
  const weekMax = Math.max(1, ...weekDays.map((d) => weekMap.get(d) ?? 0));
  const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });

  return (
    <>
      <PageHeader
        title="Ventes du jour"
        description={date === t ? `Aujourd'hui · ${formatDayLong(date)}` : formatDayLong(date)}
        actions={
          <DateNav basePath="/ventes" value={date} prev={addDays(date, -1)} next={date < t ? addDays(date, 1) : null} todayValue={t} max={t} />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <Card className="lg:order-1">
          <CardHeader title="Nouvelle vente" description="Indiquez les quantités vendues, puis enregistrez." />
          <SalesEntry
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              salePrice: p.salePrice,
              unit: p.unit,
              trackStock: p.trackStock,
              stock: p.stock,
            }))}
            date={date}
            currency={user.shop.currency}
            canManageProducts={user.role === "owner"}
            isToday={date === t}
            userId={user.id}
            shopId={user.shop.id}
            timezone={user.shop.timezone}
          />
        </Card>

        <div className="flex flex-col gap-4 lg:order-2">
          <Card className="p-5">
            <p className="text-sm text-ink-2">Total de la journée</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{money(total)}</p>
            <p className="mt-1 text-sm text-muted">
              {formatNumber(items)} article{items > 1 ? "s" : ""} · {daySales.length} ligne{daySales.length > 1 ? "s" : ""}
            </p>
            {byMethod.size > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...byMethod].map(([m, v]) => (
                  <Badge key={m}>
                    {paymentLabel(m)} · {formatCompact(v)}
                  </Badge>
                ))}
              </div>
            )}

            {/* Last 7 days, each bar links to that day */}
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-xs text-muted">7 derniers jours</p>
              <div className="flex h-24 items-end gap-1.5">
                {weekDays.map((d) => {
                  const v = weekMap.get(d) ?? 0;
                  const active = d === date;
                  return (
                    <Link
                      key={d}
                      href={`/ventes?date=${d}`}
                      scroll={false}
                      title={`${formatDayLong(d)} : ${money(v)}`}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span
                        className={cx(
                          "w-full max-w-6 rounded-t-[4px] transition-opacity",
                          active ? "opacity-100" : "opacity-45 group-hover:opacity-80",
                        )}
                        style={{ height: `${Math.max(3, (v / weekMax) * 64)}px`, background: "var(--series-revenue)" }}
                      />
                      <span className={cx("text-[0.6875rem] capitalize", active ? "font-semibold text-ink" : "text-muted")}>
                        {weekdayFmt.format(new Date(`${d}T00:00:00Z`)).replace(".", "")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Ventes enregistrées" description={daySales.length ? undefined : "Rien pour cette journée"} />
            <div className="mt-2">
              <PendingEntries userId={user.id} kind="sale" currency={user.shop.currency} filter={date === t ? undefined : date} />
            </div>
            {daySales.length ? (
              <ul className="divide-y divide-line">
                {daySales.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{s.productName}</p>
                      <p className="tabular text-xs text-muted">
                        {formatNumber(s.quantity)} × {money(s.unitPrice)} · {paymentLabel(s.paymentMethod)} ·{" "}
                        {timeFmt.format(s.createdAt)}
                        {multiUser && s.seller ? ` · ${s.seller}` : ""}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold">{money(s.total)}</span>
                    <ConfirmAction
                      action={deleteSale.bind(null, s.id)}
                      confirm={`Annuler la vente « ${s.productName} » (${money(s.total)}) ? Le stock sera remis.`}
                      label="Annuler cette vente"
                    >
                      <Trash2 />
                    </ConfirmAction>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<ShoppingCart className="size-5" />} title="Aucune vente enregistrée">
                Les ventes saisies apparaîtront ici.
              </EmptyState>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
