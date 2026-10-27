import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import type { DB } from "@/lib/db";
import { sessions, shops, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "youba_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(db: DB, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  // Housekeeping: drop this user's expired sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function readSession(db: DB) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
      shop: {
        id: shops.id,
        name: shops.name,
        currency: shops.currency,
        timezone: shops.timezone,
        monthlyGoal: shops.monthlyGoal,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(shops, eq(shops.id, users.shopId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function destroySession(db: DB) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** Signs a user out everywhere else, e.g. after a password change. */
export async function destroyOtherSessions(db: DB, userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db
    .delete(sessions)
    .where(token ? and(eq(sessions.userId, userId), ne(sessions.id, hashToken(token))) : eq(sessions.userId, userId));
}
