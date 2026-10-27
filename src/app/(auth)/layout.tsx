import Link from "next/link";
import { Logo } from "@/components/brand";
import { ClearOfflinePages } from "@/components/service-worker";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-accent-soft/70 to-transparent"
      />
      <Link href="/" className="relative mb-8">
        <Logo />
      </Link>
      <div className="relative w-full max-w-md">{children}</div>
      <ClearOfflinePages />
      <p className="relative mt-8 text-center text-xs text-muted">
        Vos données restent privées : chaque boutique ne voit que ses propres chiffres.
      </p>
    </div>
  );
}
