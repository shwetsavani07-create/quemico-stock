const CACHE_NAME = "quemico-stock-v2";

const STATIC_ASSETS = [
    "/manifest.webmanifest",
    "/images/quemico-logo.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );

    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );

    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    // Only handle GET requests.
    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // Never cache API/database requests.
    if (url.pathname.startsWith("/api/")) {
        return;
    }

    // Never cache Next.js dynamic/server requests.
    if (
        url.pathname.startsWith("/_next/") &&
        !url.pathname.startsWith("/_next/static/")
    ) {
        return;
    }

    // Never cache RSC requests.
    if (
        url.searchParams.has("_rsc") ||
        request.headers.get("RSC") === "1"
    ) {
        return;
    }

    // Always get HTML/pages from the server.
    if (request.mode === "navigate" || request.destination === "document") {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // Cache only static assets.
    const isStaticAsset =
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/images/") ||
        url.pathname.endsWith(".css") ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".woff2") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".jpeg") ||
        url.pathname.endsWith(".webp") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".ico");

    if (!isStaticAsset) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(request).then((response) => {
                if (
                    response &&
                    response.status === 200 &&
                    response.type === "basic"
                ) {
                    const responseClone = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }

                return response;
            });
        })
    );
});