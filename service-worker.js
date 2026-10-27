// You don't need to change this for normal updates: the app always asks
// for the newest files first (see the fetch section at the bottom). Bump
// it only when files move or get renamed, so phones drop their old copies.
const CACHE_NAME = 'lovinglylost-shell-v15';

// On a slow connection, wait this long for fresh files before using the
// saved copies instead.
const NETWORK_TIMEOUT_MS = 4000;

// Saved on install so the app opens offline, even on a first visit.
// Every file listed here must exist, or the update won't install.
const APP_SHELL = [
    './',
    './index.html',
    './about.html',
    './contact.html',
    './updates.html',
    './manifest.webmanifest',

    './css/app-style.css',
    './css/site-nav.css',
    './css/site-pages.css',
    './css/map-reveal.css',
    './css/intro.css',
    './css/theme.css',
    './css/whats-new.css',
    './css/saved-places.css',

    './JavaScript/site-nav.js',
    './JavaScript/intro.js',
    './JavaScript/theme.js',
    './JavaScript/updates.js',
    './JavaScript/whats-new.js',
    './JavaScript/contact-page.js',
    './JavaScript/ProgressiveWebApp-Register.js',

    './Map/Main-Launch.js',
    './Map/Map.js',
    './Map/state-and-data.js',
    './Map/Routing-Location.js',
    './Map/CategoryIcons.js',
    './Map/CategoryFilter.js',
    './Map/MapReveal.js',
    './Map/PlaceAutocomplete.js',
    './Map/maptoken-config.js',
    './Map/road-preferences.js',
    './Map/category-check.js',

    './account/account-nav.js',
    './account/place-lists.js',

    './images/decor-roads-hearts.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png'
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

// Every file from this site: try the internet first so a new push shows up
// on the next refresh, keep a copy of whatever arrives for offline use, and
// fall back to that copy when there's no connection (or it's very slow).
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    if (event.request.method !== 'GET') return;
    event.respondWith(networkFirst(event.request));
});

async function networkFirst(request){
    const cache = await caches.open(CACHE_NAME);
    try {
        // cache: 'no-cache' makes the browser check with GitHub for a newer
        // copy instead of reusing one it saved minutes ago.
        const response = await withTimeout(fetch(request.url, { cache: 'no-cache' }), NETWORK_TIMEOUT_MS);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (err){
        const saved = await cache.match(request, { ignoreSearch: true });
        if (saved) return saved;
        if (request.mode === 'navigate'){
            const home = await cache.match('./index.html');
            if (home) return home;
        }
        return Response.error();
    }
}

// Gives up on a request that takes longer than ms milliseconds.
function withTimeout(promise, ms){
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timed out')), ms);
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}
