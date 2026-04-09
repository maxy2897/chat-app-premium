const CACHE_NAME = 'max-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo.png'
];

self.addEventListener('install', (event) => {
    // Forzar activación inmediata del nuevo Service Worker
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Limpiar cachés antiguas (como nexus-v1) al activarse
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Estrategia Network First (prioriza la red, si falla usa la caché)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Si la respuesta es de la red, actualizamos la caché copia
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Si la red falla (offline), usamos la caché
                return caches.match(event.request);
            })
    );
});
