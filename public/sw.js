/*
 * YOUBA SERVICE — service worker.
 * Lets the app open without network: code and styles are kept forever (their names change
 * with every version), the main pages are kept as of the last visit, and anything else falls
 * back to the "Hors connexion" page. Sales and expenses typed offline are handled by the page
 * itself (outbox in localStorage), not here.
 */
const VERSION = "v2";
const SHELL_CACHE = `youba-shell-${VERSION}`; // offline page, icons, manifest
const STATIC_CACHE = "youba-static"; // /_next/static: immutable, shared across versions
const PAGES_CACHE = "youba-pages"; // signed-in pages: wiped at logout
const OFFLINE_URL = "/hors-ligne";
const SHELL = [OFFLINE_URL, "/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png"];
const APP_PAGES = ["/tableau-de-bord", "/ventes", "/depenses", "/produits", "/investissements", "/rapports", "/parametres"];
const MAX_STATIC_ENTRIES = 400;
const NETWORK_TIMEOUT_MS = 6000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      for (const url of SHELL) {
        try {
          if (url === OFFLINE_URL) await cachePage(url, cache);
          else await cache.add(new Request(url, { cache: "reload" }));
        } catch {
          // Never block installation on one file.
        }
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE];
      for (const name of await caches.keys()) {
        if (name.startsWith("youba-") && !keep.includes(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "warm") {
    event.waitUntil(warm(data.assets || [], data.pages || []).then(() => event.ports[0]?.postMessage("done")));
  }
  if (data.type === "clear-pages") event.waitUntil(caches.delete(PAGES_CACHE));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(navigate(request, url));
  } else if (SHELL.includes(url.pathname) && url.pathname !== OFFLINE_URL) {
    event.respondWith(staleWhileRevalidate(request));
  }
  // Everything else (data requests, Server Actions, exports) goes straight to the network.
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await putStatic(cache, request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit || network;
}

/** Network first; the copy from the last visit if the network fails or is very slow. */
async function navigate(request, url) {
  const cacheable = APP_PAGES.includes(url.pathname);
  const pages = await caches.open(PAGES_CACHE);
  const cached = cacheable ? await pages.match(url.pathname) : undefined;

  const network = fetch(request).then(async (response) => {
    // Only the plain page (no ?date=…, no redirect to the login page) is kept.
    if (cacheable && !url.search && isFreshPage(response)) await pages.put(url.pathname, response.clone());
    return response;
  });

  try {
    const response = cached
      ? await Promise.race([network, new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS))])
      : await network;
    if (response.status >= 500 && cached) return cached;
    return response;
  } catch {
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE });
    return (
      offline ||
      new Response("<h1>Hors connexion</h1><p>Vérifiez votre connexion internet puis réessayez.</p>", {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
}

function isFreshPage(response) {
  return response.ok && !response.redirected && (response.headers.get("Content-Type") || "").includes("text/html");
}

/** Stores a page and the code/styles it needs, so it can render offline. */
async function cachePage(path, cache) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!isFreshPage(response)) return;
  const html = await response.clone().text();
  await cache.put(path, response);
  await cacheAssets(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || []);
}

async function cacheAssets(urls) {
  const cache = await caches.open(STATIC_CACHE);
  for (const url of new Set(urls)) {
    if (!url.startsWith("/_next/static/") || (await cache.match(url))) continue;
    try {
      const response = await fetch(url);
      if (response.ok) await putStatic(cache, url, response);
    } catch {
      // Offline or gone: skip.
    }
  }
}

async function putStatic(cache, request, response) {
  await cache.put(request, response);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES))) await cache.delete(key);
}

/** Pages first (with the code they need), then whatever else the current page loaded. */
async function warm(assets, pages) {
  const cache = await caches.open(PAGES_CACHE);
  for (const page of pages) {
    if (!APP_PAGES.includes(page)) continue;
    try {
      await cachePage(page, cache);
    } catch {
      // Offline: keep the previous copy.
    }
  }
  await cacheAssets(assets.map((a) => new URL(a, self.location.origin)).filter((u) => u.origin === self.location.origin).map((u) => u.pathname));
}
