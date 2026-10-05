const CACHE_NAME = 'kids-games-v52';
const CACHE_PREFIX = 'kids-games-';
const APP_BASE_URL = new URL('./', self.location);
const APP_SHELL = [
  '',
  'index.html',
  'pages/auth/index.html',
  'pages/auth/auth.js',
  'pages/auth/auth.css',
  'pages/index/index.html',
  'pages/profile/index.html',
  'pages/profile/profile.css',
  'pages/profile/profile.js',
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
  'pages/gas/gas-3d.js',
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
  'pages/lesson/lesson.js',
  'pages/lesson/lesson.css',
  'pages/lesson/art/commands.svg',
  'pages/lesson/art/sequence.svg',
  'pages/lesson/art/loops.svg',
  'pages/lesson/art/conditions.svg',
  'pages/lesson/art/debugging.svg',
  'pages/achievements/index.html',
  'pages/admin/index.html',
  'pages/common.css',
  'pages/game-controls.css',
  'pages/common.js',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
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
      keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const isFreshContent = request.mode === 'navigate' || request.destination === 'script';

    if (!isFreshContent && cached) return cached;

    let response;
    try {
      response = await fetch(request);
    } catch (error) {
      if (cached) return cached;
      throw error;
    }

    const url = new URL(request.url);
    if (response.ok && url.origin === self.location.origin) {
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then(cache => cache.put(request, response.clone()))
          .catch(error => console.error('Unable to update the app cache:', error))
      );
    }
    return response;
  })());
});
