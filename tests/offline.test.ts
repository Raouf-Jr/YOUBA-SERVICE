import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createShopWithOwner } from "@/lib/data/account";
import { addExpense, listExpenses } from "@/lib/data/expenses";
import { createProduct, getProduct } from "@/lib/data/products";
import { listSalesForDay, recordSales } from "@/lib/data/sales";
import { connect, runMigrations, type Connection } from "@/lib/db/client";
import { addEntry, entriesFor, isWaiting, newId, purgeSent, setOutboxStorage, type OutboxEntry } from "@/lib/offline/outbox";
import type { SyncResult } from "@/lib/offline/types";

// The real senders are Server Actions; the sync loop is tested with stand-ins.
vi.mock("@/lib/actions/sales", () => ({ recordCheckout: vi.fn() }));
vi.mock("@/lib/actions/expenses", () => ({ recordExpense: vi.fn() }));
const { runSync } = await import("@/lib/offline/sync");

let conn: Connection;

beforeAll(async () => {
  conn = await connect({ dataDir: "memory://" });
  await runMigrations(conn);
});

afterAll(async () => {
  await conn?.close();
});

describe("re-sending the same entry is harmless", () => {
  it("records a checkout once and takes stock once", async () => {
    const { shop, user } = await createShopWithOwner(conn.db, {
      shopName: "B",
      name: "Awa",
      email: "idem@example.com",
      password: "motdepasse1",
      currency: "XOF",
      timezone: "Africa/Abidjan",
    });
    const rice = await createProduct(
      conn.db,
      shop.id,
      { name: "Riz", category: null, salePrice: 1000, costPrice: 800, unit: "sac", trackStock: true, lowStockThreshold: null, initialStock: 10 },
      "2026-10-27",
    );
    const checkout = {
      checkoutId: newId(),
      date: "2026-10-27",
      paymentMethod: "especes",
      userId: user.id,
      lines: [
        { productId: rice.id, quantity: 2, unitPrice: 1000 },
        { productId: rice.id, quantity: 5, unitPrice: 1000 }, // duplicate product line: ignored
      ],
    };
    expect(await recordSales(conn.db, shop.id, checkout)).toBe(1);
    expect(await recordSales(conn.db, shop.id, checkout)).toBe(0);
    expect(await listSalesForDay(conn.db, shop.id, "2026-10-27")).toHaveLength(1);
    expect((await getProduct(conn.db, shop.id, rice.id))!.stock).toBe(8);

    // Without a checkout id (older clients), each call is a new sale.
    const anonymous = { ...checkout, checkoutId: undefined };
    await recordSales(conn.db, shop.id, anonymous);
    await recordSales(conn.db, shop.id, anonymous);
    expect(await listSalesForDay(conn.db, shop.id, "2026-10-27")).toHaveLength(3);

    const expense = { date: "2026-10-27", category: "Transport", amount: 2000, description: null, clientRef: newId() };
    expect(await addExpense(conn.db, shop.id, user.id, expense)).toBe(true);
    expect(await addExpense(conn.db, shop.id, user.id, expense)).toBe(false);
    expect(await listExpenses(conn.db, shop.id, { from: "2026-10-01", to: "2026-10-31" })).toHaveLength(1);
  });
});

function entry(id: string, userId: string, createdAt: number): OutboxEntry {
  return {
    id,
    kind: "expense",
    userId,
    shopId: "s",
    createdAt,
    attempts: 0,
    payload: { clientRef: id, shopId: "s", date: "2026-10-27", category: "Loyer", amount: 1, description: null },
    summary: { label: id },
  };
}

describe("outbox sync", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    setOutboxStorage({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) });
  });

  it("sends the user's entries oldest first, marks them sent, then forgets them", async () => {
    addEntry(entry("b", "u1", 2));
    addEntry(entry("a", "u1", 1));
    addEntry(entry("other", "u2", 0));
    addEntry(entry("a", "u1", 1)); // same id twice: stored once
    const sent: string[] = [];
    const outcome = await runSync("u1", async (e) => {
      sent.push(e.id);
      return { ok: true, added: true };
    });
    expect(outcome).toBe("done");
    expect(sent).toEqual(["a", "b"]);
    expect(entriesFor("u1").filter(isWaiting)).toEqual([]);
    expect(entriesFor("u1").every((e) => e.sentAt)).toBe(true);
    expect(entriesFor("u2")).toHaveLength(1);

    // A second run sends nothing again; old sent entries are purged.
    await runSync("u1", async () => {
      throw new Error("should not be called");
    });
    purgeSent(Date.now() + 5 * 60_000);
    expect(entriesFor("u1")).toEqual([]);
  });

  it("stops on network errors and keeps the entries for later", async () => {
    addEntry(entry("a", "u1", 1));
    addEntry(entry("b", "u1", 2));
    const outcome = await runSync("u1", async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(outcome).toBe("network");
    expect(entriesFor("u1").map((e) => [e.id, e.attempts])).toEqual([
      ["a", 1],
      ["b", 0],
    ]);
  });

  it("stops when signed out, flags refused entries and skips other accounts' entries", async () => {
    addEntry(entry("bad", "u1", 1));
    addEntry(entry("ok", "u1", 2));
    const answers: Record<string, SyncResult> = {
      bad: { ok: false, reason: "invalid", message: "Dépense invalide" },
      ok: { ok: true, added: true },
    };
    expect(await runSync("u1", async (e) => answers[e.id])).toBe("done");
    expect(entriesFor("u1").map((e) => [e.id, e.error ?? null, !!e.sentAt])).toEqual([
      ["bad", "Dépense invalide", false],
      ["ok", null, true],
    ]);

    addEntry(entry("later", "u1", 3));
    expect(await runSync("u1", async () => ({ ok: false, reason: "auth", message: "" }))).toBe("auth");
    expect(entriesFor("u1").filter(isWaiting).map((e) => e.id)).toEqual(["later"]);
  });

  it("generates valid v4 ids", () => {
    const ids = new Set(Array.from({ length: 50 }, newId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
