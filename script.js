import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Elementos
const log = document.getElementById("log");
const statusBox = document.getElementById("status");

// Función para determinar si es puntual o retardo
function evaluarHoraEntrada() {
  const ahora = new Date();
  const limite = new Date();
  limite.setHours(8, 10, 0);
  return ahora <= limite ? "puntual" : "retardo";
}

function horaPermitidaSalida(tipo) {
  const ahora = new Date();
  const limite = new Date();
  if (tipo === "becario") limite.setHours(13, 0, 0);
  else limite.setHours(16, 0, 0);
  return ahora >= limite;
}

// Mostrar mensaje por color
function mostrarEstado(tipo, mensaje) {
  const clases = { puntual: "verde", retardo: "ambar", salida: "azul", error: "rojo" };
  statusBox.className = `status ${clases[tipo]}`;
  statusBox.innerText = mensaje;
}

// Registrar evento en Firestore
async function registrar(usuario, tipoUsuario, coords) {
  const now = new Date();
  const hora = now.toLocaleTimeString();
  const fecha = now.toLocaleDateString();
  const tipoEvento = now.getHours() < 12 ? evaluarHoraEntrada() : "salida";
  const validoSalida = tipoEvento === "salida" ? horaPermitidaSalida(tipoUsuario) : true;

  if (tipoEvento === "salida" && !validoSalida) {
    mostrarEstado("error", `❌ Aún no es hora de salida para ${tipoUsuario}`);
    return;
  }

  try {
    await addDoc(collection(db, "registros"), {
      uid: usuario.uid,
      nombre: usuario.nombre,
      email: usuario.email,
      tipo: tipoUsuario,
      fecha,
      hora,
      tipoEvento,
      ubicacion: coords || null,
      timestamp: now
    });

    const mensaje = tipoEvento === "puntual"
      ? `✅ Entrada puntual registrada a las ${hora}`
      : tipoEvento === "retardo"
      ? `⚠️ Entrada con retardo a las ${hora}`
      : `📤 Salida registrada a las ${hora}`;

    mostrarEstado(tipoEvento, mensaje);
  } catch (e) {
    console.error(e);
    mostrarEstado("error", "❌ Error al guardar en Firestore");
  }
}

// Flujo principal
onAuthStateChanged(auth, async user => {
  if (user) {
    log.innerText = `Bienvenido, ${user.email}`;
    const docRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return mostrarEstado("error", "Usuario no registrado en Firestore");

    const datos = snap.data();

    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        registrar({ uid: user.uid, email: user.email, nombre: datos.nombre }, datos.tipo, coords);
      },
      err => {
        mostrarEstado("error", "❌ Permiso de ubicación denegado");
      }
    );
  } else {
    // Iniciar sesión automática con Google
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => {
      console.error(error);
      mostrarEstado("error", "❌ Falló el inicio de sesión");
    });
  }
});
