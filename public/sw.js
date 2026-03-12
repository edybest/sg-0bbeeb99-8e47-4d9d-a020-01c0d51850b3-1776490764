// Service Worker for AMBC Club PWA
// Enhanced caching strategy for Next.js app with offline support

const CACHE_VERSION = "ambc-club-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  "/",
  "/login",
  "/member",
  "/ambc-logo.png",
  "/manifest.json",
  "/favicon.ico"
];

// Install event - pre-cache critical assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
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
          if (cacheName.startsWith("ambc-club-") && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE) {
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

// Fetch event - serve from cache with network fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and chrome-extension
  if (url.origin !== location.origin) {
    return;
  }

  // API routes - network first, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache API responses for now (can be enhanced later)
          return response;
        })
        .catch(() => {
          return new Response(
            JSON.stringify({ error: "Offline - API not available" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        })
    );
    return;
  }

  // Images - cache first, network fallback
  if (request.destination === "image") {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Next.js static assets (_next/*) - cache first
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // HTML pages - network first, cache fallback
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigations
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Last resort - serve offline page or root
            return caches.match("/");
          });
        })
    );
    return;
  }

  // Default - try network, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
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

// Background Sync (for future offline support)
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);
  if (event.tag === "sync-notifications") {
    event.waitUntil(
      // Future: sync offline actions when back online
      Promise.resolve()
    );
  }
});

// Message handler (for communication with main thread)
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);
  
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === "CACHE_URLS") {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls || []);
      })
    );
  }
});