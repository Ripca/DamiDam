// Variables globales
let swRegistration = null;
let isPermissionGranted = false;
const scheduledNotifications = [];
let hourlyNotificationInterval = null;
let isHourlyNotificationActive = false;
const CORRECT_PASSWORD = 'PastelitoCoronado123';

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
const hourlyTitleInput = document.getElementById('hourly-notification-title');
const hourlyMessageInput = document.getElementById('hourly-notification-message');
const hourlyCustomIconInput = document.getElementById('hourly-notification-custom-icon');
const intervalSelect = document.getElementById('notification-interval');
const hourlyEnableBtn = document.getElementById('hourly-enable-btn');
const hourlyDisableBtn = document.getElementById('hourly-disable-btn');

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
    hourlyEnableBtn.addEventListener('click', enableHourlyNotification);
    hourlyDisableBtn.addEventListener('click', disableHourlyNotification);
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

// Activar la notificación horaria
function enableHourlyNotification() {
    if (!isPermissionGranted) {
        alert('Necesitas conceder permiso para recibir notificaciones');
        requestNotificationPermission();
        return;
    }

    const title = hourlyTitleInput.value.trim() || 'Recordatorio Horario';
    const message = hourlyMessageInput.value.trim() || '¡Es hora de tu recordatorio horario!';
    let icon = 'images/perrito.png'; // Usar perrito.png como icono predeterminado
    const customIcon = hourlyCustomIconInput.value.trim();

    // Verificar si hay una URL de imagen personalizada
    if (customIcon) {
        if (isValidImageUrl(customIcon)) {
            icon = customIcon;
        } else {
            alert('La URL de imagen debe terminar en .png, .jpg, .jpeg o .gif');
            return;
        }
    }

    // Obtener el intervalo seleccionado
    const interval = parseInt(intervalSelect.value);

    // Guardar la configuración
    const hourlySettings = {
        title,
        message,
        icon,
        interval,
        isActive: true,
        isGlobal: true  // Marcar como configuración global
    };

    // Guardar en configuración personal
    localStorage.setItem('hourlyNotificationSettings', JSON.stringify(hourlySettings));

    // Guardar también como configuración global para todos los usuarios
    localStorage.setItem('globalNotificationSettings', JSON.stringify(hourlySettings));

    // Iniciar el intervalo
    startHourlyNotification(hourlySettings);

    // Mostrar mensaje con el intervalo seleccionado
    let intervalText = '';
    switch(interval) {
        case 900000: intervalText = '15 minutos'; break;
        case 1800000: intervalText = '30 minutos'; break;
        case 3600000: intervalText = '1 hora'; break;
        case 7200000: intervalText = '2 horas'; break;
        case 14400000: intervalText = '4 horas'; break;
        case 86400000: intervalText = '24 horas'; break;
        default: intervalText = Math.floor(interval / 60000) + ' minutos';
    }

    alert(`Notificación recurrente activada con éxito. Se enviará cada ${intervalText}`);
}

