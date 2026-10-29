const CACHE_NAME = 'fitc-cache-v5';
const assets = [
  './',
  './sample.html',
  './login.html',
  './instruction.html',
  './FITCL.png',
  './manifest.json'
];

// 1. INSTALL - I-cache ang lahat ng kailangan at mag-update agad
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching new assets');
      return cache.addAll(assets);
    })
  );
});

// 2. ACTIVATE - Burahin ang lumang cache at kontrolin agad ang mga pahina
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. FETCH - Smart Routing Strategy para sa Instruction vs Login
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Kung hihilingin ang root/main page (./) o index.html
  if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      (async () => {
        // Tinitingnan natin kung ang kliyente ay tumatakbo bilang PWA (Standalone) o browser tab lang
        const matchingClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        const isStandalone = matchingClients.some(client => client.displayMode === 'standalone' || window.matchMedia('(display-mode: standalone)').matches);

        // Kung naka-install na at bukas bilang App -> I-serve ang login.html
        // Kung binuksan lang sa web browser link -> I-serve ang instruction.html
        const targetPage = isStandalone ? './login.html' : './instruction.html';

        try {
          const netRes = await fetch(e.request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(e.request, netRes.clone());
          return netRes;
        } catch (err) {
          const cachedResponse = await caches.match(targetPage);
          return cachedResponse || caches.match('./index.html');
        }
      })()
    );
    return;
  }

  // Standard Network First strategy para sa ibang files (images, css, login.html, instruction.html, etc.)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});