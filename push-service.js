// Servicio de notificaciones push simplificado

// Variables para almacenar la configuración
let pushSubscription = null;
let isSubscribed = false;
let swRegistration = null;

// Clave pública VAPID (Web Push)
const applicationServerPublicKey = "BKyvKYl-x9Roc6KBsnP67vpy_er1YFWYhR5EIcT3xjdra_Etxh_s_Qa04jw9ACtWjFHDezQk3i5jb6ubPmWKOCM";

// Inicializar el servicio de notificaciones push
async function initPushService() {
  try {
    // Verificar si el navegador soporta notificaciones
    if (!('Notification' in window)) {
      console.error('Este navegador no soporta notificaciones.');
      return false;
    }

    // Verificar si el Service Worker está disponible
    if (!('serviceWorker' in navigator)) {
      console.error('Este navegador no soporta Service Workers.');
      return false;
    }

    // Registrar el Service Worker
    swRegistration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker registrado:', swRegistration);

    // Verificar si ya estamos suscritos
    await updateSubscriptionStatus();

    return true;
  } catch (error) {
    console.error('Error al inicializar el servicio de notificaciones push:', error);
    return false;
  }
}

// Convertir base64 a Uint8Array para la clave VAPID
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Actualizar el estado de suscripción
async function updateSubscriptionStatus() {
  if (!swRegistration) return;

  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    isSubscribed = !(subscription === null);

    if (isSubscribed) {
      console.log('Usuario está suscrito a notificaciones push');
      pushSubscription = subscription;
      saveSubscription(subscription);
    } else {
      console.log('Usuario no está suscrito a notificaciones push');
    }

    return isSubscribed;
  } catch (error) {
    console.error('Error al verificar suscripción:', error);
    return false;
  }
}

// Guardar la suscripción en localStorage
function saveSubscription(subscription) {
  if (!subscription) return;

  try {
    localStorage.setItem('pushSubscription', JSON.stringify(subscription.toJSON()));
    console.log('Suscripción guardada en localStorage');
  } catch (error) {
    console.error('Error al guardar suscripción:', error);
  }
}

// Cargar la suscripción desde localStorage
function loadSubscription() {
  try {
    const savedSubscription = localStorage.getItem('pushSubscription');
    if (savedSubscription) {
      return JSON.parse(savedSubscription);
    }
  } catch (error) {
    console.error('Error al cargar suscripción:', error);
  }
  return null;
}

// Suscribirse a notificaciones push
async function subscribeToPushNotifications() {
  try {
    // Solicitar permiso si no lo tenemos
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Permiso de notificación denegado');
        return false;
      }
    }

    // Verificar si ya estamos suscritos
    if (isSubscribed) {
      console.log('Ya estás suscrito a notificaciones push');
      return true;
    }

    if (!swRegistration) {
      const initialized = await initPushService();
      if (!initialized) {
        console.error('No se pudo inicializar el servicio de notificaciones push');
        return false;
      }
    }

    // Convertir la clave pública
    const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);

    // Suscribirse
    try {
      pushSubscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('Usuario suscrito a notificaciones push:', pushSubscription);
      
      // Guardar la suscripción
      saveSubscription(pushSubscription);
      isSubscribed = true;
      
      return true;
    } catch (subscribeError) {
      console.error('Error al suscribirse:', subscribeError);
      return false;
    }
  } catch (error) {
    console.error('Error en el proceso de suscripción:', error);
    return false;
  }
}

// Enviar una notificación push
function sendPushNotification(title, message, imageUrl = null, tag = 'general') {
  if (!swRegistration) {
    console.error('Service Worker no registrado');
    return false;
  }

  const options = {
    body: message,
    icon: imageUrl || '/images/perrito.png',
    badge: '/images/badge-icon.png',
    vibrate: [200, 100, 200],
    tag: tag,
    requireInteraction: true,
    renotify: true
  };

  swRegistration.showNotification(title, options)
    .then(() => console.log('Notificación enviada con éxito'))
    .catch(error => console.error('Error al enviar notificación:', error));

  return true;
}

// Exportar funciones
export {
  initPushService,
  subscribeToPushNotifications,
  sendPushNotification,
  isSubscribed,
  updateSubscriptionStatus
};
