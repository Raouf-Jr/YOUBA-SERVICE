import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db";
import type { Settings } from "@/lib/db/schema";
import { readSession } from "./session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof readSession>>> & { shop: Settings };

/** The signed-in user and the shop settings, read once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Everything behind a session is request-time: session expiry and "today" depend on the clock.
  await connection();
  const db = await getDb();
  const [user, shop] = await Promise.all([readSession(db), getSettings(db)]);
  if (!user) return null;
  return { ...user, shop };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}
