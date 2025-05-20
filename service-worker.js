// Nombre del cache para almacenar recursos
const CACHE_NAME = 'notification-app-v3';

// Variables para notificaciones recurrentes
let recurringNotifications = {};
let recurringIntervals = {};

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js',
        '/images/perrito.png',
        '/sound.mp3'
      ]);
    })
  );

  // Activar inmediatamente sin esperar a que se cierre la página
  self.skipWaiting();
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
    }).then(() => {
      // Tomar el control inmediatamente
      return self.clients.claim();
    }).then(() => {
      // Notificar a todos los clientes que el Service Worker está activo
      return self.clients.matchAll().then(clients => {
        return Promise.all(clients.map(client => {
          return client.postMessage({
            action: 'serviceWorkerActivated',
            timestamp: Date.now()
          });
        }));
      });
    }).then(() => {
      // Restaurar notificaciones recurrentes si existen
      try {
        // Intentar recuperar configuración de notificaciones recurrentes
        self.clients.matchAll().then(clients => {
          if (clients.length > 0) {
            // Pedir a un cliente que envíe la configuración de notificaciones recurrentes
            clients[0].postMessage({
              action: 'requestRecurringNotificationSettings'
            });
          }
        });
      } catch (error) {
        console.error('Error al restaurar notificaciones recurrentes:', error);
      }
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

  // Programar una notificación para un momento específico
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
        vibrate: [200, 100, 200], // Patrón de vibración
        sound: 'sound.mp3', // Sonido (si el navegador lo soporta)
        requireInteraction: true, // Mantener la notificación hasta que el usuario interactúe
        tag: `notification-${notificationData.id}`, // Etiquetar para poder actualizar en lugar de mostrar múltiples
        data: {
          id: notificationData.id,
          timestamp: Date.now()
        }
      });

      // Enviar mensaje a todos los clientes para confirmar que la notificación fue enviada
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            action: 'notificationSent',
            notificationId: notificationData.id,
            timestamp: Date.now()
          });
        });
      });
    }, delay);
  }

  // Configurar notificación recurrente
  else if (event.data.action === 'setupRecurringNotification') {
    const notificationData = event.data.notification;
    const notificationId = notificationData.id;

    console.log(`Configurando notificación recurrente con ID: ${notificationId}`);

    // Guardar la configuración
    recurringNotifications[notificationId] = notificationData;

    // Detener intervalo anterior si existe
    if (recurringIntervals[notificationId]) {
      clearInterval(recurringIntervals[notificationId]);
      delete recurringIntervals[notificationId];
    }

    // Configurar nuevo intervalo
    recurringIntervals[notificationId] = setInterval(() => {
      console.log(`Enviando notificación recurrente: ${notificationId}`);

      // Mostrar notificación
      self.registration.showNotification(notificationData.title, {
        body: notificationData.message,
        icon: notificationData.imageUrl || '/images/perrito.png',
        badge: '/images/badge-icon.png',
        vibrate: [200, 100, 200],
        sound: 'sound.mp3',
        requireInteraction: true,
        tag: `recurring-${notificationId}`,
        renotify: true,
        data: {
          id: notificationId,
          timestamp: Date.now(),
          recurring: true
        }
      });

      // Notificar a todos los clientes
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            action: 'notificationSent',
            notificationId: notificationId,
            timestamp: Date.now(),
            recurring: true
          });
        });
      });
    }, notificationData.interval);

    // Enviar confirmación
    event.source.postMessage({
      action: 'recurringNotificationSetup',
      notificationId: notificationId,
      success: true
    });
  }

  // Detener notificación recurrente
  else if (event.data.action === 'stopRecurringNotification') {
    console.log('Deteniendo todas las notificaciones recurrentes');

    // Detener todos los intervalos
    Object.keys(recurringIntervals).forEach(id => {
      clearInterval(recurringIntervals[id]);
      delete recurringIntervals[id];
      delete recurringNotifications[id];
    });

    // Enviar confirmación
    if (event.source) {
      event.source.postMessage({
        action: 'recurringNotificationsStopped',
        success: true
      });
    }
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
