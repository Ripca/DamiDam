// Variables globales
let swRegistration = null;
let isPermissionGranted = false;
const scheduledNotifications = [];
let hourlyNotificationInterval = null;
let isHourlyNotificationActive = false;
const CORRECT_PASSWORD = '123';

// Elementos del DOM
const titleInput = document.getElementById('notification-title');
const messageInput = document.getElementById('notification-message');
const timeInput = document.getElementById('notification-time');
const customIconInput = document.getElementById('notification-custom-icon');
const scheduleBtn = document.getElementById('schedule-btn');
const testBtn = document.getElementById('test-btn');
const notificationsList = document.getElementById('scheduled-notifications');
const permissionStatus = document.getElementById('permission-status');
const hourlyConfigBtn = document.getElementById('hourly-config-btn');

// Elementos del modal de contraseña
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const passwordSubmitBtn = document.getElementById('password-submit-btn');
const passwordCancelBtn = document.getElementById('password-cancel-btn');

// Elementos del panel oculto
const hourlyPanel = document.getElementById('hourly-notification-panel');

// Variable para la imagen seleccionada
let selectedHourlyImageFile = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Establecer la fecha y hora actual como valor predeterminado
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // Establecer un minuto en el futuro por defecto
    timeInput.value = now.toISOString().slice(0, 16);

    // Registrar el Service Worker
    registerServiceWorker();

    // Verificar permisos de notificación
    checkNotificationPermission();

    // Cargar notificaciones guardadas
    loadScheduledNotifications();

    // Cargar configuración de notificación horaria
    loadHourlyNotificationSettings();

    // Agregar event listeners
    scheduleBtn.addEventListener('click', scheduleNotification);
    testBtn.addEventListener('click', sendTestNotification);

    // Event listeners para el panel oculto y modal de contraseña
    hourlyConfigBtn.addEventListener('click', showPasswordModal);
    passwordSubmitBtn.addEventListener('click', checkPassword);
    passwordCancelBtn.addEventListener('click', hidePasswordModal);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });

    // Ya no se maneja la selección de archivo de imagen para notificaciones horarias

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Mensaje recibido del Service Worker:', event.data);

        // Confirmar que una notificación fue enviada
        if (event.data.action === 'notificationSent') {
            console.log(`Notificación ${event.data.notificationId} enviada correctamente a las ${new Date(event.data.timestamp).toLocaleTimeString()}`);
        }
    });
});

// Registrar el Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // Verificar si ya hay un controlador activo
            if (navigator.serviceWorker.controller) {
                console.log('Service Worker ya está controlando esta página');
                swRegistration = await navigator.serviceWorker.ready;
                logServiceWorkerStatus('Service Worker ya está activo', true);
                return;
            }

            // Registrar el Service Worker
            swRegistration = await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registrado con éxito:', swRegistration);
            logServiceWorkerStatus('Service Worker registrado correctamente', true);

            // Esperar a que el Service Worker esté activo
            if (swRegistration.active) {
                console.log('Service Worker ya está activo');
            } else {
                // Esperar a que el Service Worker se active
                await new Promise((resolve) => {
                    if (swRegistration.installing) {
                        // Si está instalando, esperar a que se active
                        swRegistration.installing.addEventListener('statechange', (e) => {
                            if (e.target.state === 'activated') {
                                console.log('Nuevo Service Worker activado');
                                resolve();
                            }
                        });
                    } else if (swRegistration.waiting) {
                        // Si está esperando, forzar la activación
                        swRegistration.waiting.postMessage({type: 'SKIP_WAITING'});
                        navigator.serviceWorker.addEventListener('controllerchange', () => {
                            console.log('Nuevo Service Worker tomó el control');
                            resolve();
                        }, {once: true});
                    } else {
                        resolve(); // Ya está activo
                    }
                });
            }

            // Recargar la página para asegurar que el Service Worker controle esta página
            if (!navigator.serviceWorker.controller) {
                console.log('Recargando para activar el Service Worker...');
                window.location.reload();
            }
        } catch (error) {
            console.error('Error al registrar el Service Worker:', error);
            logServiceWorkerStatus('Error al registrar el Service Worker', false);
        }
    } else {
        console.warn('Service Workers no son soportados en este navegador');
        logServiceWorkerStatus('Service Workers no soportados', false);
    }
}

