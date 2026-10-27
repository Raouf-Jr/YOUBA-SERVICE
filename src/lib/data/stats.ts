import { and, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { expenses, investments, products, sales } from "@/lib/db/schema";
import { addDays, daysInRange, maxDate, type DateRange, type ISODate } from "@/lib/dates";
import type { DailyAmount } from "@/lib/stats";

const num = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)`.mapWith(Number);

const salesIn = (shopId: string, range: DateRange) =>
  and(eq(sales.shopId, shopId), sql`${sales.date} between ${range.from} and ${range.to}`);
const expensesIn = (shopId: string, range: DateRange) =>
  and(eq(expenses.shopId, shopId), sql`${expenses.date} between ${range.from} and ${range.to}`);

export type Totals = {
  revenue: number;
  expenses: number;
  profit: number;
  items: number;
  lines: number;
  activeDays: number;
  /** Revenue and cost of the sales whose purchase price is known. */
  costedRevenue: number;
  costOfGoods: number;
};

export async function totals(db: DB, shopId: string, range: DateRange): Promise<Totals> {
  const [[s], [e]] = await Promise.all([
    db
      .select({
        revenue: num(sql`sum(${sales.total})`),
        items: num(sql`sum(${sales.quantity})`),
        lines: num(sql`count(*)`),
        activeDays: num(sql`count(distinct ${sales.date})`),
        costedRevenue: num(sql`sum(${sales.total}) filter (where ${sales.unitCost} is not null)`),
        costOfGoods: num(sql`sum(${sales.unitCost} * ${sales.quantity})`),
      })
      .from(sales)
      .where(salesIn(shopId, range)),
    db
      .select({ expenses: num(sql`sum(${expenses.amount})`) })
      .from(expenses)
      .where(expensesIn(shopId, range)),
  ]);
  return { ...s, expenses: e.expenses, profit: s.revenue - e.expenses };
}

export async function dailyRevenue(db: DB, shopId: string, range: DateRange): Promise<DailyAmount[]> {
  return db
    .select({ date: sales.date, amount: num(sql`sum(${sales.total})`) })
    .from(sales)
    .where(salesIn(shopId, range))
    .groupBy(sales.date);
}

export async function dailyExpenses(db: DB, shopId: string, range: DateRange): Promise<DailyAmount[]> {
  return db
    .select({ date: expenses.date, amount: num(sql`sum(${expenses.amount})`) })
    .from(expenses)
    .where(expensesIn(shopId, range))
    .groupBy(expenses.date);
}

export type ProductStat = {
  name: string;
  quantity: number;
  revenue: number;
  cost: number | null;
  margin: number | null;
  unit: string | null;
};

export async function productStats(db: DB, shopId: string, range: DateRange, limit?: number): Promise<ProductStat[]> {
  const query = db
    .select({
      name: sales.productName,
      quantity: num(sql`sum(${sales.quantity})`),
      revenue: num(sql`sum(${sales.total})`),
      cost: sql<number | null>`sum(${sales.unitCost} * ${sales.quantity})`.mapWith((v) => (v == null ? null : Number(v))),
      costedRevenue: num(sql`sum(${sales.total}) filter (where ${sales.unitCost} is not null)`),
      unit: sql<string | null>`max(${products.unit})`,
    })
    .from(sales)
    .leftJoin(products, eq(products.id, sales.productId))
    .where(salesIn(shopId, range))
    .groupBy(sales.productName)
    .orderBy(sql`3 desc`);
  const rows = await (limit ? query.limit(limit) : query);
  return rows.map(({ costedRevenue, ...r }) => ({
    ...r,
    margin: r.cost == null ? null : costedRevenue - r.cost,
  }));
}

export function paymentBreakdown(db: DB, shopId: string, range: DateRange) {
  return db
    .select({
      method: sales.paymentMethod,
      amount: num(sql`sum(${sales.total})`),
      count: num(sql`count(*)`),
    })
    .from(sales)
    .where(salesIn(shopId, range))
    .groupBy(sales.paymentMethod)
    .orderBy(sql`2 desc`);
}

export async function monthlySummary(db: DB, shopId: string, range: DateRange) {
  const [rev, exp] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(${sales.date}, 'YYYY-MM-01')`,
        revenue: num(sql`sum(${sales.total})`),
        costedRevenue: num(sql`sum(${sales.total}) filter (where ${sales.unitCost} is not null)`),
        costOfGoods: num(sql`sum(${sales.unitCost} * ${sales.quantity})`),
        items: num(sql`sum(${sales.quantity})`),
      })
      .from(sales)
      .where(salesIn(shopId, range))
      .groupBy(sql`1`),
    db
      .select({
        month: sql<string>`to_char(${expenses.date}, 'YYYY-MM-01')`,
        expenses: num(sql`sum(${expenses.amount})`),
      })
      .from(expenses)
      .where(expensesIn(shopId, range))
      .groupBy(sql`1`),
  ]);
  return { revenue: rev, expenses: exp };
}

/** Date of the shop's first sale or expense, used as the start of "Tout". */
export async function firstActivity(db: DB, shopId: string): Promise<ISODate | null> {
  const [[s], [e]] = await Promise.all([
    db.select({ d: sql<string | null>`min(${sales.date})::text` }).from(sales).where(eq(sales.shopId, shopId)),
    db.select({ d: sql<string | null>`min(${expenses.date})::text` }).from(expenses).where(eq(expenses.shopId, shopId)),
  ]);
  const dates = [s?.d, e?.d].filter((d): d is string => !!d).sort();
  return dates[0] ?? null;
}

export function lowStockProducts(db: DB, shopId: string) {
  return db
    .select({
      id: products.id,
      name: products.name,
      stock: products.stock,
      unit: products.unit,
      threshold: products.lowStockThreshold,
    })
    .from(products)
    .where(
      and(
        eq(products.shopId, shopId),
        eq(products.archived, false),
        eq(products.trackStock, true),
        sql`${products.stock} <= coalesce(${products.lowStockThreshold}, 0)`,
      ),
    )
    .orderBy(sql`${products.stock} - coalesce(${products.lowStockThreshold}, 0)`);
}

/** All-time numbers behind the "return on investment" card. */
export async function investmentOverview(db: DB, shopId: string, todayISO: ISODate) {
  const lastNinetyDays: DateRange = { from: addDays(todayISO, -89), to: todayISO };

  const [[inv], [rev], [exp], recentTotals, first] = await Promise.all([
    db
      .select({ total: num(sql`sum(${investments.amount})`), since: sql<string | null>`min(${investments.date})::text` })
      .from(investments)
      .where(eq(investments.shopId, shopId)),
    db.select({ total: num(sql`sum(${sales.total})`) }).from(sales).where(eq(sales.shopId, shopId)),
    db.select({ total: num(sql`sum(${expenses.amount})`) }).from(expenses).where(eq(expenses.shopId, shopId)),
    totals(db, shopId, lastNinetyDays),
    firstActivity(db, shopId),
  ]);

  // Average monthly profit over the last 90 days (or since the shop started, if newer).
  const windowDays = first ? Math.min(90, daysInRange({ from: maxDate(first, lastNinetyDays.from), to: todayISO })) : 90;
  return {
    invested: inv.total,
    since: inv.since,
    cumulativeProfit: rev.total - exp.total,
    recentMonthlyProfit: (recentTotals.profit / windowDays) * 30,
  };
}
