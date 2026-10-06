const CACHE_NAME = 'lovinglylost-shell-v1';

const APP_SHELL = [
    './',
    './index.html',
    './app-style.css',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './apple-touch-icon.png',
    './Maptoken-categories/Main-Launch.js',
    './Maptoken-categories/Map.js',
    './Maptoken-categories/state-and-data,js',
    './Maptoken-categories/Routing-Location.js',
    './Maptoken-categories/CategoryIcons.js',
    './Maptoken-categories/CategoryFilter.js',
    './Maptoken-categoreis/maptoken-config.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
        .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    if (event.request.method !== 'GET') return;

    if (event.request.mode === 'navigate'){

        event.respondWith(
            fetch(event.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});