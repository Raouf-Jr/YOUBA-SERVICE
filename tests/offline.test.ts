import { beforeEach, describe, expect, it, vi } from "vitest";
import { addEntry, entriesFor, isWaiting, newId, purgeSent, setOutboxStorage, type OutboxEntry } from "@/lib/offline/outbox";
import type { SyncResult } from "@/lib/offline/types";

// The real sender is a Server Action; the sync loop is tested with stand-ins.
vi.mock("@/lib/actions/entries", () => ({ saveDay: vi.fn() }));
const { runSync } = await import("@/lib/offline/sync");

function entry(id: string, userId: string, createdAt: number, revenue = 1000): OutboxEntry {
  return {
    id,
    userId,
    createdAt,
    attempts: 0,
    payload: { date: "2026-10-27", lines: [{ productId: "p", revenue, expense: 0, note: null }] },
  };
}

describe("outbox sync", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    setOutboxStorage({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) });
  });

  it("sends the user's days oldest first (the last version wins), marks them sent, then forgets them", async () => {
    addEntry(entry("b", "u1", 2, 2000));
    addEntry(entry("a", "u1", 1, 1000));
    addEntry(entry("other", "u2", 0));
    addEntry(entry("a", "u1", 1)); // same id twice: stored once
    const sent: number[] = [];
    const outcome = await runSync("u1", async (e) => {
      sent.push(e.payload.lines[0].revenue);
      return { ok: true };
    });
    expect(outcome).toBe("done");
    expect(sent).toEqual([1000, 2000]);
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

  it("stops on network errors and keeps the days for later", async () => {
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

  it("stops when signed out and flags refused days", async () => {
    addEntry(entry("bad", "u1", 1));
    addEntry(entry("ok", "u1", 2));
    const answers: Record<string, SyncResult> = {
      bad: { ok: false, reason: "invalid", message: "Journée invalide" },
      ok: { ok: true },
    };
    expect(await runSync("u1", async (e) => answers[e.id])).toBe("done");
    expect(entriesFor("u1").map((e) => [e.id, e.error ?? null, !!e.sentAt])).toEqual([
      ["bad", "Journée invalide", false],
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
