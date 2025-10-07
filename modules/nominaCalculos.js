// ===== MÓDULO DE CÁLCULOS DE NÓMINA =====
// Funciones puras para cálculos de nómina (sin dependencias de DOM o Firebase)

/**
 * Calcula los días laborables en un rango de fechas, excluyendo festivos
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @param {Array} festivos - Array de fechas festivas (strings YYYY-MM-DD)
 * @returns {number} Días laborables
 */
export function calcularDiasLaborables(fechaInicio, fechaFin, festivos = []) {
  let diasLaborables = 0;
  const fecha = new Date(fechaInicio);

  while (fecha <= fechaFin) {
    const diaSemana = fecha.getDay();
    const fechaStr = fecha.toISOString().split('T')[0];

    // Contar si no es fin de semana y no es festivo
    if (diaSemana !== 0 && diaSemana !== 6 && !festivos.includes(fechaStr)) {
      diasLaborables++;
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  return diasLaborables;
}

/**
 * Calcula el pago por día basado en el salario y días estándar
 * @param {number} salario - Salario quincenal o semanal
 * @param {number} diasEstandar - Días laborables estándar del periodo
 * @returns {number} Pago por día
 */
export function calcularPagoPorDia(salario, diasEstandar) {
  if (!salario || !diasEstandar || diasEstandar === 0) return 0;
  return salario / diasEstandar;
}

/**
 * Calcula descuentos por faltas
 * @param {number} diasFaltantes - Número de días faltantes
 * @param {number} pagoPorDia - Pago por día
 * @returns {number} Total de descuento por faltas
 */
export function calcularDescuentoFaltas(diasFaltantes, pagoPorDia) {
  return diasFaltantes * pagoPorDia;
}

/**
 * Calcula descuentos por retardos
 * @param {number} retardos - Número de retardos
 * @param {number} pagoPorDia - Pago por día
 * @param {number} penalizacionRetardo - Porcentaje de penalización (ej: 0.15 = 15%)
 * @returns {number} Total de descuento por retardos
 */
export function calcularDescuentoRetardos(retardos, pagoPorDia, penalizacionRetardo = 0.15) {
  return retardos * (pagoPorDia * penalizacionRetardo);
}

/**
 * Calcula el pago final aplicando todos los descuentos
 * @param {number} salarioBase - Salario base
 * @param {number} descuentoFaltas - Descuento por faltas
 * @param {number} descuentoRetardos - Descuento por retardos
 * @param {number} descuentoCajaAhorro - Descuento de caja de ahorro
 * @param {number} otrosDescuentos - Otros descuentos adicionales
 * @returns {number} Pago final
 */
export function calcularPagoFinal(salarioBase, descuentoFaltas, descuentoRetardos, descuentoCajaAhorro = 0, otrosDescuentos = 0) {
  const totalDescuentos = descuentoFaltas + descuentoRetardos + descuentoCajaAhorro + otrosDescuentos;
  const pagoFinal = salarioBase - totalDescuentos;
  return Math.max(0, pagoFinal); // No permitir pagos negativos
}

/**
 * Formatea un número como moneda MXN
 * @param {number} numero - Número a formatear
 * @returns {string} Número formateado
 */
export function formatearNumero(numero) {
  if (numero === null || numero === undefined || isNaN(numero)) return '0.00';
  return Number(numero).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Calcula el periodo de nómina (1ra o 2da quincena)
 * @param {Date} fecha - Fecha de referencia
 * @returns {Object} {quincena: '1ra Quincena' | '2da Quincena', mes: 'Enero', anio: 2025}
 */
export function calcularPeriodo(fecha = new Date()) {
  const dia = fecha.getDate();
  const mes = fecha.toLocaleDateString('es-MX', { month: 'long' });
  const anio = fecha.getFullYear();
  const quincena = dia <= 15 ? '1ra Quincena' : '2da Quincena';

  return { quincena, mes, anio };
}

/**
 * Obtiene el rango de fechas de una quincena específica
 * @param {string} quincena - '1ra Quincena' o '2da Quincena'
 * @param {number} mes - Mes (0-11)
 * @param {number} anio - Año
 * @returns {Object} {inicio: Date, fin: Date}
 */
export function obtenerRangoQuincena(quincena, mes, anio) {
  if (quincena === '1ra Quincena') {
    return {
      inicio: new Date(anio, mes, 1),
      fin: new Date(anio, mes, 15)
    };
  } else {
    const ultimoDia = new Date(anio, mes + 1, 0).getDate();
    return {
      inicio: new Date(anio, mes, 16),
      fin: new Date(anio, mes, ultimoDia)
    };
  }
}

/**
 * Valida si un empleado tiene descuento de caja de ahorro activo
 * @param {Object} empleado - Objeto empleado con datos de caja de ahorro
 * @returns {boolean} True si tiene descuento activo
 */
export function tieneDescuentoCajaAhorro(empleado) {
  return empleado?.cajaAhorro?.activo === true &&
         empleado?.cajaAhorro?.montoPorPeriodo > 0;
}

/**
 * Calcula el total de descuentos
 * @param {Object} descuentos - Objeto con todos los descuentos
 * @returns {number} Total de descuentos
 */
export function calcularTotalDescuentos(descuentos) {
  const { faltas = 0, retardos = 0, cajaAhorro = 0, otros = 0 } = descuentos;
  return faltas + retardos + cajaAhorro + otros;
}

/**
 * Valida datos de nómina para prevenir errores
 * @param {Object} datosNomina - Datos de nómina a validar
 * @returns {Object} {valido: boolean, errores: string[]}
 */
export function validarDatosNomina(datosNomina) {
  const errores = [];

  if (!datosNomina.empleado || !datosNomina.empleado.uid) {
    errores.push('Empleado no especificado');
  }

  if (typeof datosNomina.salarioQuincenal !== 'number' || datosNomina.salarioQuincenal < 0) {
    errores.push('Salario inválido');
  }

  if (typeof datosNomina.diasTrabajados !== 'number' || datosNomina.diasTrabajados < 0) {
    errores.push('Días trabajados inválidos');
  }

  if (datosNomina.diasTrabajados > datosNomina.diasLaboralesEsperados) {
    errores.push('Días trabajados no pueden exceder días esperados');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Sanitiza inputs numéricos para prevenir inyecciones
 * @param {any} input - Input a sanitizar
 * @param {number} defaultValue - Valor por defecto si es inválido
 * @returns {number} Número sanitizado
 */
export function sanitizarNumero(input, defaultValue = 0) {
  const numero = parseFloat(input);
  if (isNaN(numero) || !isFinite(numero)) {
    return defaultValue;
  }
  return Math.max(0, numero); // No permitir negativos
}

/**
 * Sanitiza strings para prevenir XSS
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
export function sanitizarTexto(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
