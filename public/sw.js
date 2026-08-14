// Service Worker for RabbitManager Push Notifications

const CACHE_NAME = 'rabbitmanager-v4';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Never cache API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
    );
    return;
  }

  // Network-first for other requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  console.log('[SW] Event data:', event.data);
  
  let notificationData = {
    title: 'CuniControl',
    body: 'Tienes una nueva notificación',
    url: '/home'
  };
  
  try {
    if (event.data) {
      const parsed = event.data.json();
      console.log('[SW] Parsed push data:', parsed);
      notificationData = parsed;
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    try {
      if (event.data) {
        console.log('[SW] Push data as text:', event.data.text());
      }
    } catch (e) {
      console.error('[SW] Error reading text:', e);
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: 'https://019bde5a-7925-762c-b579-d66b0faa5e14.mochausercontent.com/pwa-icon-192.png',
    badge: 'https://019bde5a-7925-762c-b579-d66b0faa5e14.mochausercontent.com/pwa-icon-192.png',
    tag: notificationData.tag || 'cunicontrol-notification',
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
    data: {
      url: notificationData.url || '/home',
      dateOfArrival: Date.now(),
      primaryKey: notificationData.tag || Date.now(),
      postId: notificationData.postId
    },
    actions: [
      {
        action: 'open',
        title: 'Ver'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };
  
  console.log('[SW] Notification options:', options);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('[SW] Notification displayed successfully');
      })
      .catch(error => {
        console.error('[SW] Error showing notification:', error);
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  // If user clicked "close" action, just close the notification
  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/home';

  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      console.log('[SW] Found clients:', clientList.length);
      
      // Try to find an existing window and focus it
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && 'focus' in client) {
          console.log('[SW] Focusing existing window');
          return client.focus().then(() => {
            // Navigate to the URL if possible
            if ('navigate' in client) {
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      
      // No existing window found, open a new one
      if (clients.openWindow) {
        console.log('[SW] Opening new window:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    }).catch(error => {
      console.error('[SW] Error handling notification click:', error);
    })
  );
});

// Handle notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});
