const CACHE_PREFIX = 'kids-games-';
const APP_VERSION = '2026.10.06.10';
const CACHE_NAME = `${CACHE_PREFIX}v${APP_VERSION}`;
const APP_BASE_URL = new URL('./', self.location);
const APP_SHELL = [
  '',
  'index.html',
  'pages/auth/index.html',
  'pages/auth/auth.js',
  'pages/auth/auth.css',
  'pages/index/index.html',
  'pages/index/index.js',
  'pages/index/index.css',
  'pages/games/index.html',
  'pages/games/games.js',
  'pages/games/games.css',
  'pages/common.css',
  'pages/game-controls.css',
  'pages/common.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
].map(path => new URL(path, APP_BASE_URL).toString());

function isFirebaseConfig(url) {
  return url.origin === self.location.origin && url.pathname.endsWith('/firebase-config.json');
}

function isStaticAsset(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (request.destination && ['document', 'script', 'style', 'image', 'font'].includes(request.destination)) {
    return true;
  }
  return /\.(?:html?|css|m?js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf)$/i.test(url.pathname);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async appUrl => {
      const response = await fetch(appUrl, { cache: 'reload' });
      if (!response.ok) throw new Error(`Unable to precache ${appUrl}: ${response.status}`);
      await cache.put(appUrl, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const previousAppCaches = keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
    await Promise.all(previousAppCaches.map(key => caches.delete(key)));
    await self.clients.claim();

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(client => client.postMessage({
      type: 'APP_UPDATE_AVAILABLE',
      version: APP_VERSION
    }));
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (request.cache === 'no-store' || isFirebaseConfig(url) || url.origin !== self.location.origin) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (url.pathname.endsWith('/manifest.webmanifest')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const refresh = fetch(request, { cache: 'no-cache' }).then(async response => {
        if (response.ok) await cache.put(request, response.clone());
        return response;
      });

      if (cached) {
        event.waitUntil(refresh.catch(error => {
          console.error('Unable to refresh the app manifest:', error);
        }));
        return cached;
      }
      return refresh;
    })());
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request, { cache: 'reload' });
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  event.respondWith(fetch(request, { cache: 'no-store' }));
});
