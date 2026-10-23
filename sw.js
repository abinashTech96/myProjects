/* Same-origin application assets only. Project data and AI requests never enter this cache. */
const CACHE = "archcad-4d-studio-v22";
async function cacheApp() {
  const response = await fetch(
    new URL("offline-assets.json", self.registration.scope),
    { cache: "reload" },
  );
  if (!response.ok) throw Error("Cannot load offline asset manifest");
  const assets = await response.json();
  const cache = await caches.open(CACHE);
  await cache.addAll(
    assets.map((path) => new URL(path, self.registration.scope).href),
  );
}
self.addEventListener("install", (event) =>
  event.waitUntil(cacheApp().then(() => self.skipWaiting())),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("archcad-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_APP") event.waitUntil(cacheApp());
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url),
    scope = new URL(self.registration.scope);
  if (
    event.request.method !== "GET" ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname) ||
    url.pathname.includes("/api/")
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response.ok &&
          (event.request.mode === "navigate" ||
            /\.(js|css)$/.test(url.pathname))
        ) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((c) => c.put(event.request, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const home = await caches.match(
            new URL("index.html", self.registration.scope).href,
          );
          if (home) return home;
        }
        return new Response("Unavailable offline", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      }),
  );
});
