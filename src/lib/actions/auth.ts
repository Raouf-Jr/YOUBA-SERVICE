"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { clientIp } from "@/lib/client-ip";
import { checkLimit, clearLimit, hitLimit, LIMITS, tooManyAttemptsMessage } from "@/lib/data/rate-limit";
import { ensureFirstUser, findUserByUsername, normalizeUsername } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { invalid, parseForm, type FormState } from "@/lib/forms";

// Unknown accounts still pay for a hash check, so response time doesn't reveal which accounts exist.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

const loginSchema = z.object({
  username: z.string().trim().min(1, "Identifiant obligatoire").max(60),
  password: z.string().min(1, "Mot de passe obligatoire").max(200),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const { data, errors } = parseForm(loginSchema, formData);
  if (!data) return invalid(errors);

  const db = await getDb();
  await ensureFirstUser(db);

  // Failed attempts are counted per account and per IP; a success clears the account's counter.
  const accountKey = `login:user:${normalizeUsername(data.username)}`;
  const ipKey = `login:ip:${await clientIp()}`;
  const blocked = (
    await Promise.all([checkLimit(db, accountKey, LIMITS.loginPerAccount), checkLimit(db, ipKey, LIMITS.loginPerIp)])
  ).find((s) => s.blocked);
  if (blocked) return { ok: false, message: tooManyAttemptsMessage(blocked) };

  const user = await findUserByUsername(db, data.username);
  const valid = await verifyPassword(data.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    await Promise.all([hitLimit(db, accountKey, LIMITS.loginPerAccount), hitLimit(db, ipKey, LIMITS.loginPerIp)]);
    return { ok: false, message: "Identifiant ou mot de passe incorrect." };
  }
  await clearLimit(db, accountKey);
  await createSession(db, user.id);
  redirect("/saisie");
}

export async function logout() {
  await destroySession(await getDb());
  redirect("/connexion");
}
