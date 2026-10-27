"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { CURRENCIES } from "@/lib/constants";
import { clientIp } from "@/lib/client-ip";
import { createShopWithOwner, findUserByEmail, normalizeEmail } from "@/lib/data/account";
import { checkLimit, clearLimit, hitLimit, LIMITS, tooManyAttemptsMessage } from "@/lib/data/rate-limit";
import { getDb } from "@/lib/db";
import { fields, invalid, parseForm, type FormState } from "@/lib/forms";

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const signupSchema = z.object({
  shopName: fields.text("Le nom de la boutique", 80),
  name: fields.text("Votre nom", 80),
  email: z.email("Adresse e-mail invalide").max(160),
  password: z.string().min(8, "Au moins 8 caractères").max(200),
  currency: z.enum(CURRENCIES.map((c) => c.value) as [string, ...string[]], "Devise invalide"),
  timezone: z
    .string()
    .optional()
    .transform((tz) => (tz && isTimeZone(tz) ? tz : "Africa/Abidjan")),
});

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const { data, errors } = parseForm(signupSchema, formData);
  if (!data) return invalid(errors);

  const db = await getDb();
  const limit = await hitLimit(db, `signup:ip:${await clientIp()}`, LIMITS.signupPerIp);
  if (limit.blocked) return { ok: false, message: tooManyAttemptsMessage(limit) };
  if (await findUserByEmail(db, data.email)) {
    return invalid({ email: "Un compte existe déjà avec cette adresse." });
  }
  const { user } = await createShopWithOwner(db, data);
  await createSession(db, user.id);
  redirect("/tableau-de-bord");
}

// Unknown e-mails still pay for a hash check, so response time doesn't reveal which accounts exist.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

const loginSchema = z.object({
  email: z.string().trim().min(1, "Adresse e-mail obligatoire"),
  password: z.string().min(1, "Mot de passe obligatoire"),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const { data, errors } = parseForm(loginSchema, formData);
  if (!data) return invalid(errors);

  const db = await getDb();
  // Failed attempts are counted per account and per IP; a success clears the account's counter.
  const emailKey = `login:email:${normalizeEmail(data.email)}`;
  const ipKey = `login:ip:${await clientIp()}`;
  const blocked = (
    await Promise.all([checkLimit(db, emailKey, LIMITS.loginPerEmail), checkLimit(db, ipKey, LIMITS.loginPerIp)])
  ).find((s) => s.blocked);
  if (blocked) return { ok: false, message: tooManyAttemptsMessage(blocked) };

  const user = await findUserByEmail(db, data.email);
  const valid = await verifyPassword(data.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    await Promise.all([hitLimit(db, emailKey, LIMITS.loginPerEmail), hitLimit(db, ipKey, LIMITS.loginPerIp)]);
    return { ok: false, message: "E-mail ou mot de passe incorrect." };
  }
  await clearLimit(db, emailKey);
  await createSession(db, user.id);
  redirect(user.role === "owner" ? "/tableau-de-bord" : "/ventes");
}

export async function logout() {
  await destroySession(await getDb());
  redirect("/connexion");
}
