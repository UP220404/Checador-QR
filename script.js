import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD2o2FyUwVZafKIv-qtM6fmA663ldB_1Uo",
  authDomain: "qr-acceso-cielito-home.firebaseapp.com",
  projectId: "qr-acceso-cielito-home",
  storageBucket: "qr-acceso-cielito-home.appspot.com",
  messagingSenderId: "229634415256",
  appId: "1:229634415256:web:c576ba8879e58e441c4eed",
  measurementId: "G-H9DZQM4QPX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Mostrar mensaje visual
function mostrarEstado(tipo, mensaje) {
  const statusBox = document.getElementById("status");
  const clases = { puntual: "verde", retardo: "ambar", salida: "azul", error: "rojo" };
  statusBox.className = `status ${clases[tipo]}`;
  statusBox.textContent = mensaje;
  statusBox.classList.remove("d-none");
  document.getElementById("log").classList.add("d-none");
}

// Evaluar entrada vs retardo
function evaluarHoraEntrada() {
  const ahora = new Date();
  const limite = new Date();
  limite.setHours(8, 10, 0);
  return ahora <= limite ? "puntual" : "retardo";
}

// Verificar si ya es hora de salida
function horaPermitidaSalida(tipo) {
  const ahora = new Date();
  const limite = new Date();
  if (tipo === "becario") limite.setHours(13, 0, 0);
  else limite.setHours(16, 0, 0);
  return ahora >= limite;
}

// Registrar entrada o salida
async function registrarAsistencia(user, datosUsuario, coords) {
  const now = new Date();
  const hora = now.toLocaleTimeString();
  const fecha = now.toLocaleDateString();

  const tipoEvento = now.getHours() < 12 ? evaluarHoraEntrada() : "salida";
  const permitido = tipoEvento === "salida" ? horaPermitidaSalida(datosUsuario.tipo) : true;

  if (tipoEvento === "salida" && !permitido) {
    mostrarEstado("error", "❌ Aún no es hora de salida.");
    return;
  }

  // Registrar en Firestore
  await addDoc(collection(db, "registros"), {
    uid: user.uid,
    nombre: datosUsuario.nombre,
    email: user.email,
    tipo: datosUsuario.tipo,
    fecha,
    hora,
    tipoEvento,
    ubicacion: coords || null,
    timestamp: now
  });

  // Mostrar datos en pantalla
  document.getElementById("nombreUsuario").textContent = datosUsuario.nombre;
  document.getElementById("correoUsuario").textContent = user.email;
  document.getElementById("tipoUsuario").textContent = datosUsuario.tipo;
  document.getElementById("fechaHoy").textContent = fecha;
  document.getElementById("horaRegistro").textContent = hora;
  document.getElementById("tipoEvento").textContent = tipoEvento.charAt(0).toUpperCase() + tipoEvento.slice(1);

  document.getElementById("info").classList.remove("d-none");

  mostrarEstado(tipoEvento, tipoEvento === "salida"
    ? `📤 Salida registrada a las ${hora}`
    : tipoEvento === "puntual"
    ? `✅ Entrada puntual a las ${hora}`
    : `⚠️ Entrada con retardo a las ${hora}`
  );
}

// Iniciar redirección si no está autenticado
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      mostrarEstado("error", "❌ Usuario no encontrado en Firestore.");
      return;
    }

    const datos = docSnap.data();

    // Obtener geolocalización
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        registrarAsistencia(user, datos, coords);
      },
      () => {
        mostrarEstado("error", "❌ No se pudo obtener la ubicación.");
      }
    );
  } else {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
  }
});