// Verificar permisos de notificación
function checkNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Este navegador no soporta notificaciones');
        permissionStatus.textContent = 'Estado de permisos: Las notificaciones no son soportadas en este navegador';
        permissionStatus.className = 'status-denied';
        return;
    }

    if (Notification.permission === 'granted') {
        isPermissionGranted = true;
        permissionStatus.textContent = 'Estado de permisos: Permiso concedido';
        permissionStatus.className = 'status-granted';

        // Verificar si hay notificaciones globales configuradas
        checkAndActivateGlobalNotifications();
    } else if (Notification.permission === 'denied') {
        isPermissionGranted = false;
        permissionStatus.textContent = 'Estado de permisos: Permiso denegado';
        permissionStatus.className = 'status-denied';
    } else {
        isPermissionGranted = false;
        permissionStatus.textContent = 'Estado de permisos: Permiso no solicitado';
        permissionStatus.className = 'status-default';
        requestNotificationPermission();
    }
}

// Solicitar permiso de notificación
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            isPermissionGranted = true;
            permissionStatus.textContent = 'Estado de permisos: Permiso concedido';
            permissionStatus.className = 'status-granted';

            // Verificar si hay notificaciones globales configuradas
            checkAndActivateGlobalNotifications();
        } else {
            isPermissionGranted = false;
            permissionStatus.textContent = 'Estado de permisos: Permiso denegado';
            permissionStatus.className = 'status-denied';
        }
    } catch (error) {
        console.error('Error al solicitar permiso de notificación:', error);
        permissionStatus.textContent = 'Estado de permisos: Error al solicitar permiso';
        permissionStatus.className = 'status-denied';
    }
}

// Función para registrar mensajes del Service Worker en la consola
function logServiceWorkerStatus(message, isActive) {
    console.log(`Service Worker: ${message} (${isActive ? 'Activo' : 'Inactivo'})`);
}

// Verificar y activar notificaciones globales
function checkAndActivateGlobalNotifications() {
    // Solo proceder si los permisos están concedidos
    if (!isPermissionGranted) return;

    // Verificar si hay configuración global
    const globalSettings = JSON.parse(localStorage.getItem('globalNotificationSettings') || '{}');

    // Si hay configuración global y está activa
    if (globalSettings && globalSettings.isActive) {
        console.log('Encontrada configuración global de notificaciones recurrentes');

        // Verificar si ya tenemos una configuración personal activa
        const personalSettings = JSON.parse(localStorage.getItem('hourlyNotificationSettings') || '{}');

        // Solo activar si no hay una configuración personal activa
        if (!personalSettings.isActive) {
            console.log('Activando notificaciones globales para este usuario');

            // Guardar la configuración global como personal pero marcándola como no global
            const userSettings = {...globalSettings, isGlobal: false};
            localStorage.setItem('hourlyNotificationSettings', JSON.stringify(userSettings));

            // Iniciar las notificaciones
            startHourlyNotification(userSettings);
        }
    }
}

