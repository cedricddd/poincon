const CACHE_NAME = 'poincon-app-v2'
const API_CACHE = 'poincon-api-v2'
const IMAGE_CACHE = 'poincon-images-v2'

// Uniquement les vrais fichiers statiques (pas les pages SSR Next.js)
const STATIC = [
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
            const resClone = res.clone()
            caches.open(API_CACHE).then(c => c.put(request, resClone))
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
          return fetch(request)
            .then(res => {
              if (res.status === 200) {
                cache.put(request, res.clone())
              }
              return res
            })
            .catch(() => caches.match(request) || new Response('Image not found', { status: 404 }))
        })
      })
    )
    return
  }

  // HTML pages: network-first with offline fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.status === 200) {
            const resClone = res.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, resClone))
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
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request)
          .then(res => {
            if (res.ok && request.method === 'GET') {
              const resClone = res.clone()
              caches.open(CACHE_NAME).then(c => c.put(request, resClone))
            }
            return res
          })
          .catch(() => caches.match('/offline'))
      })
    )
    return
  }

  // Default: network-first
  e.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request)
      return cached || new Response('Offline', { status: 503 })
    })
  )
})
