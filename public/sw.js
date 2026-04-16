// Service Worker for AMBC Club PWA
// Advanced caching strategy: Stale-While-Revalidate for assets, Network-First for HTML

const CACHE_VERSION = "ambc-club-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  "/",
  "/login",
  "/ambc-logo.png",
  "/manifest.json",
  "/favicon.ico",
  "/bowling-pattern.svg"
];

// Install event - pre-cache critical assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker v3...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Pre-caching static assets");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting(); // Activate immediately
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith("ambc-club-") && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - handle different strategies based on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests completely (Cache API only supports GET)
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests (e.g., Supabase API, external fonts)
  if (url.origin !== location.origin) {
    return;
  }

  // 1. API routes - Network Only (don't cache sensitive data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline - API not available" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // 2. Images - Stale-While-Revalidate
  // Return cached image instantly, then update cache in background
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request.clone()).then((networkResponse) => {
          // Only cache complete responses (200-299), not partial (206)
          if (networkResponse && networkResponse.ok && networkResponse.status !== 206) {
            const responseToCache = networkResponse.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((err) => {
          // If network fails, return cached or fetch will handle it
          console.log('[SW] Image fetch failed:', err.message);
          return cachedResponse;
        });

        // Return cached immediately if exists, else wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Next.js static assets (_next/*) - Stale-While-Revalidate
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request.clone()).then((networkResponse) => {
          // Only cache complete responses (200-299), not partial (206)
          if (networkResponse && networkResponse.ok && networkResponse.status !== 206) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Return cached or let it fail naturally
          return cachedResponse;
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. HTML pages & Navigations - Network First, fallback to Cache
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request.clone())
        .then((response) => {
          // Always pass through the network response if we got one
          if (response && response.status < 500) {
            // Cache successful navigations (200-299, 300-399, 400-499) - exclude partial (206)
            if (response.ok && response.status !== 206) {
              const clone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, clone);
              }).catch(() => {});
            }
            return response;
          }
          
          // For 500+ errors, try cache first, then fallback
          return caches.match(request).then((cached) => {
            return cached || response;
          });
        })
        .catch((err) => {
          console.log('[SW] Navigation fetch failed (offline?):', err.message);
          // Only show offline page if truly offline (no network)
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Return offline fallback page only for network errors
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Offline - AMBC Club</title><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);color:#0369a1;text-align:center;padding:20px;}h2{font-size:1.5rem;margin:0 0 1rem;}p{font-size:1rem;margin:0.5rem 0;max-width:400px;line-height:1.6;}.icon{font-size:3rem;margin-bottom:1rem;}</style></head><body><div class="icon">🔴</div><h2>Aplikasi Offline</h2><p>Tiada sambungan internet. Sila semak capaian data/Wi-Fi anda dan cuba sebentar lagi.</p><p style="margin-top:2rem;font-size:0.9rem;opacity:0.7;">AMBC Club</p></body></html>', 
              { 
                status: 503, 
                statusText: "Service Unavailable",
                headers: { 
                  'Content-Type': 'text/html; charset=utf-8',
                  'Cache-Control': 'no-store'
                } 
              }
            );
          });
        })
    );
    return;
  }

  // 5. Default - Network First, let errors pass through naturally
  event.respondWith(
    fetch(request.clone())
      .then((response) => {
        // Cache successful responses - exclude partial (206)
        if (response && response.ok && response.status !== 206) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
          }).catch(() => {});
        }
        // Always return the network response (even if it's an error)
        return response;
      })
      .catch(() => {
        // Only use cache fallback for network errors (offline)
        return caches.match(request);
      })
  );
});

// Push Notification Handler
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");
  
  let notificationData = {
    title: "AMBC Club",
    body: "Notifikasi baru dari AMBC Club",
    icon: "/ambc-logo.png",
    badge: "/ambc-logo.png",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: [
      { action: "open", title: "Buka" },
      { action: "close", title: "Tutup" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/member";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handler (for communication with main thread)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});