// ===== EJEMPLO DE INTEGRACIÓN DE MÓDULOS =====
// Este archivo muestra cómo usar los nuevos módulos en el código existente

// ============================================
// 1. IMPORTS AL INICIO DEL ARCHIVO
// ============================================

// Importar Firebase (como ya lo tienes)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Importar módulos nuevos
import CONFIG from './modules/config.js';
import {
  calcularDiasLaborables,
  calcularPagoPorDia,
  calcularPagoFinal,
  formatearNumero,
  validarDatosNomina
} from './modules/nominaCalculos.js';

import {
  mostrarNotificacion,
  mostrarLoader,
  mostrarConfirmacion,
  debounce
} from './modules/nominaUI.js';

import {
  queryWithCache,
  obtenerEmpleadosActivos,
  updateWithCache,
  obtenerAsistenciasEmpleado
} from './modules/firestoreOptimizado.js';

import {
  sanitizarNumero,
  sanitizarString,
  validarEmail,
  validarDatosEmpleado,
  rateLimiter
} from './modules/seguridad.js';

import { generarTicketPDF } from './modules/nominaPDF.js';

// ============================================
// 2. INICIALIZAR FIREBASE (USANDO CONFIG)
// ============================================

const app = initializeApp(CONFIG.FIREBASE);
const db = getFirestore(app);

// ============================================
// 3. EJEMPLO: CALCULAR NÓMINA DE UN EMPLEADO
// ============================================

async function calcularNominaEmpleado(empleadoId) {
  // Mostrar loader
  const hideLoader = mostrarLoader('Calculando nómina...');

  try {
    // 1. Obtener datos del empleado (CON CACHÉ)
    const empleados = await obtenerEmpleadosActivos(db, { useCache: true });
    const empleado = empleados.find(e => e.id === empleadoId);

    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // 2. Obtener asistencias (CON CACHÉ)
    const fechaInicio = new Date(2025, 0, 1); // 1 enero 2025
    const fechaFin = new Date(2025, 0, 15);   // 15 enero 2025

    const asistencias = await obtenerAsistenciasEmpleado(
      db,
      empleadoId,
      fechaInicio,
      fechaFin,
      { useCache: true }
    );

    // 3. Calcular días laborables (FUNCIÓN PURA)
    const festivos = ['2025-01-06']; // Día de Reyes
    const diasLaborables = calcularDiasLaborables(fechaInicio, fechaFin, festivos);

    // 4. Calcular pago por día (FUNCIÓN PURA)
    const salario = sanitizarNumero(empleado.salarioQuincenal, { min: 0, max: 100000 });
    const pagoPorDia = calcularPagoPorDia(salario, diasLaborables);

    // 5. Contar días trabajados, retardos, faltas
    const diasTrabajados = asistencias.filter(a => a.tipo === 'entrada').length;
    const retardos = asistencias.filter(a => a.retardo === true).length;
    const diasFaltantes = diasLaborables - diasTrabajados;

    // 6. Calcular descuentos (FUNCIONES PURAS)
    const descuentoFaltas = diasFaltantes * pagoPorDia;
    const descuentoRetardos = retardos * (pagoPorDia * CONFIG.NOMINA.PENALIZACION_RETARDO);
    const descuentoCajaAhorro = empleado.cajaAhorro?.activo
      ? empleado.cajaAhorro.montoPorPeriodo
      : 0;

    // 7. Calcular pago final (FUNCIÓN PURA)
    const pagoFinal = calcularPagoFinal(
      salario,
      descuentoFaltas,
      descuentoRetardos,
      descuentoCajaAhorro,
      0 // otros descuentos
    );

    // 8. Validar datos (SEGURIDAD)
    const datosNomina = {
      empleado,
      salarioQuincenal: salario,
      diasTrabajados,
      diasLaboralesEsperados: diasLaborables,
      retardos,
      diasFaltantes,
      descuentoFaltas,
      descuentoRetardos,
      descuentoCajaAhorro,
      pagoFinal,
      quincena: '1ra Quincena',
      mes: 'Enero 2025'
    };

    const validacion = validarDatosNomina(datosNomina);
    if (!validacion.valido) {
      throw new Error(`Datos inválidos: ${validacion.errores.join(', ')}`);
    }

    // 9. Ocultar loader
    hideLoader();

    // 10. Mostrar notificación de éxito
    mostrarNotificacion('Nómina calculada correctamente', 'success');

    return datosNomina;

  } catch (error) {
    hideLoader();
    mostrarNotificacion(`Error: ${error.message}`, 'error');
    throw error;
  }
}