// Programar una notificación
function scheduleNotification() {
    if (!isPermissionGranted) {
        alert('Necesitas conceder permiso para recibir notificaciones');
        requestNotificationPermission();
        return;
    }

    const title = titleInput.value.trim();
    const message = messageInput.value.trim();
    const scheduledTime = new Date(timeInput.value);
    let icon = 'images/perrito.png'; // Usar perrito.png como icono predeterminado
    const customIcon = customIconInput.value.trim();

    // Verificar si hay una URL de imagen personalizada
    if (customIcon) {
        if (isValidImageUrl(customIcon)) {
            icon = customIcon;
        } else {
            alert('La URL de imagen debe terminar en .png, .jpg, .jpeg o .gif');
            return;
        }
    }

    if (!title || !message) {
        alert('Por favor, completa todos los campos');
        return;
    }

    if (scheduledTime <= new Date()) {
        alert('La hora programada debe ser en el futuro');
        return;
    }

    const notification = {
        id: Date.now().toString(),
        title,
        message,
        time: scheduledTime.toISOString(),
        icon
    };

    // Guardar la notificación
    scheduledNotifications.push(notification);
    saveScheduledNotifications();

    // Programar la notificación en el Service Worker
    if (swRegistration && swRegistration.active && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'scheduleNotification',
            notification
        });
    } else {
        // Fallback si el Service Worker no está disponible
        const delay = Math.max(0, scheduledTime.getTime() - Date.now());
        setTimeout(() => {
            new Notification(title, {
                body: message,
                icon
            });
        }, delay);
        console.log('Usando fallback para notificación programada (Service Worker no disponible)');
    }

    // Mostrar mensaje de confirmación
    const timeFormatted = scheduledTime.toLocaleString();
    alert(`¡Notificación programada con éxito para ${timeFormatted}!`);

    // Actualizar la UI
    renderScheduledNotifications();

    // Limpiar el formulario
    messageInput.value = '';
    customIconInput.value = '';
    const newTime = new Date();
    newTime.setMinutes(newTime.getMinutes() + 1);
    timeInput.value = newTime.toISOString().slice(0, 16);
}

// Verificar si la URL es una imagen válida
function isValidImageUrl(url) {
    return url.match(/\.(jpeg|jpg|gif|png)$/i) !== null;
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
        if (hourlyImagePreview) {
            hourlyImagePreview.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
        }

        // Limpiar el campo de URL ya que ahora usaremos el archivo
        if (hourlyCustomIconInput) {
            hourlyCustomIconInput.value = '';
        }
    };
    reader.readAsDataURL(file);
}

// Obtener URL de imagen para notificaciones horarias
function getHourlyImageUrl() {
    // Ya no se manejan archivos de imagen para notificaciones horarias
    // Devolver la imagen predeterminada
    return 'images/perrito.png';
}

// Enviar una notificación de prueba
function sendTestNotification() {
    if (!isPermissionGranted) {
        alert('Necesitas conceder permiso para recibir notificaciones');
        requestNotificationPermission();
        return;
    }

    const title = titleInput.value.trim() || 'Notificación de prueba';
    const message = messageInput.value.trim() || '¡Esta es una notificación de prueba!';
    let icon = 'images/perrito.png'; // Usar perrito.png como icono predeterminado
    const customIcon = customIconInput.value.trim();

    // Verificar si hay una URL de imagen personalizada
    if (customIcon) {
        if (isValidImageUrl(customIcon)) {
            icon = customIcon;
        } else {
            alert('La URL de imagen debe terminar en .png, .jpg, .jpeg o .gif');
            return;
        }
    }

    if (swRegistration && swRegistration.active) {
        swRegistration.showNotification(title, {
            body: message,
            icon: icon || 'images/perrito.png',
            badge: '/images/badge-icon.png'
        });
    } else {
        new Notification(title, {
            body: message,
            icon: icon || 'images/perrito.png'
        });
    }
}

// Guardar notificaciones programadas en localStorage
function saveScheduledNotifications() {
    localStorage.setItem('scheduledNotifications', JSON.stringify(scheduledNotifications));
}

