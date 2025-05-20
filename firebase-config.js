// Configuración de Firebase y funciones de notificación push

// No usamos imports ya que estamos usando la versión compat (no modular)
// La versión compat expone las APIs como variables globales (firebase)

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCdlbEHtxXLtCmh4lu4K9ZDycklg4XYSRw",
  authDomain: "notificaciones-7f993.firebaseapp.com",
  projectId: "notificaciones-7f993",
  storageBucket: "notificaciones-7f993.firebasestorage.app",
  messagingSenderId: "915887559942",
  appId: "1:915887559942:web:b4d1a34ec4fc1575a17a87",
  measurementId: "G-5QVBDNFCTZ"
};

// Clave pública VAPID (Web Push)
const vapidKey = "BKyvKYl-x9Roc6KBsnP67vpy_er1YFWYhR5EIcT3xjdra_Etxh_s_Qa04jw9ACtWjFHDezQk3i5jb6ubPmWKOCM";

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Tokens de suscripción almacenados
let fcmTokens = [];

// Cargar tokens guardados
function loadSavedTokens() {
  const savedTokens = localStorage.getItem('fcmTokens');
  if (savedTokens) {
    try {
      fcmTokens = JSON.parse(savedTokens);
      console.log('Tokens cargados:', fcmTokens.length);
    } catch (e) {
      console.error('Error al cargar tokens:', e);
      fcmTokens = [];
    }
  }
}

// Guardar tokens
function saveTokens() {
  localStorage.setItem('fcmTokens', JSON.stringify(fcmTokens));
}

// Solicitar permiso y registrar para notificaciones push
async function requestNotificationPermission() {
  console.log('Solicitando permiso para notificaciones...');

  try {
    // Verificar si el navegador soporta notificaciones
    if (!('Notification' in window)) {
      console.error('Este navegador no soporta notificaciones.');
      alert('Este navegador no soporta notificaciones push.');
      return false;
    }

    // Verificar si el Service Worker está disponible
    if (!('serviceWorker' in navigator)) {
      console.error('Este navegador no soporta Service Workers.');
      alert('Este navegador no soporta Service Workers, necesarios para notificaciones push.');
      return false;
    }

    // Solicitar permiso
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Permiso de notificación concedido.');

      try {
        // Registrar el Service Worker si no está registrado
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registrado:', registration);

        // Esperar a que el Service Worker esté activo
        await navigator.serviceWorker.ready;
        console.log('Service Worker listo');

        // Obtener token de FCM con manejo de errores mejorado
        try {
          console.log('Solicitando token FCM con clave VAPID:', vapidKey);
          const currentToken = await messaging.getToken({
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
          });

          if (currentToken) {
            console.log('Token de FCM obtenido:', currentToken);

            // Guardar token si no existe
            if (!fcmTokens.includes(currentToken)) {
              fcmTokens.push(currentToken);
              saveTokens();
              console.log('Nuevo token guardado');
            }

            return true;
          } else {
            console.error('No se pudo obtener el token FCM.');
            alert('No se pudo obtener el token para notificaciones push.');
            return false;
          }
        } catch (tokenError) {
          console.error('Error al obtener token FCM:', tokenError);
          alert('Error al obtener token para notificaciones push: ' + tokenError.message);
          return false;
        }
      } catch (swError) {
        console.error('Error al registrar Service Worker:', swError);
        alert('Error al registrar Service Worker: ' + swError.message);
        return false;
      }
    } else {
      console.log('Permiso de notificación denegado.');
      alert('Necesitas conceder permiso para recibir notificaciones push.');
      return false;
    }
  } catch (error) {
    console.error('Error al solicitar permiso:', error);
    alert('Error al solicitar permiso para notificaciones: ' + error.message);
    return false;
  }
}

// Manejar mensajes en primer plano
messaging.onMessage((payload) => {
  console.log('Mensaje recibido en primer plano:', payload);

  // Mostrar notificación
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/images/perrito.png',
    badge: '/images/badge-icon.png',
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  // Mostrar notificación
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});

// Enviar notificación push a todos los dispositivos suscritos
async function sendPushNotification(title, message, imageUrl = null) {
  if (fcmTokens.length === 0) {
    console.error('No hay tokens para enviar notificaciones');
    return false;
  }

  const notification = {
    title: title,
    body: message,
    icon: imageUrl || '/images/perrito.png'
  };

  // Aquí normalmente enviarías una solicitud a tu servidor backend
  // que luego usaría la API de FCM para enviar la notificación
  // Como no tenemos un backend, simularemos el envío
  console.log('Simulando envío de notificación push a', fcmTokens.length, 'dispositivos');
  console.log('Notificación:', notification);

  // En una implementación real, esto se haría desde un servidor
  alert(`En una implementación completa, esta notificación se enviaría a ${fcmTokens.length} dispositivos suscritos.`);

  return true;
}

// Variables para notificaciones push recurrentes
let pushNotificationInterval = null;
let isRecurringPushActive = false;

// Iniciar notificaciones push recurrentes
function startRecurringPushNotifications(title, message, imageUrl = null, intervalMs = 3600000) {
  // Detener intervalo anterior si existe
  if (pushNotificationInterval) {
    clearTimeout(pushNotificationInterval);
    pushNotificationInterval = null;
  }

  // Guardar configuración
  const pushSettings = {
    title,
    message,
    imageUrl,
    interval: intervalMs,
    isActive: true
  };

  localStorage.setItem('recurringPushSettings', JSON.stringify(pushSettings));

  // Función para enviar y programar la siguiente
  function sendAndScheduleNext() {
    // Enviar notificación
    sendPushNotification(title, message, imageUrl);

    // Programar la siguiente
    pushNotificationInterval = setTimeout(() => {
      sendAndScheduleNext();
    }, intervalMs);
  }

  // Iniciar el ciclo
  sendAndScheduleNext();
  isRecurringPushActive = true;

  return true;
}

// Detener notificaciones push recurrentes
function stopRecurringPushNotifications() {
  if (pushNotificationInterval) {
    clearTimeout(pushNotificationInterval);
    pushNotificationInterval = null;
  }

  isRecurringPushActive = false;

  // Actualizar configuración
  const pushSettings = JSON.parse(localStorage.getItem('recurringPushSettings') || '{}');
  pushSettings.isActive = false;
  localStorage.setItem('recurringPushSettings', JSON.stringify(pushSettings));

  return true;
}

// Cargar configuración de notificaciones push recurrentes
function loadRecurringPushSettings() {
  const pushSettings = JSON.parse(localStorage.getItem('recurringPushSettings') || '{}');

  // Si estaba activa, reiniciar
  if (pushSettings.isActive && pushSettings.title && pushSettings.interval) {
    startRecurringPushNotifications(
      pushSettings.title,
      pushSettings.message || '¡Tienes una notificación!',
      pushSettings.imageUrl || null,
      pushSettings.interval
    );
  }

  return pushSettings;
}

// Exportar funciones
export {
  requestNotificationPermission,
  sendPushNotification,
  loadSavedTokens,
  fcmTokens,
  startRecurringPushNotifications,
  stopRecurringPushNotifications,
  loadRecurringPushSettings,
  isRecurringPushActive
};
