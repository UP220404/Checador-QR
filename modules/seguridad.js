// ===== MÓDULO DE SEGURIDAD =====
// Funciones para validación y sanitización de inputs

/**
 * Sanitiza un string para prevenir XSS
 * @param {string} input - String a sanitizar
 * @returns {string} String sanitizado
 */
export function sanitizarString(input) {
  if (typeof input !== 'string') {
    return String(input || '');
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitiza un número
 * @param {any} input - Input a sanitizar
 * @param {Object} options - Opciones {min: number, max: number, default: number}
 * @returns {number} Número sanitizado
 */
export function sanitizarNumero(input, options = {}) {
  const { min = 0, max = Infinity, default: defaultValue = 0 } = options;

  const numero = parseFloat(input);

  if (isNaN(numero) || !isFinite(numero)) {
    return defaultValue;
  }

  // Aplicar límites
  if (numero < min) return min;
  if (numero > max) return max;

  return numero;
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
export function validarEmail(email) {
  if (typeof email !== 'string') return false;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida una fecha
 * @param {any} fecha - Fecha a validar
 * @returns {boolean} True si es válida
 */
export function validarFecha(fecha) {
  if (fecha instanceof Date) {
    return !isNaN(fecha.getTime());
  }

  const date = new Date(fecha);
  return !isNaN(date.getTime());
}

/**
 * Sanitiza un objeto completo recursivamente
 * @param {Object} obj - Objeto a sanitizar
 * @param {Array<string>} camposExcluidos - Campos que no se deben sanitizar
 * @returns {Object} Objeto sanitizado
 */
export function sanitizarObjeto(obj, camposExcluidos = []) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return sanitizarString(obj);

  const sanitizado = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (camposExcluidos.includes(key)) {
      sanitizado[key] = value;
      continue;
    }

    if (value === null || value === undefined) {
      sanitizado[key] = value;
    } else if (typeof value === 'string') {
      sanitizado[key] = sanitizarString(value);
    } else if (typeof value === 'number') {
      sanitizado[key] = sanitizarNumero(value);
    } else if (typeof value === 'object') {
      sanitizado[key] = sanitizarObjeto(value, camposExcluidos);
    } else {
      sanitizado[key] = value;
    }
  }

  return sanitizado;
}

/**
 * Valida campos requeridos en un objeto
 * @param {Object} obj - Objeto a validar
 * @param {Array<string>} camposRequeridos - Campos requeridos
 * @returns {Object} {valido: boolean, camposFaltantes: string[]}
 */
export function validarCamposRequeridos(obj, camposRequeridos) {
  const camposFaltantes = [];

  for (const campo of camposRequeridos) {
    if (obj[campo] === undefined || obj[campo] === null || obj[campo] === '') {
      camposFaltantes.push(campo);
    }
  }

  return {
    valido: camposFaltantes.length === 0,
    camposFaltantes
  };
}

/**
 * Rate limiting simple en memoria
 */
class RateLimiter {
  constructor(maxIntentos = 5, ventanaTiempo = 60000) {
    this.maxIntentos = maxIntentos;
    this.ventanaTiempo = ventanaTiempo; // ms
    this.intentos = new Map();
  }

  /**
   * Verifica si una acción está permitida
   * @param {string} key - Clave única (ej: email, IP, userId)
   * @returns {boolean} True si está permitido
   */
  permitir(key) {
    const ahora = Date.now();
    const registro = this.intentos.get(key);

    if (!registro) {
      this.intentos.set(key, { count: 1, firstAttempt: ahora });
      return true;
    }

    const tiempoTranscurrido = ahora - registro.firstAttempt;

    if (tiempoTranscurrido > this.ventanaTiempo) {
      // Reset ventana
      this.intentos.set(key, { count: 1, firstAttempt: ahora });
      return true;
    }

    if (registro.count >= this.maxIntentos) {
      return false;
    }

    registro.count++;
    return true;
  }

  /**
   * Resetea el contador para una clave
   * @param {string} key - Clave a resetear
   */
  resetear(key) {
    this.intentos.delete(key);
  }

  /**
   * Obtiene información sobre una clave
   * @param {string} key - Clave
   * @returns {Object|null} Info del rate limit
   */
  obtenerInfo(key) {
    const registro = this.intentos.get(key);
    if (!registro) return null;

    const ahora = Date.now();
    const tiempoRestante = Math.max(0, this.ventanaTiempo - (ahora - registro.firstAttempt));

    return {
      intentos: registro.count,
      maxIntentos: this.maxIntentos,
      tiempoRestante: Math.ceil(tiempoRestante / 1000), // segundos
      bloqueado: registro.count >= this.maxIntentos
    };
  }
}

// Instancia global de rate limiter
export const rateLimiter = new RateLimiter(10, 60000); // 10 intentos por minuto

/**
 * Valida que un valor esté dentro de un conjunto permitido
 * @param {any} valor - Valor a validar
 * @param {Array} valoresPermitidos - Valores permitidos
 * @param {any} valorDefault - Valor por defecto si no es válido
 * @returns {any} Valor validado
 */
export function validarEnum(valor, valoresPermitidos, valorDefault) {
  if (valoresPermitidos.includes(valor)) {
    return valor;
  }
  return valorDefault;
}

/**
 * Previene inyección SQL/NoSQL básica
 * @param {string} input - Input a validar
 * @returns {boolean} True si es seguro
 */
export function esEntradaSegura(input) {
  if (typeof input !== 'string') return true;

  const patronesPeligrosos = [
    /(\$where)/i,
    /(\$ne)/i,
    /(\$gt)/i,
    /(\$lt)/i,
    /(\$regex)/i,
    /(javascript:)/i,
    /(<script)/i,
    /(onerror=)/i,
    /(onclick=)/i,
  ];

  return !patronesPeligrosos.some(patron => patron.test(input));
}

/**
 * Valida longitud de string
 * @param {string} input - String a validar
 * @param {Object} options - {min: number, max: number}
 * @returns {boolean} True si cumple con la longitud
 */
export function validarLongitud(input, options = {}) {
  const { min = 0, max = Infinity } = options;

  if (typeof input !== 'string') return false;

  const longitud = input.length;
  return longitud >= min && longitud <= max;
}

/**
 * Genera un token aleatorio seguro
 * @param {number} longitud - Longitud del token
 * @returns {string} Token generado
 */
export function generarToken(longitud = 32) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  // Usar crypto.getRandomValues si está disponible
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(longitud);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < longitud; i++) {
      token += caracteres[array[i] % caracteres.length];
    }
  } else {
    // Fallback a Math.random (menos seguro)
    for (let i = 0; i < longitud; i++) {
      token += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
  }

  return token;
}

