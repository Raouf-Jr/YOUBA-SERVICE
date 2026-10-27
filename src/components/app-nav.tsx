"use client";

import {
  ChartColumn,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  Package,
  PiggyBank,
  Receipt,
  Settings,
  ShoppingCart,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOffline } from "next/offline";
import { useState, type MouseEvent } from "react";
import { Logo } from "./brand";
import { LogoutButton } from "./logout-button";
import { cx } from "./ui";

type Role = "owner" | "staff";

const NAV = [
  { href: "/tableau-de-bord", label: "Tableau de bord", short: "Accueil", Icon: LayoutDashboard, ownerOnly: true },
  { href: "/ventes", label: "Ventes du jour", short: "Ventes", Icon: ShoppingCart },
  { href: "/depenses", label: "Dépenses", short: "Dépenses", Icon: Receipt },
  { href: "/produits", label: "Produits & stock", short: "Stock", Icon: Package },
  { href: "/investissements", label: "Investissements", short: "Invest.", Icon: PiggyBank, ownerOnly: true },
  { href: "/rapports", label: "Rapports", short: "Rapports", Icon: ChartColumn, ownerOnly: true },
  { href: "/parametres", label: "Paramètres", short: "Réglages", Icon: Settings },
] as const;

const MOBILE_TABS: Record<Role, string[]> = {
  owner: ["/tableau-de-bord", "/ventes", "/depenses", "/rapports"],
  staff: ["/ventes", "/depenses", "/produits"],
};

export function AppNav({
  role,
  shopName,
  userName,
  userId,
}: {
  role?: Role;
  shopName?: string;
  userName?: string;
  userId?: string;
}) {
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
  // The sheet remembers the page it was opened on, so navigating closes it.
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const sheetOpen = sheetFor === pathname;
  const setSheetOpen = (open: boolean) => setSheetFor(open ? pathname : null);
  const items = role ? NAV.filter((i) => role === "owner" || !("ownerOnly" in i)) : [];
  const tabs = role ? items.filter((i) => MOBILE_TABS[role].includes(i.href)) : [];
  const more = items.filter((i) => !tabs.includes(i));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = more.some((i) => isActive(i.href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card/60 px-3 py-5 backdrop-blur lg:flex">
        <Link href={role === "staff" ? "/ventes" : "/tableau-de-bord"} className="mb-7 px-2.5">
          <Logo subtitle={shopName} />
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Navigation principale">
          {items.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={go}
              aria-current={isActive(href) ? "page" : undefined}
              className={cx(
                "group flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors",
                isActive(href) ? "bg-accent-soft text-accent-text" : "text-ink-2 hover:bg-subtle hover:text-ink",
              )}
            >
              <Icon className={cx("size-[18px]", isActive(href) ? "text-accent-text" : "text-muted group-hover:text-ink-2")} />
              {label}
            </Link>
          ))}
        </nav>
        {userName && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5">
            <Avatar name={userName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{userName}</p>
              <p className="text-xs text-muted">{role === "owner" ? "Propriétaire" : "Employé"}</p>
            </div>
            <LogoutButton
              userId={userId}
              label="Se déconnecter"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
            >
              <LogOut className="size-4" />
            </LogoutButton>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:hidden">
        <Link href={role === "staff" ? "/ventes" : "/tableau-de-bord"}>
          <Logo subtitle={shopName} />
        </Link>
        {userName && <Avatar name={userName} />}
      </header>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Navigation"
        className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
          {tabs.map(({ href, short, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={go}
              aria-current={isActive(href) ? "page" : undefined}
              className={cx(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                isActive(href) ? "text-accent-text" : "text-muted",
              )}
            >
              <span
                className={cx(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  isActive(href) && "bg-accent-soft",
                )}
              >
                <Icon className="size-5" />
              </span>
              {short}
            </Link>
          ))}
          {role && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              className={cx(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium",
                moreActive ? "text-accent-text" : "text-muted",
              )}
            >
              <span className={cx("flex h-7 w-12 items-center justify-center rounded-full", moreActive && "bg-accent-soft")}>
                <Ellipsis className="size-5" />
              </span>
              Plus
            </button>
          )}
        </div>
      </nav>

      {/* "Plus" sheet */}
      {sheetOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Plus de pages">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSheetOpen(false)}
          />
          <div className="safe-bottom absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-card p-4 shadow-pop">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-ink">{shopName}</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Fermer"
                className="inline-flex size-9 items-center justify-center rounded-full bg-subtle text-ink-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {more.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={go}
                  className={cx(
                    "flex h-12 items-center gap-3 rounded-xl px-3 font-medium",
                    isActive(href) ? "bg-accent-soft text-accent-text" : "text-ink hover:bg-subtle",
                  )}
                >
                  <Icon className="size-5 text-muted" />
                  {label}
                </Link>
              ))}
              <LogoutButton
                userId={userId}
                className="flex h-12 w-full items-center gap-3 rounded-xl px-3 font-medium text-bad hover:bg-bad-soft"
              >
                <LogOut className="size-5" />
                Se déconnecter
              </LogoutButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle-2 text-xs font-semibold text-ink-2">
      {initials || "?"}
    </span>
  );
}
