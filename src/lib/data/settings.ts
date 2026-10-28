import { eq } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { settings, type Settings } from "@/lib/db/schema";

const DEFAULTS: Settings = { id: 1, shopName: "YOUBA SERVICE", currency: "XOF", timezone: "Africa/Lome" };

export async function getSettings(db: DB): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return row ?? DEFAULTS;
}

export async function updateSettings(db: DB, input: { shopName: string; currency: string }) {
  await db
    .insert(settings)
    .values({ id: 1, ...input })
    .onConflictDoUpdate({ target: settings.id, set: input });
}
