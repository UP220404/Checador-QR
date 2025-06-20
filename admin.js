// admin.js
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
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const adminEmails = ["sistemas16ch@gmail.com", "leticia@cielitohome.com", "sistemas@cielitohome.com"];
const tabla = document.getElementById("tabla-registros");
const tipoFiltro = document.getElementById("filtroTipo");
const fechaFiltro = document.getElementById("filtroFecha");

let registros = [];

function formatearFecha(timestamp) {
  const fecha = new Date(timestamp.seconds * 1000);
  return fecha.toLocaleDateString("es-MX", { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatearHora(timestamp) {
  const fecha = new Date(timestamp.seconds * 1000);
  return fecha.toLocaleTimeString("es-MX", { hour12: false });
}

function renderTabla() {
  tabla.innerHTML = "";
  const tipo = tipoFiltro.value;
  const fecha = fechaFiltro.value;

  const filtrados = registros.filter(r => {
    const fechaMatch = !fecha || formatearFecha(r.timestamp) === new Date(fecha).toLocaleDateString("es-MX");
    const tipoMatch = !tipo || r.tipo === tipo;
    return fechaMatch && tipoMatch;
  });

  filtrados.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

  filtrados.forEach(r => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${r.nombre}</td>
      <td>${r.email}</td>
      <td>${r.tipo}</td>
      <td>${formatearFecha(r.timestamp)}</td>
      <td>${formatearHora(r.timestamp)}</td>
      <td>${r.tipoEvento}</td>
      <td><button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('${r.id}')"><i class="bi bi-trash"></i></button></td>
    `;
    tabla.appendChild(fila);
  });
}

window.eliminarRegistro = async (id) => {
  if (confirm("¿Eliminar este registro?")) {
    await deleteDoc(doc(db, "registros", id));
    cargarRegistros();
  }
};

async function cargarRegistros() {
  const snap = await getDocs(collection(db, "registros"));
  registros = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // KPIs
  const hoyStr = new Date().toLocaleDateString("es-MX");
  const entradas = registros.filter(r => r.fecha === hoyStr && r.tipoEvento !== "salida").length;
  const salidas = registros.filter(r => r.fecha === hoyStr && r.tipoEvento === "salida").length;
  const usuarios = new Set(registros.map(r => r.email)).size;

  document.getElementById("entradas-hoy").textContent = entradas;
  document.getElementById("salidas-hoy").textContent = salidas;
  document.getElementById("usuarios-totales").textContent = usuarios;

  renderTabla();
  renderGrafica();
}

function renderGrafica() {
  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const conteo = Array(7).fill(0);
  const ahora = new Date();

  registros.forEach(r => {
    const fecha = new Date(r.timestamp.seconds * 1000);
    if (fecha > new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7)) {
      conteo[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1]++;
    }
  });

  const ctx = document.getElementById("graficaSemanal").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: dias,
      datasets: [{
        label: "Asistencias",
        data: conteo,
        backgroundColor: "rgba(25, 135, 84, 0.8)"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

tipoFiltro.addEventListener("change", renderTabla);
fechaFiltro.addEventListener("change", renderTabla);

document.getElementById("btn-logout").addEventListener("click", () => {
  signOut(auth).then(() => location.reload());
});

onAuthStateChanged(auth, (user) => {
  if (!user || !adminEmails.includes(user.email)) {
    alert("No autorizado");
    signOut(auth);
    return;
  }
  cargarRegistros();
});

window.exportarCSV = () => {
  const filas = ["Nombre,Email,Tipo,Fecha,Hora,Evento"];
  registros.forEach(r => {
    filas.push(`${r.nombre},${r.email},${r.tipo},${r.fecha},${r.hora},${r.tipoEvento}`);
  });
  const blob = new Blob([filas.join("\n")], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "registros.csv";
  link.click();
};

window.descargarJSON = () => {
  const blob = new Blob([JSON.stringify(registros)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "registros.json";
  link.click();
};
