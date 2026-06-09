const CACHE = 'shanxiang-v3'
const ASSETS = ['/', 'index.html', 'css/style.css', 'js/peaks.js', 'js/astro.js', 'js/api.js', 'js/app.js', 'manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))))
})

self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.open-meteo.com') || e.request.url.includes('devapi.qweather.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })))
    return
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
})