// ============================================
// 4. EJEMPLO: GUARDAR NÓMINA CON VALIDACIÓN
// ============================================

async function guardarNomina(datosNomina) {
  // Validar con rate limiter (SEGURIDAD)
  const userId = datosNomina.empleado.uid;
  if (!rateLimiter.permitir(`guardar-nomina-${userId}`)) {
    mostrarNotificacion('Demasiados intentos, espera un momento', 'warning');
    return;
  }

  // Confirmar acción
  const confirmo = await mostrarConfirmacion(
    'Guardar Nómina',
    `¿Guardar nómina de ${datosNomina.empleado.nombre}?`
  );

  if (!confirmo) return;

  const hideLoader = mostrarLoader('Guardando nómina...');

  try {
    // Sanitizar datos antes de guardar (SEGURIDAD)
    const datosSanitizados = {
      empleadoId: datosNomina.empleado.uid,
      empleadoNombre: sanitizarString(datosNomina.empleado.nombre),
      salarioQuincenal: sanitizarNumero(datosNomina.salarioQuincenal),
      diasTrabajados: sanitizarNumero(datosNomina.diasTrabajados),
      retardos: sanitizarNumero(datosNomina.retardos),
      pagoFinal: sanitizarNumero(datosNomina.pagoFinal),
      quincena: sanitizarString(datosNomina.quincena),
      mes: sanitizarString(datosNomina.mes),
      fechaCreacion: new Date()
    };

    // Guardar con invalidación automática de caché
    await updateWithCache(db, 'nominas', datosNomina.empleado.uid, datosSanitizados);

    hideLoader();
    mostrarNotificacion('Nómina guardada correctamente', 'success');

  } catch (error) {
    hideLoader();
    mostrarNotificacion(`Error al guardar: ${error.message}`, 'error');
    throw error;
  }
}

// ============================================
// 5. EJEMPLO: GENERAR PDF
// ============================================

async function generarPDFNomina(datosNomina) {
  try {
    mostrarNotificacion('Generando PDF...', 'info');

    await generarTicketPDF(datosNomina);

    mostrarNotificacion('PDF generado correctamente', 'success');

  } catch (error) {
    mostrarNotificacion(`Error al generar PDF: ${error.message}`, 'error');
  }
}

// ============================================
// 6. EJEMPLO: BÚSQUEDA CON DEBOUNCE
// ============================================

// Input de búsqueda con debounce para no hacer queries en cada tecla
const inputBusqueda = document.getElementById('buscar-empleado');

const buscarEmpleadoDebounced = debounce(async (termino) => {
  if (termino.length < 2) return;

  // Sanitizar input (SEGURIDAD)
  const terminoSeguro = sanitizarString(termino);

  const hideLoader = mostrarLoader('Buscando...');

  try {
    // Query con caché
    const empleados = await obtenerEmpleadosActivos(db, { useCache: true });

    // Filtrar localmente (más rápido que query)
    const resultados = empleados.filter(e =>
      e.nombre.toLowerCase().includes(terminoSeguro.toLowerCase())
    );

    hideLoader();

    // Mostrar resultados en UI
    mostrarResultados(resultados);

  } catch (error) {
    hideLoader();
    mostrarNotificacion('Error en búsqueda', 'error');
  }
}, 300); // Espera 300ms después del último evento

if (inputBusqueda) {
  inputBusqueda.addEventListener('input', (e) => {
    buscarEmpleadoDebounced(e.target.value);
  });
}

// ============================================
// 7. EJEMPLO: VALIDAR FORMULARIO DE EMPLEADO
// ============================================

async function guardarEmpleado(formData) {
  // Validar email
  if (!validarEmail(formData.email)) {
    mostrarNotificacion('Email inválido', 'error');
    return;
  }

  // Sanitizar datos
  const empleadoSanitizado = {
    nombre: sanitizarString(formData.nombre),
    email: sanitizarString(formData.email),
    tipo: sanitizarString(formData.tipo),
    salarioQuincenal: sanitizarNumero(formData.salario, { min: 0, max: 100000 })
  };

  // Validar datos completos
  const validacion = validarDatosEmpleado(empleadoSanitizado);
  if (!validacion.valido) {
    mostrarNotificacion(
      `Error: ${validacion.errores.join(', ')}`,
      'error'
    );
    return;
  }

  const hideLoader = mostrarLoader('Guardando empleado...');

  try {
    await updateWithCache(db, 'empleados', formData.id, empleadoSanitizado);

    hideLoader();
    mostrarNotificacion('Empleado guardado', 'success');

  } catch (error) {
    hideLoader();
    mostrarNotificacion(`Error: ${error.message}`, 'error');
  }
}

