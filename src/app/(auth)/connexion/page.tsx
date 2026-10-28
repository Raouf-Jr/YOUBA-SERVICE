import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { ensureFirstUser, hasUsers } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <Card className="p-6 shadow-pop sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Bonjour 👋</h1>
      <p className="mt-1 mb-6 text-[0.9375rem] text-ink-2">Entrez votre identifiant et votre mot de passe.</p>
      <Suspense>
        <SetupHint />
      </Suspense>
      <LoginForm />
    </Card>
  );
}

/** Only shown on a fresh install where nobody set the first account up yet. */
async function SetupHint() {
  await connection();
  const db = await getDb();
  await ensureFirstUser(db);
  if (await hasUsers(db)) return null;
  return (
    <p className="mb-5 rounded-xl bg-warn-soft px-3.5 py-3 text-sm text-warn">
      Aucun compte n&apos;existe encore. Sur l&apos;hébergeur, ajoutez les variables <code>ADMIN_USERNAME</code> et{" "}
      <code>ADMIN_PASSWORD</code> (8 caractères au moins), puis redéployez.
    </p>
  );
}
