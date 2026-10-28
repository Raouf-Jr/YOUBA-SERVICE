import { recordExpense } from "@/lib/actions/expenses";
import { recordCheckout } from "@/lib/actions/sales";
import { entriesFor, isWaiting, purgeSent, updateEntry, type OutboxEntry } from "./outbox";
import type { SyncResult } from "./types";

export type SyncOutcome = "done" | "network" | "auth";

type Sender = (entry: OutboxEntry) => Promise<SyncResult>;

const send: Sender = (entry) => (entry.kind === "sale" ? recordCheckout(entry.payload) : recordExpense(entry.payload));

/**
 * Sends the user's pending entries, oldest first, one at a time.
 * Safe to call often: concurrent calls share one run, and other tabs wait their turn.
 */
export async function runSync(userId: string, sender: Sender = send): Promise<SyncOutcome> {
  purgeSent();
  for (const entry of entriesFor(userId)) {
    if (!isWaiting(entry)) continue;
    let result: SyncResult;
    try {
      result = await sender(entry);
    } catch {
      // Unreachable server or server error: keep the entry and try again later.
      updateEntry(entry.id, { attempts: entry.attempts + 1 });
      return "network";
    }
    if (result.ok) updateEntry(entry.id, { sentAt: Date.now() });
    else if (result.reason === "auth") return "auth";
    else if (result.reason === "invalid") updateEntry(entry.id, { error: result.message });
    // "shop": the entry belongs to another account on this device; leave it alone.
  }
  return "done";
}

let current: Promise<SyncOutcome> | null = null;
let again = false;

export function syncOutbox(userId: string): Promise<SyncOutcome> {
  if (current) {
    again = true;
    return current;
  }
  const run = async (): Promise<SyncOutcome> => {
    let outcome: SyncOutcome;
    do {
      again = false;
      const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
      outcome = locks ? await locks.request("youba-outbox-sync", () => runSync(userId)) : await runSync(userId);
    } while (again && outcome === "done");
    return outcome;
  };
  current = run().finally(() => {
    current = null;
  });
  return current;
}
