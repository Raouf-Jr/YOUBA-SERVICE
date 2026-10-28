"use client";

import { useTransition, type ReactNode } from "react";
import { logout } from "@/lib/actions/auth";
import { isWaiting, useOutbox } from "@/lib/offline/outbox";
import { clearOfflinePages } from "./service-worker";

/**
 * Signs out after wiping the pages saved for offline use. Entries still waiting to be sent stay
 * on the device and go out at the next sign-in of the same person, so we warn but don't block.
 */
export function LogoutButton({
  userId,
  className,
  children,
  label,
}: {
  userId?: string;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  const waiting = useOutbox(userId ?? "").filter(isWaiting).length;
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={pending}
      className={className}
      onClick={() => {
        if (
          waiting > 0 &&
          !window.confirm(
            `${waiting} saisie${waiting > 1 ? "s n'ont" : " n'a"} pas encore été envoyée${waiting > 1 ? "s" : ""}. ` +
              "Elles resteront sur cet appareil et partiront à votre prochaine connexion. Se déconnecter ?",
          )
        ) {
          return;
        }
        startTransition(async () => {
          await clearOfflinePages();
          await logout();
        });
      }}
    >
      {children}
    </button>
  );
}
