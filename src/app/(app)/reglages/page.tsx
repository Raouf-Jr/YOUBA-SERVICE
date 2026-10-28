import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { Bone } from "@/components/skeleton";
import { ThemePicker } from "@/components/theme";
import { buttonClass, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { PasswordForm, ShopForm } from "./settings-forms";

export const metadata: Metadata = { title: "Réglages" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Réglages" />
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Apparence" description="Fond clair ou sombre. « Automatique » suit le réglage du téléphone." />
          <div className="p-5 pt-4">
            <ThemePicker />
          </div>
        </Card>
        <Suspense fallback={<Bone className="h-64 rounded-2xl" />}>
          <Account />
        </Suspense>
      </div>
    </div>
  );
}

async function Account() {
  const user = await requireUser();
  return (
    <>
      <Card>
        <CardHeader title="Boutique" />
        <div className="p-5 pt-4">
          <ShopForm shopName={user.shop.shopName} currency={user.shop.currency} />
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Mot de passe"
          description={
            <>
              Vous êtes connecté avec l&apos;identifiant <strong className="font-medium text-ink">{user.username}</strong>.
            </>
          }
        />
        <div className="p-5 pt-4">
          <PasswordForm />
        </div>
      </Card>
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[0.9375rem] font-semibold text-ink">Se déconnecter</h2>
          <p className="mt-0.5 text-sm text-muted">Utile si quelqu&apos;un d&apos;autre doit utiliser ce téléphone.</p>
        </div>
        <LogoutButton userId={user.id} className={buttonClass("secondary", "lg", "w-full sm:w-auto")}>
          <LogOut />
          Se déconnecter
        </LogoutButton>
      </Card>
    </>
  );
}
