// Sistema de notificaciones mejorado que utiliza el Service Worker para mayor confiabilidad

// Variables para almacenar la configuración
let isPermissionGranted = false;
let recurringNotificationInterval = null;
let isRecurringNotificationActive = false;
let swRegistration = null;
let notificationCheckInterval = null;

// Clave para almacenar la última vez que se envió una notificación
const LAST_NOTIFICATION_KEY = 'last_notification_timestamp';
// Clave para almacenar la configuración de notificaciones recurrentes
const RECURRING_NOTIFICATION_KEY = 'recurringNotificationSettings';

// Verificar si el navegador soporta notificaciones
function checkNotificationSupport() {
  if (!('Notification' in window)) {
    console.error('Este navegador no soporta notificaciones.');
    return false;
  }
  return true;
}

// Solicitar permiso para notificaciones
async function requestNotificationPermission() {
  if (!checkNotificationSupport()) {
    alert('Tu navegador no soporta notificaciones.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    isPermissionGranted = permission === 'granted';

    if (isPermissionGranted) {
      console.log('Permiso de notificación concedido.');
      return true;
    } else {
      console.log('Permiso de notificación denegado.');
      alert('Necesitas conceder permiso para recibir notificaciones.');
      return false;
    }
  } catch (error) {
    console.error('Error al solicitar permiso:', error);
    alert('Error al solicitar permiso para notificaciones: ' + error.message);
    return false;
  }
}

// Enviar una notificación
async function sendNotification(title, message, imageUrl = null, tag = 'general') {
  if (!isPermissionGranted) {
    console.error('No se ha concedido permiso para notificaciones.');
    return false;
  }

  try {
    // Generar ID único para la notificación
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const options = {
      body: message,
      icon: imageUrl || '/images/perrito.png',
      badge: '/images/badge-icon.png',
      tag: tag,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      renotify: true, // Notificar incluso si hay una notificación con la misma etiqueta
      data: {
        id: notificationId,
        url: window.location.origin,
        timestamp: Date.now()
      }
    };

    // Intentar usar el Service Worker para programar la notificación
    if (swRegistration) {
      // Usar el Service Worker para mostrar la notificación
      await swRegistration.showNotification(title, options);

      // Actualizar timestamp de última notificación
      localStorage.setItem(LAST_NOTIFICATION_KEY, Date.now().toString());

      console.log(`Notificación enviada con ID: ${notificationId}`);
      return true;
    }
    // Si no hay Service Worker, intentar usar el Service Worker del navegador
    else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      await navigator.serviceWorker.ready;
      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        await registration.showNotification(title, options);
        localStorage.setItem(LAST_NOTIFICATION_KEY, Date.now().toString());
        console.log(`Notificación enviada con ID: ${notificationId} (usando SW del navegador)`);
        return true;
      }
    }

    // Fallback a la API de Notification si todo lo demás falla
    const notification = new Notification(title, options);

    // Manejar eventos de la notificación
    notification.onclick = function() {
      console.log('Notificación clickeada');
      window.focus();
      notification.close();
    };

    localStorage.setItem(LAST_NOTIFICATION_KEY, Date.now().toString());
    console.log(`Notificación enviada con ID: ${notificationId} (usando API nativa)`);

    return true;
  } catch (error) {
    console.error('Error al enviar notificación:', error);

    // Último intento con la API básica
    try {
      new Notification(title, {
        body: message,
        icon: imageUrl || '/images/perrito.png'
      });
      localStorage.setItem(LAST_NOTIFICATION_KEY, Date.now().toString());
      return true;
    } catch (e) {
      console.error('Error en el último intento de enviar notificación:', e);
      return false;
    }
  }
}

