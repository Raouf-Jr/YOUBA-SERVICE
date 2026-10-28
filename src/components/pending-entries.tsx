"use client";

import { Check, Clock3, Trash2, TriangleAlert } from "lucide-react";
import { useOffline } from "next/offline";
import { removeEntry, useOutbox } from "@/lib/offline/outbox";
import { paymentLabel } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { cx } from "./ui";

/** Sales or expenses saved on this device that the server hasn't received yet. */
export function PendingEntries({
  userId,
  kind,
  currency,
  filter,
  knownIds,
}: {
  userId: string;
  kind: "sale" | "expense";
  currency: string;
  /** Keep only entries of this day ("2026-10-27") or month ("2026-10"). */
  filter?: string;
  /** Ids (checkout id / client ref) the page already lists from the server. */
  knownIds: string[];
}) {
  // While online an entry is sent within seconds; cancelling it then would race the upload.
  const offline = useOffline();
  const entries = useOutbox(userId).filter(
    (e) => e.kind === kind && (!filter || e.payload.date.startsWith(filter)) && !knownIds.includes(e.id),
  );
  if (entries.length === 0) return null;

  return (
    <ul className="divide-y divide-line border-b border-line bg-subtle/50">
      {entries.map((e) => {
        const amount = e.kind === "sale" ? e.summary.total : e.payload.amount;
        const detail =
          e.kind === "sale"
            ? `${e.summary.items} article${e.summary.items > 1 ? "s" : ""} · ${paymentLabel(e.payload.paymentMethod)}`
            : e.payload.category;
        return (
          <li key={e.id} className="flex items-center gap-3 px-5 py-3">
            <span
              className={cx(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                e.error ? "bg-bad-soft text-bad" : e.sentAt ? "bg-good-soft text-good" : "bg-warn-soft text-warn",
              )}
            >
              {e.error ? <TriangleAlert className="size-4" /> : e.sentAt ? <Check className="size-4" /> : <Clock3 className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{e.summary.label}</p>
              <p className={cx("truncate text-xs", e.error ? "text-bad" : "text-muted")}>
                {e.error ?? `${detail} · ${e.sentAt ? "envoyée" : "en attente d'envoi"}`}
              </p>
            </div>
            <span className="tabular shrink-0 text-sm font-semibold">{formatMoney(amount, currency)}</span>
            {(e.error || (offline && !e.sentAt)) && (
              <button
                type="button"
                onClick={() => {
                  if (e.error || window.confirm(`Annuler la saisie « ${e.summary.label} » ? Elle ne sera pas envoyée.`)) {
                    removeEntry(e.id);
                  }
                }}
                aria-label="Annuler cette saisie"
                title="Annuler cette saisie"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
