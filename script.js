import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function mostrarEstado(tipo, mensaje) {
  const statusBox = document.getElementById("status");
  const clases = { puntual: "verde", retardo: "ambar", salida: "azul", error: "rojo" };
  statusBox.className = `status-box ${clases[tipo]}`;
  statusBox.textContent = mensaje;
  statusBox.classList.remove("d-none");
  document.getElementById("log")?.classList.add("d-none");
}

async function registrarAsistencia(user, datosUsuario, coords) {
  const now = new Date();
  const hora = now.toLocaleTimeString();
  const fecha = now.toLocaleDateString();

  // ⚠️ Modo pruebas: sin validación de horario ni duplicados
  const tipoEvento = now.getHours() < 12 ? "puntual" : "salida";
  const permitido = true;

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

  document.getElementById("nombreUsuario").textContent = datosUsuario.nombre;
  document.getElementById("correoUsuario").textContent = user.email;
  document.getElementById("tipoUsuario").textContent = datosUsuario.tipo;
  document.getElementById("fechaHoy").textContent = fecha;
  document.getElementById("horaRegistro").textContent = hora;
  document.getElementById("tipoEvento").textContent = tipoEvento;
  document.getElementById("info").classList.remove("d-none");

  mostrarEstado(tipoEvento, tipoEvento === "salida"
    ? `📤 Salida registrada a las ${hora}`
    : `✅ Entrada registrada a las ${hora}`);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      mostrarEstado("error", "❌ Usuario no encontrado en Firestore.");
      return;
    }

    const datos = docSnap.data();

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
  }
});

document.getElementById("btn-google")?.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    signInWithRedirect(auth, provider);
  }
});
