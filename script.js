import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD2o2FyUwVZafKIv-qtM6fmA663ldB_1Uo",
  authDomain: "qr-acceso-cielito-home.firebaseapp.com",
  projectId: "qr-acceso-cielito-home",
  storageBucket: "qr-acceso-cielito-home.appspot.com",
  messagingSenderId: "229634415256",
  appId: "1:229634415256:web:c576ba8879e58e441c4eed"
};

// Constantes de configuración
const CONFIG = {
  MODO_PRUEBAS: false, // Cambiar a true para pruebas
  HORA_LIMITE_ENTRADA: { hours: 8, minutes: 10 }, // 8:10 AM
  HORA_LIMITE_SALIDA_BECARIO: { hours: 13, minutes: 0 }, // 1:00 PM
  HORA_LIMITE_SALIDA_EMPLEADO: { hours: 16, minutes: 0 } // 4:00 PM
};

async function validarQR() {
  const params = new URLSearchParams(window.location.search);
  const qrParam = params.get('qr');
  const tokenParam = params.get('token');
  
  // Verificar acceso sospechoso ANTES de validar QR
  const accesoSospechoso = verificarAccesoSospechoso();
  if (accesoSospechoso) {
    await registrarIntentoSospechoso(accesoSospechoso, usuarioActual);
    
    if (usuarioActual) {
      mostrarEstado("error", "⚠️ Acceso no autorizado detectado. Debes escanear el QR.");
      return false;
    }
  }
  
  // Validación básica del QR
  if (qrParam !== 'OFICINA2025') {
    return false;
  }
  
  // ✅ SISTEMA HÍBRIDO: Soportar QR con token Y QR estático anterior
  if (tokenParam) {
    // ===== NUEVO SISTEMA CON TOKEN =====
    console.log('🔐 Validando QR con token (nuevo sistema)...');
    
    try {
      // Verificar token en Firebase
      const tokenRef = doc(db, "qr_tokens", "current");
      const tokenDoc = await getDoc(tokenRef);
      
      if (!tokenDoc.exists()) {
        mostrarEstado("error", "❌ Token no encontrado. Solicita un nuevo QR.");
        await incrementarContador('bloqueados');
        return false;
      }
      
      const tokenData = tokenDoc.data();
      const ahora = new Date();
      const expiracion = tokenData.expiracion.toDate();
      
      // Verificar que el token coincida
      if (tokenData.token !== tokenParam) {
        mostrarEstado("error", "❌ Token inválido. Escanea el QR más reciente.");
        await incrementarContador('bloqueados');
        return false;
      }
      
      // Verificar que no esté expirado
      if (ahora > expiracion) {
        mostrarEstado("error", "⏰ QR expirado. Solicita un nuevo código.");
        await incrementarContador('bloqueados');
        return false;
      }
      
      // Lógica de múltiples usos según modo
      const modoToken = tokenData.modo || 'dinamico';
      
      if (modoToken === 'dinamico') {
        // En modo dinámico: solo un uso
        if (tokenData.usado) {
          mostrarEstado("error", "🚫 QR ya utilizado. Cada QR solo puede usarse una vez en horario de entrada.");
          await incrementarContador('bloqueados');
          return false;
        }
        
        // Marcar como usado SOLO en modo dinámico
        await updateDoc(tokenRef, {
          usado: true,
          fechaUso: new Date(),
          ultimoUsuario: usuarioActual?.email || 'desconocido'
        });
        
      } else if (modoToken === 'estatico') {
        // En modo estático: múltiples usos permitidos
        console.log('🔓 Modo estático: permitiendo múltiples usos');
        
        // Registrar quién lo usó sin marcarlo como usado
        await updateDoc(tokenRef, {
          ultimoAcceso: new Date(),
          ultimoUsuario: usuarioActual?.email || 'desconocido',
          contadorUsos: increment(1)
        });
      }
      
      await incrementarContador('exitosos');
      console.log('✅ Token validado exitosamente (nuevo sistema)');
      
    } catch (error) {
      console.error('Error validando token:', error);
      mostrarEstado("error", "❌ Error de conexión. Intenta nuevamente.");
      return false;
    }
    
  } else {
  // ===== SISTEMA ANTERIOR SIN TOKEN (COMPATIBILIDAD) =====
  console.log('📋 Validando QR estático anterior (sin token)...');
  
  // Verificar horarios permitidos para QR estático anterior
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  
  // ✅ PERMITIR QR ESTÁTICO ANTERIOR EN TODO EL HORARIO LABORAL
  if (hora >= 7 && hora < 20) {
    console.log('✅ QR estático anterior permitido en horario laboral completo');
    await incrementarContador('exitosos');
  } else {
    mostrarEstado("error", "❌ QR estático anterior solo permitido en horario laboral (7 AM - 6 PM).");
    await incrementarContador('bloqueados');
    return false;
  }
}
  
  // Si todo está bien, marcar sesión como válida
  sesionValidada = true;
  
  // Limpiar URL para evitar reuso
  const nuevaUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({}, document.title, nuevaUrl);
  
  return true;
}

