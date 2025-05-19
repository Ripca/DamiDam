// Nombre del cache para almacenar recursos
const CACHE_NAME = 'notification-app-v1';

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js'
      ]);
    })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
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

// Manejo de peticiones
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  console.log('Push recibido:', event);

  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.message || 'Notificación sin mensaje',
      icon: data.icon || '/images/perrito.png',
      badge: '/images/badge-icon.png',
      data: {
        url: data.url || '/'
      },
      actions: [
        {
          action: 'view',
          title: 'Ver'
        },
        {
          action: 'close',
          title: 'Cerrar'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Notificación', options)
    );
  }
});

// Manejo de mensajes desde la aplicación principal
self.addEventListener('message', (event) => {
  console.log('Mensaje recibido en el Service Worker:', event.data);

  // Manejar mensaje para activar inmediatamente el Service Worker
  if (event.data.type === 'SKIP_WAITING') {
    console.log('Activando nuevo Service Worker inmediatamente');
    self.skipWaiting();
    return;
  }

  if (event.data.action === 'scheduleNotification') {
    const notificationData = event.data.notification;
    const scheduledTime = new Date(notificationData.time).getTime();
    const currentTime = Date.now();
    const delay = Math.max(0, scheduledTime - currentTime);

    console.log(`Programando notificación para dentro de ${delay}ms`);

    setTimeout(() => {
      self.registration.showNotification(notificationData.title, {
        body: notificationData.message,
        icon: notificationData.icon || '/images/perrito.png',
        badge: '/images/badge-icon.png',
        data: {
          id: notificationData.id
        }
      });
    }, delay);
  }
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notificación clickeada:', event.notification);

  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : '/';

    event.waitUntil(
      clients.matchAll({type: 'window'}).then((windowClients) => {
        // Verificar si ya hay una ventana abierta y enfocarla
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Manejo del cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('Notificación cerrada:', event.notification);
});
