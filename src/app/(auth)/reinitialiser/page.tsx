import { LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Bone } from "@/components/skeleton";
import { Card, LinkButton } from "@/components/ui";
import { findResetTokenUser } from "@/lib/data/password-reset";
import { getDb } from "@/lib/db";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  // The token is in the URL: never send it to another site.
  referrer: "no-referrer",
  robots: { index: false },
};

export default function ResetPasswordPage({ searchParams }: PageProps<"/reinitialiser">) {
  return (
    <Card className="p-6 shadow-pop sm:p-8">
      <Suspense
        fallback={
          <div className="animate-pulse">
            <Bone className="mb-3 h-6 w-48" />
            <Bone className="mb-6 h-4 w-64" />
            <Bone className="h-40" />
          </div>
        }
      >
        <Reset searchParams={searchParams} />
      </Suspense>
    </Card>
  );
}

async function Reset({ searchParams }: { searchParams: PageProps<"/reinitialiser">["searchParams"] }) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const user = value ? await findResetTokenUser(await getDb(), value) : null;

  if (!user) {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-warn-soft text-warn">
          <LinkIcon className="size-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Lien invalide ou expiré</h1>
        <p className="mt-2 text-sm text-ink-2">
          Ce lien a déjà été utilisé, ou il date de plus d&apos;une heure. Demandez-en un nouveau.
        </p>
        <LinkButton href="/mot-de-passe-oublie" className="mt-6">
          Recevoir un nouveau lien
        </LinkButton>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Nouveau mot de passe</h1>
      <p className="mt-1 mb-6 text-sm text-ink-2">
        Pour le compte <strong className="text-ink">{user.email}</strong>. Vous serez déconnecté de vos autres appareils.
      </p>
      <ResetForm token={value} />
    </>
  );
}
