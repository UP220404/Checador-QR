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

function validarQR() {
  const params = new URLSearchParams(window.location.search);
  return params.get('qr') === 'OFICINA2025';
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
  "operacionescielitoh@gmail.com"
];

let ubicacionPrecargada = null;
let ubicacionObteniendo = false;

// ✅ AGREGAR AQUÍ ESTAS FUNCIONES:

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
  const limite = new Date();
  limite.setHours(CONFIG.HORA_LIMITE_ENTRADA.hours, CONFIG.HORA_LIMITE_ENTRADA.minutes, 0);
  return ahora <= limite ? "puntual" : "retardo";
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

  const ahora = new Date();
  const hora = ahora.toLocaleTimeString("es-MX", { hour12: false });
  const fecha = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0')
  ].join('-');

  // PRIMERO: Verificar registros existentes
  const yaRegistroEntrada = await yaRegistradoHoy(user.uid, "entrada");
  const yaRegistroSalida = await yaRegistradoHoy(user.uid, "salida");

  // Definir límites según tipo
  const inicioEntrada = new Date();
  inicioEntrada.setHours(7, 0, 0, 0);
  const finEntrada = new Date();
  const horaSalida = new Date();
  if (datosUsuario.tipo === "becario") {
    finEntrada.setHours(13, 0, 0, 0); // 13:00
    horaSalida.setHours(13, 0, 0, 0); // 13:00
  } else {
    finEntrada.setHours(16, 0, 0, 0); // 16:00
    horaSalida.setHours(16, 0, 0, 0); // 16:00
  }

  // SEGUNDO: Verificar horarios y lógica de negocio
  let tipoEvento;
  let mensajeTipo = "";

  if (!yaRegistroEntrada) {
    if (ahora < inicioEntrada) {
      mostrarEstado("error", "❌ Solo puedes registrar entrada a partir de las 7:00 am.");
      return;
    }
    if (ahora >= finEntrada) {
      mostrarEstado("error", `❌ Ya no puedes registrar entrada después de las ${finEntrada.getHours()}:00.`);
      return;
    }
    // Es una entrada
    const horaActual = ahora.getHours();
    const minutosActual = ahora.getMinutes();
    const limiteHora = CONFIG.HORA_LIMITE_ENTRADA.hours;
    const limiteMinutos = CONFIG.HORA_LIMITE_ENTRADA.minutes;

    let esPuntual = false;
    if (horaActual < limiteHora) {
      esPuntual = true;
    } else if (horaActual === limiteHora && minutosActual <= limiteMinutos) {
      esPuntual = true;
    } else {
      esPuntual = false;
    }
    tipoEvento = esPuntual ? "puntual" : "retardo";
    mensajeTipo = "entrada";
  } else if (!yaRegistroSalida) {
    if (ahora < horaSalida) {
      mostrarEstado("error", `⏳ Espera a la hora de salida (${horaSalida.getHours()}:00) para registrar tu salida.`);
      return;
    }
    // Es una salida
    tipoEvento = "salida";
    mensajeTipo = "salida";
  } else {
    mostrarEstado("error", "⚠️ Ya registraste entrada y salida hoy.");
    return;
  }

  // TERCERO: Solo validar QR y ubicación si NO es remoto Y si pasó las validaciones anteriores
  if (!esRemoto) {
    if (!validarQR()) {
      mostrarEstado("error", "⛔ Debes escanear el QR de la oficina para registrar tu entrada.");
      return;
    }

    // RESTRICCIÓN: No permitir registros en fin de semana
    const diaSemana = ahora.getDay(); 
    if (diaSemana === 0 || diaSemana === 6) {
      mostrarEstado("error", "⛔ No puedes registrar asistencia en fin de semana.");
      return;
    }

    // RESTRICCIÓN: No permitir registros fuera de 7:00 a 22:00
    const horaActual = ahora.getHours();
    if (horaActual < 7 || horaActual >= 22) {
      mostrarEstado("error", "❌ Solo puedes registrar entre 7:00 am y 10:00 pm.");
      return;
    }

    // Coordenadas de la oficina
    const OFICINA = { lat: 21.92545657925517, lng: -102.31327431392519 };
    const RADIO_METROS = 100; // Radio permitido en metros

    function distanciaMetros(lat1, lng1, lat2, lng2) {
      const R = 6371e3; // metros
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

    // Validación de ubicación
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

  // CUARTO: Crear registro en Firestore
  try {
    const docRef = await addDoc(collection(db, "registros"), {
      uid: user.uid,
      nombre: datosUsuario.nombre,
      email: user.email,
      tipo: datosUsuario.tipo,
      fecha,
      hora,
      tipoEvento: mensajeTipo,
      estado: tipoEvento,
      ubicacion: coords || null,
      timestamp: serverTimestamp()
    });

    setTimeout(async () => {
      await cargarHistorial(user.uid);
    }, 1200);

    actualizarUI(user, datosUsuario, { fecha, hora, tipoEvento: mensajeTipo });

    let mensaje = "";
    if (tipoEvento === "puntual") {
      mensaje = `✅ Entrada puntual a las ${hora}`;
    } else if (tipoEvento === "retardo") {
      mensaje = `⚠️ Entrada con retardo a las ${hora}`;
    } else if (tipoEvento === "salida") {
      mensaje = `📤 Salida registrada a las ${hora}`;
    }

    // Si hay mensaje especial, lo agregas debajo
    const mensajeEspecial = generarMensajeEspecial(ahora.getDay(), tipoEvento, datosUsuario.nombre);
    if (mensajeEspecial) {
      mensaje += `\n${mensajeEspecial}`;
    }

    mostrarEstado(tipoEvento, mensaje);
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

      // ...existing code...
      const userData = userDoc.data();
      
      // Verificar si es usuario remoto ANTES de obtener ubicación
      const esRemoto = USUARIOS_REMOTOS.includes(user.email);
      
      if (esRemoto) {
        // Usuario remoto: registrar sin ubicación
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
document.addEventListener("DOMContentLoaded", () => {
  // Iniciar precarga de ubicación inmediatamente
  iniciarActualizacionUbicacion();
});
