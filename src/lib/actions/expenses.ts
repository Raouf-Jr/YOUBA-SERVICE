"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireOwner } from "@/lib/auth/dal";
import * as data from "@/lib/data/expenses";
import { getDb } from "@/lib/db";
import { addDays, today } from "@/lib/dates";
import { fields, invalid, parseForm, success, type FormState } from "@/lib/forms";
import type { ExpensePayload, SyncResult } from "@/lib/offline/types";

const id = z.string().uuid().optional().or(z.literal("").transform(() => undefined));

const expenseSchema = z.object({
  id,
  date: fields.date,
  category: fields.text("La catégorie", 40),
  amount: fields.amount("Le montant"),
  description: fields.optionalText(200),
});

/** Edits an existing expense (new ones go through recordExpense). */
export async function saveExpense(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOwner();
  const { data: input, errors } = parseForm(expenseSchema, formData);
  if (!input) return invalid(errors);
  if (!input.id) return { ok: false, message: "Dépense introuvable." };
  const values = { date: input.date, category: input.category, amount: input.amount!, description: input.description };
  await data.updateExpense(await getDb(), user.shop.id, input.id, values);
  revalidatePath("/", "layout");
  return success("Dépense modifiée.");
}

const expensePayloadSchema = z.object({
  clientRef: z.uuid(),
  shopId: z.uuid(),
  date: fields.date,
  category: z.string().trim().min(1).max(40),
  amount: z.number().positive().max(1e11),
  description: z.string().trim().max(200).nullable(),
});

/** New expense from the expenses screen, directly or through the offline outbox (idempotent). */
export async function recordExpense(payload: ExpensePayload): Promise<SyncResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "auth", message: "Session expirée : reconnectez-vous." };
  if (payload?.shopId !== user.shop.id) return { ok: false, reason: "shop", message: "Saisie d'un autre compte." };
  const parsed = expensePayloadSchema.safeParse(payload);
  if (!parsed.success || parsed.data.date > addDays(today(user.shop.timezone), 1)) {
    return { ok: false, reason: "invalid", message: "Dépense invalide (date ou montant)." };
  }
  const { clientRef, date, category, amount, description } = parsed.data;
  const added = await data.addExpense(await getDb(), user.shop.id, user.id, {
    clientRef,
    date,
    category,
    amount,
    description: description || null,
  });
  if (added) revalidatePath("/", "layout");
  return { ok: true, added };
}

export async function deleteExpense(expenseId: string) {
  const user = await requireOwner();
  await data.deleteExpense(await getDb(), user.shop.id, expenseId);
  revalidatePath("/", "layout");
}

const investmentSchema = z.object({
  id,
  date: fields.date,
  label: fields.text("Le libellé", 80),
  category: fields.text("La catégorie", 40),
  amount: fields.amount("Le montant"),
});

export async function saveInvestment(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOwner();
  const { data: input, errors } = parseForm(investmentSchema, formData);
  if (!input) return invalid(errors);
  const db = await getDb();
  const values = { date: input.date, label: input.label, category: input.category, amount: input.amount! };
  if (input.id) await data.updateInvestment(db, user.shop.id, input.id, values);
  else await data.addInvestment(db, user.shop.id, values);
  revalidatePath("/", "layout");
  return success(input.id ? "Investissement modifié." : "Investissement enregistré.");
}

export async function deleteInvestment(investmentId: string) {
  const user = await requireOwner();
  await data.deleteInvestment(await getDb(), user.shop.id, investmentId);
  revalidatePath("/", "layout");
}
