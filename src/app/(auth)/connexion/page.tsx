import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <Card className="p-6 shadow-pop sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Bon retour 👋</h1>
      <p className="mt-1 mb-6 text-sm text-ink-2">Connectez-vous pour suivre votre boutique.</p>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-ink-2">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-accent-text underline-offset-4 hover:underline">
          Créer ma boutique
        </Link>
      </p>
    </Card>
  );
}
