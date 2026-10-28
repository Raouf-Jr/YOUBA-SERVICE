import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { ClearOfflinePages } from "@/components/service-worker";
import { ThemeToggle } from "@/components/theme";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db";

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
      <p className="relative mt-8 max-w-xs text-center text-xs text-muted">
        Mot de passe oublié ? Demandez à la personne qui a installé l&apos;application.
      </p>
    </div>
  );
}

async function ShopLogo() {
  await connection();
  const shop = await getSettings(await getDb());
  return <Logo name={shop.shopName} />;
}
