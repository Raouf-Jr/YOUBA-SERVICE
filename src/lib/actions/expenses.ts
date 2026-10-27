"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requireUser } from "@/lib/auth/dal";
import * as data from "@/lib/data/expenses";
import { getDb } from "@/lib/db";
import { fields, invalid, parseForm, success, type FormState } from "@/lib/forms";

const id = z.string().uuid().optional().or(z.literal("").transform(() => undefined));

const expenseSchema = z.object({
  id,
  date: fields.date,
  category: fields.text("La catégorie", 40),
  amount: fields.amount("Le montant"),
  description: fields.optionalText(200),
});

export async function saveExpense(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { data: input, errors } = parseForm(expenseSchema, formData);
  if (!input) return invalid(errors);
  const db = await getDb();
  const values = { date: input.date, category: input.category, amount: input.amount!, description: input.description };
  if (input.id) {
    if (user.role !== "owner") return { ok: false, message: "Seul le propriétaire peut modifier une dépense." };
    await data.updateExpense(db, user.shop.id, input.id, values);
  } else {
    await data.addExpense(db, user.shop.id, user.id, values);
  }
  revalidatePath("/", "layout");
  return success(input.id ? "Dépense modifiée." : "Dépense enregistrée.");
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
