/* Momentum service worker — offline app shell. Bump CACHE on each release. */
const CACHE = 'momentum-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Navigations: network-first, fall back to cached app shell (works offline).
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { caches.open(CACHE).then(c => c.put('./index.html', r.clone())); return r; })
        .catch(() => caches.match('./index.html').then(m => m || caches.match('./')))
    );
    return;
  }
  // Everything else: cache-first, then network (and cache it).
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && r.status === 200 && (r.type === 'basic' || r.type === 'cors')) {
        const clone = r.clone(); caches.open(CACHE).then(c => c.put(req, clone));
      }
      return r;
    }).catch(() => hit))
  );
});
