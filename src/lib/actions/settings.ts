"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { verifyPassword } from "@/lib/auth/password";
import { destroyOtherSessions } from "@/lib/auth/session";
import { CURRENCIES } from "@/lib/constants";
import { checkLimit, clearLimit, hitLimit, LIMITS, tooManyAttemptsMessage } from "@/lib/data/rate-limit";
import { updateSettings } from "@/lib/data/settings";
import { getPasswordHash, setPassword } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { fields, invalid, parseForm, success, type FormState } from "@/lib/forms";

const shopSchema = z.object({
  shopName: fields.text("Le nom", 60),
  currency: z.enum(CURRENCIES.map((c) => c.value) as [string, ...string[]], "Devise invalide"),
});

export async function saveShop(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { data, errors } = parseForm(shopSchema, formData);
  if (!data) return invalid(errors);
  await updateSettings(await getDb(), data);
  revalidatePath("/", "layout");
  return success("Enregistré.");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mot de passe actuel obligatoire"),
    next: z.string().min(8, "Au moins 8 caractères").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Les deux mots de passe ne sont pas identiques" });

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { data, errors } = parseForm(passwordSchema, formData);
  if (!data) return invalid(errors);
  const db = await getDb();
  const key = `password-change:${user.id}`;
  const blocked = await checkLimit(db, key, LIMITS.passwordChangePerUser);
  if (blocked.blocked) return { ok: false, message: tooManyAttemptsMessage(blocked) };
  const hash = await getPasswordHash(db, user.id);
  if (!hash || !(await verifyPassword(data.current, hash))) {
    await hitLimit(db, key, LIMITS.passwordChangePerUser);
    return invalid({ current: "Mot de passe actuel incorrect" });
  }
  await clearLimit(db, key);
  await setPassword(db, user.id, data.next);
  await destroyOtherSessions(db, user.id);
  return success("Mot de passe changé.");
}