// 📊 Función para incrementar contadores
async function incrementarContador(tipo) {
  const hoy = new Date().toISOString().split('T')[0];
  const statsRef = doc(db, "qr_stats", hoy);

  try {
    const updateData = {};
    updateData[tipo] = increment(1);
    updateData.ultimaActualizacion = new Date();

    console.log(`📊 Incrementando contador ${tipo} para fecha ${hoy}`);
    await updateDoc(statsRef, updateData);
    console.log(`✅ Contador ${tipo} incrementado exitosamente`);

  } catch (error) {
    console.error('Error actualizando contador:', error);

    // Si el documento no existe, crearlo
    if (error.code === 'not-found') {
      try {
        const newData = {
          generados: 0,
          exitosos: 0,
          bloqueados: 0,
          fecha: hoy,
          ultimaActualizacion: new Date()
        };
        newData[tipo] = 1;

        await setDoc(statsRef, newData);
        console.log(`✅ Documento creado y contador ${tipo} inicializado`);
      } catch (createError) {
        console.error('Error creando documento de estadísticas:', createError);
      }
    } 
  }
}

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos del DOM
const DOM = {
  userName: document.getElementById("user-name"),
  btnGoogle: document.getElementById("btn-google"),
  btnLogout: document.getElementById("btn-logout"),
  statusBox: document.getElementById("status"),
  infoBox: document.getElementById("info"),
  historialContainer: document.getElementById("historial-container"),
  historialLista: document.getElementById("historial-lista"),
  nombreUsuario: document.getElementById("nombreUsuario"),
  correoUsuario: document.getElementById("correoUsuario"),
  tipoUsuario: document.getElementById("tipoUsuario"),
  fechaHoy: document.getElementById("fechaHoy"),
  horaRegistro: document.getElementById("horaRegistro"),
  tipoEvento: document.getElementById("tipoEvento")
};

// Clases CSS
const CSS_CLASSES = {
  dNone: "d-none",
  alert: {
    puntual: "alert-success",
    retardo: "alert-warning",
    salida: "alert-primary",
    error: "alert-danger"
  }
};

// Lista blanca de correos remotos
const USUARIOS_REMOTOS = [
  "sistemas20cielitoh@gmail.com",
  "operacionescielitoh@gmail.com",
  "atencionmedicacielitoh@gmail.com"
];

let ubicacionPrecargada = null;
let ubicacionObteniendo = false;

// Sistema de detección de accesos sospechosos
let sesionValidada = false;
let usuarioActual = null;

function detectarTipoAcceso() {
  const params = new URLSearchParams(window.location.search);
  const tieneQR = params.has('qr');
  
  let tipoNavegacion = 'desconocido';
  
  if (performance.navigation) {
    switch (performance.navigation.type) {
      case 0: tipoNavegacion = tieneQR ? 'qr_escaneado' : 'acceso_directo'; break;
      case 1: tipoNavegacion = 'recarga_pagina'; break;
      case 2: tipoNavegacion = 'navegacion_historial'; break;
    }
  } else if (performance.getEntriesByType) {
    const navegacion = performance.getEntriesByType('navigation')[0];
    if (navegacion) {
      switch (navegacion.type) {
        case 'navigate': tipoNavegacion = tieneQR ? 'qr_escaneado' : 'acceso_directo'; break;
        case 'reload': tipoNavegacion = 'recarga_pagina'; break;
        case 'back_forward': tipoNavegacion = 'navegacion_historial'; break;
      }
    }
  }
  
  return {
    tipo: tipoNavegacion,
    tieneQR: tieneQR,
    url: window.location.href,
    timestamp: new Date(),
    userAgent: navigator.userAgent
  };
}

