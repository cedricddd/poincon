const CACHE = 'poincon-v1'

const STATIC = [
  '/',
  '/app/clock',
  '/app/time-off',
  '/app/rtt',
  '/app/reports',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e

  // Ignorer tout ce qui n'est pas http/https (extensions Chrome, etc.)
  if (!request.url.startsWith('http')) return

  const url = new URL(request.url)

  // Ne pas mettre en cache les appels API
  if (url.pathname.startsWith('/api/')) return

  // Network first pour les navigations (pages HTML fraîches)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Cache first pour assets statiques (JS, CSS, images)
  e.respondWith(
    caches.match(request).then(cached => cached ?? fetch(request).then(res => {
      if (res.ok && request.method === 'GET') {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(request, clone))
      }
      return res
    }))
  )
})
