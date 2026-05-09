const CACHE_NAME = 'poincon-app-v1'
const API_CACHE = 'poincon-api-v1'
const IMAGE_CACHE = 'poincon-images-v1'

const STATIC = [
  '/',
  '/app/clock',
  '/app/time-off',
  '/app/rtt',
  '/app/reports',
  '/offline',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
]

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(c => c.addAll(STATIC).catch(() => {
        console.log('Some static assets could not be cached')
      })),
    ]).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => ![CACHE_NAME, API_CACHE, IMAGE_CACHE].includes(k))
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e

  // Ignorer tout ce qui n'est pas http/https
  if (!request.url.startsWith('http')) return

  const url = new URL(request.url)

  // API: network-first, cache on success
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.status === 200 && request.method === 'GET') {
            caches.open(API_CACHE).then(c => c.put(request, res.clone()))
          }
          return res
        })
        .catch(() => {
          if (request.method === 'GET') {
            return caches.match(request).then(cached => {
              if (cached) return cached
              // Fallback: indicate offline
              if (url.pathname.includes('/api/clock')) {
                return new Response(
                  JSON.stringify({ offline: true }),
                  { status: 503, headers: { 'Content-Type': 'application/json' } }
                )
              }
              return new Response('Offline', { status: 503 })
            })
          }
          // POST/PUT/DELETE: notify offline
          return new Response(
            JSON.stringify({ offline: true, error: 'Vous êtes hors ligne' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        })
    )
    return
  }

  // Images: cache-first
  if (request.destination === 'image') {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(cached => {
          if (cached) return cached
          return fetch(request).then(res => {
            if (res.status === 200) {
              cache.put(request, res.clone())
            }
            return res
          })
        })
      }).catch(() => caches.match(request))
    )
    return
  }

  // HTML pages: network-first with offline fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
          }
          return res
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('/offline')
          )
        )
    )
    return
  }

  // Static assets (JS, CSS, fonts): cache-first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok && request.method === 'GET') {
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
        }
        return res
      }))
    )
    return
  }

  // Default: network-first
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})