async function registrarIntentoSospechoso(tipoAcceso, usuario = null) {
  try {
    const datosIntento = {
      tipo: tipoAcceso.tipo,
      tieneQR: tipoAcceso.tieneQR,
      url: tipoAcceso.url,
      timestamp: tipoAcceso.timestamp,
      userAgent: tipoAcceso.userAgent,
      usuario: usuario ? {
        email: usuario.email,
        nombre: usuario.displayName || usuario.email,
        uid: usuario.uid
      } : null,
      ip: await obtenerIP(),
      sesionId: generarSesionId()
    };
    
    await addDoc(collection(db, "accesos_sospechosos"), datosIntento);
    console.warn("🚨 INTENTO SOSPECHOSO REGISTRADO:", datosIntento);
    
  } catch (error) {
    console.error("Error registrando intento sospechoso:", error);
  }
}

function generarSesionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function obtenerIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'desconocida';
  }
}

function verificarAccesoSospechoso() {
  const tipoAcceso = detectarTipoAcceso();
  
  const esSospechoso = 
    tipoAcceso.tipo === 'recarga_pagina' ||
    tipoAcceso.tipo === 'acceso_directo' ||
    tipoAcceso.tipo === 'navegacion_historial';
  
  if (esSospechoso) {
    console.warn("🚨 ACCESO SOSPECHOSO DETECTADO:", tipoAcceso);
    return tipoAcceso;
  }
  
  return null;
}

/**
 * Precarga la ubicación del usuario en segundo plano
 */
async function precargarUbicacion() {
  if (ubicacionObteniendo || ubicacionPrecargada) return;
  
  ubicacionObteniendo = true;
  console.log("🔄 Precargando ubicación...");
  
  try {
    const posicion = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: false, // Más rápido
          timeout: 10000,
          maximumAge: 300000 // 5 minutos de caché
        }
      );
    });
    
    ubicacionPrecargada = {
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      accuracy: posicion.coords.accuracy,
      timestamp: Date.now()
    };
    
    console.log("✅ Ubicación precargada:", ubicacionPrecargada);
  } catch (error) {
    console.warn("⚠️ No se pudo precargar ubicación:", error);
  } finally {
    ubicacionObteniendo = false;
  }
}

/**
 * Obtiene la ubicación (usa la precargada si está disponible)
 */
async function obtenerUbicacion() {
  // Si tenemos ubicación precargada y es reciente (menos de 5 minutos)
  if (ubicacionPrecargada && (Date.now() - ubicacionPrecargada.timestamp) < 300000) {
    console.log("📍 Usando ubicación precargada");
    return ubicacionPrecargada;
  }
  
  // Intentar obtener nueva ubicación
  try {
    const posicion = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 8000, // Reducido de 15 a 8 segundos
          maximumAge: 60000 // 1 minuto de caché
        }
      );
    });
    
    const nuevaUbicacion = {
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      accuracy: posicion.coords.accuracy,
      timestamp: Date.now()
    };
    
    ubicacionPrecargada = nuevaUbicacion; // Actualizar caché
    return nuevaUbicacion;
    
  } catch (error) {
    console.warn("⚠️ Error obteniendo ubicación nueva:", error);
    
    // Fallback: usar ubicación precargada aunque sea antigua
    if (ubicacionPrecargada) {
      console.log("📍 Usando ubicación precargada (antigua)");
      return ubicacionPrecargada;
    }
    
    throw error;
  }
}

/**
 * Actualiza periódicamente la ubicación en segundo plano
 */
function iniciarActualizacionUbicacion() {
  // Precargar inmediatamente
  precargarUbicacion();
  
  // Actualizar cada 2 minutos
  setInterval(() => {
    precargarUbicacion();
  }, 120000); // 2 minutos
}


/**
 * Muestra un mensaje de estado en la interfaz


/**
 * Muestra un mensaje de estado en la interfaz
 * @param {string} tipo - Tipo de mensaje (puntual, retardo, salida, error)
 * @param {string} mensaje - Texto del mensaje a mostrar
 */
function mostrarEstado(tipo, mensaje) {
  DOM.statusBox.className = `alert ${CSS_CLASSES.alert[tipo]} alert-message`;
  DOM.statusBox.textContent = mensaje;
  DOM.statusBox.classList.remove(CSS_CLASSES.dNone);
}

