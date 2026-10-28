import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/auth/password";
import { entriesForDay, entriesInRange, productHistory, saveDay } from "@/lib/data/entries";
import { createProduct, deleteProduct, listProducts, setArchived } from "@/lib/data/products";
import { dailyTotals, firstDate, productTotals, sumTotals } from "@/lib/data/reports";
import { getSettings, updateSettings } from "@/lib/data/settings";
import { ensureFirstUser, findUserByUsername } from "@/lib/data/users";
import { connect, runMigrations, type Connection } from "@/lib/db/client";

let conn: Connection;

beforeAll(async () => {
  conn = await connect({ dataDir: "memory://" });
  await runMigrations(conn);
});

afterAll(async () => {
  await conn?.close();
});

const base = { investment: 0, startDate: null, openingDate: null, openingRevenue: 0, openingExpense: 0 };

describe("settings", () => {
  it("starts as YOUBA SERVICE in F CFA and can be renamed", async () => {
    expect(await getSettings(conn.db)).toMatchObject({ shopName: "YOUBA SERVICE", currency: "XOF", timezone: "Africa/Lome" });
    await updateSettings(conn.db, { shopName: "Boutique Test", currency: "EUR" });
    expect(await getSettings(conn.db)).toMatchObject({ shopName: "Boutique Test", currency: "EUR" });
    await updateSettings(conn.db, { shopName: "YOUBA SERVICE", currency: "XOF" });
  });
});

describe("first account", () => {
  it("is not created in production without ADMIN_USERNAME / ADMIN_PASSWORD", async () => {
    await ensureFirstUser(conn.db, { NODE_ENV: "production" });
    expect(await findUserByUsername(conn.db, "youba")).toBeNull();
  });

  it("comes from the environment, once", async () => {
    await ensureFirstUser(conn.db, { NODE_ENV: "production", ADMIN_USERNAME: " Youba ", ADMIN_PASSWORD: "secret-2026" });
    const user = (await findUserByUsername(conn.db, "YOUBA"))!;
    expect(user).toMatchObject({ username: "youba", name: "Youba" });
    expect(await verifyPassword("secret-2026", user.passwordHash)).toBe(true);
    // Later changes to the variables don't touch the existing account.
    await ensureFirstUser(conn.db, { NODE_ENV: "production", ADMIN_USERNAME: "autre", ADMIN_PASSWORD: "autre-2026" });
    expect(await findUserByUsername(conn.db, "autre")).toBeNull();
  });
});

describe("products and days", () => {
  it("saves a day by setting values, so saving again changes nothing; empty clears", async () => {
    const rice = await createProduct(conn.db, { ...base, name: "Riz" });
    const drinks = await createProduct(conn.db, { ...base, name: "Boissons" });
    const day = "2026-10-20";

    await saveDay(conn.db, day, [
      { productId: rice.id, revenue: 10_000, expense: 4_000, note: "Sacs achetés" },
      { productId: drinks.id, revenue: 3_000, expense: 0, note: null },
      { productId: "00000000-0000-4000-8000-000000000000", revenue: 1, expense: 1, note: null }, // unknown: ignored
    ]);
    await saveDay(conn.db, day, [{ productId: rice.id, revenue: 10_000, expense: 4_000, note: "Sacs achetés" }]);
    const first = await entriesForDay(conn.db, day);
    expect(first).toHaveLength(2);

    // Correcting the day replaces the figures.
    await saveDay(conn.db, day, [{ productId: rice.id, revenue: 12_000, expense: 4_000, note: null }]);
    expect((await entriesForDay(conn.db, day)).find((e) => e.productId === rice.id)).toMatchObject({ revenue: 12_000, note: null });

    // An all-empty line removes the day for that product.
    await saveDay(conn.db, day, [{ productId: drinks.id, revenue: 0, expense: 0, note: null }]);
    expect(await entriesForDay(conn.db, day)).toHaveLength(1);

    expect(await productHistory(conn.db, rice.id)).toEqual([{ date: day, revenue: 12_000, expense: 4_000, note: null }]);
    expect(await entriesInRange(conn.db, { from: "2026-10-01", to: "2026-10-31" })).toEqual([
      { date: day, product: "Riz", revenue: 12_000, expense: 4_000, note: null },
    ]);

    await deleteProduct(conn.db, rice.id);
    await deleteProduct(conn.db, drinks.id);
    expect(await entriesForDay(conn.db, day)).toEqual([]);
  });

  it("totals per product include carried-over figures when their date is in the period", async () => {
    const shop = await createProduct(conn.db, {
      name: "Boutique",
      investment: 500_000,
      startDate: "2026-01-01",
      openingDate: "2026-09-30",
      openingRevenue: 300_000,
      openingExpense: 120_000,
    });
    const other = await createProduct(conn.db, { ...base, name: "Crédit", investment: 50_000 });
    await saveDay(conn.db, "2026-10-01", [
      { productId: shop.id, revenue: 20_000, expense: 5_000, note: null },
      { productId: other.id, revenue: 1_000, expense: 900, note: null },
    ]);
    await saveDay(conn.db, "2026-10-02", [{ productId: shop.id, revenue: 10_000, expense: 0, note: null }]);

    // Since the beginning: carried-over totals included.
    const all = await productTotals(conn.db, null);
    const shopAll = all.find((p) => p.name === "Boutique")!;
    expect(shopAll).toMatchObject({ revenue: 330_000, expense: 125_000, profit: 205_000, days: 2, investment: 500_000 });
    expect(shopAll.opening).toEqual({ date: "2026-09-30", revenue: 300_000, expense: 120_000 });
    expect(sumTotals(all)).toEqual({ revenue: 331_000, expense: 125_900, profit: 205_100 });

    // October only: the carry-over (30 September) is outside.
    const october = await productTotals(conn.db, { from: "2026-10-01", to: "2026-10-31" }, shop.id);
    expect(october).toEqual([expect.objectContaining({ revenue: 30_000, expense: 5_000, opening: null })]);

    expect(await dailyTotals(conn.db, { from: "2026-10-01", to: "2026-10-31" })).toEqual([
      { date: "2026-10-01", revenue: 21_000, expense: 5_900 },
      { date: "2026-10-02", revenue: 10_000, expense: 0 },
    ]);
    expect(await firstDate(conn.db)).toBe("2026-01-01");

    // Archived products leave the entry screen but keep their history.
    await setArchived(conn.db, other.id, true);
    expect((await listProducts(conn.db)).map((p) => p.name)).toEqual(["Boutique"]);
    expect((await listProducts(conn.db, { includeArchived: true })).map((p) => p.name)).toEqual(["Boutique", "Crédit"]);
  });
});
