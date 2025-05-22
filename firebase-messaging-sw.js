// Firebase Cloud Messaging Service Worker

// Importar las bibliotecas de Firebase necesarias
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

console.log('[firebase-messaging-sw.js] Firebase scripts importados correctamente');

// Configuración de Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCdlbEHtxXLtCmh4lu4K9ZDycklg4XYSRw",
  authDomain: "notificaciones-7f993.firebaseapp.com",
  projectId: "notificaciones-7f993",
  storageBucket: "notificaciones-7f993.firebasestorage.app",
  messagingSenderId: "915887559942",
  appId: "1:915887559942:web:b4d1a34ec4fc1575a17a87",
  measurementId: "G-5QVBDNFCTZ"
});
console.log('[firebase-messaging-sw.js] Firebase inicializado correctamente');

// Inicializar Firebase Messaging
const messaging = firebase.messaging();
console.log('[firebase-messaging-sw.js] Firebase Messaging inicializado correctamente');

// Configurar el service worker para recibir notificaciones push
// La configuración principal está más abajo

// Variables para notificaciones programadas
let scheduledNotifications = [];
let notificationTimers = {};

// Asegurarse de que el service worker esté activo
self.addEventListener('install', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker instalado');

  // Activar inmediatamente sin esperar a que se cierre la página
  event.waitUntil(self.skipWaiting());
  console.log('[firebase-messaging-sw.js] skipWaiting llamado');
});

self.addEventListener('activate', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker activado');

  // Tomar control de todas las páginas inmediatamente y notificar
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[firebase-messaging-sw.js] Clients claimed');

      // Notificar a todas las ventanas que el service worker está activo
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            message: 'Service Worker está activo'
          });
        });

        // Restaurar notificaciones programadas
        return restoreScheduledNotifications();
      });
    })
  );
});

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Recibido mensaje en segundo plano:', payload);

  // Personalizar la notificación
  const notificationTitle = payload.notification?.title || 'Notificación';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: payload.notification?.icon || '/images/perrito.png',
    badge: '/images/badge-icon.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: 'push-notification-' + Date.now(), // Usar tag único para evitar reemplazar notificaciones
    renotify: true, // Notificar incluso si hay una notificación con la misma etiqueta
    data: {
      url: payload.data?.url || '/',
      timestamp: payload.data?.timestamp || Date.now(),
      id: 'fcm-' + Date.now()
    }
  };

  // Notificar a todas las ventanas que se recibió una notificación
  self.clients.matchAll({ type: 'window' }).then(clients => {
    if (clients.length > 0) {
      console.log('[firebase-messaging-sw.js] Notificando a', clients.length, 'ventanas abiertas');
      clients.forEach(client => {
        client.postMessage({
          action: 'notificationReceived',
          notification: {
            title: notificationTitle,
            body: notificationOptions.body,
            timestamp: Date.now(),
            id: notificationOptions.data.id
          }
        });
      });
    } else {
      console.log('[firebase-messaging-sw.js] No hay ventanas abiertas para notificar');
    }
  });

  // Mostrar la notificación
  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('[firebase-messaging-sw.js] Notificación mostrada correctamente');
    })
    .catch(error => {
      console.error('[firebase-messaging-sw.js] Error al mostrar notificación:', error);
    });
});
console.log('[firebase-messaging-sw.js] Handler de mensajes en segundo plano registrado');

