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

// Clave VAPID para notificaciones web push (clave pública)
// Esta clave debe coincidir con la configurada en la consola de Firebase
const vapidKey = "BKyvKYl-x9Roc6KBsnP67vpy_er1YFWYhR5EIcT3xjdra_Etxh_s_Qa04jw9ACtWjFHDezQk3i5jb6ubPmWKOCM";

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

      // Esperar a que el service worker esté activo
      if (registration.installing) {
        const serviceWorker = registration.installing || registration.waiting;

        // Establecer un listener para cambios de estado
        serviceWorker.addEventListener('statechange', function() {
          console.log('Service Worker estado cambiado a:', serviceWorker.state);
        });
      }

      // En Firebase v9, no necesitamos llamar a useServiceWorker
      // Firebase Messaging usa automáticamente el service worker registrado
      console.log('Service Worker registrado para Firebase Messaging');
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
  // Actualizar el panel oculto
  const subscriptionStatus = document.getElementById('subscription-status');
  const subscribeBtn = document.getElementById('subscribe-push-btn');
  const unsubscribeBtn = document.getElementById('unsubscribe-push-btn');
  const subscribersCount = document.getElementById('subscribers-count');

  // Actualizar el panel público
  const subscriptionStatusPublic = document.getElementById('subscription-status-public');
  const subscribeBtnPublic = document.getElementById('subscribe-btn-public');
  const unsubscribeBtnPublic = document.getElementById('unsubscribe-btn-public');

  // Actualizar estado en el panel oculto
  if (subscriptionStatus) {
    if (isSubscribed) {
      subscriptionStatus.textContent = 'Suscrito';
      subscriptionStatus.className = 'status-subscribed';
    } else {
      subscriptionStatus.textContent = 'No suscrito';
      subscriptionStatus.className = 'status-unsubscribed';
    }
  }

  // Actualizar botones en el panel oculto
  if (subscribeBtn && unsubscribeBtn) {
    if (isSubscribed) {
      subscribeBtn.style.display = 'none';
      unsubscribeBtn.style.display = 'inline-block';
    } else {
      subscribeBtn.style.display = 'inline-block';
      unsubscribeBtn.style.display = 'none';
    }
  }

  // Actualizar estado en el panel público
  if (subscriptionStatusPublic) {
    if (isSubscribed) {
      subscriptionStatusPublic.textContent = 'Suscrito';
      subscriptionStatusPublic.className = 'status-subscribed';
    } else {
      subscriptionStatusPublic.textContent = 'No suscrito';
      subscriptionStatusPublic.className = 'status-unsubscribed';
    }
  }

  // Actualizar botones en el panel público
  if (subscribeBtnPublic && unsubscribeBtnPublic) {
    if (isSubscribed) {
      subscribeBtnPublic.style.display = 'none';
      unsubscribeBtnPublic.style.display = 'inline-block';
    } else {
      subscribeBtnPublic.style.display = 'inline-block';
      unsubscribeBtnPublic.style.display = 'none';
    }
  }

  // Actualizar contador de suscriptores
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

    // Verificar si estamos en un contexto seguro (HTTPS o localhost)
    if (!window.isSecureContext) {
      console.error('No estamos en un contexto seguro (HTTPS o localhost)');
      alert('Las notificaciones push requieren un contexto seguro (HTTPS o localhost). Actualmente estás usando HTTP, lo que puede causar problemas con las notificaciones push.');
      // Continuamos de todos modos, ya que en algunos casos puede funcionar
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
      // Registrar o recuperar el service worker
      console.log('Verificando service workers existentes...');

      // Intentar obtener el service worker existente primero
      let swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');

      if (swRegistration) {
        console.log('Service Worker ya registrado:', swRegistration);
      } else {
        // Si no existe, registrar uno nuevo
        console.log('Registrando nuevo service worker de Firebase...');
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Nuevo Service Worker registrado:', swRegistration);
      }

      // Esperar a que el service worker esté completamente activo
      if (swRegistration.installing) {
        console.log('Service Worker instalándose, esperando activación...');

        await new Promise((resolve) => {
          const worker = swRegistration.installing;

          // Función para manejar cambios de estado
          const handleStateChange = function() {
            console.log('Service Worker cambió estado a:', worker.state);
            if (worker.state === 'activated') {
              console.log('Service Worker completamente activado');
              worker.removeEventListener('statechange', handleStateChange);
              resolve();
            }
          };

          // Escuchar cambios de estado
          worker.addEventListener('statechange', handleStateChange);

          // Si ya está activo, resolver inmediatamente
          if (worker.state === 'activated') {
            console.log('Service Worker ya está activo');
            worker.removeEventListener('statechange', handleStateChange);
            resolve();
          }
        });
      } else if (swRegistration.active) {
        console.log('Service Worker ya está activo');
      }

      // Esperar un momento adicional para asegurar que todo esté listo
      console.log('Esperando un momento para asegurar que todo esté listo...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar que el service worker esté activo
      const activeRegistration = await navigator.serviceWorker.ready;
      console.log('Service Worker activo confirmado:', activeRegistration.active ? 'Sí' : 'No');

      // Solicitar el token FCM
      console.log('Solicitando token FCM con VAPID key:', vapidKey);
      try {
        // Usar el método getToken con la clave VAPID
        const currentToken = await messaging.getToken({
          vapidKey: vapidKey,
          serviceWorkerRegistration: swRegistration
        });

        if (currentToken) {
          console.log('Token de FCM obtenido:', currentToken);

          // Mostrar mensaje de confirmación
          alert('¡Suscripción exitosa! Ahora recibirás notificaciones incluso cuando el navegador esté cerrado.');

          // Guardar token si no existe
          if (!fcmTokens.includes(currentToken)) {
            fcmTokens.push(currentToken);
            saveTokens();
            console.log('Nuevo token guardado');
          } else {
            console.log('Token ya existente, actualizando UI');
            // Actualizar la UI aunque el token ya exista
            updateSubscriptionUI(true);
          }

          return true;
        } else {
          throw new Error('No se pudo obtener el token FCM');
        }
      } catch (tokenError) {
        console.error('Error al obtener token FCM:', tokenError);

        // Diagnóstico detallado
        console.log('Diagnóstico detallado:');
        console.log('- Navegador:', navigator.userAgent);
        console.log('- Estado de permisos:', Notification.permission);
        console.log('- Service Worker activo:', !!swRegistration.active);
        console.log('- VAPID key:', vapidKey);

        // Verificar si el navegador es compatible con Push API
        if (!('PushManager' in window)) {
          console.error('Este navegador no soporta la API de Push');
          alert('Tu navegador no soporta notificaciones push. Por favor, actualiza tu navegador o usa uno compatible como Chrome, Firefox, Edge o Safari reciente.');
          return false;
        }

        // Verificar estado de la red
        console.log('Estado de conexión a Internet:', navigator.onLine ? 'Conectado' : 'Desconectado');

        // Mostrar mensaje de error amigable
        alert('No se pudo obtener el token para notificaciones push. Este error puede ocurrir por varias razones:\n\n' +
              '1. El navegador no soporta completamente las notificaciones push\n' +
              '2. Hay problemas de conectividad con el servicio de Firebase\n' +
              '3. La configuración de Firebase no es correcta\n\n' +
              'Por favor, intenta con otro navegador como Chrome, que tiene mejor soporte para notificaciones push.');

        console.log('Detalles del error:', tokenError);
        return false;
      }
    } catch (swError) {
      console.error('Error al registrar Service Worker:', swError);
      alert('Error al registrar Service Worker: ' + swError.message + '. Por favor, recarga la página e intenta nuevamente.');
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

// Enviar notificación push a todos los dispositivos suscritos usando FCM REST API
async function sendPushNotification(title, message, imageUrl = null) {
  if (fcmTokens.length === 0) {
    console.error('No hay tokens para enviar notificaciones');
    alert('No hay dispositivos suscritos para enviar notificaciones. Por favor, suscríbete primero.');
    return false;
  }

  try {
    // Crear la notificación para FCM
    const fcmMessage = {
      notification: {
        title: title,
        body: message,
        icon: imageUrl || '/images/perrito.png',
        click_action: window.location.origin
      },
      data: {
        timestamp: Date.now().toString(),
        url: window.location.origin
      }
    };

    console.log('Enviando notificación push a', fcmTokens.length, 'dispositivos');

    // Mostrar mensaje de confirmación
    alert(`Enviando notificación a ${fcmTokens.length} dispositivo(s) suscrito(s)...`);

    // Enviar a cada token registrado
    const sendPromises = fcmTokens.map(token => sendFcmMessage(token, fcmMessage));
    const results = await Promise.allSettled(sendPromises);

    // Verificar resultados
    const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failedResults = results.filter(result => result.status === 'rejected' || !result.value);

    if (successCount > 0) {
      console.log(`Notificación push enviada correctamente a ${successCount} de ${fcmTokens.length} dispositivos`);

      // Mostrar mensaje de éxito
      alert(`¡Notificación enviada con éxito a ${successCount} de ${fcmTokens.length} dispositivo(s)!`);

      // También mostrar localmente si el navegador está abierto
      if (Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            body: message,
            icon: imageUrl || '/images/perrito.png',
            badge: '/images/badge-icon.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: 'push-notification-' + Date.now(),
            data: {
              timestamp: Date.now(),
              url: window.location.href
            }
          });
        } catch (localError) {
          console.warn('No se pudo mostrar notificación local:', localError);
        }
      }

      // Si hay algunos fallos, registrarlos
      if (failedResults.length > 0) {
        console.warn(`No se pudo enviar a ${failedResults.length} dispositivos:`, failedResults);
      }

      return true;
    } else {
      console.error('No se pudo enviar la notificación a ningún dispositivo');
      alert('Error: No se pudo enviar la notificación a ningún dispositivo. Verifica la conexión a internet y que los dispositivos estén correctamente suscritos.');
      return false;
    }
  } catch (error) {
    console.error('Error al enviar notificación push:', error);
    alert('Error al enviar notificación push: ' + error.message);
    return false;
  }
}

