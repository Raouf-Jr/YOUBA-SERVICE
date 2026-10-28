import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { generalExpenses } from "@/lib/db/schema";
import type { DateRange, ISODate } from "@/lib/dates";

/** Money taken from the overall profit (rent, electricity, money for home…), newest first. */
export function listGeneralExpenses(db: DB, range: DateRange | null = null) {
  return db
    .select()
    .from(generalExpenses)
    .where(range ? sql`${generalExpenses.date} between ${range.from} and ${range.to}` : undefined)
    .orderBy(desc(generalExpenses.date), desc(generalExpenses.createdAt));
}

export async function addGeneralExpense(db: DB, input: { date: ISODate; amount: number; label: string }) {
  const [row] = await db.insert(generalExpenses).values(input).returning();
  return row;
}

export async function deleteGeneralExpense(db: DB, id: string) {
  await db.delete(generalExpenses).where(eq(generalExpenses.id, id));
}

export async function totalGeneralExpenses(db: DB, range: DateRange | null = null) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${generalExpenses.amount}), 0)`.mapWith(Number) })
    .from(generalExpenses)
    .where(and(range ? sql`${generalExpenses.date} between ${range.from} and ${range.to}` : undefined));
  return row.total;
}
