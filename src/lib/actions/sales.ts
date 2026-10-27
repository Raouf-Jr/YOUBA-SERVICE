"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth/dal";
import { PAYMENT_METHODS } from "@/lib/constants";
import * as sales from "@/lib/data/sales";
import { getDb } from "@/lib/db";
import { addDays, today } from "@/lib/dates";
import { fields } from "@/lib/forms";
import type { CheckoutPayload, SyncResult } from "@/lib/offline/types";

const checkoutSchema = z.object({
  checkoutId: z.uuid(),
  shopId: z.uuid(),
  date: fields.date,
  paymentMethod: z.enum(PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]]),
  lines: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().positive().max(1_000_000),
        unitPrice: z.number().min(0).max(1e11),
      }),
    )
    .min(1)
    .max(500),
});

/**
 * Records one checkout from the sales screen. Called right away when online, or later by the
 * offline outbox: the checkout id makes a second delivery harmless.
 */
export async function recordCheckout(payload: CheckoutPayload): Promise<SyncResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "auth", message: "Session expirée : reconnectez-vous." };
  if (payload?.shopId !== user.shop.id) return { ok: false, reason: "shop", message: "Saisie d'un autre compte." };
  const parsed = checkoutSchema.safeParse(payload);
  // Allow one day of clock difference between the phone and the server.
  if (!parsed.success || parsed.data.date > addDays(today(user.shop.timezone), 1)) {
    return { ok: false, reason: "invalid", message: "Vente invalide (date, quantité ou prix)." };
  }
  const { checkoutId, date, paymentMethod, lines } = parsed.data;
  const count = await sales.recordSales(await getDb(), user.shop.id, { checkoutId, date, paymentMethod, userId: user.id, lines });
  if (count > 0) revalidatePath("/", "layout");
  return { ok: true, added: count > 0 };
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
