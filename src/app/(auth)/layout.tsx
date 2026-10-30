import { MessageCircle } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { ClearOfflinePages } from "@/components/service-worker";
import { ThemeToggle } from "@/components/theme";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db";
import { supportWhatsApp, whatsAppLink } from "@/lib/support";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center px-4 py-8 sm:justify-center sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-accent-soft/70 to-transparent"
      />
      <div className="relative mb-8 flex w-full max-w-md items-center justify-between gap-4">
        <Suspense fallback={<Logo />}>
          <ShopLogo />
        </Suspense>
        <ThemeToggle className="shrink-0" />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
      <ClearOfflinePages />
      <Suspense fallback={<AskInstaller />}>
        <ForgotPassword />
      </Suspense>
    </div>
  );
}

/** Who to contact when the password is forgotten: WhatsApp when SUPPORT_WHATSAPP is set. */
async function ForgotPassword() {
  await connection();
  const support = supportWhatsApp();
  if (!support) return <AskInstaller />;
  const shop = await getSettings(await getDb());
  const href = whatsAppLink(support.digits, `Bonjour, j'ai oublié mon mot de passe ${shop.shopName}. Pouvez-vous m'aider ?`);
  return (
    <div className="relative mt-6 flex w-full max-w-md flex-col items-center gap-2 text-center">
      <p className="text-sm text-ink-2">Mot de passe oublié ?</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 items-center gap-2.5 rounded-full border border-line-strong bg-card px-5 font-medium text-ink shadow-card transition-colors hover:bg-subtle"
      >
        <MessageCircle className="size-5 text-[#1fae55]" aria-hidden />
        Écrire sur WhatsApp
      </a>
      <p className="tabular text-sm text-muted">{support.display}</p>
    </div>
  );
}

function AskInstaller() {
  return (
    <p className="relative mt-8 max-w-xs text-center text-xs text-muted">
      Mot de passe oublié ? Demandez à la personne qui a installé l&apos;application.
    </p>
  );
}

async function ShopLogo() {
  await connection();
  const shop = await getSettings(await getDb());
  return <Logo name={shop.shopName} />;
}
