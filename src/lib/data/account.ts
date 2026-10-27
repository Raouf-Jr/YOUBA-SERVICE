import { and, asc, eq, ne } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import type { DB } from "@/lib/db/client";
import { sessions, shops, users } from "@/lib/db/schema";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function findUserByEmail(db: DB, email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return user ?? null;
}

export async function createShopWithOwner(
  db: DB,
  input: { shopName: string; name: string; email: string; password: string; currency: string; timezone: string },
) {
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [shop] = await tx
      .insert(shops)
      .values({ name: input.shopName, currency: input.currency, timezone: input.timezone })
      .returning();
    const [user] = await tx
      .insert(users)
      .values({ shopId: shop.id, name: input.name, email: normalizeEmail(input.email), passwordHash, role: "owner" })
      .returning();
    return { shop, user };
  });
}

export async function updateShop(
  db: DB,
  shopId: string,
  input: { name: string; currency: string; timezone: string; monthlyGoal: number | null },
) {
  await db.update(shops).set(input).where(eq(shops.id, shopId));
}

export async function getPasswordHash(db: DB, userId: string) {
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.hash ?? null;
}

export async function setPassword(db: DB, userId: string, password: string) {
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId));
}

export async function updateProfile(db: DB, userId: string, input: { name: string }) {
  await db.update(users).set(input).where(eq(users.id, userId));
}

export function listTeam(db: DB, shopId: string) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.shopId, shopId))
    .orderBy(asc(users.role), asc(users.createdAt));
}

export async function addStaff(db: DB, shopId: string, input: { name: string; email: string; password: string }) {
  await db.insert(users).values({
    shopId,
    name: input.name,
    email: normalizeEmail(input.email),
    passwordHash: await hashPassword(input.password),
    role: "staff",
  });
}

/** Sets a staff member's password (chosen by the owner) and signs them out everywhere. */
export async function resetStaffPassword(db: DB, shopId: string, userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ passwordHash })
      .where(and(eq(users.shopId, shopId), eq(users.id, userId), eq(users.role, "staff")))
      .returning({ id: users.id, name: users.name });
    if (user) await tx.delete(sessions).where(eq(sessions.userId, user.id));
    return user ?? null;
  });
}

/** Owners can only remove staff accounts, never themselves. */
export async function removeStaff(db: DB, shopId: string, userId: string) {
  await db.delete(users).where(and(eq(users.shopId, shopId), eq(users.id, userId), ne(users.role, "owner")));
}
