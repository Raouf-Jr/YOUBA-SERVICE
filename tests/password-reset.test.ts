import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/auth/password";
import { addStaff, createShopWithOwner, findUserByEmail, resetStaffPassword } from "@/lib/data/account";
import { consumeResetToken, createResetToken, findResetTokenUser } from "@/lib/data/password-reset";
import { connect, runMigrations, type Connection } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import { passwordResetMail } from "@/lib/mail-templates";

let conn: Connection;

beforeAll(async () => {
  conn = await connect({ dataDir: "memory://" });
  await runMigrations(conn);
});

afterAll(async () => {
  await conn?.close();
});

async function owner(email: string) {
  const { user, shop } = await createShopWithOwner(conn.db, {
    shopName: "Boutique",
    name: "Awa Traoré",
    email,
    password: "ancienmotdepasse",
    currency: "XOF",
    timezone: "Africa/Abidjan",
  });
  await conn.db.insert(sessions).values({ id: `s-${user.id}`, userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) });
  return { user, shop };
}

describe("password reset links", () => {
  it("works exactly once and signs the user out everywhere", async () => {
    const { user } = await owner("reset@example.com");
    const token = await createResetToken(conn.db, user.id);
    expect(token.length).toBeGreaterThan(40);
    expect(await findResetTokenUser(conn.db, token)).toMatchObject({ email: "reset@example.com" });

    const result = await consumeResetToken(conn.db, token, "nouveaumotdepasse");
    expect(result).toMatchObject({ id: user.id, role: "owner" });
    const updated = (await findUserByEmail(conn.db, "reset@example.com"))!;
    expect(await verifyPassword("nouveaumotdepasse", updated.passwordHash)).toBe(true);
    expect(await conn.db.select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(0);

    // Second use and lookups fail.
    expect(await consumeResetToken(conn.db, token, "encoreunautre")).toBeNull();
    expect(await findResetTokenUser(conn.db, token)).toBeNull();
  });

  it("rejects expired, superseded and unknown tokens", async () => {
    const { user } = await owner("expired@example.com");
    const old = await createResetToken(conn.db, user.id, new Date(Date.now() - 2 * 3_600_000));
    expect(await findResetTokenUser(conn.db, old)).toBeNull();
    expect(await consumeResetToken(conn.db, old, "nouveaumotdepasse")).toBeNull();

    const first = await createResetToken(conn.db, user.id);
    const second = await createResetToken(conn.db, user.id);
    expect(await findResetTokenUser(conn.db, first)).toBeNull();
    expect(await findResetTokenUser(conn.db, second)).not.toBeNull();
    expect(await findResetTokenUser(conn.db, "inexistant")).toBeNull();
    expect(await findResetTokenUser(conn.db, "")).toBeNull();
  });

  it("builds a French e-mail with the link and escapes names", () => {
    const mail = passwordResetMail({ to: "a@b.c", name: "<Awa>", url: "https://x.test/reinitialiser?token=abc", minutes: 60 });
    expect(mail.subject).toContain("mot de passe");
    expect(mail.text).toContain("https://x.test/reinitialiser?token=abc");
    expect(mail.html).toContain("&lt;Awa&gt;");
    expect(mail.html).not.toContain("<Awa>");
  });
});

describe("owner resets an employee's password", () => {
  it("only works on staff of the same shop", async () => {
    const a = await owner("boss-a@example.com");
    const b = await owner("boss-b@example.com");
    await addStaff(conn.db, a.shop.id, { name: "Moussa", email: "moussa@example.com", password: "employe123" });
    const staff = (await findUserByEmail(conn.db, "moussa@example.com"))!;

    expect(await resetStaffPassword(conn.db, b.shop.id, staff.id, "piratage1")).toBeNull();
    expect(await resetStaffPassword(conn.db, a.shop.id, a.user.id, "piratage1")).toBeNull(); // not the owner
    expect(await resetStaffPassword(conn.db, a.shop.id, staff.id, "nouveau123")).toMatchObject({ name: "Moussa" });
    const after = (await findUserByEmail(conn.db, "moussa@example.com"))!;
    expect(await verifyPassword("nouveau123", after.passwordHash)).toBe(true);
  });
});
