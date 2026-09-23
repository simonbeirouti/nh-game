const CACHE_NAME = "colabs-games-static-v4"
const OFFLINE_URL = "/offline"
const PRECACHE = [
  OFFLINE_URL,
  "/icon-192.svg",
  "/icon-512.svg",
  "/apple-touch-icon.svg",
]

async function cacheOfflineShell() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(PRECACHE)
  const response = await fetch(OFFLINE_URL, { cache: "no-store" })
  if (!response.ok) return
  await cache.put(OFFLINE_URL, response.clone())
  const html = await response.text()
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith("/_next/static/"))
  await Promise.all(
    [...new Set(assets)].map(async (asset) => {
      const assetResponse = await fetch(asset)
      if (assetResponse.ok) await cache.put(asset, assetResponse)
    })
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflineShell())
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE_NAME &&
                (key.startsWith("colabs-games-static-") ||
                  key.startsWith("nh-games-static-"))
            )
            .map((key) => caches.delete(key))
        )
      )
  )
  self.clients.claim()
})

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CLEAR_PRIVATE_STATE") return
  // Private application data is kept in IndexedDB by the page and cleared
  // before sign-out. Cache Storage contains only the public offline shell.
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return cache.match(OFFLINE_URL)
      })
    )
    return
  }

  const isNextStaticAsset =
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/static/")
  const isPrecachedAsset =
    url.origin === self.location.origin && PRECACHE.includes(url.pathname)
  const safeStaticAsset = isNextStaticAsset || isPrecachedAsset
  if (!safeStaticAsset || event.request.method !== "GET") return

  if (isNextStaticAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          return (await cache.match(event.request)) ?? Response.error()
        })
    )
    return
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then(
        (cached) =>
          cached ??
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              void cache.put(event.request, copy)
            }
            return response
          })
      )
    )
  )
})

self.addEventListener("push", (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icon-192.svg",
      badge: data.badge || "/icon-192.svg",
      data: { url: data.url || "/dashboard" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  let target = new URL(
    event.notification.data?.url || "/dashboard",
    self.location.origin
  )
  if (target.origin !== self.location.origin) {
    target = new URL("/dashboard", self.location.origin)
  }
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(
          (client) => new URL(client.url).origin === self.location.origin
        )
        if (existing) {
          existing.navigate(target.href)
          return existing.focus()
        }
        return self.clients.openWindow(target.href)
      })
  )
})
