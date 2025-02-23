const CACHE_NAME = 'dashboard-cache-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/static/styles/main.css',
        // Add other static assets
      ])
    })
  )
}) 