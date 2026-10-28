import { useMemo, useSyncExternalStore } from "react";
import type { DayPayload } from "./types";

/**
 * Days typed on this device, waiting to reach the server. Stored in localStorage so they
 * survive closing the app, and tagged with the user so a shared phone never mixes accounts.
 */
export type OutboxEntry = {
  id: string;
  userId: string;
  createdAt: number;
  attempts: number;
  /** Set when the server refused the entry for good. */
  error?: string;
  /** Set once the server has it; kept a moment so the screen doesn't flicker, then forgotten. */
  sentAt?: number;
  payload: DayPayload;
};

const KEY = "youba:outbox:v2";
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

export function updateEntry(id: string, patch: Partial<Pick<OutboxEntry, "attempts" | "error" | "sentAt">>) {
  write(read().map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

/** Forgets entries the server received more than `maxAgeMs` ago. */
export function purgeSent(now = Date.now(), maxAgeMs = 60_000) {
  const entries = read();
  const kept = entries.filter((e) => !e.sentAt || now - e.sentAt < maxAgeMs);
  if (kept.length !== entries.length) write(kept);
}

/** Still has to reach the server (not sent, not refused). */
export const isWaiting = (e: OutboxEntry) => !e.error && !e.sentAt;

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

/** Live list of the user's queued days (empty during server rendering and hydration). */
export function useOutbox(userId: string): OutboxEntry[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => getStorage().getItem(KEY) ?? "[]",
    () => "[]",
  );
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
