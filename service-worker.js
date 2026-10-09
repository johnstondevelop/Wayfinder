const CACHE_NAME = 'lovinglylost-shell-v5';

const APP_SHELL = [
    './',
    './index.html',
    './about.html',
    './contact.html',
    './app-style.css',
    './site-nav.css',
    './map-reveal.css',
    './site-pages.css',
    './site-nav.js',
    './contact-page.js',
    './ProgressiveWebApp-Register.js',
    './images/decor-roads-hearts.svg',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
    './Maptoken-categories/Main-Launch.js',
    './Maptoken-categories/Map.js',
    './Maptoken-categories/state-and-data.js',
    './Maptoken-categories/Routing-Location.js',
    './Maptoken-categories/CategoryIcons.js',
    './Maptoken-categories/CategoryFilter.js',
    './Maptoken-categories/MapReveal.js',
    './Maptoken-categories/PlaceAutocomplete.js',
    './Maptoken-categories/maptoken-config.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
                        // cache: 'reload' skips the browser's own short-term copies, so a
            // fresh version saves the files you just pushed, not ones from minutes ago.
            .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
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
                fetch(event.request).catch(() =>
                    caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
            )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});