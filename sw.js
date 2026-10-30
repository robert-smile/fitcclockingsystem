// ====================================================================
// VARSYS PWA - PRODUCTION SERVICE WORKER (sw.js)
// ====================================================================

const CACHE_NAME = 'varsys-v3.1.19'; // 🟢 Ibomba ang version para mag-update sa phone

const ASSETS = [
    './',
    'index.html',
    'types.html',
    'others.html',
    'takeimg.html',
    'takeimg2.html',
    'camera.html',
    'camera2.html',
    'mydetails.html',
    'singlereportdets.html',
    '2way.html',
    'input.html',
    'scanner.html',
    'dataforqr.html',
    'accsaved.html',
    'video.html',
    'reports.html',
    'manualreports.html',
    'qrsscannedreports.html',

    // OFFLINE MODE MODULES & PAGES
    'functionoffline.html',
    'offlinetakeimg.html',
    'offlinetakeimg2.html',
    'offlinedeliver.html',
    'offlineinput.html',

    // Styles & Scripts
    'style.css',
    'report.css',
    'summary.css',
    'common.js',
    'offline.js',
    'functionoffline.js',
    'manifest.json',

    // UI & Incident Images
    'logoiconphone.png',
    'Images/logo.png',
    'Images/logo3.png',
    'Images/angled.png',
    'Images/multiple.png',
    'Images/rear.png',
    'Images/headon.png',
    'Images/pedestrian.png',
    'Images/tbone.png',
    'Images/parking.png',
    'Images/Selfaccident.png',
    'Images/acn.png',
    'Images/vandalize.png',
    'Images/hitandrun.png',
    'Images/animae.png',
    'Images/details.png',
    'Images/coldet.png',
    'Images/front.png',
    'Images/right.png',
    'Images/likod.png',
    'Images/left.png',

    // External Libraries & Fonts
    'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap'
];

// 🟢 SMART TIMEOUT FUNCTION PARA SA NAPAKABAGAL NA INTERNET
function fetchWithTimeout(request, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Network request timed out due to slow connection'));
        }, timeout);

        fetch(request).then(
            response => {
                clearTimeout(timer);
                resolve(response);
            },
            err => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}

self.addEventListener('install', (event) => {
    console.log('[SW Engine] Installing cache version:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const asset of ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn(`[SW Engine] Skipped/Failed to cache asset: ${asset}`, err);
                }
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[SW Engine] Activating new Service Worker version:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 🟢 MESSAGE LISTENER (Dito nakikinig ang SW sa mga utos galing sa reports.html tulad ng Badge Update)
self.addEventListener('message', (event) => {
    if (event.data) {
        if (event.data.type === 'SKIP_WAITING') {
            self.skipWaiting();
        }

        // Pagtanggap ng unread count para i-update ang badge sa labas ng app icon
        if (event.data.type === 'UPDATE_APP_BADGE') {
            const count = event.data.count;
            if ('setAppBadge' in self.registration) {
                if (count > 0) {
                    self.registration.setAppBadge(count).catch(err => console.log('SW badge error:', err));
                } else {
                    if ('clearAppBadge' in self.registration) {
                        self.registration.clearAppBadge().catch(err => console.log('SW clear badge error:', err));
                    }
                }
            }
        }
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') {
        return;
    }

    if (
        url.pathname.includes('version.json') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('cloudinary.com')
    ) {
        return;
    }

    // 🟢 OFFLINE-FIRST / CACHE-FIRST STRATEGY PARA SA FAST LOADING KAHIT MAHINA ANG WIFI
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                // 1. Hanapin muna agad sa cache para mabilis bumukas nang walang hintay
                const cachedResponse = await cache.match(event.request);

                // 2. Gumawa ng network fetch sa background para sa update
                const networkFetch = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Ignore network error kung talagang offline o walang masagap
                });

                // Kung may nakitang cache, ibigay agad sa user nang hindi naghihintay sa net!
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Kung walang cache (unang beses pa lang), saka lang umasa sa network fetch o fallback sa index.html
                try {
                    return await networkFetch;
                } catch (err) {
                    const filename = url.pathname.split('/').pop() || 'index.html';
                    const filenameMatch = await cache.match(filename) || await cache.match('/' + filename);
                    if (filenameMatch) return filenameMatch;
                    return cache.match('index.html') || cache.match('/index.html');
                }
            })
        );
        return;
    }
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0) &&
                    (networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('image')) {
                    return caches.match('/Images/logo.png');
                }
            });
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW Engine] Notification clicked:', event.notification);
    event.notification.close();

    const relativeUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : './';
    const targetUrl = new URL(relativeUrl, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});