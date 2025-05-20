// Interfaz de administración para enviar notificaciones push
import {
  sendNotification,
  requestNotificationPermission,
  startRecurringNotifications,
  stopRecurringNotifications,
  isRecurringNotificationActive,
  isPermissionGranted
} from './simple-push.js';

// Elementos del DOM
let pushTitleInput;
let pushMessageInput;
let pushImageInput;
let pushImageFileInput;
let pushImagePreview;
let pushIntervalSelect;
let pushCustomIntervalInput;
let sendPushBtn;
let startRecurringPushBtn;
let stopRecurringPushBtn;
let subscribersCount;
let recurringStatusText;

// Variables para imágenes seleccionadas
let selectedPushImageFile = null;
let selectedHourlyImageFile = null;

// Inicializar la interfaz de administración
function initPushAdmin() {
  // Obtener elementos del DOM
  pushTitleInput = document.getElementById('push-title');
  pushMessageInput = document.getElementById('push-message');
  pushImageInput = document.getElementById('push-image');
  pushImageFileInput = document.getElementById('push-image-file');
  pushImagePreview = document.getElementById('push-image-preview');
  pushIntervalSelect = document.getElementById('push-interval');
  pushCustomIntervalInput = document.getElementById('push-custom-interval');
  sendPushBtn = document.getElementById('send-push-btn');
  startRecurringPushBtn = document.getElementById('start-recurring-push-btn');
  stopRecurringPushBtn = document.getElementById('stop-recurring-push-btn');
  subscribersCount = document.getElementById('subscribers-count');
  recurringStatusText = document.getElementById('recurring-push-status');

  // Manejar selección de archivos de imagen
  if (pushImageFileInput) {
    pushImageFileInput.addEventListener('change', handlePushImageFileSelect);
  }

  const hourlyImageFileInput = document.getElementById('hourly-notification-image-file');
  if (hourlyImageFileInput) {
    hourlyImageFileInput.addEventListener('change', handleHourlyImageFileSelect);
  }

  // Actualizar contador de suscriptores
  updateSubscribersCount();

  // Establecer valores predeterminados
  if (pushTitleInput) {
    pushTitleInput.value = pushTitleInput.value || 'Notificación importante';
  }

  if (pushMessageInput) {
    pushMessageInput.value = pushMessageInput.value || '¡Tienes un mensaje importante!';
  }

  // Agregar event listeners
  if (sendPushBtn) {
    sendPushBtn.addEventListener('click', handleSendPush);
  }

  if (startRecurringPushBtn) {
    startRecurringPushBtn.addEventListener('click', handleStartRecurringPush);
  }

  if (stopRecurringPushBtn) {
    stopRecurringPushBtn.addEventListener('click', handleStopRecurringPush);
  }
}

// Actualizar contador de suscriptores
function updateSubscribersCount() {
  if (subscribersCount) {
    subscribersCount.textContent = isPermissionGranted ? '1' : '0';
  }
}

// Manejar el envío de notificaciones push
async function handleSendPush() {
  // Verificar si tenemos permiso
  if (!isPermissionGranted) {
    // Solicitar permiso automáticamente
    try {
      const result = await requestNotificationPermission();
      if (!result) {
        alert('No se pudo obtener permiso para enviar notificaciones. Por favor, concede permiso cuando el navegador lo solicite.');
        return;
      }
    } catch (error) {
      console.error('Error al solicitar permiso:', error);
      alert('Error al solicitar permiso para notificaciones: ' + error.message);
      return;
    }
  }

  // Obtener valores de los campos
  const title = pushTitleInput.value.trim();
  const message = pushMessageInput.value.trim();
  const imageUrl = getPushImageUrl();

  // Validar campos
  if (!title || !message) {
    alert('Por favor, completa el título y el mensaje.');
    return;
  }

  // Validar URL de imagen si se proporciona
  if (imageUrl && !isValidImageUrl(imageUrl)) {
    alert('La URL de imagen debe terminar en .png, .jpg, .jpeg o .gif');
    return;
  }

  // Enviar notificación
  try {
    const result = sendNotification(title, message, imageUrl || null);

    if (result) {
      alert('Notificación enviada con éxito.');

      // Limpiar campos
      pushMessageInput.value = '';
      pushImageInput.value = '';

      // Limpiar vista previa de imagen
      if (pushImagePreview) {
        pushImagePreview.innerHTML = '';
      }

      // Resetear la imagen seleccionada
      selectedPushImageFile = null;
      if (pushImageFileInput) {
        pushImageFileInput.value = '';
      }
    } else {
      alert('Error al enviar la notificación. Asegúrate de que has concedido permiso para notificaciones.');
    }
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    alert('Error al enviar la notificación: ' + error.message);
  }
}

