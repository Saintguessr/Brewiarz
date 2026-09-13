// Service worker — cache'uje wyłącznie powłokę aplikacji (HTML/CSS/JS),
// nie ingeruje w żądania do brewiarz.pl ani do Firebase/gstatic.
//
// WAŻNE PRZY AKTUALIZACJACH: podbij CACHE_VERSION przy każdej zmianie
// plików powłoki, żeby przeglądarki wykryły nową wersję service workera
// (sama zmiana treści tego pliku już to robi automatycznie, bo przeglądarka
// porównuje bajt po bajcie plik sw.js przy każdym `registration.update()`).
const CACHE_VERSION = "v4";
const CACHE_NAME = `brewiarz-lg-shell-${CACHE_VERSION}`;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/firebase-sync.js",
  "./js/firebase-config.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Ważne: pobieramy pliki z { cache: "reload" }, żeby ominąć zwykły
      // dyskowy cache HTTP przeglądarki i zawsze zapisać w CacheStorage
      // naprawdę świeżą wersję z serwera — samo cache.addAll(SHELL_FILES)
      // mogłoby (w zależności od nagłówków Cache-Control serwera, np.
      // GitHub Pages) trafić w nieaktualną kopię z dysku.
      Promise.all(
        SHELL_FILES.map((url) => cache.add(new Request(url, { cache: "reload" })))
      )
    )
  );
  // Celowo NIE wołamy tu self.skipWaiting() — nowa wersja czeka, aż
  // użytkownik potwierdzi odświeżenie (patrz updateBanner w app.js),
  // żeby nie podmieniać aplikacji "pod ręką" w trakcie korzystania.
  // Dzięki temu, gdy już potwierdzi, w CacheStorage czeka na niego
  // kompletna, w pełni aktualna wersja powłoki aplikacji.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nigdy nie cache'ujemy zapytań do brewiarz.pl (zawsze aktualna treść na żywo)
  // ani do zewnętrznych CDN/Firebase — to obsługują ich własne mechanizmy.
  const isExternal =
    url.hostname.includes("brewiarz.pl") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseapp.com");
  if (isExternal || event.request.method !== "GET") return;

  // Stale-while-revalidate dla plików powłoki: pokaż od razu z cache
  // (szybko, działa offline), a w tle pobierz świeższą wersję na przyszłość.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response && response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => null);
      return cached || (await networkFetch) || new Response("Offline", { status: 503 });
    })
  );
});
