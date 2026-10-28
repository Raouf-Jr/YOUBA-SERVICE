"use client";

import { ChartColumn, NotebookPen, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOffline } from "next/offline";
import type { MouseEvent } from "react";
import { Logo } from "./brand";
import { ThemeToggle } from "./theme";
import { cx } from "./ui";

const TABS = [
  { href: "/saisie", label: "Saisie", Icon: NotebookPen },
  { href: "/produits", label: "Produits", Icon: Package },
  { href: "/rapports", label: "Rapports", Icon: ChartColumn },
  { href: "/reglages", label: "Réglages", Icon: Settings },
] as const;

/** Top bar everywhere; tabs inline on large screens, at the bottom on phones. */
export function AppNav({ shopName }: { shopName?: string }) {
  const pathname = usePathname();
  const offline = useOffline();
  // Offline, a full page load lets the service worker serve the copy saved on the device,
  // where an in-app navigation would wait for the network.
  const go = offline
    ? (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        window.location.assign(event.currentTarget.href);
      }
    : undefined;
  return (
    <NavFrame shopName={shopName} isActive={(href) => pathname === href || pathname.startsWith(`${href}/`)} go={go} />
  );
}

/** Shown while the session is checked: same bars, nothing highlighted (no URL needed). */
export function AppNavPlaceholder() {
  return <NavFrame isActive={() => false} />;
}

function NavFrame({
  shopName,
  isActive,
  go,
}: {
  shopName?: string;
  isActive: (href: string) => boolean;
  go?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/saisie" onClick={go} className="min-w-0 flex-1 md:flex-none">
            <Logo name={shopName ?? ""} />
          </Link>
          <nav aria-label="Menu" className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {TABS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={go}
                aria-current={isActive(href) ? "page" : undefined}
                className={cx(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-medium transition-colors",
                  isActive(href) ? "bg-accent-soft text-accent-text" : "text-ink-2 hover:bg-subtle hover:text-ink",
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            ))}
          </nav>
          <ThemeToggle className="shrink-0" />
        </div>
      </header>

      <nav
        aria-label="Menu"
        className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-4">
          {TABS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={go}
              aria-current={isActive(href) ? "page" : undefined}
              className={cx(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                isActive(href) ? "text-accent-text" : "text-muted",
              )}
            >
              <span className={cx("flex h-7 w-14 items-center justify-center rounded-full", isActive(href) && "bg-accent-soft")}>
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
