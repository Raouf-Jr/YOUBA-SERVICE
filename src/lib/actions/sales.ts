"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { PAYMENT_METHODS } from "@/lib/constants";
import * as sales from "@/lib/data/sales";
import { getDb } from "@/lib/db";
import { isISODate, today } from "@/lib/dates";
import { parseAmount, success, type FormState } from "@/lib/forms";

/**
 * The daily sales form posts `qty:<productId>` and `price:<productId>` pairs,
 * one per product row; rows left empty are ignored.
 */
export async function recordSales(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const date = String(formData.get("date") ?? "");
  if (!isISODate(date)) return { ok: false, message: "Date invalide." };
  const method = String(formData.get("paymentMethod") ?? "especes");
  const paymentMethod = PAYMENT_METHODS.some((m) => m.value === method) ? method : "especes";

  const lines: sales.SaleLine[] = [];
  const errors: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty:")) continue;
    const productId = key.slice(4);
    const quantity = parseAmount(value);
    if (quantity == null || quantity === 0) continue;
    const unitPrice = parseAmount(formData.get(`price:${productId}`));
    if (Number.isNaN(quantity) || quantity < 0) {
      errors[key] = "Quantité invalide";
      continue;
    }
    if (unitPrice == null || Number.isNaN(unitPrice) || unitPrice < 0) {
      errors[`price:${productId}`] = "Prix invalide";
      continue;
    }
    lines.push({ productId, quantity, unitPrice });
  }
  if (Object.keys(errors).length) return { ok: false, errors, message: "Vérifiez les quantités et les prix." };
  if (lines.length === 0) return { ok: false, message: "Indiquez au moins une quantité vendue." };

  const count = await sales.recordSales(await getDb(), user.shop.id, {
    date,
    paymentMethod,
    userId: user.id,
    lines,
  });
  revalidatePath("/", "layout");
  return success(count > 1 ? `${count} ventes enregistrées.` : "Vente enregistrée.");
}

/** Owners can cancel any sale; employees only their own, on the same day. */
export async function deleteSale(id: string) {
  const user = await requireUser();
  const db = await getDb();
  if (user.role !== "owner") {
    const sale = await sales.getSale(db, user.shop.id, id);
    if (!sale || sale.createdById !== user.id || sale.date !== today(user.shop.timezone)) return;
  }
  await sales.deleteSale(db, user.shop.id, id);
  revalidatePath("/", "layout");
}
