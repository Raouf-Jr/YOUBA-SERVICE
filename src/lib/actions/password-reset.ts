"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAppUrl } from "@/lib/app-url";
import { createSession } from "@/lib/auth/session";
import { clientIp } from "@/lib/client-ip";
import { findUserByEmail, normalizeEmail } from "@/lib/data/account";
import { consumeResetToken, createResetToken, RESET_TOKEN_MINUTES } from "@/lib/data/password-reset";
import { hitLimit, LIMITS, tooManyAttemptsMessage } from "@/lib/data/rate-limit";
import { getDb } from "@/lib/db";
import { invalid, parseForm, type FormState } from "@/lib/forms";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { passwordResetMail } from "@/lib/mail-templates";

const requestSchema = z.object({ email: z.email("Adresse e-mail invalide").max(160) });

/** Always answers the same way, so the form can't be used to find out who has an account. */
export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const { data, errors } = parseForm(requestSchema, formData);
  if (!data) return invalid(errors);

  if (process.env.NODE_ENV === "production" && !isMailConfigured()) {
    return {
      ok: false,
      message:
        "L'envoi d'e-mails n'est pas encore activé sur ce site. Demandez au propriétaire de la boutique (ou à l'administrateur) de réinitialiser votre mot de passe.",
    };
  }

  const db = await getDb();
  const byIp = await hitLimit(db, `reset:ip:${await clientIp()}`, LIMITS.resetPerIp);
  if (byIp.blocked) return { ok: false, message: tooManyAttemptsMessage(byIp) };
  // Per address, extra requests are silently dropped (same answer, no new e-mail).
  const byEmail = await hitLimit(db, `reset:email:${normalizeEmail(data.email)}`, LIMITS.resetPerEmail);

  const user = byEmail.blocked ? null : await findUserByEmail(db, data.email);
  if (user) {
    const token = await createResetToken(db, user.id);
    const url = `${await getAppUrl()}/reinitialiser?token=${token}`;
    try {
      await sendMail(passwordResetMail({ to: user.email, name: user.name, url, minutes: RESET_TOKEN_MINUTES }));
    } catch (error) {
      console.error("Échec d'envoi de l'e-mail de réinitialisation", error);
      return { ok: false, message: "L'e-mail n'a pas pu être envoyé. Réessayez dans quelques minutes." };
    }
  }
  return {
    ok: true,
    stamp: Date.now(),
    message: `Si un compte existe pour ${data.email}, un e-mail avec un lien vient d'être envoyé. Il est valable ${RESET_TOKEN_MINUTES} minutes. Pensez à regarder dans les spams.`,
  };
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Au moins 8 caractères").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas" });

export async function resetPassword(_: FormState, formData: FormData): Promise<FormState> {
  const { data, errors } = parseForm(resetSchema, formData);
  if (!data) return invalid(errors);

  const db = await getDb();
  const user = await consumeResetToken(db, data.token, data.password);
  if (!user) {
    return { ok: false, message: "Ce lien n'est plus valable. Demandez un nouveau lien de réinitialisation." };
  }
  await createSession(db, user.id);
  redirect(user.role === "owner" ? "/tableau-de-bord" : "/ventes");
}
