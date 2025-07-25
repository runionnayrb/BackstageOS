// BackstageOS Service Worker  
// Version 5.0.0 - NUCLEAR CACHE BYPASS

const CACHE_NAME = 'backstageos-v5-' + Date.now();
const STATIC_CACHE_NAME = 'backstageos-static-v5-' + Date.now();
const DYNAMIC_CACHE_NAME = 'backstageos-dynamic-v5-' + Date.now();

// Core files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/uploads/favicon-1751583712399.png',
  '/manifest.json'
];

// API endpoints to cache for offline access
const CACHEABLE_APIS = [
  '/api/user',
  '/api/projects',
  '/api/reports',
  '/api/notes'
];

// Install event - BYPASS ALL CACHING
self.addEventListener('install', event => {
  console.log('[SW] Installing BackstageOS Service Worker v5.0.0 - NUCLEAR CACHE BYPASS');
  
  // Skip all caching and force immediate activation
  event.waitUntil(self.skipWaiting());
});

// Activate event - DESTROY ALL CACHES
self.addEventListener('activate', event => {
  console.log('[SW] Activating BackstageOS Service Worker v5.0.0 - NUCLEAR OPTION');
  
  event.waitUntil(
    Promise.all([
      // Delete EVERY single cache - no exceptions
      caches.keys().then(cacheNames => {
        console.log('[SW] NUCLEAR: Destroying all caches:', cacheNames);
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('[SW] NUCLEAR: Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Take control immediately
      self.clients.claim()
    ])
  );
  
  // Force reload all clients immediately
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      console.log('[SW] NUCLEAR: Force reloading client');
      client.postMessage({
        type: 'FORCE_RELOAD',
        version: '5.0.0',
        message: 'NUCLEAR CACHE CLEAR - RELOADING NOW'
      });
    });
  });
});

// Fetch event - NUCLEAR CACHE BYPASS
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }
  
  console.log('[SW] NUCLEAR: Always fetching fresh from network:', request.url);
  
  // ALWAYS fetch fresh - NO CACHING AT ALL
  event.respondWith(
    fetch(request.url + (request.url.includes('?') ? '&' : '?') + 'v=' + Date.now())
      .catch(() => {
        // Fallback to regular fetch if cache-busting fails
        return fetch(request);
      })
  );
});

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for offline access
    if (networkResponse.ok) {
      // Only cache specific API endpoints
      const url = new URL(request.url);
      if (CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', request.url);
    
    // Fall back to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Add offline header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-From', 'cache');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    // Return offline response for critical endpoints
    if (request.url.includes('/api/user')) {
      return new Response(JSON.stringify({ 
        offline: true, 
        message: 'You are currently offline' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle app routes with network-first, SPA fallback
async function handleAppRoute(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for app route, serving SPA shell');
    
    // Fall back to cached index.html for SPA routing
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedApp = await cache.match('/');
    
    if (cachedApp) {
      return cachedApp;
    }
    
    throw error;
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncPendingReports());
  }
});

// Sync pending reports when connection is restored
async function syncPendingReports() {
  try {
    // Get pending reports from IndexedDB (to be implemented)
    console.log('[SW] Syncing pending reports...');
    
    // This will be expanded when we implement offline functionality
    // For now, just log that sync is available
    
    // Notify clients that sync completed
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { reportsCount: 0 }
      });
    });
  } catch (error) {
    console.error('[SW] Failed to sync reports:', error);
  }
}

// Handle push notifications (for future implementation)
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New update from BackstageOS',
      icon: '/uploads/favicon-1751583712399.png',
      badge: '/uploads/favicon-1751583712399.png',
      tag: data.tag || 'backstageos-notification',
      data: data.url || '/',
      actions: [
        {
          action: 'open',
          title: 'Open BackstageOS'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'BackstageOS', options)
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data || '/';
    
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        // Check if BackstageOS is already open
        const existingClient = clients.find(client => 
          client.url.includes(urlToOpen) && 'focus' in client
        );
        
        if (existingClient) {
          return existingClient.focus();
        }
        
        // Open new window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    );
  }
});