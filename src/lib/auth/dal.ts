import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { readSession } from "./session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof readSession>>>["user"] & {
  shop: NonNullable<Awaited<ReturnType<typeof readSession>>>["shop"];
};

/** The signed-in user and their shop, read once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Everything behind a session is request-time: session expiry and "today" depend on the clock.
  await connection();
  const db = await getDb();
  const session = await readSession(db);
  if (!session) return null;
  return { ...session.user, shop: session.shop };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

/** Profits, reports and settings are for the shop owner only. */
export async function requireOwner(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/ventes");
  return user;
}
