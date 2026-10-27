import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import type { DB } from "@/lib/db/client";
import { passwordResetTokens, sessions, users } from "@/lib/db/schema";

export const RESET_TOKEN_MINUTES = 60;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Issues a fresh one-time token for the user; any previous link stops working. */
export async function createResetToken(db: DB, userId: string, now = new Date()): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx
      .delete(passwordResetTokens)
      .where(or(eq(passwordResetTokens.userId, userId), lt(passwordResetTokens.expiresAt, now)));
    await tx.insert(passwordResetTokens).values({
      id: hashToken(token),
      userId,
      expiresAt: new Date(now.getTime() + RESET_TOKEN_MINUTES * 60_000),
    });
  });
  return token;
}

/** The account a still-valid token belongs to, or null. */
export async function findResetTokenUser(db: DB, token: string, now = new Date()) {
  if (!token) return null;
  const [row] = await db
    .select({ userId: users.id, email: users.email, name: users.name })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(
      and(
        eq(passwordResetTokens.id, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Uses the token (atomically, so a link works only once), sets the new password
 * and signs the account out of every device. Returns the user, or null if the link is invalid.
 */
export async function consumeResetToken(db: DB, token: string, newPassword: string, now = new Date()) {
  if (!token) return null;
  const passwordHash = await hashPassword(newPassword);
  return db.transaction(async (tx) => {
    const [used] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.id, hashToken(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    if (!used) return null;
    const [user] = await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, used.userId))
      .returning({ id: users.id, role: users.role });
    await tx.delete(sessions).where(eq(sessions.userId, used.userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, used.userId));
    return user ?? null;
  });
}
