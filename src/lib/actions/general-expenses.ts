"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import * as data from "@/lib/data/general-expenses";
import { getDb } from "@/lib/db";
import { addDays, today } from "@/lib/dates";
import { fields, invalid, parseForm, success, type FormState } from "@/lib/forms";

const schema = z.object({
  amount: fields.amount("Le montant"),
  label: fields.text("Le motif", 80),
  date: fields.date,
});

/** Money taken from the overall profit (not tied to one product). */
export async function addGeneralExpense(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { data: input, errors } = parseForm(schema, formData);
  if (!input) return invalid(errors);
  if (input.date > addDays(today(user.shop.timezone), 1)) return invalid({ date: "La date est dans le futur" });
  await data.addGeneralExpense(await getDb(), { date: input.date, amount: input.amount!, label: input.label });
  revalidatePath("/", "layout");
  return success("Dépense enregistrée.");
}

export async function deleteGeneralExpense(id: string) {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return;
  await data.deleteGeneralExpense(await getDb(), id);
  revalidatePath("/", "layout");
}