/**
 * Evalúa si la hora actual es puntual o con retardo
 * @returns {string} - "puntual" o "retardo"
 */
function evaluarHoraEntrada() {
  const ahora = new Date();
  const horaActual = ahora.getHours();
  const minutosActual = ahora.getMinutes();
  
  const limiteHora = CONFIG.HORA_LIMITE_ENTRADA.hours; // 8
  const limiteMinutos = CONFIG.HORA_LIMITE_ENTRADA.minutes; // 10
  
  // Convertir a minutos totales para comparación precisa
  const minutosActuales = (horaActual * 60) + minutosActual;
  const minutosLimite = (limiteHora * 60) + limiteMinutos; // 8:10 = 490 minutos
  
  return minutosActuales <= minutosLimite ? "puntual" : "retardo";
}

/**
 * Determina si es hora permitida para registrar salida
 * @param {string} tipoUsuario - Tipo de usuario (becario/empleado)
 * @returns {boolean} - True si es hora permitida
 */
function horaPermitidaSalida(tipoUsuario) {
  const ahora = new Date();
  const limite = new Date();
  const configHora = tipoUsuario === "becario" 
    ? CONFIG.HORA_LIMITE_SALIDA_BECARIO 
    : CONFIG.HORA_LIMITE_SALIDA_EMPLEADO;
  
  limite.setHours(configHora.hours, configHora.minutes, 0);
  return ahora >= limite;
}

/**
 * Verifica si el usuario ya registró este tipo de evento hoy
 * @param {string} uid - ID del usuario
 * @param {string} tipoEvento - Tipo de evento a verificar
 * @returns {Promise<boolean>} - True si ya está registrado
 */
async function yaRegistradoHoy(uid, tipoEvento) {
  // Obtener la fecha de hoy en formato YYYY-MM-DD (igual que en Firestore)
  const ahora = new Date();
  const hoy = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0')
  ].join('-');
  const q = query(
    collection(db, "registros"),
    where("uid", "==", uid),
    where("fecha", "==", hoy),
    where("tipoEvento", "==", tipoEvento)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

/**
 * Genera mensajes especiales según día y evento
 * @param {number} dia - Día de la semana (0-6)
 * @param {string} tipoEvento - Tipo de evento
 * @param {string} nombre - Nombre del usuario
 * @returns {string|null} - Mensaje especial o null
 */
function generarMensajeEspecial(dia, tipoEvento, nombre) {
  const mensajes = {
    1: { default: `🎉 Feliz inicio de semana, ${nombre}!` }, // Lunes
    5: { salida: `🎉 Disfruta tu fin de semana, ${nombre}!` } // Viernes
  };
  
  return mensajes[dia]?.[tipoEvento] || mensajes[dia]?.default || null;
}

/**
 * Carga el historial semanal del usuario
 * @param {string} uid - ID del usuario
 */
async function cargarHistorial(uid) {
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes de esta semana
  
  DOM.historialLista.innerHTML = "";
  
  const querySnapshot = await getDocs(
    query(
      collection(db, "registros"),
      where("uid", "==", uid),
      where("timestamp", ">=", inicioSemana)
    )
  );
  
  const registros = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      fechaCompleta: new Date(data.timestamp?.seconds * 1000 || data.timestamp)
    };
  });
  
  registros
    .sort((a, b) => a.fechaCompleta - b.fechaCompleta)
    .forEach(registro => {
      const item = document.createElement("li");
      item.className = "list-group-item d-flex justify-content-between align-items-center";
      
      const fechaHora = `
        <span class="badge bg-light text-dark me-2">
          ${registro.fechaCompleta.toLocaleDateString("es-MX")}
        </span>
        <span>${registro.fechaCompleta.toLocaleTimeString("es-MX", { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
      `;
      
      const tipo = `
        <span class="badge ${getBadgeClass(registro.estado || registro.tipoEvento)}">
          ${registro.tipoEvento === 'entrada' ? 
            (registro.estado === 'puntual' ? 'Entrada puntual' : 'Entrada con retardo') : 
            'Salida'}
        </span>
      `;
      
      item.innerHTML = `${fechaHora} ${tipo}`;
      DOM.historialLista.appendChild(item);
    });
  
  DOM.historialContainer.classList.remove(CSS_CLASSES.dNone);
}

