const CACHE_NAME = "teknosoz-v3-qr-unlock";
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./app.js",
  "./vendor/model-viewer.min.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/qr/iha.svg",
  "./assets/qr/drone.svg",
  "./assets/qr/roket.svg",
  "./assets/qr/uydu.svg",
  "./assets/qr/helikopter.svg",
  "./assets/qr/insansi-robot.svg",
  "./assets/qr/elektrikli-otomobil.svg",
  "./assets/qr/mars-araci.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
