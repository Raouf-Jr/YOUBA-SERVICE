import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { products, sales, users } from "@/lib/db/schema";
import type { ISODate } from "@/lib/dates";
import { round2 } from "@/lib/stats";

export type SaleLine = { productId: string; quantity: number; unitPrice: number };

/**
 * Records one checkout's lines and takes the quantities out of stock.
 * With a `checkoutId`, recording the same checkout again is a no-op (returns 0).
 */
export async function recordSales(
  db: DB,
  shopId: string,
  input: { date: ISODate; paymentMethod: string; userId: string; lines: SaleLine[]; checkoutId?: string },
) {
  // One line per product: the checkout id + product id pair is what makes a re-send harmless.
  const seen = new Set<string>();
  const lines = input.lines.filter((l) => l.quantity > 0 && !seen.has(l.productId) && seen.add(l.productId));
  if (lines.length === 0) return 0;

  return db.transaction(async (tx) => {
    const ids = lines.map((l) => l.productId);
    const found = await tx
      .select()
      .from(products)
      .where(and(eq(products.shopId, shopId), inArray(products.id, ids)));
    const byId = new Map(found.map((p) => [p.id, p]));

    const rows = lines.flatMap((line) => {
      const product = byId.get(line.productId);
      if (!product) return [];
      return [
        {
          shopId,
          productId: product.id,
          productName: product.name,
          date: input.date,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: product.costPrice,
          total: round2(line.quantity * line.unitPrice),
          paymentMethod: input.paymentMethod,
          checkoutId: input.checkoutId ?? null,
          createdById: input.userId,
        },
      ];
    });
    if (rows.length === 0) return 0;
    const inserted = await tx
      .insert(sales)
      .values(rows)
      .onConflictDoNothing()
      .returning({ productId: sales.productId, quantity: sales.quantity });

    for (const row of inserted) {
      if (row.productId && byId.get(row.productId)?.trackStock) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${row.quantity}` })
          .where(eq(products.id, row.productId));
      }
    }
    return inserted.length;
  });
}

export function listSalesForDay(db: DB, shopId: string, date: ISODate) {
  return db
    .select({
      id: sales.id,
      productName: sales.productName,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      total: sales.total,
      paymentMethod: sales.paymentMethod,
      createdAt: sales.createdAt,
      unit: products.unit,
      seller: users.name,
    })
    .from(sales)
    .leftJoin(products, eq(products.id, sales.productId))
    .leftJoin(users, eq(users.id, sales.createdById))
    .where(and(eq(sales.shopId, shopId), eq(sales.date, date)))
    .orderBy(desc(sales.createdAt));
}

export async function getSale(db: DB, shopId: string, id: string) {
  const [row] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.shopId, shopId), eq(sales.id, id)))
    .limit(1);
  return row ?? null;
}

/** Cancels a sale and puts the quantity back in stock. */
export async function deleteSale(db: DB, shopId: string, id: string) {
  await db.transaction(async (tx) => {
    const [sale] = await tx
      .delete(sales)
      .where(and(eq(sales.shopId, shopId), eq(sales.id, id)))
      .returning();
    if (!sale?.productId) return;
    await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${sale.quantity}` })
      .where(and(eq(products.id, sale.productId), eq(products.trackStock, true)));
  });
}

/** Daily revenue for the last few days, for the "ventes" page strip. */
export async function recentDailyRevenue(db: DB, shopId: string, from: ISODate, to: ISODate) {
  const rows = await db
    .select({
      date: sales.date,
      amount: sql<number>`coalesce(sum(${sales.total}), 0)`.mapWith(Number),
    })
    .from(sales)
    .where(and(eq(sales.shopId, shopId), sql`${sales.date} between ${from} and ${to}`))
    .groupBy(sales.date);
  return rows;
}

/** Every sale line in a period, oldest first (CSV export). */
export function listSales(db: DB, shopId: string, range: { from: ISODate; to: ISODate }) {
  return db
    .select({
      date: sales.date,
      productName: sales.productName,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      unitCost: sales.unitCost,
      total: sales.total,
      paymentMethod: sales.paymentMethod,
      seller: users.name,
    })
    .from(sales)
    .leftJoin(users, eq(users.id, sales.createdById))
    .where(and(eq(sales.shopId, shopId), sql`${sales.date} between ${range.from} and ${range.to}`))
    .orderBy(sales.date, sales.createdAt);
}
