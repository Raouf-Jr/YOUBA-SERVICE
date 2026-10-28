import { asc, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import type { ISODate } from "@/lib/dates";

export type ProductInput = {
  name: string;
  investment: number;
  startDate: ISODate | null;
  openingDate: ISODate | null;
  openingRevenue: number;
  openingExpense: number;
};

export function listProducts(db: DB, opts: { includeArchived?: boolean } = {}) {
  return db
    .select()
    .from(products)
    .where(opts.includeArchived ? undefined : eq(products.archived, false))
    .orderBy(asc(products.archived), asc(sql`lower(${products.name})`));
}

export async function getProduct(db: DB, id: string) {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return row ?? null;
}

export async function createProduct(db: DB, input: ProductInput) {
  const [row] = await db.insert(products).values(input).returning();
  return row;
}

export async function updateProduct(db: DB, id: string, input: ProductInput) {
  const [row] = await db.update(products).set(input).where(eq(products.id, id)).returning();
  return row ?? null;
}

export async function setArchived(db: DB, id: string, archived: boolean) {
  await db.update(products).set({ archived }).where(eq(products.id, id));
}

/** Also deletes the product's daily entries. */
export async function deleteProduct(db: DB, id: string) {
  await db.delete(products).where(eq(products.id, id));
}