/**
 * Devuelve la clase CSS para el badge según el tipo de evento
 * @param {string} tipoEvento 
 * @returns {string}
 */
function getBadgeClass(tipoEvento) {
  const classes = {
    puntual: "bg-success",
    retardo: "bg-warning text-dark",
    salida: "bg-primary",
    entrada: "bg-info",
    error: "bg-danger"
  };
  return classes[tipoEvento] || "bg-secondary";
}

/**
 * Registra la asistencia del usuario en Firestore
 * @param {object} user - Objeto de usuario de Firebase Auth
 * @param {object} datosUsuario - Datos adicionales del usuario
 * @param {object} coords - Coordenadas de geolocalización
 */

async function registrarAsistencia(user, datosUsuario, coords) {
  const esRemoto = USUARIOS_REMOTOS.includes(user.email);

  // ⚠️ SOLO para referencia inicial de fecha (no se usa para evaluar puntualidad)
  const ahoraLocal = new Date();
  const fechaLocal = [
    ahoraLocal.getFullYear(),
    String(ahoraLocal.getMonth() + 1).padStart(2, '0'),
    String(ahoraLocal.getDate()).padStart(2, '0')
  ].join('-');

  // PRIMERO: Verificar registros existentes
  const yaRegistroEntrada = await yaRegistradoHoy(user.uid, "entrada");
  const yaRegistroSalida = await yaRegistradoHoy(user.uid, "salida");

  // ✅ NUEVO: Lógica especial para usuario tipo "especial"
  const esUsuarioEspecial = datosUsuario.tipo === "especial" || datosUsuario.tipo === "horario_especial";

  // SEGUNDO: Verificar horarios y lógica de negocio (validaciones básicas con hora local)
  let mensajeTipo = "";

  if (!yaRegistroEntrada) {
    // ✅ Para usuarios especiales: sin restricciones de horario de entrada
    if (!esUsuarioEspecial) {
      // Validación básica de ventana de entrada (hora local solo para prevenir intentos obviamente fuera de hora)
      const inicioEntrada = new Date();
      inicioEntrada.setHours(7, 0, 0, 0);
      const finEntrada = new Date();

      if (datosUsuario.tipo === "becario") {
        finEntrada.setHours(13, 0, 0, 0);
      } else {
        finEntrada.setHours(16, 0, 0, 0);
      }

      if (ahoraLocal < inicioEntrada) {
        mostrarEstado("error", "❌ Solo puedes registrar entrada a partir de las 7:00 am.");
        return;
      }
      if (ahoraLocal >= finEntrada) {
        mostrarEstado("error", `❌ Ya no puedes registrar entrada después de las ${finEntrada.getHours()}:00.`);
        return;
      }
    }

    mensajeTipo = "entrada";

  } else if (!yaRegistroSalida) {
    // ✅ Para usuarios especiales: sin restricciones de horario de salida
    if (!esUsuarioEspecial) {
      // Validación básica de hora de salida
      const horaSalida = new Date();
      if (datosUsuario.tipo === "becario") {
        horaSalida.setHours(13, 0, 0, 0);
      } else {
        horaSalida.setHours(16, 0, 0, 0);
      }

      if (ahoraLocal < horaSalida) {
        mostrarEstado("error", `⏳ Espera a la hora de salida (${horaSalida.getHours()}:00) para registrar tu salida.`);
        return;
      }
    }

    mensajeTipo = "salida";
  } else {
    mostrarEstado("error", "⚠️ Ya registraste entrada y salida hoy.");
    return;
  }

  // TERCERO: Solo validar ubicación si NO es remoto Y NO está en modo pruebas
  if (!esRemoto && !CONFIG.MODO_PRUEBAS) {
    // Validaciones normales de ubicación, fin de semana, etc.
    const diaSemana = ahoraLocal.getDay();
    if (diaSemana === 0 || diaSemana === 6) {
      mostrarEstado("error", "⛔ No puedes registrar asistencia en fin de semana.");
      return;
    }

    const horaActual = ahoraLocal.getHours();
    if (horaActual < 7 || horaActual >= 22) {
      mostrarEstado("error", "❌ Solo puedes registrar entre 7:00 am y 10:00 pm.");
      return;
    }

    // Coordenadas y validación de ubicación (sin cambios)
    const OFICINA = { lat: 21.92545657925517, lng: -102.31327431392519 };
    const RADIO_METROS = 40;

    function distanciaMetros(lat1, lng1, lat2, lng2) {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lng2-lng1) * Math.PI/180;
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    if (!coords || !coords.lat || !coords.lng) {
      mostrarEstado("error", "⛔ No se pudo obtener tu ubicación. Activa la ubicación para registrar asistencia.");
      return;
    }
    const distancia = distanciaMetros(coords.lat, coords.lng, OFICINA.lat, OFICINA.lng);
    if (distancia > RADIO_METROS) {
      mostrarEstado("error", "⛔ Solo puedes registrar asistencia dentro de la oficina.");
      return;
    }
  }

  // Mensaje de modo pruebas
  if (CONFIG.MODO_PRUEBAS) {
    console.warn("⚠️ MODO PRUEBAS ACTIVO - Validaciones de ubicación omitidas");
  }

  // CUARTO: Crear registro en Firestore con validación de servidor
  try {
    // 1️⃣ Guardar registro con hora del cliente (temporal, se actualizará con servidor)
    const horaClienteTemp = ahoraLocal.toLocaleTimeString("es-MX", {
      hour12: false,
      timeZone: "America/Mexico_City"
    });

    const docRef = await addDoc(collection(db, "registros"), {
      uid: user.uid,
      nombre: datosUsuario.nombre,
      email: user.email,
      tipo: datosUsuario.tipo,
      fecha: fechaLocal,
      hora: horaClienteTemp, // Temporal, se actualizará
      tipoEvento: mensajeTipo,
      estado: "verificando", // Se actualizará con hora del servidor
      ubicacion: coords || null,
      timestamp: serverTimestamp()
    });

    console.log("📝 Registro creado, obteniendo hora del servidor...");

    // 2️⃣ Esperar y leer el documento para obtener el timestamp del servidor
    // Firebase necesita un momento para resolver serverTimestamp()
    let registroData = null;
    let intentos = 0;
    const maxIntentos = 5;

    while (intentos < maxIntentos) {
      await new Promise(resolve => setTimeout(resolve, 300)); // Esperar 300ms
      const registroDoc = await getDoc(docRef);
      registroData = registroDoc.data();

      if (registroData && registroData.timestamp) {
        console.log(`✅ Timestamp obtenido en intento ${intentos + 1}`);
        break;
      }

      intentos++;
      console.log(`⏳ Esperando timestamp del servidor... intento ${intentos}/${maxIntentos}`);
    }

    if (!registroData || !registroData.timestamp) {
      // Si no hay timestamp, usar hora del cliente como fallback
      console.warn("⚠️ No se pudo obtener timestamp del servidor, usando hora del cliente");

      let estadoFallback = "salida";
      if (mensajeTipo === "entrada") {
        if (esUsuarioEspecial) {
          estadoFallback = "puntual";
        } else {
          const horaActual = ahoraLocal.getHours();
          const minutosActual = ahoraLocal.getMinutes();
          if (horaActual < CONFIG.HORA_LIMITE_ENTRADA.hours ||
              (horaActual === CONFIG.HORA_LIMITE_ENTRADA.hours && minutosActual <= CONFIG.HORA_LIMITE_ENTRADA.minutes)) {
            estadoFallback = "puntual";
          } else {
            estadoFallback = "retardo";
          }
        }
      }

      await updateDoc(docRef, { estado: estadoFallback });

      actualizarUI(user, datosUsuario, { fecha: fechaLocal, hora: horaClienteTemp, tipoEvento: mensajeTipo });
      mostrarEstado(estadoFallback, `${estadoFallback === "puntual" ? "✅" : "⚠️"} Registro guardado a las ${horaClienteTemp}`);
      setTimeout(() => window.close(), 7000);
      return;
    }

    // 3️⃣ Calcular hora y estado con el TIMESTAMP DEL SERVIDOR (anti-trampa)
    const timestampServidor = registroData.timestamp.toDate();
    const horaServidor = timestampServidor.toLocaleTimeString("es-MX", {
      hour12: false,
      timeZone: "America/Mexico_City"
    });
    const fechaServidor = [
      timestampServidor.getFullYear(),
      String(timestampServidor.getMonth() + 1).padStart(2, '0'),
      String(timestampServidor.getDate()).padStart(2, '0')
    ].join('-');

    console.log(`🔒 Hora del servidor: ${horaServidor} (no manipulable)`);

    // 4️⃣ Evaluar puntualidad con hora del SERVIDOR
    let estadoRegistro = "salida";

    if (mensajeTipo === "entrada") {
      if (esUsuarioEspecial) {
        estadoRegistro = "puntual";
      } else {
        const horaActualServidor = timestampServidor.getHours();
        const minutosActualServidor = timestampServidor.getMinutes();

        const limiteHora = CONFIG.HORA_LIMITE_ENTRADA.hours;
        const limiteMinutos = CONFIG.HORA_LIMITE_ENTRADA.minutes;

        console.log(`🔒 Evaluando: ${horaActualServidor}:${String(minutosActualServidor).padStart(2, '0')} vs límite ${limiteHora}:${String(limiteMinutos).padStart(2, '0')}`);

        if (horaActualServidor < limiteHora) {
          estadoRegistro = "puntual";
          console.log('✅ PUNTUAL: Antes de las 8:00 (servidor)');
        } else if (horaActualServidor === limiteHora && minutosActualServidor <= limiteMinutos) {
          estadoRegistro = "puntual";
          console.log('✅ PUNTUAL: Entre 8:00 y 8:10:59 (servidor)');
        } else {
          estadoRegistro = "retardo";
          console.log('⚠️ RETARDO: A partir de 8:11 (servidor)');
        }
      }
    }

    // 5️⃣ Actualizar registro con valores del servidor
    await updateDoc(docRef, {
      fecha: fechaServidor,
      hora: horaServidor,
      estado: estadoRegistro
    });

    console.log(`✅ Registro finalizado: ${estadoRegistro} a las ${horaServidor}`);

    // 6️⃣ Actualizar UI y mostrar mensaje
    setTimeout(async () => {
      await cargarHistorial(user.uid);
    }, 1200);

    actualizarUI(user, datosUsuario, { fecha: fechaServidor, hora: horaServidor, tipoEvento: mensajeTipo });

    let mensaje = "";
    if (estadoRegistro === "puntual") {
      mensaje = esUsuarioEspecial
        ? `✅ Entrada registrada a las ${horaServidor} - Horario Especial`
        : `✅ Entrada puntual a las ${horaServidor}`;
    } else if (estadoRegistro === "retardo") {
      mensaje = `⚠️ Entrada con retardo a las ${horaServidor}`;
    } else if (estadoRegistro === "salida") {
      mensaje = esUsuarioEspecial
        ? `📤 Salida registrada a las ${horaServidor} - Horario Especial`
        : `📤 Salida registrada a las ${horaServidor}`;
    }

    const mensajeEspecial = generarMensajeEspecial(timestampServidor.getDay(), estadoRegistro, datosUsuario.nombre);
    if (mensajeEspecial) {
      mensaje += `\n${mensajeEspecial}`;
    }

    mostrarEstado(estadoRegistro, mensaje);
    setTimeout(() => {
      window.close();
    }, 7000);

  } catch (error) {
    console.error("Error al registrar asistencia:", error);
    mostrarEstado("error", "❌ Error al registrar asistencia");
  }
}

