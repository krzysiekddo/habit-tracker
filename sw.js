// Service worker: aplikacja działa offline.
// Pliki strony: najpierw sieć (zawsze świeża wersja), w razie braku — kopia z pamięci.
// Biblioteki Firebase z gstatic: najpierw pamięć (wersja jest przypięta, więc się nie zmienia).
const CACHE = "habits-v12";
const SHELL = [
  "./", "index.html", "css/styles.css", "css/themes.css", "css/motion.css", "manifest.webmanifest",
  "js/app.js", "js/dates.js", "js/i18n.js", "js/themes.js", "js/firebase-config.js", "js/store-local.js", "js/store-firebase.js",
  "fonts/ultra.woff", "fonts/young-serif.woff", "fonts/jost.woff", "fonts/archivo-black.woff", "fonts/archivo.woff", "fonts/fredoka.woff", "fonts/nunito.woff",
  "icons/icon-192.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  if ((url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) ||
      url.hostname === "images.unsplash.com") {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        // zdjęcia z Unsplash przychodzą jako „opaque” (status 0) — też je zapamiętujemy
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
