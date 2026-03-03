// Service Worker for PWA with Push Notifications
const CACHE_NAME = "ambc-club-v1";
const urlsToCache = [
  "/",
  "/login",
  "/member",
  "/ambc-logo.png"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch resources
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push Notification Handler
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "Notifikasi baru dari AMBC Club",
    icon: "/ambc-logo.png",
    badge: "/ambc-logo.png",
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification("AMBC Club", options)
  );
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/member")
  );
});