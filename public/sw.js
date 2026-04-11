const CACHE_VERSION = 'v2';
const CACHE_NAME = `ambc-club-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
};

// Route patterns and their strategies
const ROUTE_STRATEGIES = [
  // Static assets - Cache First (fastest)
  { pattern: /\.(js|css|woff2?|ttf|otf)$/, strategy: CACHE_STRATEGIES.CACHE_FIRST },
  { pattern: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/, strategy: CACHE_STRATEGIES.CACHE_FIRST },
  
  // API calls - Network First (fresh data)
  { pattern: /\/api\//, strategy: CACHE_STRATEGIES.NETWORK_FIRST },
  { pattern: /supabase\.co/, strategy: CACHE_STRATEGIES.NETWORK_FIRST },
  
  // Pages - Stale While Revalidate (balance speed + freshness)
  { pattern: /\/member\//, strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE },
  { pattern: /\/admin\//, strategy: CACHE_STRATEGIES.NETWORK_FIRST },
  
  // Auth pages - Network Only (always fresh)
  { pattern: /\/(login|signup)/, strategy: CACHE_STRATEGIES.NETWORK_ONLY },
];

// Essential resources to cache on install
const ESSENTIAL_CACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/ambc-logo.png',
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching essential resources');
      return cache.addAll(ESSENTIAL_CACHE);
    }).then(() => {
      console.log('[SW] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim clients
      self.clients.claim(),
      // Clean expired cache entries
      cleanExpiredCache(),
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Determine strategy for this request
  const strategy = getStrategy(url.pathname + url.search);

  // Apply strategy
  event.respondWith(
    applyStrategy(strategy, request).catch(() => {
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match(OFFLINE_URL);
      }
      throw new Error('Network request failed and no cache available');
    })
  );
});

// Get caching strategy for URL
function getStrategy(urlPath) {
  for (const route of ROUTE_STRATEGIES) {
    if (route.pattern.test(urlPath)) {
      return route.strategy;
    }
  }
  // Default strategy
  return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
}

// Apply caching strategy
async function applyStrategy(strategy, request) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
    
    default:
      return staleWhileRevalidate(request);
  }
}

// Cache First Strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    // Check if cache is expired
    const cacheTime = await getCacheTime(request.url);
    if (cacheTime && Date.now() - cacheTime < MAX_AGE) {
      return cached;
    }
  }
  
  // Fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      await setCacheTime(request.url);
    }
    return response;
  } catch (error) {
    // Return stale cache if network fails
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Network First Strategy
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      await setCacheTime(request.url);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // Fetch fresh data in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
      setCacheTime(request.url);
    }
    return response;
  });
  
  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// Cache time management using IndexedDB
function openCacheTimeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cache-times', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('times')) {
        db.createObjectStore('times');
      }
    };
  });
}

async function getCacheTime(url) {
  try {
    const db = await openCacheTimeDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('times', 'readonly');
      const store = tx.objectStore('times');
      const request = store.get(url);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function setCacheTime(url) {
  try {
    const db = await openCacheTimeDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('times', 'readwrite');
      const store = tx.objectStore('times');
      const request = store.put(Date.now(), url);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore errors
  }
}

// Clean expired cache entries
async function cleanExpiredCache() {
  try {
    const db = await openCacheTimeDB();
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const cacheTime = await getCacheTime(request.url);
      if (cacheTime && Date.now() - cacheTime > MAX_AGE) {
        await cache.delete(request);
        console.log('[SW] Deleted expired cache:', request.url);
      }
    }
  } catch (error) {
    console.error('[SW] Error cleaning cache:', error);
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending') {
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  // Implement background sync logic here
  console.log('[SW] Syncing pending requests...');
}

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'AMBC Club';
  const options = {
    body: data.message || 'You have a new notification',
    icon: '/ambc-logo.png',
    badge: '/ambc-logo.png',
    data: data,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// Message handler for cache control
self.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (data && data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      })
    );
  }
});

console.log('[SW] Service Worker loaded');