// Desactivar la notificación horaria
function disableHourlyNotification() {
    if (hourlyNotificationInterval) {
        clearInterval(hourlyNotificationInterval);
        hourlyNotificationInterval = null;
    }

    isHourlyNotificationActive = false;

    // Actualizar la configuración personal
    const hourlySettings = JSON.parse(localStorage.getItem('hourlyNotificationSettings') || '{}');
    hourlySettings.isActive = false;
    localStorage.setItem('hourlyNotificationSettings', JSON.stringify(hourlySettings));

    // También desactivar la configuración global
    const globalSettings = JSON.parse(localStorage.getItem('globalNotificationSettings') || '{}');
    globalSettings.isActive = false;
    localStorage.setItem('globalNotificationSettings', JSON.stringify(globalSettings));

    alert('Notificación recurrente desactivada');
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

    // Actualizar el selector de intervalo si existe
    if (intervalSelect) {
        // Buscar la opción que coincide con el intervalo guardado
        let found = false;
        for (let i = 0; i < intervalSelect.options.length; i++) {
            if (parseInt(intervalSelect.options[i].value) === interval) {
                intervalSelect.selectedIndex = i;
                found = true;
                break;
            }
        }

        // Si no se encuentra, seleccionar la opción por defecto (1 hora)
        if (!found) {
            for (let i = 0; i < intervalSelect.options.length; i++) {
                if (parseInt(intervalSelect.options[i].value) === 3600000) {
                    intervalSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    // Mostrar mensaje con el intervalo seleccionado
    let intervalText = '';
    switch(interval) {
        case 900000: intervalText = '15 minutos'; break;
        case 1800000: intervalText = '30 minutos'; break;
        case 3600000: intervalText = '1 hora'; break;
        case 7200000: intervalText = '2 horas'; break;
        case 14400000: intervalText = '4 horas'; break;
        case 86400000: intervalText = '24 horas'; break;
        default: intervalText = Math.floor(interval / 60000) + ' minutos';
    }

    console.log(`Configurando notificación recurrente cada ${intervalText}`);

    hourlyNotificationInterval = setInterval(() => {
        sendHourlyNotification(settings);
    }, interval);

    isHourlyNotificationActive = true;
}

// Enviar la notificación horaria
function sendHourlyNotification(settings) {
    if (!isPermissionGranted) return;

    if (swRegistration && swRegistration.active) {
        swRegistration.showNotification(settings.title, {
            body: settings.message,
            icon: settings.icon || 'images/perrito.png',
            badge: '/images/badge-icon.png'
        });
    } else {
        new Notification(settings.title, {
            body: settings.message,
            icon: settings.icon || 'images/perrito.png'
        });
    }
}

// Cargar la configuración de notificación horaria
function loadHourlyNotificationSettings() {
    // Cargar configuración personal
    const hourlySettings = JSON.parse(localStorage.getItem('hourlyNotificationSettings') || '{}');

    // Cargar configuración global (para el panel de administrador)
    const globalSettings = JSON.parse(localStorage.getItem('globalNotificationSettings') || '{}');

    // Si hay configuración global y es administrador, mostrarla en el panel
    if (globalSettings.title && globalSettings.isGlobal) {
        hourlyTitleInput.value = globalSettings.title;
        hourlyMessageInput.value = globalSettings.message || '';

        // Configurar el icono personalizado si existe
        if (globalSettings.icon && globalSettings.icon.startsWith('http')) {
            hourlyCustomIconInput.value = globalSettings.icon;
        }

        // Configurar el intervalo si existe
        if (globalSettings.interval && intervalSelect) {
            for (let i = 0; i < intervalSelect.options.length; i++) {
                if (parseInt(intervalSelect.options[i].value) === globalSettings.interval) {
                    intervalSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }
    // Si no hay configuración global o no es administrador, usar la configuración personal
    else if (hourlySettings.title) {
        hourlyTitleInput.value = hourlySettings.title;

        if (hourlySettings.message) {
            hourlyMessageInput.value = hourlySettings.message;
        }

        if (hourlySettings.icon && hourlySettings.icon.startsWith('http')) {
            hourlyCustomIconInput.value = hourlySettings.icon;
        }

        // Configurar el intervalo si existe
        if (hourlySettings.interval && intervalSelect) {
            for (let i = 0; i < intervalSelect.options.length; i++) {
                if (parseInt(intervalSelect.options[i].value) === hourlySettings.interval) {
                    intervalSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    // Si la configuración personal estaba activa, reiniciarla
    if (hourlySettings.isActive) {
        startHourlyNotification(hourlySettings);
    }
    // Si no hay configuración personal activa pero hay permisos, verificar si hay configuración global
    else if (isPermissionGranted) {
        checkAndActivateGlobalNotifications();
    }
}
