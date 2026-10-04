const CACHE_NAME = 'kids-games-v19';
const APP_BASE_URL = new URL('./', self.location);
const APP_SHELL = [
  '',
  'index.html',
  'pages/auth/index.html',
  'pages/auth/auth.js',
  'pages/auth/auth.css',
  'pages/index/index.html',
  'pages/games/index.html',
  'pages/games/games.js',
  'pages/games/games.css',
  'pages/maze/index.html',
  'pages/maze/maze.css',
  'pages/maze/maze.js',
  'pages/draw/index.html',
  'pages/draw/draw.css',
  'pages/draw/draw.js',
  'pages/gas/index.html',
  'pages/gas/gas.css',
  'pages/gas/gas.js',
  'pages/gas/city.svg',
  'pages/gas/crossing.svg',
  'pages/frog/index.html',
  'pages/frog/frog.css',
  'pages/frog/frog.js',
  'pages/potion/index.html',
  'pages/potion/potion.css',
  'pages/potion/potion.js',
  'pages/robot/index.html',
  'pages/robot/robot.css',
  'pages/robot/robot.js',
  'pages/lesson/index.html',
  'pages/achievements/index.html',
  'pages/admin/index.html',
  'pages/common.css',
  'pages/common.js',
  'manifest.webmanifest',
  'icons/icon-192.svg',
  'icons/icon-512.svg'
].map(path => new URL(path, APP_BASE_URL).toString());

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const cloned = response.clone();
        const url = new URL(request.url);
        if (url.origin === self.location.origin && url.pathname.startsWith(new URL('pages/', APP_BASE_URL).pathname)) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
        }
        return response;
      }).catch(() => cached || Response.error());
    })
  );
});
