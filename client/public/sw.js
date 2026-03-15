// BackstageOS Service Worker
// Version 1.0.0

const CACHE_NAME = 'backstageos-v1';
const STATIC_CACHE_NAME = 'backstageos-static-v1';
const DYNAMIC_CACHE_NAME = 'backstageos-dynamic-v1';

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

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Installing BackstageOS Service Worker');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating BackstageOS Service Worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Never intercept API requests - let them go directly to the server
  // This ensures cookies/credentials are properly handled
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Handle different types of requests
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    // Static assets - Cache First
    event.respondWith(handleStaticAsset(request));
  } else if (url.pathname.endsWith('.js') || 
             url.pathname.endsWith('.css') || 
             url.pathname.endsWith('.png') || 
             url.pathname.endsWith('.jpg') || 
             url.pathname.endsWith('.svg')) {
    // Other static resources - Cache First
    event.respondWith(handleStaticAsset(request));
  } else {
    // App routes - Network First with SPA fallback
    event.respondWith(handleAppRoute(request));
  }
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