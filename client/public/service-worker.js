// Service Worker for handling push notifications and system notifications
// This worker ensures notifications are delivered even when the app is closed

// Handle push events - main entry point for push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push event received');
  
  if (!event.data) {
    console.warn('[ServiceWorker] Push notification received but no data');
    return;
  }

  try {
    const data = event.data.json();
    
    // Ensure we have required fields
    const title = data.title || 'طلب جديد من Wasly';
    const body = data.body || 'لديك إشعار جديد';
    
    const options = {
      body: body,
      icon: '/wasly-icon.png',
      badge: '/wasly-badge.png',
      tag: data.tag || `notification-${Date.now()}`,
      requireInteraction: true, // Keep notification visible until user interacts
      vibrate: [200, 100, 200], // Vibration pattern for mobile devices
      sound: '/notification-sound.mp3', // Optional notification sound
      data: {
        url: data.url || '/driver/dashboard',
        orderId: data.orderId,
        orderData: data.orderData,
        timestamp: Date.now(),
      },
      // Action buttons for the notification
      actions: [
        {
          action: 'accept',
          title: 'قبول الطلب',
          icon: '/accept-icon.png'
        },
        {
          action: 'dismiss',
          title: 'تجاهل',
          icon: '/dismiss-icon.png'
        }
      ]
    };

    console.log('[ServiceWorker] Showing notification:', title);
    
    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('[ServiceWorker] Notification shown successfully');
        })
        .catch((error) => {
          console.error('[ServiceWorker] Failed to show notification:', error);
        })
    );
  } catch (error) {
    console.error('[ServiceWorker] Error handling push notification:', error);
    
    // Fallback: show a generic notification if JSON parsing fails
    try {
      const fallbackText = event.data.text();
      event.waitUntil(
        self.registration.showNotification('طلب جديد من Wasly', {
          body: fallbackText || 'لديك إشعار جديد',
          icon: '/wasly-icon.png',
          badge: '/wasly-badge.png',
          requireInteraction: true,
        })
      );
    } catch (fallbackError) {
      console.error('[ServiceWorker] Fallback notification also failed:', fallbackError);
    }
  }
});

// Handle notification click - open app or focus existing window
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/driver/dashboard';
  const orderId = event.notification.data.orderId;

  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          client.focus();
          // Send message to client about the notification action
          client.postMessage({
            type: 'notification-clicked',
            orderId: orderId,
            action: event.action,
          });
          return client;
        }
      }
      
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen).then((client) => {
          if (client) {
            client.postMessage({
              type: 'notification-clicked',
              orderId: orderId,
              action: event.action,
            });
          }
          return client;
        });
      }
    })
  );
});

// Handle notification action buttons
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'accept') {
    console.log('[ServiceWorker] Accept action triggered for order:', event.notification.data.orderId);
    event.notification.close();
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'notification-action',
            action: 'accept',
            orderId: event.notification.data.orderId,
          });
        });
      })
    );
  } else if (event.action === 'dismiss') {
    console.log('[ServiceWorker] Dismiss action triggered');
    event.notification.close();
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed:', event.notification.tag);
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle subscription requests from client
  if (event.data && event.data.type === 'SUBSCRIBE_TO_PUSH') {
    console.log('[ServiceWorker] Subscription request received');
    event.ports[0].postMessage({ success: true });
  }
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated');
  event.waitUntil(clients.claim());
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installed');
  self.skipWaiting();
});

// Handle fetch events - cache static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('/offline.html');
      })
  );
});

// Periodic background sync for checking notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-notifications') {
    console.log('[ServiceWorker] Background sync: checking notifications');
    event.waitUntil(
      fetch('/api/notifications/check')
        .then((response) => {
          console.log('[ServiceWorker] Notifications checked');
        })
        .catch((error) => {
          console.error('[ServiceWorker] Failed to check notifications:', error);
        })
    );
  }
});
