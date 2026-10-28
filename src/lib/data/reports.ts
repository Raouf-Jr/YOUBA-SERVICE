import { and, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { entries, generalExpenses, products } from "@/lib/db/schema";
import type { DateRange, ISODate } from "@/lib/dates";
import { totalGeneralExpenses } from "./general-expenses";

const num = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)`.mapWith(Number);

export type ProductTotals = {
  productId: string;
  name: string;
  archived: boolean;
  investment: number;
  /** From the days entered in the app (in the period, or all of them). */
  revenue: number;
  expense: number;
  profit: number;
  /** Days with something entered, and the latest of them. */
  days: number;
  lastDate: ISODate | null;
  /** Profit already made before the app (hand-kept accounts), whatever the period. */
  opening: { date: ISODate; profit: number } | null;
};

/** Per-product totals of the days entered over a period (or since the beginning when `range` is null). */
export async function productTotals(db: DB, range: DateRange | null, productId?: string): Promise<ProductTotals[]> {
  const sums = db
    .select({
      productId: entries.productId,
      revenue: num(sql`sum(${entries.revenue})`).as("revenue"),
      expense: num(sql`sum(${entries.expense})`).as("expense"),
      days: num(sql`count(*)`).as("days"),
      lastDate: sql<string | null>`max(${entries.date})::text`.as("last_date"),
    })
    .from(entries)
    .where(range ? sql`${entries.date} between ${range.from} and ${range.to}` : undefined)
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

  return rows.map(({ product: p, revenue, expense, days, lastDate }) => ({
    productId: p.id,
    name: p.name,
    archived: p.archived,
    investment: p.investment,
    revenue,
    expense,
    profit: revenue - expense,
    days,
    lastDate,
    opening: p.openingDate && p.openingProfit ? { date: p.openingDate, profit: p.openingProfit } : null,
  }));
}

/**
 * Where the shop stands today, all products together:
 * money put in + profit made before the app + profit since − money taken from the profit.
 */
export async function shopBalance(db: DB) {
  const [rows, spent] = await Promise.all([productTotals(db, null), totalGeneralExpenses(db)]);
  const products = rows.map((r) => {
    const profit = r.profit + (r.opening?.profit ?? 0);
    return { ...r, totalProfit: profit, capital: r.investment + profit };
  });
  const invested = sum(products.map((p) => p.investment));
  const profitBefore = sum(products.map((p) => p.opening?.profit ?? 0));
  const profitSince = sum(products.map((p) => p.profit));
  return {
    products,
    invested,
    profitBefore,
    profitSince,
    generalExpenses: spent,
    capital: invested + profitBefore + profitSince - spent,
  };
}

/** Revenue and expense per day (days entered in the app). */
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

/** Earliest day entered or money taken from the profit, for "everything". */
export async function firstDate(db: DB): Promise<ISODate | null> {
  const [[e], [g]] = await Promise.all([
    db.select({ d: sql<string | null>`min(${entries.date})::text` }).from(entries),
    db.select({ d: sql<string | null>`min(${generalExpenses.date})::text` }).from(generalExpenses),
  ]);
  const dates = [e?.d, g?.d].filter((d): d is string => !!d).sort();
  return dates[0] ?? null;
}

export function sumTotals(rows: Pick<ProductTotals, "revenue" | "expense">[]) {
  const revenue = sum(rows.map((r) => r.revenue));
  const expense = sum(rows.map((r) => r.expense));
  return { revenue, expense, profit: revenue - expense };
}

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);
