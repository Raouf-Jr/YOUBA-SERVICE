"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requireUser } from "@/lib/auth/dal";
import * as products from "@/lib/data/products";
import { getDb } from "@/lib/db";
import { today } from "@/lib/dates";
import { fields, invalid, parseForm, success, type FormState } from "@/lib/forms";

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  name: fields.text("Le nom", 80),
  category: fields.optionalText(40),
  salePrice: fields.amount("Le prix de vente"),
  costPrice: fields.amount("Le prix d'achat", { optional: true }),
  unit: fields.text("L'unité", 20),
  trackStock: fields.checkbox,
  initialStock: fields.amount("Le stock", { optional: true, allowZero: true }),
  lowStockThreshold: fields.amount("Le seuil d'alerte", { optional: true, allowZero: true }),
});

export async function saveProduct(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOwner();
  const { data, errors } = parseForm(productSchema, formData);
  if (!data) return invalid(errors);

  const db = await getDb();
  const input = {
    name: data.name,
    category: data.category,
    salePrice: data.salePrice!,
    costPrice: data.costPrice,
    unit: data.unit,
    trackStock: data.trackStock,
    lowStockThreshold: data.trackStock ? data.lowStockThreshold : null,
  };
  if (data.id) {
    const updated = await products.updateProduct(db, user.shop.id, data.id, input);
    if (!updated) return { ok: false, message: "Produit introuvable." };
  } else {
    await products.createProduct(db, user.shop.id, { ...input, initialStock: data.initialStock ?? 0 }, today(user.shop.timezone));
  }
  revalidatePath("/", "layout");
  return success(data.id ? "Produit mis à jour." : `« ${data.name} » ajouté à votre catalogue.`);
}

export async function archiveProduct(id: string, archived: boolean) {
  const user = await requireOwner();
  await products.setProductArchived(await getDb(), user.shop.id, id, archived);
  revalidatePath("/", "layout");
}

export async function deleteProduct(id: string) {
  const user = await requireOwner();
  await products.deleteProduct(await getDb(), user.shop.id, id);
  revalidatePath("/", "layout");
}

const restockSchema = z.object({
  productId: z.string().uuid("Produit invalide"),
  date: fields.date,
  quantity: fields.amount("La quantité"),
  unitCost: fields.amount("Le prix d'achat", { optional: true }),
  recordExpense: fields.checkbox,
  note: fields.optionalText(200),
});

export async function restock(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { data, errors } = parseForm(restockSchema, formData);
  if (!data) return invalid(errors);
  if (data.recordExpense && !data.unitCost) {
    return invalid({ unitCost: "Indiquez le prix d'achat pour l'enregistrer en dépense." });
  }
  await products.restockProduct(await getDb(), user.shop.id, {
    productId: data.productId,
    date: data.date,
    quantity: data.quantity!,
    unitCost: data.unitCost,
    recordExpense: data.recordExpense,
    note: data.note,
    userId: user.id,
  });
  revalidatePath("/", "layout");
  return success("Stock réapprovisionné.");
}

const adjustSchema = z.object({
  productId: z.string().uuid("Produit invalide"),
  counted: fields.amount("Le stock compté", { allowZero: true }),
  note: fields.optionalText(200),
});

export async function adjustStock(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { data, errors } = parseForm(adjustSchema, formData);
  if (!data) return invalid(errors);
  await products.adjustStock(await getDb(), user.shop.id, {
    productId: data.productId,
    date: today(user.shop.timezone),
    counted: data.counted!,
    note: data.note,
  });
  revalidatePath("/", "layout");
  return success("Inventaire enregistré.");
}
