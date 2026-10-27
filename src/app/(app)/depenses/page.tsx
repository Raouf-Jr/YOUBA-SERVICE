import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import { PageSkeleton } from "@/components/skeleton";
import { BarList, Delta } from "@/components/stats";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { expensesByCategory, listExpenses } from "@/lib/data/expenses";
import { getDb } from "@/lib/db";
import { addMonths, endOfMonth, formatDayLong, formatMonthLong, minDate, today } from "@/lib/dates";
import { change, formatMoney, formatPercent } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { ExpenseRowActions } from "./expense-row-actions";

export const metadata: Metadata = { title: "Dépenses" };

export default function ExpensesPage({ searchParams }: PageProps<"/depenses">) {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <Expenses searchParams={searchParams} />
    </Suspense>
  );
}

async function Expenses({ searchParams }: { searchParams: PageProps<"/depenses">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const t = today(user.shop.timezone);
  const currentMonth = t.slice(0, 7);
  const requested = typeof params.mois === "string" && /^\d{4}-\d{2}$/.test(params.mois) ? params.mois : currentMonth;
  const month = requested > currentMonth ? currentMonth : requested;
  const from = `${month}-01`;
  const range = { from, to: endOfMonth(from) };
  const prevFrom = addMonths(from, -1);

  const db = await getDb();
  const [expenses, categories, previous] = await Promise.all([
    listExpenses(db, user.shop.id, range),
    expensesByCategory(db, user.shop.id, range),
    expensesByCategory(db, user.shop.id, { from: prevFrom, to: endOfMonth(prevFrom) }),
  ]);

  const money = (v: number) => formatMoney(v, user.shop.currency);
  const total = categories.reduce((s, c) => s + c.amount, 0);
  const previousTotal = previous.reduce((s, c) => s + c.amount, 0);
  const isOwner = user.role === "owner";

  const byDate = new Map<string, typeof expenses>();
  for (const e of expenses) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  return (
    <>
      <PageHeader
        title="Dépenses"
        description={formatMonthLong(from)}
        actions={
          <DateNav
            basePath="/depenses"
            param="mois"
            type="month"
            value={month}
            prev={addMonths(from, -1).slice(0, 7)}
            next={month < currentMonth ? addMonths(from, 1).slice(0, 7) : null}
            todayValue={currentMonth}
            max={currentMonth}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Nouvelle dépense" />
            <div className="p-5">
              <ExpenseForm defaultDate={month === currentMonth ? t : minDate(endOfMonth(from), t)} maxDate={t} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Par catégorie" description={total ? undefined : "Aucune dépense ce mois-ci"} />
            {categories.length > 0 && (
              <div className="p-3 sm:p-4">
                <BarList
                  color="var(--series-expenses)"
                  items={categories.map((c) => ({
                    label: c.category,
                    value: c.amount,
                    display: money(c.amount),
                    detail: formatPercent(c.amount / total),
                  }))}
                />
              </div>
            )}
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-5">
            <div>
              <p className="text-sm text-ink-2">Total du mois</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{money(total)}</p>
            </div>
            <div className="text-right">
              <Delta value={change(total, previousTotal)} upIsGood={false} suffix="vs mois préc." />
              <p className="mt-1 text-xs text-muted">
                {expenses.length} dépense{expenses.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {expenses.length === 0 ? (
            <EmptyState icon={<Receipt className="size-5" />} title="Aucune dépense ce mois-ci">
              Loyer, transport, électricité, achats de marchandises… Notez tout ce qui sort de la caisse.
            </EmptyState>
          ) : (
            <div>
              {[...byDate].map(([date, rows]) => (
                <section key={date}>
                  <h3 className="flex items-center justify-between bg-subtle/60 px-5 py-2 text-xs font-medium text-muted">
                    <span>{formatDayLong(date)}</span>
                    <span className="tabular">{money(rows.reduce((s, r) => s + r.amount, 0))}</span>
                  </h3>
                  <ul className="divide-y divide-line">
                    {rows.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{e.description || e.category}</p>
                          <Badge tone="expenses" className="mt-1">
                            {e.category}
                          </Badge>
                        </div>
                        <span className="tabular shrink-0 text-sm font-semibold">{money(e.amount)}</span>
                        {isOwner && (
                          <ExpenseRowActions
                            expense={{ id: e.id, date: e.date, category: e.category, amount: e.amount, description: e.description }}
                            maxDate={t}
                            label={e.description || e.category}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

