// Basilisk ERP — Service Worker (PWA)
// Strategy: Network-first with offline fallback cache

const CACHE_NAME = 'basilisk-erp-v1'
const OFFLINE_URL = '/offline.html'

// Assets to pre-cache on install
const PRE_CACHE = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip chrome-extension and non-http(s) requests
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for navigation requests
        if (response.ok && event.request.mode === 'navigate') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL)
        }
        return caches.match(event.request)
      })
  )
})
