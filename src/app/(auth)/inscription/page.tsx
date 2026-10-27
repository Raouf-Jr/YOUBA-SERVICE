import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer ma boutique" };

export default function SignupPage() {
  return (
    <Card className="p-6 shadow-pop sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Créez votre boutique</h1>
      <p className="mt-1 mb-6 text-sm text-ink-2">Gratuit, en moins d&apos;une minute. Aucune carte bancaire.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-ink-2">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-medium text-accent-text underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </Card>
  );
}
