const CACHE_NAME = 'fitc-cache-v4'; // Binago natin sa v2 para mag-trigger ng update
const assets = [
  './',
  './index.html',
  './FITCL.png',
  './manifest.json'
];

// 1. INSTALL - Dito natin ilalagay ang skipWaiting para mag-update agad
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching new assets');
      return cache.addAll(assets);
    })
  );
});

// 2. ACTIVATE - Dito natin buburahin ang lahat ng lumang cache (v1)
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
  return self.clients.claim(); // Kontrolin agad ang page nang walang refresh
});

// 3. FETCH - Network First Strategy (Para laging fresh ang data kung may internet)
self.addEventListener('fetch', e => {
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