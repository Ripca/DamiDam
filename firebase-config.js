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

// Ya no necesitamos la clave VAPID, usamos las credenciales de Firebase directamente

// Variables globales
let messaging = null;

// Inicializar Firebase
try {
  // Verificar si Firebase ya está inicializado
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase inicializado correctamente');
  } else {
    console.log('Firebase ya estaba inicializado');
  }

  // Inicializar messaging
  messaging = firebase.messaging();
  console.log('Firebase Messaging inicializado correctamente');

  // Configurar el service worker para messaging
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registrado desde la inicialización:', registration);
    })
    .catch((error) => {
      console.error('Error al registrar Service Worker desde la inicialización:', error);
    });
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  console.log('Detalles del error:', error);
}

// Tokens de suscripción almacenados
let fcmTokens = [];

// Cargar tokens guardados
function loadSavedTokens() {
  const savedTokens = localStorage.getItem('fcmTokens');
  if (savedTokens) {
    try {
      fcmTokens = JSON.parse(savedTokens);
      console.log('Tokens cargados:', fcmTokens.length);

      // Actualizar la UI para mostrar que está suscrito
      updateSubscriptionUI(fcmTokens.length > 0);
    } catch (e) {
      console.error('Error al cargar tokens:', e);
      fcmTokens = [];

      // Actualizar la UI para mostrar que no está suscrito
      updateSubscriptionUI(false);
    }
  } else {
    // Actualizar la UI para mostrar que no está suscrito
    updateSubscriptionUI(false);
  }
}

// Actualizar la UI según el estado de suscripción
function updateSubscriptionUI(isSubscribed) {
  const subscriptionStatus = document.getElementById('subscription-status');
  const subscribeBtn = document.getElementById('subscribe-push-btn');
  const unsubscribeBtn = document.getElementById('unsubscribe-push-btn');
  const subscribersCount = document.getElementById('subscribers-count');

  if (subscriptionStatus) {
    if (isSubscribed) {
      subscriptionStatus.textContent = 'Suscrito';
      subscriptionStatus.className = 'status-subscribed';
    } else {
      subscriptionStatus.textContent = 'No suscrito';
      subscriptionStatus.className = 'status-unsubscribed';
    }
  }

  if (subscribeBtn && unsubscribeBtn) {
    if (isSubscribed) {
      subscribeBtn.style.display = 'none';
      unsubscribeBtn.style.display = 'inline-block';
    } else {
      subscribeBtn.style.display = 'inline-block';
      unsubscribeBtn.style.display = 'none';
    }
  }

  if (subscribersCount) {
    subscribersCount.textContent = isSubscribed ? '1' : '0';
  }
}

// Guardar tokens
function saveTokens() {
  localStorage.setItem('fcmTokens', JSON.stringify(fcmTokens));

  // Actualizar la UI según el estado de suscripción
  updateSubscriptionUI(fcmTokens.length > 0);
}

// Cancelar suscripción a notificaciones push
async function unsubscribeFromPushNotifications() {
  try {
    // Verificar que messaging esté disponible
    if (!messaging) {
      console.error('Firebase Messaging no está inicializado');
      alert('Firebase Messaging no está inicializado. Por favor, recarga la página e intenta de nuevo.');
      return false;
    }

    // Obtener la suscripción actual
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) {
      console.error('No se encontró el service worker');
      alert('No se encontró el service worker. Por favor, recarga la página e intenta de nuevo.');
      return false;
    }

    // Eliminar el token
    await messaging.deleteToken();
    console.log('Token eliminado correctamente');

    // Limpiar tokens almacenados
    fcmTokens = [];
    saveTokens();

    // Actualizar la UI
    updateSubscriptionUI(false);

    return true;
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    alert('Error al cancelar la suscripción: ' + error.message);
    return false;
  }
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

    // Verificar que messaging esté disponible
    if (!messaging) {
      console.error('Firebase Messaging no está inicializado');
      alert('Firebase Messaging no está inicializado. Por favor, recarga la página e intenta de nuevo.');
      return false;
    }

    // Solicitar permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permiso de notificación denegado.');
      alert('Necesitas conceder permiso para recibir notificaciones push.');
      return false;
    }

    console.log('Permiso de notificación concedido.');

    try {
      // Esperar a que el service worker esté activo
      await navigator.serviceWorker.ready;
      console.log('Service Worker listo');

      // Esperar un momento para asegurarnos de que todo esté listo
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // Solicitar el token directamente
        console.log('Solicitando token FCM...');

        // Usar el método getToken sin parámetros
        const currentToken = await messaging.getToken();

        if (currentToken) {
          console.log('Token de FCM obtenido:', currentToken);

          // Guardar token si no existe
          if (!fcmTokens.includes(currentToken)) {
            fcmTokens.push(currentToken);
            saveTokens();
            console.log('Nuevo token guardado');
          } else {
            // Actualizar la UI aunque el token ya exista
            updateSubscriptionUI(true);
          }

          return true;
        } else {
          throw new Error('No se pudo obtener el token FCM');
        }
      } catch (tokenError) {
        console.error('Error al obtener token FCM:', tokenError);

        // Mensaje de error más amigable
        if (tokenError.name === 'AbortError') {
          alert('Error en el servicio de notificaciones push. Asegúrate de que tu navegador esté actualizado y que no tengas bloqueadores de notificaciones activos.');
        } else {
          alert('Error al obtener token para notificaciones push: ' + tokenError.message);
        }

        console.log('Detalles del error:', tokenError);
        return false;
      }
    } catch (swError) {
      console.error('Error al registrar Service Worker:', swError);
      alert('Error al registrar Service Worker: ' + swError.message);
      return false;
    }
  } catch (error) {
    console.error('Error al solicitar permiso:', error);
    alert('Error al solicitar permiso para notificaciones: ' + error.message);
    return false;
  }
}

