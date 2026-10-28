"use client";

import { CloudOff, LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useOffline } from "next/offline";
import { useEffect, useState } from "react";
import { isWaiting, purgeSent, useOutbox } from "@/lib/offline/outbox";
import { syncOutbox, type SyncOutcome } from "@/lib/offline/sync";
import { warmOfflineCache } from "./service-worker";

const RETRY_MS = 30_000;

/**
 * Sends sales and expenses saved on this device as soon as the server can be reached,
 * and tells the user what is going on.
 */
export function OfflineSync({ userId }: { userId: string }) {
  const offline = useOffline();
  const entries = useOutbox(userId);
  const [outcome, setOutcome] = useState<SyncOutcome>("done");
  const waiting = entries.filter(isWaiting);
  const refused = entries.filter((e) => e.error);

  // Keep Sales and Expenses available offline.
  useEffect(() => {
    warmOfflineCache(["/ventes", "/depenses"]);
  }, []);

  // Sent entries are kept a short while (until the page shows them), then forgotten.
  const hasSent = entries.some((e) => e.sentAt);
  useEffect(() => {
    purgeSent();
    if (!hasSent) return;
    const timer = setInterval(() => purgeSent(), 30_000);
    return () => clearInterval(timer);
  }, [hasSent]);

  // Try now, whenever something is added, when the network comes back, and every 30 s while entries wait.
  const pendingCount = waiting.length;
  useEffect(() => {
    if (pendingCount === 0) return;
    let cancelled = false;
    const sync = () => {
      void syncOutbox(userId).then((result) => {
        if (!cancelled) setOutcome(result);
      });
    };
    sync();
    const timer = setInterval(sync, RETRY_MS);
    window.addEventListener("online", sync);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("online", sync);
    };
  }, [userId, pendingCount]);

  let banner: React.ReactNode = null;
  if (offline) {
    banner = (
      <Bar tone="warn" icon={<CloudOff />}>
        <strong>Hors connexion.</strong> Vos ventes et dépenses sont gardées sur cet appareil
        {pendingCount > 0 && ` (${pendingCount} en attente)`} et seront envoyées dès le retour du réseau.
      </Bar>
    );
  } else if (pendingCount > 0 && outcome === "auth") {
    banner = (
      <Bar tone="warn" icon={<TriangleAlert />}>
        {pendingCount} saisie{pendingCount > 1 ? "s" : ""} en attente : votre session a expiré.{" "}
        <Link href="/connexion" className="font-semibold underline underline-offset-2">
          Reconnectez-vous
        </Link>{" "}
        pour les envoyer.
      </Bar>
    );
  } else if (pendingCount > 0) {
    banner = (
      <Bar tone="info" icon={<LoaderCircle className="animate-spin" />}>
        Envoi de {pendingCount} saisie{pendingCount > 1 ? "s" : ""} faite{pendingCount > 1 ? "s" : ""} hors connexion…
      </Bar>
    );
  } else if (refused.length > 0) {
    banner = (
      <Bar tone="bad" icon={<TriangleAlert />}>
        {refused.length} saisie{refused.length > 1 ? "s" : ""} n&apos;{refused.length > 1 ? "ont" : "a"} pas pu être
        enregistrée{refused.length > 1 ? "s" : ""}.{" "}
        <Link href={refused[0].kind === "sale" ? "/ventes" : "/depenses"} className="font-semibold underline underline-offset-2">
          Voir
        </Link>
      </Bar>
    );
  }

  return (
    <div aria-live="polite" className="no-print sticky top-14 z-20 lg:top-0">
      {banner}
    </div>
  );
}

function Bar({ tone, icon, children }: { tone: "warn" | "info" | "bad"; icon: React.ReactNode; children: React.ReactNode }) {
  const tones = {
    warn: "bg-warn-soft text-warn border-warn/20",
    info: "bg-accent-soft text-accent-text border-accent/20",
    bad: "bg-bad-soft text-bad border-bad/20",
  };
  return (
    <div role="status" className={`border-b px-4 py-2.5 text-sm sm:px-6 lg:px-10 ${tones[tone]}`}>
      <p className="mx-auto flex max-w-6xl items-start gap-2 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0">
        {icon}
        <span>{children}</span>
      </p>
    </div>
  );
}