// Cargar notificaciones programadas desde localStorage
function loadScheduledNotifications() {
    const saved = localStorage.getItem('scheduledNotifications');
    if (saved) {
        const parsed = JSON.parse(saved);
        scheduledNotifications.length = 0; // Limpiar el array

        // Filtrar notificaciones pasadas
        const now = new Date();
        const filtered = parsed.filter(notification => {
            return new Date(notification.time) > now;
        });

        // Agregar todas las notificaciones filtradas al array
        scheduledNotifications.push(...filtered);

        // Guardar las notificaciones filtradas
        if (filtered.length !== parsed.length) {
            saveScheduledNotifications();
        }

        // Programar todas las notificaciones cargadas
        if (swRegistration && swRegistration.active && navigator.serviceWorker.controller) {
            filtered.forEach(notification => {
                const scheduledTime = new Date(notification.time);
                const delay = Math.max(0, scheduledTime.getTime() - Date.now());

                if (delay > 0) {
                    navigator.serviceWorker.controller.postMessage({
                        action: 'scheduleNotification',
                        notification
                    });
                }
            });
        } else if (filtered.length > 0) {
            console.log('No se pudieron programar notificaciones con Service Worker. Usando fallback.');
            // Fallback para notificaciones si el Service Worker no está disponible
            filtered.forEach(notification => {
                const scheduledTime = new Date(notification.time);
                const delay = Math.max(0, scheduledTime.getTime() - Date.now());

                if (delay > 0) {
                    setTimeout(() => {
                        new Notification(notification.title, {
                            body: notification.message,
                            icon: notification.icon
                        });
                    }, delay);
                }
            });
        }

        // Renderizar la lista de notificaciones
        renderScheduledNotifications();
    }
}

// Renderizar la lista de notificaciones programadas
function renderScheduledNotifications() {
    notificationsList.innerHTML = '';

    if (scheduledNotifications.length === 0) {
        notificationsList.innerHTML = '<li class="notification-item">No hay notificaciones programadas</li>';
        return;
    }

    // Ordenar por tiempo
    const sorted = [...scheduledNotifications].sort((a, b) => {
        return new Date(a.time) - new Date(b.time);
    });

    sorted.forEach(notification => {
        const li = document.createElement('li');
        li.className = 'notification-item';

        const timeFormatted = new Date(notification.time).toLocaleString();

        li.innerHTML = `
            <div class="notification-info">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${timeFormatted}</div>
            </div>
            <button class="delete-btn" data-id="${notification.id}">Eliminar</button>
        `;

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            deleteNotification(notification.id);
        });

        notificationsList.appendChild(li);
    });
}

// Eliminar una notificación programada
function deleteNotification(id) {
    const index = scheduledNotifications.findIndex(notification => notification.id === id);
    if (index !== -1) {
        scheduledNotifications.splice(index, 1);
        saveScheduledNotifications();
        renderScheduledNotifications();
    }
}

// Mostrar el modal de contraseña
function showPasswordModal() {
    passwordModal.style.display = 'flex';
    passwordInput.value = '';
    passwordInput.focus();
}

// Ocultar el modal de contraseña
function hidePasswordModal() {
    passwordModal.style.display = 'none';
}

