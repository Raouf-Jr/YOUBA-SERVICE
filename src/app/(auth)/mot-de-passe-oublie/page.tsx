import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <Card className="p-6 shadow-pop sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Mot de passe oublié</h1>
      <p className="mt-1 mb-6 text-sm text-ink-2">
        Indiquez l&apos;adresse e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.
      </p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-ink-2">
        <Link href="/connexion" className="font-medium text-accent-text underline-offset-4 hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </Card>
  );
}