/**
 * Actualiza la interfaz con los datos del usuario
 * @param {object} user 
 * @param {object} datosUsuario 
 * @param {object} registro 
 */
function actualizarUI(user, datosUsuario, registro) {
  DOM.nombreUsuario.textContent = datosUsuario.nombre;
  DOM.correoUsuario.textContent = user.email;
  DOM.tipoUsuario.textContent = datosUsuario.tipo;
  DOM.fechaHoy.textContent = registro.fecha;
  DOM.horaRegistro.textContent = registro.hora;
  DOM.tipoEvento.textContent = registro.tipoEvento === 'entrada' ? 'Entrada' : 'Salida';
  DOM.infoBox.classList.remove(CSS_CLASSES.dNone);
}

/**
 * Devuelve el mensaje default según el tipo de evento
 * @param {string} tipoEvento 
 * @param {string} hora 
 * @returns {string}
 */
function getMensajeDefault(tipoEvento, hora) {
  const mensajes = {
    salida: `📤 Salida registrada a las ${hora}`,
    puntual: `✅ Entrada puntual a las ${hora}`,
    retardo: `⚠️ Entrada con retardo a las ${hora}`
  };
  return mensajes[tipoEvento] || `Evento registrado a las ${hora}`;
}

// Observador de estado de autenticación
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = user;

    // Verificar si es usuario remoto ANTES de la verificación de acceso sospechoso
    const esUsuarioRemoto = USUARIOS_REMOTOS.includes(user.email);

    // Verificar acceso sospechoso con usuario identificado (excepto usuarios remotos)
    const accesoSospechoso = verificarAccesoSospechoso();
    if (accesoSospechoso && !sesionValidada && !esUsuarioRemoto) {
      await registrarIntentoSospechoso(accesoSospechoso, user);
      mostrarEstado("error", `⚠️ ${user.displayName || user.email}, debes escanear el QR para registrar asistencia.`);
      return; // ✅ IMPORTANTE: Salir aquí si no está validado
    }
    
    // Usuario autenticado
    DOM.btnGoogle?.classList.add(CSS_CLASSES.dNone);
    DOM.btnLogout?.classList.remove(CSS_CLASSES.dNone);
    DOM.userName.textContent = `Hola, ${user.displayName || user.email}`;

    // Obtener datos adicionales del usuario
    try {
      const userRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        mostrarEstado("error", `❌ El correo ${user.email} no está autorizado`);
        return;
      }

      const userData = userDoc.data();
      
      // ✅ CORREGIR AQUÍ: Validar QR ANTES de continuar
      const esRemoto = USUARIOS_REMOTOS.includes(user.email);
      
      // Solo validar QR si NO es usuario remoto
      if (!esRemoto) {
        const qrValido = await validarQR();
        if (!qrValido) {
          // ✅ Si el QR no es válido, NO continuar con el registro
          console.log('❌ QR inválido, deteniendo flujo de registro');
          return; // ✅ DETENER AQUÍ
        }
      }
      
      // Si llegamos aquí, el usuario está autorizado y el QR es válido (o es remoto)

      // Verificar si es usuario remoto O modo pruebas ANTES de obtener ubicación
      if (esRemoto || CONFIG.MODO_PRUEBAS) {
        // Usuario remoto o modo pruebas: registrar sin ubicación
        registrarAsistencia(user, userData, null);
      } else {
        // Usuario presencial: obtener ubicación
        try {
          mostrarEstado("info", "📍 Obteniendo ubicación...");
          const coords = await obtenerUbicacion();
          registrarAsistencia(user, userData, coords);
        } catch (error) {
          console.warn("Geolocalización no disponible:", error);
          mostrarEstado("error", "❌ No se pudo obtener tu ubicación. Activa la ubicación para registrar asistencia.");
        }
      }
    } catch (error) {
      console.error("Error al obtener datos de usuario:", error);
      mostrarEstado("error", "❌ Error al cargar datos de usuario");
    }
  } else {
    usuarioActual = null;
    
    const accesoSospechoso = verificarAccesoSospechoso();
    if (accesoSospechoso) {
      await registrarIntentoSospechoso(accesoSospechoso, null);
    }
    
    DOM.btnGoogle?.classList.remove(CSS_CLASSES.dNone);
    DOM.btnLogout?.classList.add(CSS_CLASSES.dNone);
    DOM.userName.textContent = "Por favor, inicia sesión";
  }
});

// Event Listeners
DOM.btnGoogle?.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .catch(err => console.error("Error en autenticación:", err));
});

DOM.btnLogout?.addEventListener("click", () => {
  signOut(auth)
    .then(() => location.reload())
    .catch(err => console.error("Error al cerrar sesión:", err));
});

// Inicialización
// Inicialización de detección al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  const accesoSospechoso = verificarAccesoSospechoso();
  if (accesoSospechoso) {
    console.warn("🚨 Acceso sospechoso detectado al cargar:", accesoSospechoso.tipo);
  }
  
  iniciarActualizacionUbicacion();
});

window.addEventListener('beforeunload', () => {
  const ahora = Date.now();
  localStorage.setItem('ch_ultima_salida', ahora.toString());
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.warn("⚠️ Página mostrada desde caché");
    const accesoSospechoso = {
      tipo: 'cache_navegacion',
      tieneQR: new URLSearchParams(window.location.search).has('qr'),
      url: window.location.href,
      timestamp: new Date(),
      userAgent: navigator.userAgent
    };
    
    if (usuarioActual) {
      registrarIntentoSospechoso(accesoSospechoso, usuarioActual);
    }
  }
});