// Verificar la contraseña
function checkPassword() {
    const password = passwordInput.value;

    if (password === CORRECT_PASSWORD) {
        hidePasswordModal();
        showHourlyPanel();
    } else {
        alert('Contraseña incorrecta');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// Mostrar el panel de notificación horaria
function showHourlyPanel() {
    hourlyPanel.style.display = 'block';
}

// Esta función ya no se utiliza porque se eliminó el botón correspondiente
function enableHourlyNotification() {
    console.log('Esta función ya no se utiliza');
}

// Esta función ya no se utiliza porque se eliminó el botón correspondiente
function disableHourlyNotification() {
    console.log('Esta función ya no se utiliza');
}

// Iniciar el intervalo de notificación recurrente
function startHourlyNotification(settings) {
    // Detener el intervalo anterior si existe
    if (hourlyNotificationInterval) {
        clearInterval(hourlyNotificationInterval);
    }

    // Enviar la primera notificación inmediatamente
    sendHourlyNotification(settings);

    // Configurar el intervalo según lo seleccionado (por defecto: 3600000 ms = 1 hora)
    const interval = settings.interval || 3600000;

    // Actualizar la interfaz de usuario si estamos en el panel de configuración
    if (intervalSelect && customIntervalInput) {
        // Si es un intervalo personalizado (no está en las opciones predefinidas)
        let found = false;

        // Intentar encontrar el intervalo en las opciones predefinidas
        for (let i = 0; i < intervalSelect.options.length; i++) {
            if (parseInt(intervalSelect.options[i].value) === interval) {
                intervalSelect.selectedIndex = i;
                customIntervalInput.value = ''; // Limpiar el campo personalizado
                found = true;
                break;
            }
        }

        // Si no se encuentra en las opciones predefinidas, debe ser personalizado
        if (!found) {
            // Seleccionar la primera opción (o cualquier otra por defecto)
            intervalSelect.selectedIndex = 0;
            // Mostrar el valor en el campo de intervalo personalizado (convertir de ms a minutos)
            customIntervalInput.value = Math.floor(interval / 60000);
        }
    }

    // Mostrar mensaje con el intervalo seleccionado
    let intervalText = '';
    switch(interval) {
        case 60000: intervalText = '1 minuto'; break;
        case 120000: intervalText = '2 minutos'; break;
        case 180000: intervalText = '3 minutos'; break;
        case 300000: intervalText = '5 minutos'; break;
        case 600000: intervalText = '10 minutos'; break;
        case 900000: intervalText = '15 minutos'; break;
        case 1800000: intervalText = '30 minutos'; break;
        case 3600000: intervalText = '1 hora'; break;
        case 7200000: intervalText = '2 horas'; break;
        case 14400000: intervalText = '4 horas'; break;
        case 86400000: intervalText = '24 horas'; break;
        default: intervalText = Math.floor(interval / 60000) + ' minutos';
    }

    console.log(`Configurando notificación recurrente cada ${intervalText}`);

    // Usar setTimeout en lugar de setInterval para mayor precisión
    function scheduleNextNotification() {
        hourlyNotificationInterval = setTimeout(() => {
            // Enviar la notificación
            sendHourlyNotification(settings);
            // Programar la siguiente
            scheduleNextNotification();
        }, interval);
    }

    // Iniciar el ciclo de notificaciones
    scheduleNextNotification();

    isHourlyNotificationActive = true;
}

// Enviar la notificación horaria
function sendHourlyNotification(settings) {
    if (!isPermissionGranted) return;

    console.log('Enviando notificación recurrente:', settings.title, settings.message);

    try {
        // Intentar usar el Service Worker si está disponible
        if (swRegistration && swRegistration.active) {
            // Agregar un sonido y vibración para llamar la atención
            swRegistration.showNotification(settings.title, {
                body: settings.message,
                icon: settings.icon || 'images/perrito.png',
                badge: '/images/badge-icon.png',
                vibrate: [200, 100, 200], // Patrón de vibración
                sound: 'sound.mp3', // Sonido (si el navegador lo soporta)
                requireInteraction: true, // Mantener la notificación hasta que el usuario interactúe
                tag: 'recurring-notification', // Etiquetar para poder actualizar en lugar de mostrar múltiples
                renotify: true // Notificar nuevamente incluso si hay una notificación con la misma etiqueta
            });
            console.log('Notificación enviada a través del Service Worker');
        } else {
            // Fallback a la API de Notificaciones nativa
            new Notification(settings.title, {
                body: settings.message,
                icon: settings.icon || 'images/perrito.png',
                requireInteraction: true
            });
            console.log('Notificación enviada a través de la API nativa');

            // Reproducir un sonido para llamar la atención
            try {
                const audio = new Audio('sound.mp3');
                audio.play().catch(e => console.log('No se pudo reproducir el sonido:', e));
            } catch (e) {
                console.log('Error al intentar reproducir sonido:', e);
            }
        }
    } catch (error) {
        console.error('Error al enviar notificación:', error);
        // Intentar con el método alternativo si el principal falla
        try {
            new Notification(settings.title, {
                body: settings.message,
                icon: settings.icon || 'images/perrito.png'
            });
            console.log('Notificación enviada mediante método alternativo');
        } catch (e) {
            console.error('Error en método alternativo de notificación:', e);
        }
    }
}

// Cargar la configuración de notificación horaria
function loadHourlyNotificationSettings() {
    // Esta función ya no es necesaria porque se eliminó la sección de notificaciones recurrentes
    console.log('Esta función ya no es necesaria');
}
