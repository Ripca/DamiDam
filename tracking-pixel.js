// Sistema de seguimiento de usuarios mediante pixel

// Almacenamiento de eventos de seguimiento
const trackingEvents = [];

// Información del usuario
let userInfo = {
  sessionId: generateSessionId(),
  startTime: new Date(),
  userAgent: navigator.userAgent,
  screenSize: `${window.screen.width}x${window.screen.height}`,
  language: navigator.language,
  referrer: document.referrer || 'direct',
  path: window.location.pathname,
  events: []
};

// Generar un ID de sesión único
function generateSessionId() {
  return 'session_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         '_' + Date.now();
}

// Inicializar el sistema de seguimiento
function initTrackingSystem() {
  // Cargar información de sesión anterior si existe
  const savedSession = localStorage.getItem('tracking_session');
  if (savedSession) {
    try {
      const parsedSession = JSON.parse(savedSession);
      // Usar la sesión guardada solo si es de hoy
      const savedDate = new Date(parsedSession.startTime);
      const now = new Date();
      if (savedDate.toDateString() === now.toDateString()) {
        userInfo = parsedSession;
        console.log('Sesión de seguimiento restaurada:', userInfo.sessionId);
      } else {
        // Si es un nuevo día, crear nueva sesión
        saveSession();
        console.log('Nueva sesión de seguimiento creada:', userInfo.sessionId);
      }
    } catch (e) {
      console.error('Error al cargar sesión de seguimiento:', e);
      saveSession();
    }
  } else {
    // Primera vez, guardar sesión
    saveSession();
    console.log('Primera sesión de seguimiento creada:', userInfo.sessionId);
  }

  // Registrar evento de inicio de sesión
  trackEvent('session_start', {
    url: window.location.href,
    timestamp: new Date().toISOString()
  });

  // Configurar listeners para seguimiento
  setupTrackingListeners();
  
  return userInfo;
}

// Guardar información de sesión
function saveSession() {
  localStorage.setItem('tracking_session', JSON.stringify(userInfo));
}

// Registrar un evento de seguimiento
function trackEvent(eventType, eventData = {}) {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    data: eventData
  };
  
  // Agregar a la lista de eventos
  userInfo.events.push(event);
  trackingEvents.push(event);
  
  // Guardar en localStorage
  saveSession();
  
  // Registrar en consola para depuración
  console.log(`[Tracking] ${eventType}:`, eventData);
  
  return event;
}

// Configurar listeners para eventos de seguimiento
function setupTrackingListeners() {
  // Seguimiento de navegación
  window.addEventListener('popstate', () => {
    trackEvent('navigation', {
      url: window.location.href,
      path: window.location.pathname
    });
  });
  
  // Seguimiento de clics
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button') || e.target;
    const tagName = target.tagName.toLowerCase();
    const text = target.innerText || target.textContent;
    const id = target.id || '';
    const classes = Array.from(target.classList || []).join(' ');
    
    trackEvent('click', {
      element: tagName,
      text: text ? text.substring(0, 50) : '',
      id,
      classes,
      path: window.location.pathname
    });
  });
  
  // Seguimiento de visibilidad de página
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      trackEvent('page_hide', {
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    } else {
      trackEvent('page_show', {
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Seguimiento de cierre de ventana
  window.addEventListener('beforeunload', () => {
    trackEvent('session_end', {
      url: window.location.href,
      duration: (new Date() - new Date(userInfo.startTime)) / 1000,
      timestamp: new Date().toISOString()
    });
    
    // Forzar guardado sincrónico antes de cerrar
    saveSession();
  });
}

// Obtener todos los eventos de seguimiento
function getTrackingEvents() {
  return trackingEvents;
}

// Obtener información de la sesión actual
function getSessionInfo() {
  return userInfo;
}

// Limpiar datos de seguimiento
function clearTrackingData() {
  localStorage.removeItem('tracking_session');
  userInfo = {
    sessionId: generateSessionId(),
    startTime: new Date(),
    userAgent: navigator.userAgent,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    referrer: document.referrer || 'direct',
    path: window.location.pathname,
    events: []
  };
  trackingEvents.length = 0;
  saveSession();
  return true;
}

// Exportar funciones
export {
  initTrackingSystem,
  trackEvent,
  getTrackingEvents,
  getSessionInfo,
  clearTrackingData
};
