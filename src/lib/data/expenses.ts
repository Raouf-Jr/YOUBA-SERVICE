import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { expenses, investments } from "@/lib/db/schema";
import type { DateRange, ISODate } from "@/lib/dates";

const inRange = (column: typeof expenses.date | typeof investments.date, range: DateRange) =>
  sql`${column} between ${range.from} and ${range.to}`;

export type ExpenseInput = { date: ISODate; category: string; amount: number; description: string | null };

/** With a `clientRef`, adding the same expense twice is a no-op. Returns whether a row was added. */
export async function addExpense(db: DB, shopId: string, userId: string, input: ExpenseInput & { clientRef?: string }) {
  const rows = await db
    .insert(expenses)
    .values({ ...input, shopId, createdById: userId })
    .onConflictDoNothing()
    .returning({ id: expenses.id });
  return rows.length > 0;
}

export async function updateExpense(db: DB, shopId: string, id: string, input: ExpenseInput) {
  await db.update(expenses).set(input).where(and(eq(expenses.shopId, shopId), eq(expenses.id, id)));
}

export async function deleteExpense(db: DB, shopId: string, id: string) {
  await db.delete(expenses).where(and(eq(expenses.shopId, shopId), eq(expenses.id, id)));
}

export function listExpenses(db: DB, shopId: string, range: DateRange) {
  return db
    .select()
    .from(expenses)
    .where(and(eq(expenses.shopId, shopId), inRange(expenses.date, range)))
    .orderBy(desc(expenses.date), desc(expenses.createdAt));
}

export function expensesByCategory(db: DB, shopId: string, range: DateRange) {
  return db
    .select({
      category: expenses.category,
      amount: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(expenses)
    .where(and(eq(expenses.shopId, shopId), inRange(expenses.date, range)))
    .groupBy(expenses.category)
    .orderBy(sql`2 desc`);
}

// ---------------------------------------------------------------------------
// Investments

export type InvestmentInput = { date: ISODate; label: string; category: string; amount: number };

export async function addInvestment(db: DB, shopId: string, input: InvestmentInput) {
  await db.insert(investments).values({ ...input, shopId });
}

export async function updateInvestment(db: DB, shopId: string, id: string, input: InvestmentInput) {
  await db.update(investments).set(input).where(and(eq(investments.shopId, shopId), eq(investments.id, id)));
}

export async function deleteInvestment(db: DB, shopId: string, id: string) {
  await db.delete(investments).where(and(eq(investments.shopId, shopId), eq(investments.id, id)));
}

export function listInvestments(db: DB, shopId: string) {
  return db
    .select()
    .from(investments)
    .where(eq(investments.shopId, shopId))
    .orderBy(desc(investments.date), desc(investments.createdAt));
}
