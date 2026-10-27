import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { OfflineSync } from "@/components/offline-sync";
import { requireUser } from "@/lib/auth/dal";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:pl-64 print:pl-0">
      <Suspense fallback={<AppNav />}>
        <Nav />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-9 lg:pb-14 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}

async function Nav() {
  const user = await requireUser();
  return (
    <>
      <AppNav role={user.role} shopName={user.shop.name} userName={user.name} userId={user.id} />
      <OfflineSync userId={user.id} />
    </>
  );
}
