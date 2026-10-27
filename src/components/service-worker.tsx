"use client";

import { useEffect } from "react";

const PAGES_CACHE = "youba-pages";
const WARM_KEY = "youba:sw-warm";
const WARM_EVERY_MS = 6 * 3_600_000;

/** Registers the service worker (production only: it would fight hot reload in development). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}

/**
 * Asks the service worker to keep the pages needed offline (and the code they use),
 * at most every few hours.
 */
export function warmOfflineCache(pages: string[], force = false) {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  try {
    const last = Number(localStorage.getItem(WARM_KEY) || 0);
    if (!force && Date.now() - last < WARM_EVERY_MS) return;
    localStorage.setItem(WARM_KEY, String(Date.now()));
  } catch {
    // Storage blocked: warm every time, it's cheap enough.
  }
  navigator.serviceWorker.ready
    .then((registration) => {
      const assets = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => name.includes("/_next/static/"));
      registration.active?.postMessage({ type: "warm", assets, pages });
    })
    .catch(() => {});
}

/** Forgets the saved signed-in pages (logout, or a new person signing in on this device). */
export async function clearOfflinePages() {
  try {
    localStorage.removeItem(WARM_KEY);
  } catch {}
  if (typeof caches !== "undefined") await caches.delete(PAGES_CACHE).catch(() => false);
}

/** Mounted on the login pages: nothing saved for a previous session should stay readable. */
export function ClearOfflinePages() {
  useEffect(() => {
    void clearOfflinePages();
  }, []);
  return null;
}