// Verificar si la URL es una imagen válida
function isValidImageUrl(url) {
  return url.match(/\.(jpeg|jpg|gif|png)$/i) !== null;
}

// Actualizar estado de notificaciones recurrentes
function updateRecurringPushStatus() {
  if (recurringStatusText) {
    if (isRecurringPushActive) {
      recurringStatusText.textContent = 'Activas';
      recurringStatusText.className = 'status-active';

      if (stopRecurringPushBtn) {
        stopRecurringPushBtn.disabled = false;
      }

      if (startRecurringPushBtn) {
        startRecurringPushBtn.disabled = true;
      }

      // Actualizar la tarjeta de notificación recurrente activa
      updateActiveRecurringNotificationCard();
    } else {
      recurringStatusText.textContent = 'Inactivas';
      recurringStatusText.className = 'status-inactive';

      if (stopRecurringPushBtn) {
        stopRecurringPushBtn.disabled = true;
      }

      if (startRecurringPushBtn) {
        startRecurringPushBtn.disabled = false;
      }

      // Mostrar mensaje de que no hay notificación activa
      const activeNotificationCard = document.getElementById('active-recurring-notification');
      if (activeNotificationCard) {
        activeNotificationCard.innerHTML = '<p>No hay notificación recurrente activa</p>';
      }
    }
  }
}

// Actualizar la tarjeta de notificación recurrente activa
function updateActiveRecurringNotificationCard() {
  const activeNotificationCard = document.getElementById('active-recurring-notification');
  if (!activeNotificationCard) return;

  // Obtener la configuración actual
  const settings = JSON.parse(localStorage.getItem('recurringNotificationSettings') || '{}');

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

// Manejar inicio de notificaciones push recurrentes
async function handleStartRecurringPush() {
  // Verificar si tenemos permiso
  if (!isPermissionGranted) {
    // Solicitar permiso automáticamente
    try {
      const result = await requestNotificationPermission();
      if (!result) {
        alert('No se pudo obtener permiso para enviar notificaciones. Por favor, concede permiso cuando el navegador lo solicite.');
        return;
      }
    } catch (error) {
      console.error('Error al solicitar permiso:', error);
      alert('Error al solicitar permiso para notificaciones: ' + error.message);
      return;
    }
  }

  // Obtener valores de los campos
  const title = pushTitleInput.value.trim();
  const message = pushMessageInput.value.trim();
  const imageUrl = getPushImageUrl();

  // Validar campos
  if (!title || !message) {
    alert('Por favor, completa el título y el mensaje.');
    return;
  }

  // Validar URL de imagen si se proporciona
  if (imageUrl && !isValidImageUrl(imageUrl)) {
    alert('La URL de imagen debe terminar en .png, .jpg, .jpeg o .gif');
    return;
  }

  // Obtener el intervalo
  let interval;
  if (pushCustomIntervalInput && pushCustomIntervalInput.value.trim() && !isNaN(pushCustomIntervalInput.value.trim())) {
    // Convertir minutos a milisegundos
    interval = parseInt(pushCustomIntervalInput.value.trim()) * 60000;
  } else if (pushIntervalSelect) {
    interval = parseInt(pushIntervalSelect.value);
  } else {
    interval = 3600000; // 1 hora por defecto
  }

  // Iniciar notificaciones recurrentes
  try {
    // Iniciar notificaciones recurrentes
    startRecurringNotifications(title, message, imageUrl, interval);

    // Mostrar mensaje con el intervalo seleccionado
    let intervalText = Math.floor(interval / 60000) + ' minutos';
    if (interval === 60000) intervalText = '1 minuto';
    else if (interval === 3600000) intervalText = '1 hora';
    else if (interval === 86400000) intervalText = '24 horas';

    alert(`Notificaciones recurrentes activadas. Se enviarán cada ${intervalText}.`);

    // Actualizar estado y tarjeta
    updateRecurringStatus();
  } catch (error) {
    console.error('Error al iniciar notificaciones recurrentes:', error);
    alert('Error al activar las notificaciones recurrentes: ' + error.message);
  }
}

// Manejar detención de notificaciones push recurrentes
function handleStopRecurringPush() {
  try {
    // Detener notificaciones recurrentes
    stopRecurringNotifications();

    alert('Notificaciones recurrentes desactivadas.');

    // Actualizar estado
    updateRecurringStatus();
  } catch (error) {
    console.error('Error al detener notificaciones recurrentes:', error);
    alert('Error al desactivar las notificaciones recurrentes: ' + error.message);
  }
}

// Actualizar estado de notificaciones recurrentes
function updateRecurringStatus() {
  if (recurringStatusText) {
    if (isRecurringNotificationActive) {
      recurringStatusText.textContent = 'Activas';
      recurringStatusText.className = 'status-active';

      if (stopRecurringPushBtn) {
        stopRecurringPushBtn.disabled = false;
      }

      if (startRecurringPushBtn) {
        startRecurringPushBtn.disabled = true;
      }

      // Actualizar la tarjeta de notificación recurrente activa
      updateActiveRecurringNotificationCard();
    } else {
      recurringStatusText.textContent = 'Inactivas';
      recurringStatusText.className = 'status-inactive';

      if (stopRecurringPushBtn) {
        stopRecurringPushBtn.disabled = true;
      }

      if (startRecurringPushBtn) {
        startRecurringPushBtn.disabled = false;
      }

      // Mostrar mensaje de que no hay notificación activa
      const activeNotificationCard = document.getElementById('active-recurring-notification');
      if (activeNotificationCard) {
        activeNotificationCard.innerHTML = '<p>No hay notificación recurrente activa</p>';
      }
    }
  }
}

// Manejar selección de archivo de imagen para notificaciones push
function handlePushImageFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Verificar que sea una imagen
  if (!file.type.match('image.*')) {
    alert('Por favor, selecciona un archivo de imagen (PNG, JPG, GIF).');
    event.target.value = '';
    return;
  }

  // Guardar referencia al archivo
  selectedPushImageFile = file;

  // Mostrar vista previa
  const reader = new FileReader();
  reader.onload = function(e) {
    if (pushImagePreview) {
      pushImagePreview.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
    }

    // Limpiar el campo de URL ya que ahora usaremos el archivo
    if (pushImageInput) {
      pushImageInput.value = '';
    }
  };
  reader.readAsDataURL(file);
}

