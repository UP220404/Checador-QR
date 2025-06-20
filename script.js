import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged
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

const googleBtn = document.getElementById("google-btn");
const emailBtn = document.getElementById("email-btn");
const log = document.getElementById("log");
const statusBox = document.getElementById("status");
const loginSection = document.getElementById("login-section");

// Mensaje visual por tipo
function mostrarEstado(tipo, mensaje) {
  const clases = { puntual: "verde", retardo: "ambar", salida: "azul", error: "rojo" };
  statusBox.className = `status ${clases[tipo]}`;
  statusBox.classList.remove("d-none");
  statusBox.innerText = mensaje;
}

// Determinar si fue puntual o retardo
function evaluarHoraEntrada() {
  const ahora = new Date();
  const limite = new Date();
  limite.setHours(8, 10, 0);
  return ahora <= limite ? "puntual" : "retardo";
}

// Validar si ya es hora de salida
function horaPermitidaSalida(tipo) {
  const ahora = new Date();
  const limite = new Date();
  if (tipo === "becario") limite.setHours(13, 0, 0);
  else limite.setHours(16, 0, 0);
  return ahora >= limite;
}

// Registrar asistencia en Firestore
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

// Cargar usuario y lógica después del login
async function procesarUsuario(user) {
  log.innerText = `Bienvenido, ${user.email}`;
  loginSection.style.display = "none";

  const docRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    mostrarEstado("error", "Usuario no registrado en Firestore");
    return;
  }

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
}

// Login con Google
googleBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await procesarUsuario(result.user);
  } catch (err) {
    console.error(err);
    mostrarEstado("error", "❌ Error al iniciar sesión con Google");
  }
});

// Login con correo/contraseña (desde prompt)
emailBtn.addEventListener("click", async () => {
  const email = prompt("Correo electrónico:");
  if (!email) return;

  const password = prompt("Contraseña:");
  if (!password) return;

  try {
    // Intentar login
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await procesarUsuario(userCredential.user);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      // Si no existe, registrar
      try {
        const newUser = await createUserWithEmailAndPassword(auth, email, password);
        mostrarEstado("azul", "Usuario registrado. Contacta a TI para activarlo.");
      } catch (err2) {
        console.error(err2);
        mostrarEstado("error", "❌ Error al registrar usuario.");
      }
    } else {
      console.error(err);
      mostrarEstado("error", "❌ Error al iniciar sesión.");
    }
  }
});

// Detectar login automático
onAuthStateChanged(auth, user => {
  if (user) procesarUsuario(user);
});
