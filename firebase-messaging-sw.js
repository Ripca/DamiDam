// Firebase Cloud Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

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

// Inicializar Firebase Messaging
const messaging = firebase.messaging();

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Recibido mensaje en segundo plano:', payload);

  // Personalizar la notificación
  const notificationTitle = payload.notification.title || 'Notificación';
  const notificationOptions = {
    body: payload.notification.body || 'Tienes una nueva notificación',
    icon: payload.notification.icon || '/images/perrito.png',
    badge: '/images/badge-icon.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    requireInteraction: true,
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

  // Mostrar la notificación
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
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
