// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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
const db = getFirestore(app);
const tabla = document.getElementById("tabla-registros");
const entradasHoyEl = document.getElementById("entradas-hoy");
const salidasHoyEl = document.getElementById("salidas-hoy");

function formatearFechaHora(timestamp) {
  const fecha = new Date(timestamp.seconds * 1000);
  const f = fecha.toLocaleDateString("es-MX");
  const h = fecha.toLocaleTimeString("es-MX", { hour12: false });
  return [f, h];
}

async function cargarRegistros() {
  const snap = await getDocs(collection(db, "registros"));
  const hoy = new Date().toLocaleDateString("es-MX");
  let entradas = 0, salidas = 0;
  const datos = [];

  tabla.innerHTML = "";

  snap.forEach(docSnap => {
    const r = docSnap.data();
    const [f, h] = formatearFechaHora(r.timestamp);
    if (f === hoy && r.tipoEvento === "puntual") entradas++;
    if (f === hoy && r.tipoEvento === "salida") salidas++;
    datos.push({ ...r, fecha: f, hora: h });
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${r.nombre}</td>
      <td>${r.email}</td>
      <td>${r.tipo}</td>
      <td>${f}</td>
      <td>${h}</td>
      <td>${r.tipoEvento}</td>
      <td><button class="btn btn-sm btn-outline-danger" data-id="${docSnap.id}"><i class="bi bi-trash"></i></button></td>
    `;
    tabla.appendChild(fila);
  });

  entradasHoyEl.textContent = entradas;
  salidasHoyEl.textContent = salidas;

  dibujarGraficaDiaria(entradas, salidas);
  dibujarGraficaSemanal(datos);
}

tabla.addEventListener("click", async (e) => {
  if (e.target.closest("button")) {
    const id = e.target.closest("button").dataset.id;
    if (confirm("¿Eliminar este registro?")) {
      await deleteDoc(doc(db, "registros", id));
      cargarRegistros();
    }
  }
});

function dibujarGraficaDiaria(entradas, salidas) {
  const ctx = document.getElementById("graficaAsistencias").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Entradas", "Salidas"],
      datasets: [{
        label: "Hoy",
        data: [entradas, salidas],
        backgroundColor: ["#198754", "#0d6efd"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function dibujarGraficaSemanal(datos) {
  const conteo = { Lunes: 0, Martes: 0, Miércoles: 0, Jueves: 0, Viernes: 0 };
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  datos.forEach(r => {
    const d = new Date(r.timestamp.seconds * 1000);
    const dia = dias[d.getDay()];
    if (conteo[dia] !== undefined) conteo[dia]++;
  });

  const ctx = document.getElementById("graficaSemanal").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: Object.keys(conteo),
      datasets: [{
        label: "Registros por día",
        data: Object.values(conteo),
        fill: false,
        borderColor: "#198754",
        tension: 0.1
      }]
    }
  });
}

window.exportarCSV = async function () {
  const snap = await getDocs(collection(db, "registros"));
  let csv = "Nombre,Email,Tipo,Fecha,Hora,Evento\n";
  snap.forEach(docSnap => {
    const r = docSnap.data();
    const [f, h] = formatearFechaHora(r.timestamp);
    csv += `${r.nombre},${r.email},${r.tipo},${f},${h},${r.tipoEvento}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "registros.csv";
  link.click();
};

cargarRegistros();
