// ===== CONFIGURACIÓN CENTRALIZADA =====
// Todas las configuraciones del sistema en un solo lugar

export const CONFIG = {
  // Configuración de Firebase
  FIREBASE: {
    apiKey: "AIzaSyD2o2FyUwVZafKIv-qtM6fmA663ldB_1Uo",
    authDomain: "qr-acceso-cielito-home.firebaseapp.com",
    projectId: "qr-acceso-cielito-home",
    storageBucket: "qr-acceso-cielito-home.appspot.com",
    messagingSenderId: "229634415256",
    appId: "1:229634415256:web:c576ba8879e58e441c4eed"
  },

  // Configuración de nómina
  NOMINA: {
    DIAS_QUINCENA_ESTANDAR: 11, // Días laborables promedio por quincena
    PENALIZACION_RETARDO: 0.15, // 15% del día por retardo
    TIPOS_EMPLEADO: ['tiempo_completo', 'becario', 'medio_tiempo'],
    CATEGORIAS: ['sistemas', 'administrativa', 'operaciones', 'ventas', 'general'],
    ROLES: ['admin', 'empleado', 'supervisor', 'usuario'],
    SALARIO_MINIMO: 0,
    SALARIO_MAXIMO: 1000000,
  },

  // Configuración de horarios
  HORARIOS: {
    HORA_LIMITE_ENTRADA: { hours: 8, minutes: 10 },
    HORA_LIMITE_SALIDA_BECARIO: { hours: 13, minutes: 0 },
    HORA_LIMITE_SALIDA_EMPLEADO: { hours: 16, minutes: 0 },
    HORARIO_LABORAL_INICIO: 7,
    HORARIO_LABORAL_FIN: 18,
  },

  // Configuración de caché
  CACHE: {
    TTL_DEFAULT: 5 * 60 * 1000, // 5 minutos
    TTL_EMPLEADOS: 10 * 60 * 1000, // 10 minutos
    TTL_ASISTENCIAS: 2 * 60 * 1000, // 2 minutos
    TTL_NOMINAS: 15 * 60 * 1000, // 15 minutos
  },

  // Configuración de seguridad
  SEGURIDAD: {
    RATE_LIMIT_INTENTOS: 10,
    RATE_LIMIT_VENTANA: 60000, // 1 minuto
    MAX_LONGITUD_NOMBRE: 100,
    MAX_LONGITUD_COMENTARIO: 500,
    EMAILS_PERMITIDOS_ADMIN: [
      'sistemas16ch@gmail.com',
      'sistemas16cielitohome@gmail.com',
      'leticia@cielitohome.com',
      'sistemas@cielitohome.com',
      'direcciongeneral@cielitohome.com',
      'sistemas6cielitohome@gmail.com'
    ],
  },

  // Configuración de UI
  UI: {
    NOTIFICACION_DURACION_DEFAULT: 3000,
    ITEMS_POR_PAGINA: 10,
    ANIMACION_DURACION: 300,
  },

  // Configuración de EmailJS
  EMAILJS: {
    SERVICE_ID: 'service_j0nh0nm',
    TEMPLATE_ID: 'template_wm0r0qh',
    PUBLIC_KEY: 'fCMWOC3A_Nv_FqKel',
    LIMITE_DIARIO: 200,
  },

  // Modo de desarrollo
  DEV_MODE: false, // Cambiar a true para logs detallados

  // Versión del sistema
  VERSION: '2.0.0',
  BUILD_DATE: '2025-01-07'
};

/**
 * Obtiene configuración específica
 * @param {string} path - Ruta de configuración (ej: 'NOMINA.PENALIZACION_RETARDO')
 * @returns {any} Valor de configuración
 */
export function getConfig(path) {
  const keys = path.split('.');
  let value = CONFIG;

  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Configuración no encontrada: ${path}`);
      return undefined;
    }
  }

  return value;
}

/**
 * Actualiza configuración (solo para desarrollo)
 * @param {string} path - Ruta de configuración
 * @param {any} value - Nuevo valor
 */
export function setConfig(path, value) {
  if (!CONFIG.DEV_MODE) {
    console.error('No se puede modificar configuración en producción');
    return;
  }

  const keys = path.split('.');
  const lastKey = keys.pop();
  let target = CONFIG;

  for (const key of keys) {
    target = target[key];
    if (target === undefined) {
      console.error(`Configuración no encontrada: ${path}`);
      return;
    }
  }

  target[lastKey] = value;
  console.log(`✅ Configuración actualizada: ${path} = ${value}`);
}

/**
 * Valida configuración al iniciar
 */
export function validarConfiguracion() {
  const errores = [];

  // Validar Firebase
  if (!CONFIG.FIREBASE.apiKey || !CONFIG.FIREBASE.projectId) {
    errores.push('Configuración de Firebase incompleta');
  }

  // Validar EmailJS
  if (!CONFIG.EMAILJS.SERVICE_ID || !CONFIG.EMAILJS.PUBLIC_KEY) {
    errores.push('Configuración de EmailJS incompleta');
  }

  // Validar valores numéricos
  if (CONFIG.NOMINA.PENALIZACION_RETARDO < 0 || CONFIG.NOMINA.PENALIZACION_RETARDO > 1) {
    errores.push('Penalización de retardo debe estar entre 0 y 1');
  }

  if (errores.length > 0) {
    console.error('❌ Errores de configuración:', errores);
    return false;
  }

  console.log('✅ Configuración validada correctamente');
  return true;
}

// Exportar como default también
export default CONFIG;