// Iniciar notificaciones recurrentes
async function startRecurringNotifications(title, message, imageUrl = null, intervalMs = 3600000) {
  // Detener intervalo anterior si existe
  if (recurringNotificationInterval) {
    clearInterval(recurringNotificationInterval);
    recurringNotificationInterval = null;
  }

  // Guardar configuración
  const settings = {
    title,
    message,
    imageUrl,
    interval: intervalMs,
    isActive: true,
    createdAt: Date.now()
  };
  localStorage.setItem(RECURRING_NOTIFICATION_KEY, JSON.stringify(settings));

  // Enviar la primera notificación inmediatamente
  await sendNotification(title, message, imageUrl, 'recurring');

  // Actualizar timestamp de última notificación
  localStorage.setItem(LAST_NOTIFICATION_KEY, Date.now().toString());

  // Configurar el intervalo para verificar si es tiempo de enviar otra notificación
  // Esto es un respaldo, el Service Worker debería manejar esto
  recurringNotificationInterval = setInterval(() => {
    checkPendingNotifications();
  }, Math.min(intervalMs / 2, 60000)); // Verificar cada mitad del intervalo o cada minuto como máximo

  isRecurringNotificationActive = true;

  // Programar la notificación en el Service Worker si está disponible
  if (swRegistration && swRegistration.active) {
    try {
      // Enviar mensaje al Service Worker para que programe la notificación recurrente
      swRegistration.active.postMessage({
        action: 'setupRecurringNotification',
        notification: {
          title,
          message,
          imageUrl,
          interval: intervalMs,
          id: `recurring_${Date.now()}`
        }
      });
      console.log('Notificación recurrente programada en el Service Worker');
    } catch (error) {
      console.error('Error al programar notificación recurrente en el Service Worker:', error);
    }
  }

  return true;
}

// Detener notificaciones recurrentes
function stopRecurringNotifications() {
  // Detener intervalo
  if (recurringNotificationInterval) {
    clearInterval(recurringNotificationInterval);
    recurringNotificationInterval = null;
  }

  // Detener verificador de notificaciones
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
    notificationCheckInterval = null;
  }

  isRecurringNotificationActive = false;

  // Actualizar configuración
  const settings = JSON.parse(localStorage.getItem(RECURRING_NOTIFICATION_KEY) || '{}');
  settings.isActive = false;
  localStorage.setItem(RECURRING_NOTIFICATION_KEY, JSON.stringify(settings));

  // Notificar al Service Worker para que detenga las notificaciones recurrentes
  if (swRegistration && swRegistration.active) {
    try {
      swRegistration.active.postMessage({
        action: 'stopRecurringNotification'
      });
      console.log('Solicitud para detener notificaciones recurrentes enviada al Service Worker');
    } catch (error) {
      console.error('Error al enviar solicitud para detener notificaciones recurrentes:', error);
    }
  }

  return true;
}

// Cargar configuración de notificaciones recurrentes
async function loadRecurringNotificationSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(RECURRING_NOTIFICATION_KEY) || '{}');

    if (settings.isActive && settings.title && settings.interval) {
      // Verificar si tenemos permiso
      if (Notification.permission === 'granted') {
        isPermissionGranted = true;

        console.log('Restaurando notificaciones recurrentes:', settings);

        // Verificar si el Service Worker está registrado
        if (!swRegistration) {
          await registerServiceWorker();
        }

        // Actualizar estado
        isRecurringNotificationActive = true;

        // Configurar el intervalo para verificar notificaciones pendientes
        if (notificationCheckInterval) {
          clearInterval(notificationCheckInterval);
        }

        notificationCheckInterval = setInterval(() => {
          checkPendingNotifications();
        }, Math.min(settings.interval / 2, 60000));

        // Verificar si ha pasado suficiente tiempo desde la última notificación
        const lastNotificationTime = parseInt(localStorage.getItem(LAST_NOTIFICATION_KEY) || '0');
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastNotificationTime;

        // Si ha pasado más tiempo que el intervalo o no hay registro de última notificación
        if (elapsedTime >= settings.interval || lastNotificationTime === 0) {
          console.log('Enviando notificación recurrente inicial después de cargar configuración');

          // Enviar notificación inmediatamente
          await sendNotification(
            settings.title,
            settings.message || '¡Tienes una notificación!',
            settings.imageUrl || null,
            'recurring'
          );

          // Actualizar timestamp
          localStorage.setItem(LAST_NOTIFICATION_KEY, currentTime.toString());
        } else {
          const timeRemaining = settings.interval - elapsedTime;
          console.log(`Próxima notificación recurrente en ${Math.floor(timeRemaining/1000)} segundos`);
        }

        // Notificar al Service Worker
        if (swRegistration && swRegistration.active) {
          swRegistration.active.postMessage({
            action: 'setupRecurringNotification',
            notification: {
              title: settings.title,
              message: settings.message || '¡Tienes una notificación!',
              imageUrl: settings.imageUrl,
              interval: settings.interval,
              id: `recurring_restored_${Date.now()}`
            }
          });
        }
      }
    }

    return settings;
  } catch (error) {
    console.error('Error al cargar configuración de notificaciones recurrentes:', error);
    return {};
  }
}

