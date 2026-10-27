import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createShopWithOwner, findUserByEmail } from "@/lib/data/account";
import { addExpense, deleteExpense, expensesByCategory, listExpenses } from "@/lib/data/expenses";
import { adjustStock, createProduct, getProduct, restockProduct } from "@/lib/data/products";
import { deleteSale, listSalesForDay, recordSales } from "@/lib/data/sales";
import { firstActivity, lowStockProducts, productStats, totals } from "@/lib/data/stats";
import { connect, runMigrations, type Connection } from "@/lib/db/client";
import { products as productsTable } from "@/lib/db/schema";

let conn: Connection;

beforeAll(async () => {
  conn = await connect({ dataDir: "memory://" });
  await runMigrations(conn);
});

afterAll(async () => {
  await conn?.close();
});

const day = "2026-10-20";
const range = { from: "2026-10-01", to: "2026-10-31" };

async function newShop(email: string) {
  return createShopWithOwner(conn.db, {
    shopName: "Boutique",
    name: "Awa",
    email,
    password: "motdepasse1",
    currency: "XOF",
    timezone: "Africa/Abidjan",
  });
}

describe("passwords", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("secret123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("shop workflow", () => {
  it("normalises emails on sign-up", async () => {
    await newShop("Awa@Example.com ");
    expect(await findUserByEmail(conn.db, "awa@example.com")).not.toBeNull();
  });

  it("tracks stock through sales, cancellations, restocks and counts", async () => {
    const { shop, user } = await newShop("stock@example.com");
    const rice = await createProduct(
      conn.db,
      shop.id,
      { name: "Riz", category: "Alimentation", salePrice: 1000, costPrice: 800, unit: "sac", trackStock: true, lowStockThreshold: 5, initialStock: 10 },
      day,
    );
    const credit = await createProduct(
      conn.db,
      shop.id,
      { name: "Crédit", category: null, salePrice: 500, costPrice: null, unit: "pièce", trackStock: false, lowStockThreshold: null, initialStock: 0 },
      day,
    );

    const count = await recordSales(conn.db, shop.id, {
      date: day,
      paymentMethod: "especes",
      userId: user.id,
      lines: [
        { productId: rice.id, quantity: 3, unitPrice: 1000 },
        { productId: credit.id, quantity: 4, unitPrice: 500 },
        { productId: rice.id, quantity: 0, unitPrice: 1000 },
      ],
    });
    expect(count).toBe(2);
    expect((await getProduct(conn.db, shop.id, rice.id))!.stock).toBe(7);

    const t = await totals(conn.db, shop.id, range);
    expect(t.revenue).toBe(5000);
    expect(t.items).toBe(7);
    expect(t.costedRevenue).toBe(3000);
    expect(t.costOfGoods).toBe(2400);

    // Cancelling a sale puts the stock back.
    const [riceSale] = (await listSalesForDay(conn.db, shop.id, day)).filter((s) => s.productName === "Riz");
    await deleteSale(conn.db, shop.id, riceSale.id);
    expect((await getProduct(conn.db, shop.id, rice.id))!.stock).toBe(10);

    // Restocking adds stock, updates the cost and records the purchase as an expense.
    await restockProduct(conn.db, shop.id, {
      productId: rice.id,
      date: day,
      quantity: 5,
      unitCost: 850,
      recordExpense: true,
      note: null,
      userId: user.id,
    });
    const restocked = (await getProduct(conn.db, shop.id, rice.id))!;
    expect(restocked.stock).toBe(15);
    expect(restocked.costPrice).toBe(850);
    const [purchase] = await expensesByCategory(conn.db, shop.id, range);
    expect(purchase).toMatchObject({ category: "Achat de marchandises", amount: 4250 });

    // An inventory count overrides the stock and shows up in alerts below the threshold.
    await adjustStock(conn.db, shop.id, { productId: rice.id, date: day, counted: 4, note: null });
    const low = await lowStockProducts(conn.db, shop.id);
    expect(low.map((p) => [p.name, p.stock])).toEqual([["Riz", 4]]);

    expect(await firstActivity(conn.db, shop.id)).toBe(day);
  });

  it("keeps sales history when a product is deleted", async () => {
    const { shop, user } = await newShop("history@example.com");
    const soap = await createProduct(
      conn.db,
      shop.id,
      { name: "Savon", category: null, salePrice: 300, costPrice: 200, unit: "pièce", trackStock: false, lowStockThreshold: null, initialStock: 0 },
      day,
    );
    await recordSales(conn.db, shop.id, { date: day, paymentMethod: "mobile_money", userId: user.id, lines: [{ productId: soap.id, quantity: 2, unitPrice: 300 }] });
    await conn.db.delete(productsTable).where(eq(productsTable.id, soap.id));
    const stats = await productStats(conn.db, shop.id, range);
    expect(stats).toEqual([expect.objectContaining({ name: "Savon", quantity: 2, revenue: 600, margin: 200 })]);
  });

  it("never lets one shop read or change another shop's data", async () => {
    const a = await newShop("a@example.com");
    const b = await newShop("b@example.com");
    const product = await createProduct(
      conn.db,
      a.shop.id,
      { name: "Huile", category: null, salePrice: 2000, costPrice: null, unit: "pièce", trackStock: true, lowStockThreshold: null, initialStock: 5 },
      day,
    );
    await addExpense(conn.db, a.shop.id, a.user.id, { date: day, category: "Loyer", amount: 50000, description: null });

    // Shop B cannot see A's product, sell it, or delete A's expense.
    expect(await getProduct(conn.db, b.shop.id, product.id)).toBeNull();
    const sold = await recordSales(conn.db, b.shop.id, {
      date: day,
      paymentMethod: "especes",
      userId: b.user.id,
      lines: [{ productId: product.id, quantity: 1, unitPrice: 2000 }],
    });
    expect(sold).toBe(0);
    const [expense] = await listExpenses(conn.db, a.shop.id, range);
    await deleteExpense(conn.db, b.shop.id, expense.id);
    expect(await listExpenses(conn.db, a.shop.id, range)).toHaveLength(1);
    expect((await totals(conn.db, b.shop.id, range)).expenses).toBe(0);
    expect((await getProduct(conn.db, a.shop.id, product.id))!.stock).toBe(5);
  });
});