/**
 * Valida datos de empleado (estructura real de tu DB)
 * @param {Object} empleado - Datos del empleado
 * @returns {Object} {valido: boolean, errores: string[]}
 */
export function validarDatosEmpleado(empleado) {
  const errores = [];

  // Validar campos requeridos
  const { valido, camposFaltantes } = validarCamposRequeridos(empleado, ['nombre', 'correo', 'tipo']);
  if (!valido) {
    errores.push(`Campos faltantes: ${camposFaltantes.join(', ')}`);
  }

  // Validar correo (nota: tu DB usa 'correo' no 'email')
  if (empleado.correo && !validarEmail(empleado.correo)) {
    errores.push('Correo inválido');
  }

  // Validar tipo (basado en tu estructura: tiempo_completo, becario, etc.)
  const tiposValidos = ['tiempo_completo', 'becario', 'medio_tiempo'];
  if (empleado.tipo && !tiposValidos.includes(empleado.tipo)) {
    errores.push(`Tipo de empleado inválido. Debe ser: ${tiposValidos.join(', ')}`);
  }

  // Validar categoría (opcional)
  if (empleado.categoria) {
    const categoriasValidas = ['sistemas', 'administrativa', 'operaciones', 'ventas', 'general'];
    if (!categoriasValidas.includes(empleado.categoria)) {
      errores.push(`Categoría inválida. Debe ser: ${categoriasValidas.join(', ')}`);
    }
  }

  // Validar rol (opcional)
  if (empleado.rol) {
    const rolesValidos = ['admin', 'empleado', 'supervisor', 'usuario'];
    if (!rolesValidos.includes(empleado.rol)) {
      errores.push(`Rol inválido. Debe ser: ${rolesValidos.join(', ')}`);
    }
  }

  // Validar salarioQuincenal
  if (empleado.salarioQuincenal !== undefined) {
    const salario = sanitizarNumero(empleado.salarioQuincenal, { min: 0, max: 1000000 });
    if (salario === 0 && empleado.salarioQuincenal !== 0) {
      errores.push('Salario quincenal inválido');
    }
  }

  // Validar pagoPorHora
  if (empleado.pagoPorHora !== undefined) {
    const pago = sanitizarNumero(empleado.pagoPorHora, { min: 0, max: 10000 });
    if (pago === 0 && empleado.pagoPorHora !== 0) {
      errores.push('Pago por hora inválido');
    }
  }

  // Validar horasQuincenal
  if (empleado.horasQuincenal !== undefined) {
    const horas = sanitizarNumero(empleado.horasQuincenal, { min: 0, max: 200 });
    if (horas === 0 && empleado.horasQuincenal !== 0) {
      errores.push('Horas quincenales inválidas');
    }
  }

  // Validación cruzada: si tiene pagoPorHora, debería tener horasQuincenal
  if (empleado.pagoPorHora && !empleado.horasQuincenal) {
    errores.push('Si se especifica pago por hora, debe incluir horas quincenales');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Logger de seguridad
 * @param {string} evento - Tipo de evento
 * @param {Object} detalles - Detalles del evento
 */
export function logSeguridad(evento, detalles = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    evento,
    ...detalles,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.warn('🔒 Evento de seguridad:', log);

  // Aquí podrías enviar a un servicio de logging externo
  // Por ejemplo, a Firestore en una colección 'logs_seguridad'

  return log;
}

/**
 * Detecta intentos de inyección
 * @param {Object} datos - Datos a analizar
 * @returns {boolean} True si se detectó intento de inyección
 */
export function detectarInyeccion(datos) {
  const datosString = JSON.stringify(datos);

  const patronesPeligrosos = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
    /\$where/i,
    /\$ne/i,
    /eval\(/i,
    /expression\(/i
  ];

  const detectado = patronesPeligrosos.some(patron => patron.test(datosString));

  if (detectado) {
    logSeguridad('INTENTO_INYECCION', {
      datos: datosString.substring(0, 200), // Solo primeros 200 chars
      tipo: 'XSS/NoSQL Injection'
    });
  }

  return detectado;
}
