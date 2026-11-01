// Collision Voice — minimal app-shell cache for installability/offline start.
const CACHE_NAME = "collision-voice-shell-v24";
// Large, rarely-changing files (barcode/plate readers and their models). Kept in their own cache so an app update
// doesn't throw away ~25 MB and make the phone download it again.
const ASSET_CACHE = "collision-voice-assets-v1";
const HEAVY_ASSETS = /\/(?:js\/vendor|models)\//;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/storage.js",
  "./js/zip.js",
  "./js/scanner.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/Collision-Voice.png",
  "./icons/favicon-32.png",
];

// Code/markup that changes often — always prefer the network so updates show up without a stale double-refresh.
const NETWORK_FIRST = /\.(?:html|js|css)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== ASSET_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin === self.location.origin && HEAVY_ASSETS.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(event.request).then(
          (cached) =>
            cached ||
            fetch(event.request).then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
        )
      )
    );
    return;
  }

  const isAppCode = event.request.mode === "navigate" || NETWORK_FIRST.test(url.pathname);

  if (isAppCode) {
    event.respondWith(
      fetch(event.request.mode === "navigate" ? event.request.url : event.request, { cache: "no-cache" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (icons, etc.) that rarely change.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

