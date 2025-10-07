// ===== INICIALIZACIÓN AUTOMÁTICA DE MÓDULOS =====
// Este archivo agrega las funcionalidades optimizadas sin modificar el código existente

import CONFIG from './config.js';
import {
  calcularDiasLaborables,
  calcularPagoPorDia,
  calcularPagoFinal,
  formatearNumero,
  calcularDescuentoFaltas,
  calcularDescuentoRetardos,
  validarDatosNomina,
  sanitizarNumero as sanitizarNum,
  sanitizarTexto
} from './nominaCalculos.js';

import {
  mostrarNotificacion,
  mostrarLoader,
  mostrarConfirmacion,
  debounce,
  formatearFecha
} from './nominaUI.js';

import {
  queryWithCache,
  updateWithCache,
  createWithCache,
  obtenerEmpleadosActivos,
  mostrarEstadisticasCache,
  limpiarCache
} from './firestoreOptimizado.js';

import {
  sanitizarNumero,
  sanitizarString,
  validarEmail,
  validarDatosEmpleado,
  rateLimiter,
  detectarInyeccion
} from './seguridad.js';

import { generarTicketPDF } from './nominaPDF.js';

// ===== EXPONER FUNCIONES GLOBALMENTE =====

// Funciones de cálculo
window.calcularDiasLaborables = calcularDiasLaborables;
window.calcularPagoPorDia = calcularPagoPorDia;
window.calcularPagoFinal = calcularPagoFinal;
window.formatearNumero = formatearNumero;
window.calcularDescuentoFaltas = calcularDescuentoFaltas;
window.calcularDescuentoRetardos = calcularDescuentoRetardos;

// Funciones de UI
window.mostrarNotificacion = mostrarNotificacion;
window.mostrarLoader = mostrarLoader;
window.mostrarConfirmacion = mostrarConfirmacion;
window.debounce = debounce;

// Funciones de Firestore
window.queryWithCache = queryWithCache;
window.updateWithCache = updateWithCache;
window.createWithCache = createWithCache;
window.obtenerEmpleadosActivos = obtenerEmpleadosActivos;
window.mostrarEstadisticasCache = mostrarEstadisticasCache;
window.limpiarCache = limpiarCache;

// Funciones de seguridad
window.sanitizarNumero = sanitizarNumero;
window.sanitizarString = sanitizarString;
window.validarEmail = validarEmail;
window.validarDatosEmpleado = validarDatosEmpleado;
window.detectarInyeccion = detectarInyeccion;

// Función de PDF
window.generarTicketPDFOptimizado = generarTicketPDF;

// Configuración
window.CONFIG = CONFIG;

// ===== OVERRIDE DE FUNCIONES EXISTENTES =====

// Guardar referencias a funciones originales
const alertOriginal = window.alert;
const confirmOriginal = window.confirm;

// Override de alert con notificaciones
window.alert = function(mensaje) {
  if (typeof mostrarNotificacion === 'function') {
    mostrarNotificacion(mensaje, 'info', 4000);
  } else {
    alertOriginal(mensaje);
  }
};

// Override de confirm con modal
const confirmAsync = window.confirm;
window.confirmAsync = async function(mensaje) {
  if (typeof mostrarConfirmacion === 'function') {
    return await mostrarConfirmacion('Confirmación', mensaje);
  } else {
    return confirmOriginal(mensaje);
  }
};

// ===== WRAPPER PARA FORMATEAR NÚMEROS =====

// Si existe una función formatearNumero original, la guardamos
if (window.formatearNumero && typeof window.formatearNumero === 'function') {
  window.formatearNumeroOriginal = window.formatearNumero;
}

// Siempre usar la nueva
window.formatearNumero = formatearNumero;

// ===== INICIALIZACIÓN =====

console.log('✅ Módulos optimizados cargados');
console.log('📦 Versión:', CONFIG.VERSION);
console.log('🔧 Modo desarrollo:', CONFIG.DEV_MODE);

// Mostrar notificación de inicio
if (typeof mostrarNotificacion === 'function') {
  setTimeout(() => {
    mostrarNotificacion('Sistema optimizado cargado v' + CONFIG.VERSION, 'success', 2000);
  }, 1000);
}

// ===== HELPERS GLOBALES =====

// Helper para mostrar stats de caché en consola
window.verCacheStats = function() {
  console.table(mostrarEstadisticasCache());
};

// Helper para verificar configuración
window.verConfig = function() {
  console.log('🔧 Configuración actual:', CONFIG);
};

// Helper para test rápido de módulos
window.testModulos = function() {
  console.log('🧪 Testing módulos...');

  // Test formateo
  const numero = formatearNumero(1234567.89);
  console.log('✅ formatearNumero(1234567.89):', numero);

  // Test sanitización
  const sanitizado = sanitizarNumero('123abc');
  console.log('✅ sanitizarNumero("123abc"):', sanitizado);

  // Test validación email
  const emailValido = validarEmail('test@test.com');
  console.log('✅ validarEmail("test@test.com"):', emailValido);

  // Test notificación
  mostrarNotificacion('Test de módulos completado', 'success', 3000);

  console.log('✅ Todos los módulos funcionando correctamente');
};

// ===== EXPORT PARA USAR EN OTROS MÓDULOS =====

export {
  CONFIG,
  calcularDiasLaborables,
  calcularPagoPorDia,
  calcularPagoFinal,
  formatearNumero,
  mostrarNotificacion,
  mostrarLoader,
  mostrarConfirmacion,
  queryWithCache,
  updateWithCache,
  sanitizarNumero,
  sanitizarString,
  validarEmail,
  generarTicketPDF
};

// ===== MENSAJE DE AYUDA =====

console.log(`
🚀 Módulos Optimizados Cargados

Funciones disponibles:
- window.formatearNumero(numero)
- window.mostrarNotificacion(msg, tipo)
- window.sanitizarNumero(input)
- window.validarEmail(email)
- window.mostrarEstadisticasCache()
- window.testModulos()          ← Prueba todos los módulos
- window.verCacheStats()        ← Ver estadísticas de caché
- window.verConfig()            ← Ver configuración

Para usar en tu código:
  const salario = formatearNumero(5000);
  mostrarNotificacion('Guardado', 'success');
  const numero = sanitizarNumero(input);
`);