// Registrar el Service Worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrado con éxito:', swRegistration);

      // Esperar a que el Service Worker esté activo
      if (swRegistration.installing) {
        console.log('Service Worker instalando...');

        // Esperar a que termine de instalarse
        const worker = swRegistration.installing;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            console.log('Service Worker activado y listo');
          }
        });
      } else if (swRegistration.waiting) {
        console.log('Service Worker esperando activación');
      } else if (swRegistration.active) {
        console.log('Service Worker ya activo');
      }

      return true;
    } catch (error) {
      console.error('Error al registrar el Service Worker:', error);
      return false;
    }
  } else {
    console.warn('Service Worker no soportado en este navegador');
    return false;
  }
}

// Inicializar el sistema de notificaciones
async function initNotificationSystem() {
  // Verificar permiso actual
  isPermissionGranted = Notification.permission === 'granted';

  // Registrar Service Worker
  await registerServiceWorker();

  // Configurar listener para mensajes del Service Worker
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Mensaje recibido del Service Worker:', event.data);

      // Si recibimos confirmación de que se envió una notificación
      if (event.data.action === 'notificationSent') {
        // Actualizar timestamp de última notificación
        localStorage.setItem(LAST_NOTIFICATION_KEY, event.data.timestamp);
        console.log(`Notificación ${event.data.notificationId} enviada a las ${new Date(event.data.timestamp).toLocaleTimeString()}`);
      }
    });
  }

  // Cargar configuración guardada
  if (isPermissionGranted) {
    loadRecurringNotificationSettings();

    // Iniciar verificación periódica de notificaciones programadas
    startNotificationChecker();
  }

  return isPermissionGranted;
}

// Iniciar verificador periódico de notificaciones
function startNotificationChecker() {
  // Detener verificador anterior si existe
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }

  // Verificar cada 30 segundos si hay notificaciones pendientes
  notificationCheckInterval = setInterval(() => {
    checkPendingNotifications();
  }, 30000);

  // Verificar inmediatamente
  checkPendingNotifications();
}

// Verificar si hay notificaciones pendientes
function checkPendingNotifications() {
  // Verificar si hay notificaciones recurrentes activas
  const settings = JSON.parse(localStorage.getItem(RECURRING_NOTIFICATION_KEY) || '{}');

  if (settings.isActive && settings.title && settings.interval) {
    const lastNotificationTime = parseInt(localStorage.getItem(LAST_NOTIFICATION_KEY) || '0');
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastNotificationTime;

    // Si ha pasado más tiempo que el intervalo, enviar notificación
    if (elapsedTime >= settings.interval) {
      console.log(`Han pasado ${Math.floor(elapsedTime/1000)} segundos desde la última notificación. Enviando nueva notificación recurrente.`);

      // Enviar notificación
      sendNotification(
        settings.title,
        settings.message || '¡Tienes una notificación!',
        settings.imageUrl || null,
        'recurring'
      );

      // Actualizar timestamp
      localStorage.setItem(LAST_NOTIFICATION_KEY, currentTime.toString());
    } else {
      const timeRemaining = settings.interval - elapsedTime;
      console.log(`Próxima notificación recurrente en ${Math.floor(timeRemaining/1000)} segundos`);
    }
  }
}

// Verificar estado de las notificaciones
function getNotificationStatus() {
  return {
    permissionGranted: isPermissionGranted,
    recurringActive: isRecurringNotificationActive,
    serviceWorkerActive: !!(swRegistration && swRegistration.active),
    lastNotification: parseInt(localStorage.getItem(LAST_NOTIFICATION_KEY) || '0'),
    settings: JSON.parse(localStorage.getItem(RECURRING_NOTIFICATION_KEY) || '{}')
  };
}

// Exportar funciones
export {
  initNotificationSystem,
  requestNotificationPermission,
  sendNotification,
  startRecurringNotifications,
  stopRecurringNotifications,
  isRecurringNotificationActive,
  isPermissionGranted,
  getNotificationStatus,
  checkPendingNotifications
};