// Manejar selección de archivo de imagen para notificaciones horarias
function handleHourlyImageFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Verificar que sea una imagen
  if (!file.type.match('image.*')) {
    alert('Por favor, selecciona un archivo de imagen (PNG, JPG, GIF).');
    event.target.value = '';
    return;
  }

  // Guardar referencia al archivo
  selectedHourlyImageFile = file;

  // Mostrar vista previa
  const reader = new FileReader();
  reader.onload = function(e) {
    const previewContainer = document.getElementById('hourly-image-preview');
    if (previewContainer) {
      previewContainer.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
    }

    // Limpiar el campo de URL ya que ahora usaremos el archivo
    const urlInput = document.getElementById('hourly-notification-custom-icon');
    if (urlInput) {
      urlInput.value = '';
    }
  };
  reader.readAsDataURL(file);
}

// Obtener URL de imagen para notificaciones push
function getPushImageUrl() {
  // Priorizar archivo seleccionado
  if (selectedPushImageFile) {
    return URL.createObjectURL(selectedPushImageFile);
  }

  // Si no hay archivo, usar URL
  return pushImageInput.value.trim() || null;
}

// Obtener URL de imagen para notificaciones horarias
function getHourlyImageUrl() {
  // Priorizar archivo seleccionado
  if (selectedHourlyImageFile) {
    return URL.createObjectURL(selectedHourlyImageFile);
  }

  // Si no hay archivo, usar URL
  const urlInput = document.getElementById('hourly-notification-custom-icon');
  return urlInput ? urlInput.value.trim() : null;
}

// Inicializar notificaciones recurrentes
function initRecurringNotifications() {
  // Actualizar estado
  updateRecurringStatus();
}

// Exportar funciones
export {
  initPushAdmin,
  updateSubscribersCount,
  getPushImageUrl,
  getHourlyImageUrl,
  initRecurringNotifications
};