// ============================================
// 8. EJEMPLO: CARGAR EMPLEADOS AL INICIO
// ============================================

async function inicializarSistema() {
  const hideLoader = mostrarLoader('Inicializando sistema...');

  try {
    // Cargar empleados activos (primera vez desde Firestore, luego desde caché)
    const empleados = await obtenerEmpleadosActivos(db, { useCache: true });

    console.log(`✅ ${empleados.length} empleados cargados`);

    // Renderizar en UI
    renderizarEmpleados(empleados);

    hideLoader();
    mostrarNotificacion('Sistema listo', 'success', 2000);

  } catch (error) {
    hideLoader();
    mostrarNotificacion('Error al inicializar', 'error');
    console.error(error);
  }
}

// ============================================
// 9. EJEMPLO: FUNCIONES HELPER PARA UI
// ============================================

function mostrarResultados(resultados) {
  const container = document.getElementById('resultados');
  if (!container) return;

  if (resultados.length === 0) {
    container.innerHTML = '<p>No se encontraron resultados</p>';
    return;
  }

  container.innerHTML = resultados.map(emp => `
    <div class="empleado-card">
      <h4>${sanitizarString(emp.nombre)}</h4>
      <p>Email: ${sanitizarString(emp.email)}</p>
      <p>Salario: $${formatearNumero(emp.salarioQuincenal)}</p>
      <button onclick="calcularNominaEmpleado('${emp.id}')">
        Calcular Nómina
      </button>
    </div>
  `).join('');
}

function renderizarEmpleados(empleados) {
  const container = document.getElementById('lista-empleados');
  if (!container) return;

  container.innerHTML = empleados.map(emp => `
    <tr>
      <td>${sanitizarString(emp.nombre)}</td>
      <td>${sanitizarString(emp.email)}</td>
      <td>$${formatearNumero(emp.salarioQuincenal)}</td>
      <td>
        <button onclick="editarEmpleado('${emp.id}')">Editar</button>
        <button onclick="calcularNominaEmpleado('${emp.id}')">Nómina</button>
      </td>
    </tr>
  `).join('');
}

// ============================================
// 10. EXPORTAR FUNCIONES (si es necesario)
// ============================================

// Para usar en otros archivos o desde la consola
window.calcularNominaEmpleado = calcularNominaEmpleado;
window.guardarNomina = guardarNomina;
window.generarPDFNomina = generarPDFNomina;
window.inicializarSistema = inicializarSistema;

// ============================================
// 11. INICIALIZAR AL CARGAR LA PÁGINA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Sistema de Nómina v' + CONFIG.VERSION);
  inicializarSistema();
});

// ============================================
// NOTAS DE MIGRACIÓN:
// ============================================

/*
ANTES (código original):
-----------------------
window.calcularNomina = async function(empleadoId) {
  const empleadoRef = doc(db, 'empleados', empleadoId);
  const empleadoDoc = await getDoc(empleadoRef);
  const empleado = empleadoDoc.data();

  const salario = empleado.salarioQuincenal;
  const diasTrabajados = 10;
  const diasLaborables = 11;

  const pagoFinal = salario - ((diasLaborables - diasTrabajados) * (salario / diasLaborables));

  return pagoFinal;
}

DESPUÉS (con módulos):
----------------------
import { calcularPagoFinal, calcularPagoPorDia } from './modules/nominaCalculos.js';
import { obtenerEmpleadosActivos } from './modules/firestoreOptimizado.js';

async function calcularNomina(empleadoId) {
  // Obtener empleado con caché
  const empleados = await obtenerEmpleadosActivos(db, { useCache: true });
  const empleado = empleados.find(e => e.id === empleadoId);

  // Usar funciones puras
  const pagoPorDia = calcularPagoPorDia(empleado.salarioQuincenal, 11);
  const descuentoFaltas = (11 - 10) * pagoPorDia;
  const pagoFinal = calcularPagoFinal(empleado.salarioQuincenal, descuentoFaltas, 0, 0, 0);

  return pagoFinal;
}

BENEFICIOS:
-----------
✅ Caché automático (menos lecturas de Firestore)
✅ Funciones testeables y reutilizables
✅ Código más limpio y mantenible
✅ Sanitización automática
✅ Mejor manejo de errores
*/
