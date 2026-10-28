import { count, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import type { DB } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";

export const normalizeUsername = (username: string) => username.trim().toLowerCase();

export async function findUserByUsername(db: DB, username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, normalizeUsername(username))).limit(1);
  return user ?? null;
}

export async function createUser(db: DB, input: { username: string; password: string; name?: string }) {
  const username = normalizeUsername(input.username);
  const name = input.name?.trim() || username.charAt(0).toUpperCase() + username.slice(1);
  const [user] = await db
    .insert(users)
    .values({ username, name, passwordHash: await hashPassword(input.password) })
    .returning();
  return user;
}

export async function hasUsers(db: DB) {
  const [{ total }] = await db.select({ total: count() }).from(users);
  return total > 0;
}

/**
 * The very first account comes from ADMIN_USERNAME / ADMIN_PASSWORD (set on the host).
 * In development only, it defaults to youba / youba1234.
 */
export async function ensureFirstUser(db: DB, env: NodeJS.ProcessEnv = process.env) {
  if (await hasUsers(db)) return;
  const dev = env.NODE_ENV !== "production";
  const username = env.ADMIN_USERNAME || (dev ? "youba" : "");
  const password = env.ADMIN_PASSWORD || (dev ? "youba1234" : "");
  if (!username || password.length < 8) return;
  await createUser(db, { username, password }).catch(() => {
    // Two first logins at the same time: the other one created it.
  });
}

export async function getPasswordHash(db: DB, userId: string) {
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.hash ?? null;
}

export async function setPassword(db: DB, userId: string, password: string) {
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId));
}

export async function signOutEverywhere(db: DB, userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
