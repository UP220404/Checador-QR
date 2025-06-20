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
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// MODO PRUEBAS: true para desactivar validaciones, false para comportamiento real
const modoPruebas = false;

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

async function yaRegistradoHoy(uid, tipoEvento) {
  const hoy = new Date().toLocaleDateString("es-MX");
  const q = query(
    collection(db, "registros"),
    where("uid", "==", uid),
    where("fecha", "==", hoy),
    where("tipoEvento", "==", tipoEvento)
  );
  const docs = await getDocs(q);
  return !docs.empty;
}

async function registrarAsistencia(user, datosUsuario, coords) {
  const now = new Date();
  const hora = now.toLocaleTimeString("es-MX", { hour12: false });
  const fecha = now.toLocaleDateString("es-MX");
  const tipoEvento = now.getHours() < 12 ? evaluarHoraEntrada() : "salida";

  let permitido = true;
  let duplicado = false;

  if (!modoPruebas) {
    permitido = tipoEvento === "salida" ? horaPermitidaSalida(datosUsuario.tipo) : true;
    if (tipoEvento === "salida" && !permitido) {
      mostrarEstado("error", "❌ Aún no es hora de salida para " + datosUsuario.tipo);
      return;
    }

    duplicado = await yaRegistradoHoy(user.uid, tipoEvento);
    if (duplicado) {
      mostrarEstado("error", `⚠️ Ya se registró ${tipoEvento} hoy.`);
      return;
    }
  }

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

  mostrarEstado(tipoEvento,
    tipoEvento === "salida"
      ? `📤 Salida registrada a las ${hora}`
      : tipoEvento === "puntual"
      ? `✅ Entrada puntual a las ${hora}`
      : `⚠️ Entrada con retardo a las ${hora}`
  );
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById("btn-google")?.classList.add("d-none");

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
