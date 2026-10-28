"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { saveDay as saveDayData } from "@/lib/data/entries";
import { getDb } from "@/lib/db";
import { addDays, today } from "@/lib/dates";
import { fields } from "@/lib/forms";
import type { DayPayload, SyncResult } from "@/lib/offline/types";

const amount = z.number().min(0).max(1e11);

const daySchema = z.object({
  date: fields.date,
  lines: z
    .array(
      z.object({
        productId: z.uuid(),
        revenue: amount,
        expense: amount,
        note: z.string().trim().max(300).nullable(),
      }),
    )
    .min(1)
    .max(500),
});

/**
 * Saves a day's figures. Called right away when online, or later from the device's queue:
 * values are set (not added), so sending the same day twice changes nothing.
 */
export async function saveDay(payload: DayPayload): Promise<SyncResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "auth", message: "Session expirée : reconnectez-vous." };
  const parsed = daySchema.safeParse(payload);
  // Allow one day of clock difference between the phone and the server.
  if (!parsed.success || parsed.data.date > addDays(today(user.shop.timezone), 1)) {
    return { ok: false, reason: "invalid", message: "Journée invalide (date ou montants)." };
  }
  await saveDayData(
    await getDb(),
    parsed.data.date,
    parsed.data.lines.map((l) => ({ ...l, note: l.note || null })),
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
