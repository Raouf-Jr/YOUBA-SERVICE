import { Suspense } from "react";
import { AppNav, AppNavPlaceholder } from "@/components/app-nav";
import { OfflineSync } from "@/components/offline-sync";
import { requireUser } from "@/lib/auth/dal";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<AppNavPlaceholder />}>
        <Nav />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-14 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}

async function Nav() {
  const user = await requireUser();
  return (
    <>
      <AppNav shopName={user.shop.shopName} />
      <OfflineSync userId={user.id} />
    </>
  );
}
