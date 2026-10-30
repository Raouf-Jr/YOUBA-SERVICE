import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkLimit, clearLimit, clearLoginLimits, hitLimit, tooManyAttemptsMessage } from "@/lib/data/rate-limit";
import { connect, runMigrations, type Connection } from "@/lib/db/client";

let conn: Connection;

beforeAll(async () => {
  conn = await connect({ dataDir: "memory://" });
  await runMigrations(conn);
});

afterAll(async () => {
  await conn?.close();
});

const limit = { max: 3, windowMinutes: 15 };
const t0 = new Date("2026-10-27T10:00:00Z");
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);

describe("rate limiter", () => {
  it("allows `max` hits per window, then blocks until the window ends", async () => {
    const key = "test:window";
    for (let i = 0; i < 3; i++) {
      expect((await checkLimit(conn.db, key, limit, at(i))).blocked).toBe(false);
      expect((await hitLimit(conn.db, key, limit, at(i))).blocked).toBe(false);
    }
    const blocked = await checkLimit(conn.db, key, limit, at(5));
    expect(blocked).toEqual({ blocked: true, retryAfterSeconds: 10 * 60 });
    expect((await hitLimit(conn.db, key, limit, at(6))).blocked).toBe(true);

    // The window started at t0 and is not extended by blocked hits.
    expect((await checkLimit(conn.db, key, limit, at(15))).blocked).toBe(false);
    expect((await hitLimit(conn.db, key, limit, at(16))).blocked).toBe(false);
    expect((await checkLimit(conn.db, key, limit, at(16))).blocked).toBe(false);
  });

  it("keeps keys independent and can be cleared", async () => {
    for (let i = 0; i < 3; i++) await hitLimit(conn.db, "test:a", limit, at(0));
    expect((await checkLimit(conn.db, "test:a", limit, at(1))).blocked).toBe(true);
    expect((await checkLimit(conn.db, "test:b", limit, at(1))).blocked).toBe(false);
    await clearLimit(conn.db, "test:a");
    expect((await checkLimit(conn.db, "test:a", limit, at(1))).blocked).toBe(false);
  });

  it("counts concurrent hits without losing any", async () => {
    await Promise.all(Array.from({ length: 5 }, () => hitLimit(conn.db, "test:concurrent", { max: 10, windowMinutes: 5 }, at(0))));
    const results = await Promise.all(
      Array.from({ length: 6 }, () => hitLimit(conn.db, "test:concurrent", { max: 10, windowMinutes: 5 }, at(0))),
    );
    expect(results.filter((r) => r.blocked)).toHaveLength(1);
  });

  it("lifts every sign-in block after an administrator reset, and only those", async () => {
    const account = { max: 1, windowMinutes: 15 };
    for (const key of ["login:user:youba", "login:ip:1.2.3.4", "password-change:u1"]) {
      await hitLimit(conn.db, key, account, at(0));
      await hitLimit(conn.db, key, account, at(0));
    }
    await clearLoginLimits(conn.db);
    expect((await checkLimit(conn.db, "login:user:youba", account, at(1))).blocked).toBe(false);
    expect((await checkLimit(conn.db, "login:ip:1.2.3.4", account, at(1))).blocked).toBe(false);
    expect((await checkLimit(conn.db, "password-change:u1", account, at(1))).blocked).toBe(true);
  });

  it("explains the wait in minutes", () => {
    expect(tooManyAttemptsMessage({ blocked: true, retryAfterSeconds: 61 })).toContain("2 minutes");
    expect(tooManyAttemptsMessage({ blocked: true, retryAfterSeconds: 5 })).toContain("1 minute.");
  });
});