// Manejar notificaciones push directamente
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push recibido:', event);

  if (event.data) {
    try {
      // Intentar parsear los datos
      const data = event.data.json();
      console.log('[firebase-messaging-sw.js] Datos de push:', data);

      // Mostrar notificación
      const title = data.notification?.title || 'Notificación';
      const options = {
        body: data.notification?.body || 'Tienes una nueva notificación',
        icon: data.notification?.icon || '/images/perrito.png',
        badge: '/images/badge-icon.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: 'push-notification-' + Date.now(),
        renotify: true,
        data: {
          url: data.data?.url || '/',
          timestamp: Date.now(),
          id: 'push-' + Date.now()
        }
      };

      // Notificar a todas las ventanas que se recibió una notificación
      const notifyClients = self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          console.log('[firebase-messaging-sw.js] Notificando a', clients.length, 'ventanas abiertas sobre push');
          clients.forEach(client => {
            client.postMessage({
              action: 'notificationReceived',
              notification: {
                title: title,
                body: options.body,
                timestamp: Date.now(),
                id: options.data.id
              }
            });
          });
        }
      });

      // Mostrar la notificación y notificar a los clientes
      event.waitUntil(
        Promise.all([
          self.registration.showNotification(title, options),
          notifyClients
        ])
      );
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error al procesar push:', error);

      // Mostrar notificación genérica
      event.waitUntil(
        self.registration.showNotification('Nueva notificación', {
          body: 'Tienes una nueva notificación',
          icon: '/images/perrito.png',
          badge: '/images/badge-icon.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          tag: 'push-notification-fallback',
          data: {
            timestamp: Date.now(),
            id: 'push-fallback-' + Date.now()
          }
        })
      );
    }
  }
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notificación clickeada:', event.notification);

  // Cerrar la notificación
  event.notification.close();

  // Obtener datos de la notificación
  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/';
  const notificationId = notificationData.id || 'unknown';

  console.log('[firebase-messaging-sw.js] Datos de notificación:', notificationData);
  console.log('[firebase-messaging-sw.js] URL a abrir:', url);

  // Notificar a todas las ventanas que se hizo clic en la notificación
  const notifyClients = self.clients.matchAll({ type: 'window' }).then(clients => {
    if (clients.length > 0) {
      console.log('[firebase-messaging-sw.js] Notificando a', clients.length, 'ventanas abiertas sobre clic en notificación');
      clients.forEach(client => {
        client.postMessage({
          action: 'notificationClicked',
          notification: {
            id: notificationId,
            timestamp: Date.now()
          }
        });
      });
    }
  });

  // Abrir o enfocar la ventana principal
  const focusOrOpenWindow = clients.matchAll({type: 'window'}).then((windowClients) => {
    // Verificar si ya hay una ventana abierta y enfocarla
    for (const client of windowClients) {
      if ('focus' in client) {
        return client.focus();
      }
    }
    // Si no hay ventana abierta, abrir una nueva
    if (clients.openWindow) {
      return clients.openWindow(url);
    }
  });

  // Esperar a que ambas promesas se completen
  event.waitUntil(Promise.all([notifyClients, focusOrOpenWindow]));
});

// Manejar mensajes desde la página
self.addEventListener('message', (event) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido desde la página:', event.data);

  if (event.data && event.data.action) {
    switch (event.data.action) {
      case 'scheduleNotification':
        scheduleNotification(event.data.notification);
        break;
      case 'cancelScheduledNotifications':
        cancelScheduledNotifications();
        break;
      case 'getScheduledNotifications':
        sendScheduledNotificationsToClient(event.source);
        break;
      case 'ping':
        console.log('[firebase-messaging-sw.js] Ping recibido:', event.data.message);
        // Responder al ping
        if (event.source) {
          event.source.postMessage({
            type: 'PING_RESPONSE',
            message: 'Pong desde el Service Worker',
            timestamp: Date.now()
          });
        }
        break;
    }
  }
});

// Programar una notificación
function scheduleNotification(notification) {
  if (!notification || !notification.title || !notification.interval) {
    console.error('[firebase-messaging-sw.js] Datos de notificación incompletos');
    return;
  }

  const notificationId = 'notification_' + Date.now();

  // Guardar la notificación
  scheduledNotifications.push({
    id: notificationId,
    title: notification.title,
    body: notification.body || '¡Tienes una notificación!',
    icon: notification.icon || '/images/perrito.png',
    interval: notification.interval,
    nextTime: Date.now() + notification.interval
  });

  // Guardar en almacenamiento persistente
  saveScheduledNotifications();

  // Programar la notificación
  scheduleNextNotification(notificationId);

  console.log(`[firebase-messaging-sw.js] Notificación programada: ${notification.title}, cada ${notification.interval/1000} segundos`);
}

// Programar la próxima notificación
function scheduleNextNotification(notificationId) {
  // Cancelar el temporizador existente si hay uno
  if (notificationTimers[notificationId]) {
    clearTimeout(notificationTimers[notificationId]);
  }

  // Encontrar la notificación
  const notification = scheduledNotifications.find(n => n.id === notificationId);
  if (!notification) return;

  // Calcular el tiempo hasta la próxima notificación
  const now = Date.now();
  let timeUntilNext = notification.nextTime - now;

  // Si ya pasó el tiempo, mostrar inmediatamente y programar la siguiente
  if (timeUntilNext <= 0) {
    showNotification(notification);
    notification.nextTime = now + notification.interval;
    timeUntilNext = notification.interval;
    saveScheduledNotifications();
  }

  // Programar la próxima notificación
  notificationTimers[notificationId] = setTimeout(() => {
    showNotification(notification);

    // Actualizar el próximo tiempo
    notification.nextTime = Date.now() + notification.interval;
    saveScheduledNotifications();

    // Programar la siguiente
    scheduleNextNotification(notificationId);
  }, timeUntilNext);

  console.log(`[firebase-messaging-sw.js] Próxima notificación programada para dentro de ${timeUntilNext/1000} segundos`);
}

