import { LogOut, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { Button, Card, PageHeader } from "@/components/ui";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/dal";
import { listTeam } from "@/lib/data/account";
import { getDb } from "@/lib/db";
import { PasswordForm, ProfileForm, ShopForm, TeamManager } from "./settings-forms";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const user = await requireUser();
  const isOwner = user.role === "owner";
  const team = isOwner ? await listTeam(await getDb(), user.shop.id) : [];

  return (
    <>
      <PageHeader title="Paramètres" description={user.shop.name} />
      <div className="flex flex-col gap-4">
        {isOwner && (
          <Section title="Boutique" description="Nom, devise, fuseau horaire et objectif de ventes.">
            <ShopForm shop={user.shop} />
          </Section>
        )}
        {isOwner && (
          <Section title="Équipe" description="Donnez un accès à vos employés pour qu'ils saisissent les ventes.">
            <TeamManager members={team} currentUserId={user.id} />
          </Section>
        )}
        <Section title="Mon profil">
          <ProfileForm name={user.name} email={user.email} />
        </Section>
        <Section title="Mot de passe" description="Changer le mot de passe déconnecte vos autres appareils.">
          <PasswordForm />
        </Section>
        <Section title="Application">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 text-sm text-ink-2">
              <Smartphone className="mt-0.5 size-5 shrink-0 text-muted" />
              <span>
                Installez YOUBA SERVICE sur votre téléphone : dans Chrome, menu <strong>⋮</strong> puis{" "}
                <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong> (sur iPhone : bouton Partager, puis « Sur l&apos;écran
                d&apos;accueil »).
              </span>
            </p>
            <form action={logout}>
              <Button type="submit" variant="secondary" className="text-bad">
                <LogOut /> Se déconnecter
              </Button>
            </form>
          </div>
        </Section>
      </div>
    </>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div>{children}</div>
    </Card>
  );
}
