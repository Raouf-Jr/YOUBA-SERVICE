import { and, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { entries, products } from "@/lib/db/schema";
import type { DateRange, ISODate } from "@/lib/dates";

const num = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)`.mapWith(Number);

export type ProductTotals = {
  productId: string;
  name: string;
  archived: boolean;
  investment: number;
  revenue: number;
  expense: number;
  profit: number;
  /** Days with something entered, and the latest of them. */
  days: number;
  lastDate: ISODate | null;
  /** Totals carried over from hand-kept accounts, when they fall in the period (already in revenue/expense). */
  opening: { date: ISODate; revenue: number; expense: number } | null;
};

/**
 * Per-product totals over a period (or since the beginning when `range` is null).
 * Carried-over totals count when their date falls in the period.
 */
export async function productTotals(db: DB, range: DateRange | null, productId?: string): Promise<ProductTotals[]> {
  const inRange = range ? sql`${entries.date} between ${range.from} and ${range.to}` : undefined;
  const sums = db
    .select({
      productId: entries.productId,
      revenue: num(sql`sum(${entries.revenue})`).as("revenue"),
      expense: num(sql`sum(${entries.expense})`).as("expense"),
      days: num(sql`count(*)`).as("days"),
      lastDate: sql<string | null>`max(${entries.date})::text`.as("last_date"),
    })
    .from(entries)
    .where(inRange)
    .groupBy(entries.productId)
    .as("sums");

  const rows = await db
    .select({
      product: products,
      revenue: num(sql`${sums.revenue}`),
      expense: num(sql`${sums.expense}`),
      days: num(sql`${sums.days}`),
      lastDate: sums.lastDate,
    })
    .from(products)
    .leftJoin(sums, eq(sums.productId, products.id))
    .where(productId ? eq(products.id, productId) : undefined)
    .orderBy(products.archived, sql`lower(${products.name})`);

  return rows.map(({ product: p, revenue, expense, days, lastDate }) => {
    const opening =
      p.openingDate && (p.openingRevenue || p.openingExpense) && (!range || (p.openingDate >= range.from && p.openingDate <= range.to))
        ? { date: p.openingDate, revenue: p.openingRevenue, expense: p.openingExpense }
        : null;
    const totalRevenue = revenue + (opening?.revenue ?? 0);
    const totalExpense = expense + (opening?.expense ?? 0);
    return {
      productId: p.id,
      name: p.name,
      archived: p.archived,
      investment: p.investment,
      revenue: totalRevenue,
      expense: totalExpense,
      profit: totalRevenue - totalExpense,
      days,
      lastDate,
      opening,
    };
  });
}

/** Revenue and expense per day (entered days only, without carried-over totals). */
export function dailyTotals(db: DB, range: DateRange, productId?: string) {
  return db
    .select({
      date: entries.date,
      revenue: num(sql`sum(${entries.revenue})`),
      expense: num(sql`sum(${entries.expense})`),
    })
    .from(entries)
    .where(and(sql`${entries.date} between ${range.from} and ${range.to}`, productId ? eq(entries.productId, productId) : undefined))
    .groupBy(entries.date)
    .orderBy(entries.date);
}

/** Earliest date known (entries, carried-over totals, start dates), for "since the beginning". */
export async function firstDate(db: DB): Promise<ISODate | null> {
  const [[e], [p]] = await Promise.all([
    db.select({ d: sql<string | null>`min(${entries.date})::text` }).from(entries),
    db
      .select({ d: sql<string | null>`least(min(${products.openingDate}), min(${products.startDate}))::text` })
      .from(products),
  ]);
  const dates = [e?.d, p?.d].filter((d): d is string => !!d).sort();
  return dates[0] ?? null;
}

export function sumTotals(rows: Pick<ProductTotals, "revenue" | "expense">[]) {
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const expense = rows.reduce((s, r) => s + r.expense, 0);
  return { revenue, expense, profit: revenue - expense };
}
