import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { entries, products } from "@/lib/db/schema";
import type { ISODate } from "@/lib/dates";

export type DayLine = { productId: string; revenue: number; expense: number; note: string | null };

export function entriesForDay(db: DB, date: ISODate) {
  return db
    .select({
      productId: entries.productId,
      revenue: entries.revenue,
      expense: entries.expense,
      note: entries.note,
    })
    .from(entries)
    .where(eq(entries.date, date));
}

/**
 * Sets what came in and went out on `date` for each product given.
 * Setting values (not adding them) makes a repeated save harmless; an all-empty line clears the day.
 * Returns how many products were saved.
 */
export async function saveDay(db: DB, date: ISODate, lines: DayLine[]) {
  if (lines.length === 0) return 0;
  return db.transaction(async (tx) => {
    const ids = [...new Set(lines.map((l) => l.productId))];
    const known = await tx.select({ id: products.id }).from(products).where(inArray(products.id, ids));
    const valid = new Set(known.map((p) => p.id));
    let saved = 0;
    for (const line of lines) {
      if (!valid.has(line.productId)) continue;
      saved++;
      if (!line.revenue && !line.expense && !line.note) {
        await tx.delete(entries).where(and(eq(entries.productId, line.productId), eq(entries.date, date)));
        continue;
      }
      const values = { revenue: line.revenue, expense: line.expense, note: line.note, updatedAt: new Date() };
      await tx
        .insert(entries)
        .values({ productId: line.productId, date, ...values })
        .onConflictDoUpdate({ target: [entries.productId, entries.date], set: values });
    }
    return saved;
  });
}

/** The product's most recent days, newest first. */
export function productHistory(db: DB, productId: string, limit = 60) {
  return db
    .select({ date: entries.date, revenue: entries.revenue, expense: entries.expense, note: entries.note })
    .from(entries)
    .where(eq(entries.productId, productId))
    .orderBy(desc(entries.date))
    .limit(limit);
}

/** Every line of a period (export), oldest first. */
export function entriesInRange(db: DB, range: { from: ISODate; to: ISODate }, productId?: string) {
  return db
    .select({
      date: entries.date,
      product: products.name,
      revenue: entries.revenue,
      expense: entries.expense,
      note: entries.note,
    })
    .from(entries)
    .innerJoin(products, eq(products.id, entries.productId))
    .where(
      and(
        sql`${entries.date} between ${range.from} and ${range.to}`,
        productId ? eq(entries.productId, productId) : undefined,
      ),
    )
    .orderBy(entries.date, sql`lower(${products.name})`);
}
