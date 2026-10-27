import { and, asc, eq, sql } from "drizzle-orm";
import { RESTOCK_EXPENSE_CATEGORY } from "@/lib/constants";
import type { DB } from "@/lib/db/client";
import { expenses, products, stockMovements } from "@/lib/db/schema";
import type { ISODate } from "@/lib/dates";
import { round2 } from "@/lib/stats";

export type ProductInput = {
  name: string;
  category: string | null;
  salePrice: number;
  costPrice: number | null;
  unit: string;
  trackStock: boolean;
  lowStockThreshold: number | null;
};

export function listProducts(db: DB, shopId: string, opts: { includeArchived?: boolean } = {}) {
  return db
    .select()
    .from(products)
    .where(opts.includeArchived ? eq(products.shopId, shopId) : and(eq(products.shopId, shopId), eq(products.archived, false)))
    .orderBy(asc(products.archived), asc(sql`lower(${products.name})`));
}

export async function getProduct(db: DB, shopId: string, id: string) {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.shopId, shopId), eq(products.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listCategories(db: DB, shopId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(and(eq(products.shopId, shopId), sql`${products.category} is not null`));
  return rows.map((r) => r.category!).sort((a, b) => a.localeCompare(b, "fr"));
}

export async function createProduct(db: DB, shopId: string, input: ProductInput & { initialStock: number }, date: ISODate) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({ ...input, shopId, stock: input.trackStock ? input.initialStock : 0 })
      .returning();
    if (input.trackStock && input.initialStock !== 0) {
      await tx.insert(stockMovements).values({
        shopId,
        productId: product.id,
        date,
        type: "adjustment",
        quantity: input.initialStock,
        note: "Stock initial",
      });
    }
    return product;
  });
}

export async function updateProduct(db: DB, shopId: string, id: string, input: ProductInput) {
  const [row] = await db
    .update(products)
    .set(input)
    .where(and(eq(products.shopId, shopId), eq(products.id, id)))
    .returning();
  return row ?? null;
}

export async function setProductArchived(db: DB, shopId: string, id: string, archived: boolean) {
  await db.update(products).set({ archived }).where(and(eq(products.shopId, shopId), eq(products.id, id)));
}

/** Sales keep their own copy of the product name, so history survives deletion. */
export async function deleteProduct(db: DB, shopId: string, id: string) {
  await db.delete(products).where(and(eq(products.shopId, shopId), eq(products.id, id)));
}

export async function restockProduct(
  db: DB,
  shopId: string,
  input: {
    productId: string;
    date: ISODate;
    quantity: number;
    unitCost: number | null;
    recordExpense: boolean;
    note: string | null;
    userId: string;
  },
) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.shopId, shopId), eq(products.id, input.productId)))
      .limit(1);
    if (!product) throw new Error("Produit introuvable");

    let expenseId: string | null = null;
    if (input.recordExpense && input.unitCost && input.unitCost > 0) {
      const [expense] = await tx
        .insert(expenses)
        .values({
          shopId,
          date: input.date,
          category: RESTOCK_EXPENSE_CATEGORY,
          amount: round2(input.unitCost * input.quantity),
          description: `Réapprovisionnement : ${product.name} (${input.quantity} ${product.unit})`,
          createdById: input.userId,
        })
        .returning({ id: expenses.id });
      expenseId = expense.id;
    }

    await tx.insert(stockMovements).values({
      shopId,
      productId: product.id,
      date: input.date,
      type: "restock",
      quantity: input.quantity,
      unitCost: input.unitCost,
      note: input.note,
      expenseId,
    });
    await tx
      .update(products)
      .set({
        trackStock: true,
        stock: sql`${products.stock} + ${input.quantity}`,
        // The latest purchase price becomes the reference cost for margins.
        ...(input.unitCost && input.unitCost > 0 ? { costPrice: input.unitCost } : {}),
      })
      .where(eq(products.id, product.id));
  });
}

/** Records an inventory count: the stock becomes `counted`, the gap is logged. */
export async function adjustStock(
  db: DB,
  shopId: string,
  input: { productId: string; date: ISODate; counted: number; note: string | null },
) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.shopId, shopId), eq(products.id, input.productId)))
      .limit(1);
    if (!product) throw new Error("Produit introuvable");
    const delta = Math.round((input.counted - product.stock) * 1000) / 1000;
    if (delta !== 0) {
      await tx.insert(stockMovements).values({
        shopId,
        productId: product.id,
        date: input.date,
        type: "adjustment",
        quantity: delta,
        note: input.note ?? "Inventaire",
      });
    }
    await tx.update(products).set({ trackStock: true, stock: input.counted }).where(eq(products.id, product.id));
  });
}

export function listStockMovements(db: DB, shopId: string, productId: string, limit = 20) {
  return db
    .select()
    .from(stockMovements)
    .where(and(eq(stockMovements.shopId, shopId), eq(stockMovements.productId, productId)))
    .orderBy(sql`${stockMovements.date} desc, ${stockMovements.createdAt} desc`)
    .limit(limit);
}
