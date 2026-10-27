import type { Metadata } from "next";
import { Logo } from "@/components/brand";

export const metadata: Metadata = { title: "Hors connexion", robots: { index: false } };

/** Served by the service worker when a page is requested without network and isn't saved yet. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-10" />
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-warn-soft text-warn">
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M2 8.8a15 15 0 0 1 20 0M5 12.4a10 10 0 0 1 14 0M8.5 15.9a5 5 0 0 1 7 0" strokeLinecap="round" />
          <path d="m3 3 18 18" strokeLinecap="round" />
          <circle cx="12" cy="19.5" r="1" fill="currentColor" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold">Vous êtes hors connexion</h1>
      <p className="mt-2 max-w-sm text-ink-2">
        Cette page n&apos;a pas encore été enregistrée sur votre appareil. Les pages <strong>Ventes</strong> et{" "}
        <strong>Dépenses</strong> fonctionnent sans réseau si vous les avez déjà ouvertes une fois.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <a
          href="/ventes"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 font-medium text-accent-ink"
        >
          Saisir les ventes
        </a>
        <a
          href="/depenses"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-line-strong bg-card px-5 font-medium text-ink"
        >
          Ajouter une dépense
        </a>
      </div>
      <p className="mt-6 text-sm text-muted">Dès que le réseau revient, rechargez la page.</p>
    </div>
  );
}