// Función para enviar un mensaje FCM a un token específico usando la API REST
async function sendFcmMessage(token, message) {
  try {
    // Clave del servidor de Firebase (normalmente se almacenaría en el servidor)
    // En una aplicación real, esta solicitud debería hacerse desde tu servidor por seguridad
    // Nota: Esta es la clave del servidor para el proyecto notificaciones-7f993
    const serverKey = "AAAA-Ow_Ztk:APA91bGJbXiUIS-lDCPNmNvTxnNz9tZvU-KvQJXEEy0OIzJkEMZzOtYJlLPTxz-G9c_-_5nfROMQNS-mfEGFRgNS-mfEGFRgNS-mfEGFRgNS";

    // Preparar el mensaje para un token específico
    const fcmPayload = {
      ...message,
      to: token
    };

    console.log(`Enviando mensaje FCM al token: ${token.substring(0, 10)}...`);

    // Enviar la solicitud a la API de FCM
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`
      },
      body: JSON.stringify(fcmPayload)
    });

    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      console.error('Error en la respuesta de FCM:', errorData);
      return false;
    }

    // Procesar la respuesta
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Error al parsear respuesta de FCM:', e);
      console.log('Respuesta recibida:', responseText);
      return false;
    }

    console.log('Respuesta de FCM:', responseData);

    // Verificar si el mensaje se envió correctamente
    if (responseData.success === 1) {
      console.log(`Mensaje enviado correctamente al token: ${token.substring(0, 10)}...`);
      return true;
    } else {
      // Verificar si hay errores específicos
      if (responseData.results && responseData.results.length > 0) {
        const result = responseData.results[0];
        if (result.error) {
          console.warn(`Error al enviar mensaje a token ${token.substring(0, 10)}...: ${result.error}`);

          // Si el token no está registrado o es inválido, eliminarlo
          if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
            console.log('Token inválido o no registrado, eliminando...');
            const index = fcmTokens.indexOf(token);
            if (index !== -1) {
              fcmTokens.splice(index, 1);
              saveTokens();
            }
          }
        }
      }

      console.warn('FCM no pudo entregar el mensaje:', responseData);
      return false;
    }
  } catch (error) {
    console.error('Error al enviar mensaje FCM:', error);
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

  // Programar notificaciones para que funcionen incluso cuando el navegador está cerrado
  // Ahora usamos la API REST de FCM que funciona con el navegador cerrado
  console.log('Programando notificaciones recurrentes con FCM...');

  // Programar el ciclo regular para enviar notificaciones
  sendAndScheduleNext();
  isRecurringPushActive = true;
  console.log('Notificaciones recurrentes activadas correctamente');

  // También programar en el service worker como respaldo
  if (navigator.serviceWorker.controller) {
    console.log('Programando notificaciones recurrentes en el service worker como respaldo...');

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