// Manejar mensajes en primer plano
if (messaging) {
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
  console.log('Handler de mensajes en primer plano registrado');
} else {
  console.error('No se pudo registrar el handler de mensajes en primer plano porque messaging no está inicializado');
}

// Enviar notificación push a todos los dispositivos suscritos
async function sendPushNotification(title, message, imageUrl = null) {
  if (fcmTokens.length === 0) {
    console.error('No hay tokens para enviar notificaciones');
    return false;
  }

  try {
    // Crear la notificación
    const notification = {
      title: title,
      body: message,
      icon: imageUrl || '/images/perrito.png',
      badge: '/images/badge-icon.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      timestamp: Date.now()
    };

    console.log('Enviando notificación push a', fcmTokens.length, 'dispositivos');
    console.log('Notificación:', notification);

    // Verificar si el service worker está registrado
    const registration = await navigator.serviceWorker.ready;

    // Mostrar la notificación usando el service worker
    await registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      vibrate: notification.vibrate,
      requireInteraction: notification.requireInteraction,
      tag: 'push-notification-' + Date.now(), // Asegurar que cada notificación sea única
      data: {
        timestamp: notification.timestamp,
        url: window.location.href
      }
    });

    console.log('Notificación push enviada correctamente');
    return true;
  } catch (error) {
    console.error('Error al enviar notificación push:', error);
    alert('Error al enviar notificación push: ' + error.message);
    return false;
  }
}

// Variables para notificaciones push recurrentes
let pushNotificationInterval = null;
let isRecurringPushActive = false;

