"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requireUser } from "@/lib/auth/dal";
import { verifyPassword } from "@/lib/auth/password";
import { destroyOtherSessions } from "@/lib/auth/session";
import { CURRENCIES } from "@/lib/constants";
import * as account from "@/lib/data/account";
import { getDb } from "@/lib/db";
import { fields, invalid, parseForm, success, type FormState } from "@/lib/forms";

const shopSchema = z.object({
  name: fields.text("Le nom de la boutique", 80),
  currency: z.enum(CURRENCIES.map((c) => c.value) as [string, ...string[]], "Devise invalide"),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Fuseau horaire invalide"),
  monthlyGoal: fields.amount("L'objectif", { optional: true }),
});

export async function saveShop(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOwner();
  const { data, errors } = parseForm(shopSchema, formData);
  if (!data) return invalid(errors);
  await account.updateShop(await getDb(), user.shop.id, data);
  revalidatePath("/", "layout");
  return success("Paramètres enregistrés.");
}

const profileSchema = z.object({ name: fields.text("Votre nom", 80) });

export async function saveProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { data, errors } = parseForm(profileSchema, formData);
  if (!data) return invalid(errors);
  await account.updateProfile(await getDb(), user.id, data);
  revalidatePath("/", "layout");
  return success("Profil mis à jour.");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mot de passe actuel obligatoire"),
    next: z.string().min(8, "Au moins 8 caractères").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas" });

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { data, errors } = parseForm(passwordSchema, formData);
  if (!data) return invalid(errors);
  const db = await getDb();
  const hash = await account.getPasswordHash(db, user.id);
  if (!hash || !(await verifyPassword(data.current, hash))) {
    return invalid({ current: "Mot de passe actuel incorrect" });
  }
  await account.setPassword(db, user.id, data.next);
  await destroyOtherSessions(db, user.id);
  return success("Mot de passe modifié. Vos autres appareils ont été déconnectés.");
}

const staffSchema = z.object({
  name: fields.text("Le nom", 80),
  email: z.email("Adresse e-mail invalide").max(160),
  password: z.string().min(8, "Au moins 8 caractères").max(200),
});

export async function addStaff(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOwner();
  const { data, errors } = parseForm(staffSchema, formData);
  if (!data) return invalid(errors);
  const db = await getDb();
  if (await account.findUserByEmail(db, data.email)) {
    return invalid({ email: "Cette adresse est déjà utilisée." });
  }
  await account.addStaff(db, user.shop.id, data);
  revalidatePath("/parametres");
  return success(`Compte créé pour ${data.name}. Communiquez-lui son e-mail et son mot de passe.`);
}

const staffPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8, "Au moins 8 caractères").max(200),
});

export async function resetStaffPassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOwner();
  const { data, errors } = parseForm(staffPasswordSchema, formData);
  if (!data) return invalid(errors);
  const staff = await account.resetStaffPassword(await getDb(), user.shop.id, data.userId, data.password);
  if (!staff) return { ok: false, message: "Compte introuvable." };
  return success(`Nouveau mot de passe enregistré pour ${staff.name}. Communiquez-le-lui.`);
}

export async function removeStaff(userId: string) {
  const user = await requireOwner();
  await account.removeStaff(await getDb(), user.shop.id, userId);
  revalidatePath("/parametres");
}