// Mostrar una notificación
function showNotification(notification) {
  self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: notification.icon,
    badge: '/images/badge-icon.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
      id: notification.id,
      timestamp: Date.now()
    }
  }).then(() => {
    console.log(`[firebase-messaging-sw.js] Notificación mostrada: ${notification.title}`);
  }).catch(error => {
    console.error('[firebase-messaging-sw.js] Error al mostrar notificación:', error);
  });
}

// Guardar notificaciones programadas
function saveScheduledNotifications() {
  self.registration.sync.register('saveNotifications').catch(err => {
    console.error('[firebase-messaging-sw.js] Error al registrar sincronización:', err);
  });

  // Guardar en IndexedDB
  const dbPromise = indexedDB.open('notificationsDB', 1);

  dbPromise.onupgradeneeded = function(event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('notifications')) {
      db.createObjectStore('notifications', { keyPath: 'id' });
    }
  };

  dbPromise.onsuccess = function(event) {
    const db = event.target.result;
    const tx = db.transaction('notifications', 'readwrite');
    const store = tx.objectStore('notifications');

    // Limpiar el almacén
    store.clear();

    // Guardar cada notificación
    scheduledNotifications.forEach(notification => {
      store.add(notification);
    });

    tx.oncomplete = function() {
      console.log('[firebase-messaging-sw.js] Notificaciones guardadas en IndexedDB');
    };

    tx.onerror = function(error) {
      console.error('[firebase-messaging-sw.js] Error al guardar notificaciones:', error);
    };
  };

  dbPromise.onerror = function(error) {
    console.error('[firebase-messaging-sw.js] Error al abrir IndexedDB:', error);
  };
}

// Restaurar notificaciones programadas
function restoreScheduledNotifications() {
  console.log('[firebase-messaging-sw.js] Restaurando notificaciones programadas...');

  // Abrir IndexedDB
  const dbPromise = indexedDB.open('notificationsDB', 1);

  dbPromise.onupgradeneeded = function(event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('notifications')) {
      db.createObjectStore('notifications', { keyPath: 'id' });
    }
  };

  dbPromise.onsuccess = function(event) {
    const db = event.target.result;
    const tx = db.transaction('notifications', 'readonly');
    const store = tx.objectStore('notifications');
    const request = store.getAll();

    request.onsuccess = function() {
      const notifications = request.result;
      console.log(`[firebase-messaging-sw.js] Restauradas ${notifications.length} notificaciones programadas`);

      // Restaurar notificaciones
      scheduledNotifications = notifications;

      // Programar todas las notificaciones
      scheduledNotifications.forEach(notification => {
        scheduleNextNotification(notification.id);
      });
    };

    request.onerror = function(error) {
      console.error('[firebase-messaging-sw.js] Error al restaurar notificaciones:', error);
    };
  };

  dbPromise.onerror = function(error) {
    console.error('[firebase-messaging-sw.js] Error al abrir IndexedDB:', error);
  };
}

// Cancelar todas las notificaciones programadas
function cancelScheduledNotifications() {
  console.log('[firebase-messaging-sw.js] Cancelando todas las notificaciones programadas');

  // Cancelar todos los temporizadores
  Object.values(notificationTimers).forEach(timer => {
    clearTimeout(timer);
  });

  notificationTimers = {};
  scheduledNotifications = [];

  // Limpiar IndexedDB
  const dbPromise = indexedDB.open('notificationsDB', 1);

  dbPromise.onsuccess = function(event) {
    const db = event.target.result;
    const tx = db.transaction('notifications', 'readwrite');
    const store = tx.objectStore('notifications');

    store.clear();

    tx.oncomplete = function() {
      console.log('[firebase-messaging-sw.js] Notificaciones eliminadas de IndexedDB');
    };
  };
}

// Enviar notificaciones programadas al cliente
function sendScheduledNotificationsToClient(client) {
  client.postMessage({
    action: 'scheduledNotifications',
    notifications: scheduledNotifications
  });
}
