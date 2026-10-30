import { eq, like, lt, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

export type Limit = { max: number; windowMinutes: number };

/** `max` hits are allowed per window; beyond that the key is blocked until the window ends. */
export const LIMITS = {
  loginPerAccount: { max: 5, windowMinutes: 15 },
  // Generous: many people can share one IP behind a mobile operator or a cybercafé.
  loginPerIp: { max: 40, windowMinutes: 15 },
  passwordChangePerUser: { max: 5, windowMinutes: 15 },
} satisfies Record<string, Limit>;

export type LimitStatus = { blocked: boolean; retryAfterSeconds: number };

const open: LimitStatus = { blocked: false, retryAfterSeconds: 0 };

/** Would one more hit go over the limit? Does not count anything. */
export async function checkLimit(db: DB, key: string, limit: Limit, now = new Date()): Promise<LimitStatus> {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  if (!row || row.resetAt <= now || row.count < limit.max) return open;
  return { blocked: true, retryAfterSeconds: Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000) };
}

/** Counts one hit (atomically); blocked if this hit goes over the limit. */
export async function hitLimit(db: DB, key: string, limit: Limit, now = new Date()): Promise<LimitStatus> {
  const nowIso = now.toISOString();
  const resetIso = new Date(now.getTime() + limit.windowMinutes * 60_000).toISOString();
  const expired = sql`${rateLimits.resetAt} <= ${nowIso}::timestamptz`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: new Date(resetIso) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${expired} then ${resetIso}::timestamptz else ${rateLimits.resetAt} end`,
      },
    })
    .returning();

  // Occasional housekeeping of finished windows.
  if (Math.random() < 0.02) await db.delete(rateLimits).where(lt(rateLimits.resetAt, now));

  if (row.count <= limit.max) return open;
  return { blocked: true, retryAfterSeconds: Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000) };
}

export async function clearLimit(db: DB, key: string) {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

/** Lifts every sign-in block at once (after a password reset by the administrator). */
export async function clearLoginLimits(db: DB) {
  await db.delete(rateLimits).where(like(rateLimits.key, "login:%"));
}

export function tooManyAttemptsMessage(status: LimitStatus) {
  const minutes = Math.max(1, Math.ceil(status.retryAfterSeconds / 60));
  return `Trop de tentatives. Par sécurité, réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}
