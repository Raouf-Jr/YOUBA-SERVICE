import { useMemo, useSyncExternalStore } from "react";
import type { CheckoutPayload, ExpensePayload } from "./types";

/**
 * Sales and expenses typed on this device, waiting to reach the server.
 * Stored in localStorage so they survive closing the app, and tagged with the user
 * so a shared phone never sends one person's entries under another's account.
 */
export type OutboxEntry = {
  /** Same value as the payload's checkoutId / clientRef. */
  id: string;
  userId: string;
  shopId: string;
  createdAt: number;
  attempts: number;
  /** Set when the server refused the entry for good. */
  error?: string;
} & (
  | { kind: "sale"; payload: CheckoutPayload; summary: { total: number; items: number; label: string } }
  | { kind: "expense"; payload: ExpensePayload; summary: { label: string } }
);

const KEY = "youba:outbox:v1";
const EVENT = "youba:outbox-change";

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function browserStorage(): Storage {
  try {
    const probe = "youba:probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // Private browsing or blocked storage: keep entries for this visit at least.
    return memoryStorage();
  }
}

let storage: Storage | null = null;
const getStorage = () => (storage ??= typeof window === "undefined" ? memoryStorage() : browserStorage());

/** Tests swap in their own storage. */
export function setOutboxStorage(next: Storage) {
  storage = next;
}

function parse(raw: string | null): OutboxEntry[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const read = () => parse(getStorage().getItem(KEY));

const forUser = (entries: OutboxEntry[], userId: string) =>
  entries.filter((e) => e.userId === userId).sort((a, b) => a.createdAt - b.createdAt);

function write(entries: OutboxEntry[]) {
  getStorage().setItem(KEY, JSON.stringify(entries));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function addEntry(entry: OutboxEntry) {
  const entries = read();
  if (!entries.some((e) => e.id === entry.id)) write([...entries, entry]);
}

export function removeEntry(id: string) {
  write(read().filter((e) => e.id !== id));
}

export function updateEntry(id: string, patch: Partial<Pick<OutboxEntry, "attempts" | "error">>) {
  write(read().map((e) => (e.id === id ? ({ ...e, ...patch } as OutboxEntry) : e)));
}

/** Oldest first. */
export function entriesFor(userId: string): OutboxEntry[] {
  return forUser(read(), userId);
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage); // other tabs
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** Live list of the user's pending entries (empty during server rendering). */
export function useOutbox(userId: string): OutboxEntry[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => getStorage().getItem(KEY) ?? "[]",
    () => "[]",
  );
  // Derived from the snapshot itself, so hydration sees the same (empty) list as the server.
  return useMemo(() => forUser(parse(raw), userId), [raw, userId]);
}

/** RFC 4122 v4 id; crypto.randomUUID only exists on HTTPS, so fall back on getRandomValues. */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