// Iniciar notificaciones push recurrentes
function startRecurringPushNotifications(title, message, imageUrl = null, intervalMs = 3600000, sendImmediately = true) {
  // Detener intervalo anterior si existe
  if (pushNotificationInterval) {
    clearTimeout(pushNotificationInterval);
    pushNotificationInterval = null;
  }

  // Validar parámetros
  if (!title || !message) {
    alert('El título y el mensaje son obligatorios para las notificaciones recurrentes');
    return false;
  }

  // Validar intervalo
  if (!intervalMs || intervalMs < 10000) { // Mínimo 10 segundos
    intervalMs = 60000; // Por defecto 1 minuto
  }

  // Guardar configuración
  const pushSettings = {
    title,
    message,
    imageUrl,
    interval: intervalMs,
    isActive: true,
    lastSent: Date.now(),
    sendImmediately: sendImmediately
  };

  localStorage.setItem('recurringPushSettings', JSON.stringify(pushSettings));

  // Función para enviar y programar la siguiente
  async function sendAndScheduleNext() {
    console.log('Ejecutando función sendAndScheduleNext para enviar notificación recurrente...');

    // Programar la siguiente notificación primero para mantener el intervalo constante
    // incluso si hay retrasos en el envío
    const currentTime = Date.now();
    const currentSettings = JSON.parse(localStorage.getItem('recurringPushSettings') || '{}');

    if (currentSettings.isActive) {
      console.log(`Programando próxima notificación recurrente para dentro de ${intervalMs/1000} segundos`);
      pushNotificationInterval = setTimeout(() => {
        sendAndScheduleNext();
      }, intervalMs);
    } else {
      console.log('Las notificaciones recurrentes han sido desactivadas, no se programarán más');
      return; // Salir si las notificaciones están desactivadas
    }

    try {
      // Enviar notificación de forma asíncrona
      console.log('Enviando notificación push recurrente...');
      const success = await sendPushNotification(title, message, imageUrl);

      if (success) {
        // Actualizar timestamp de último envío
        const settings = JSON.parse(localStorage.getItem('recurringPushSettings') || '{}');
        settings.lastSent = currentTime;
        localStorage.setItem('recurringPushSettings', JSON.stringify(settings));

        console.log(`Notificación recurrente enviada exitosamente. Próxima en ${intervalMs/1000} segundos`);
      } else {
        console.error('No se pudo enviar la notificación recurrente');
      }
    } catch (error) {
      console.error('Error al enviar notificación recurrente:', error);
    }
  }

  // Iniciar el ciclo
  console.log('Iniciando ciclo de notificaciones recurrentes...');

  // Enviar una notificación inmediatamente si se solicita
  if (pushSettings.sendImmediately) {
    console.log('Enviando notificación inicial inmediatamente...');
    sendPushNotification(title, message, imageUrl)
      .then(success => {
        if (success) {
          console.log('Notificación inicial enviada con éxito');
        } else {
          console.error('No se pudo enviar la notificación inicial');
        }
      })
      .catch(error => {
        console.error('Error al enviar notificación inicial:', error);
      });
  }

  // Programar notificaciones en el service worker para que funcionen incluso cuando el navegador está cerrado
  if (navigator.serviceWorker.controller) {
    console.log('Programando notificaciones recurrentes en el service worker...');

    // Enviar mensaje al service worker para programar la notificación
    navigator.serviceWorker.controller.postMessage({
      action: 'scheduleNotification',
      notification: {
        title: title,
        body: message,
        icon: imageUrl || '/images/perrito.png',
        interval: intervalMs
      }
    });

    // También programar el ciclo regular para cuando el navegador esté abierto
    sendAndScheduleNext();
    isRecurringPushActive = true;
    console.log('Notificaciones recurrentes activadas correctamente');
  } else {
    console.error('No se pudo acceder al service worker controller');

    // Programar solo el ciclo regular como fallback
    sendAndScheduleNext();
    isRecurringPushActive = true;
    console.log('Notificaciones recurrentes activadas en modo fallback (solo funcionarán con el navegador abierto)');
  }

  // Actualizar la UI si existe
  const statusElement = document.getElementById('recurring-push-status');
  if (statusElement) {
    statusElement.textContent = 'Activas';
    statusElement.className = 'status-active';
  }

  const stopButton = document.getElementById('stop-recurring-push-btn');
  if (stopButton) {
    stopButton.disabled = false;
  }

  const startButton = document.getElementById('start-recurring-push-btn');
  if (startButton) {
    startButton.disabled = true;
  }

  // Actualizar la tarjeta de notificación activa
  updateActiveRecurringNotificationCard();

  return true;
}

// Actualizar la tarjeta de notificación recurrente activa
function updateActiveRecurringNotificationCard() {
  const activeNotificationCard = document.getElementById('active-recurring-notification');
  if (!activeNotificationCard) return;

  // Obtener la configuración actual
  const settings = JSON.parse(localStorage.getItem('recurringPushSettings') || '{}');

  if (!settings.title || !settings.isActive) {
    activeNotificationCard.innerHTML = '<p>No hay notificación recurrente activa</p>';
    return;
  }

  // Formatear el intervalo
  let intervalText = Math.floor(settings.interval / 60000) + ' minutos';
  if (settings.interval === 60000) intervalText = '1 minuto';
  else if (settings.interval === 3600000) intervalText = '1 hora';
  else if (settings.interval === 86400000) intervalText = '24 horas';

  // Crear el HTML para la tarjeta
  let cardHTML = `
    <h5>${settings.title}</h5>
    <p>${settings.message || 'Sin mensaje'}</p>
    <p>Intervalo: <span class="interval">${intervalText}</span></p>
  `;

  // Agregar vista previa de imagen si existe
  if (settings.imageUrl) {
    cardHTML += `<img src="${settings.imageUrl}" alt="Vista previa" class="image-preview">`;
  }

  // Actualizar la tarjeta
  activeNotificationCard.innerHTML = cardHTML;
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

  // Cancelar notificaciones programadas en el service worker
  if (navigator.serviceWorker.controller) {
    console.log('Cancelando notificaciones programadas en el service worker...');
    navigator.serviceWorker.controller.postMessage({
      action: 'cancelScheduledNotifications'
    });
  }

  // Actualizar la UI si existe
  const statusElement = document.getElementById('recurring-push-status');
  if (statusElement) {
    statusElement.textContent = 'Inactivas';
    statusElement.className = 'status-inactive';
  }

  const stopButton = document.getElementById('stop-recurring-push-btn');
  if (stopButton) {
    stopButton.disabled = true;
  }

  const startButton = document.getElementById('start-recurring-push-btn');
  if (startButton) {
    startButton.disabled = false;
  }

  // Actualizar la tarjeta de notificación activa
  const activeNotificationCard = document.getElementById('active-recurring-notification');
  if (activeNotificationCard) {
    activeNotificationCard.innerHTML = '<p>No hay notificación recurrente activa</p>';
  }

  return true;
}

