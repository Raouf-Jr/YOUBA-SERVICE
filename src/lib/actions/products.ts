"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import * as products from "@/lib/data/products";
import { getDb } from "@/lib/db";
import { fields, invalid, parseForm, success, type FormState } from "@/lib/forms";

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || fields.date.safeParse(v).success, "Date invalide");

const productSchema = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  name: fields.text("Le nom", 60),
  investment: fields.amount("L'investissement", { optional: true, allowZero: true }),
  startDate: optionalDate,
  openingDate: optionalDate,
  openingRevenue: fields.amount("Le total des recettes", { optional: true, allowZero: true }),
  openingExpense: fields.amount("Le total des dépenses", { optional: true, allowZero: true }),
});

export async function saveProduct(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { data, errors } = parseForm(productSchema, formData);
  if (!data) return invalid(errors);
  const hasOpening = (data.openingRevenue ?? 0) > 0 || (data.openingExpense ?? 0) > 0;
  if (hasOpening && !data.openingDate) return invalid({ openingDate: "Indiquez à quelle date ces totaux ont été arrêtés" });

  const input = {
    name: data.name,
    investment: data.investment ?? 0,
    startDate: data.startDate,
    openingDate: hasOpening ? data.openingDate : null,
    openingRevenue: hasOpening ? (data.openingRevenue ?? 0) : 0,
    openingExpense: hasOpening ? (data.openingExpense ?? 0) : 0,
  };
  const db = await getDb();
  if (data.id) {
    const updated = await products.updateProduct(db, data.id, input);
    if (!updated) return { ok: false, message: "Produit introuvable." };
    revalidatePath("/", "layout");
    return success("Modifications enregistrées.");
  }
  const created = await products.createProduct(db, input);
  revalidatePath("/", "layout");
  redirect(`/produits/${created.id}?nouveau=1`);
}

export async function archiveProduct(id: string, archived: boolean) {
  await requireUser();
  await products.setArchived(await getDb(), id, archived);
  revalidatePath("/", "layout");
}

export async function deleteProduct(id: string) {
  await requireUser();
  await products.deleteProduct(await getDb(), id);
  revalidatePath("/", "layout");
  redirect("/produits");
}