// Cargar configuración de notificaciones push recurrentes
function loadRecurringPushSettings() {
  const pushSettings = JSON.parse(localStorage.getItem('recurringPushSettings') || '{}');

  // Actualizar la UI con la configuración actual
  updateRecurringPushUI(pushSettings);

  // Si estaba activa, reiniciar
  if (pushSettings.isActive && pushSettings.title && pushSettings.interval) {
    console.log('Restaurando notificación push recurrente activa');
    startRecurringPushNotifications(
      pushSettings.title,
      pushSettings.message || '¡Tienes una notificación!',
      pushSettings.imageUrl || null,
      pushSettings.interval,
      false // No enviar inmediatamente al restaurar
    );
  }

  return pushSettings;
}

// Actualizar la UI de notificaciones push recurrentes
function updateRecurringPushUI(settings) {
  // Actualizar campos de formulario si existen
  const titleInput = document.getElementById('push-title');
  const messageInput = document.getElementById('push-message');
  const imageInput = document.getElementById('push-image');
  const intervalSelect = document.getElementById('push-interval');
  const customIntervalInput = document.getElementById('push-custom-interval');

  if (titleInput && settings.title) {
    titleInput.value = settings.title;
  }

  if (messageInput && settings.message) {
    messageInput.value = settings.message;
  }

  if (imageInput && settings.imageUrl) {
    imageInput.value = settings.imageUrl;
  }

  // Configurar el intervalo si existe
  if (settings.interval && intervalSelect) {
    let found = false;
    for (let i = 0; i < intervalSelect.options.length; i++) {
      if (parseInt(intervalSelect.options[i].value) === settings.interval) {
        intervalSelect.selectedIndex = i;
        found = true;
        break;
      }
    }

    // Si no se encuentra en las opciones predefinidas, debe ser personalizado
    if (!found && customIntervalInput) {
      customIntervalInput.value = Math.floor(settings.interval / 60000);
    }
  }

  // Actualizar estado
  if (settings.isActive) {
    isRecurringPushActive = true;

    const statusElement = document.getElementById('recurring-push-status');
    if (statusElement) {
      statusElement.textContent = 'Activas';
      statusElement.className = 'status-active';
    }

    const stopButton = document.getElementById('stop-recurring-push-btn');
    if (stopButton) {
      stopButton.disabled = false;
    }

    const startButton = document.getElementById('start-recurring-push-btn');
    if (startButton) {
      startButton.disabled = true;
    }

    // Actualizar la tarjeta de notificación activa
    updateActiveRecurringNotificationCard();
  } else {
    isRecurringPushActive = false;

    const statusElement = document.getElementById('recurring-push-status');
    if (statusElement) {
      statusElement.textContent = 'Inactivas';
      statusElement.className = 'status-inactive';
    }

    const stopButton = document.getElementById('stop-recurring-push-btn');
    if (stopButton) {
      stopButton.disabled = true;
    }

    const startButton = document.getElementById('start-recurring-push-btn');
    if (startButton) {
      startButton.disabled = false;
    }
  }
}

// Exportar funciones
export {
  requestNotificationPermission,
  unsubscribeFromPushNotifications,
  sendPushNotification,
  loadSavedTokens,
  fcmTokens,
  updateSubscriptionUI,
  startRecurringPushNotifications,
  stopRecurringPushNotifications,
  loadRecurringPushSettings,
  updateRecurringPushUI,
  updateActiveRecurringNotificationCard,
  isRecurringPushActive
};
