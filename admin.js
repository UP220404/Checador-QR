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
const db = getFirestore(app);
const auth = getAuth(app);
const adminEmails = ["sistemas16ch@gmail.com", "leticia@cielitohome.com", "sistemas@cielitohome.com"];

const tabla = document.getElementById("tabla-registros");
const tipoFiltro = document.getElementById("filtroTipo");
const fechaFiltro = document.getElementById("filtroFecha");

function formatearFechaHora(timestamp) {
  const fecha = new Date(timestamp.seconds * 1000);
  return {
    fecha: fecha.toLocaleDateString("es-MX"),
    hora: fecha.toLocaleTimeString("es-MX", { hour12: false })
  };
}

function exportarCSV() {
  let csv = "Nombre,Email,Tipo,Fecha,Hora,Evento\n";
  document.querySelectorAll("#tabla-registros tr").forEach(row => {
    const cols = Array.from(row.querySelectorAll("td")).map(td => td.innerText);
    csv += cols.join(",") + "\n";
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "registros.csv");
  link.click();
}

function descargarJSON() {
  const data = [];
  document.querySelectorAll("#tabla-registros tr").forEach(row => {
    const [nombre, email, tipo, fecha, hora, evento] = Array.from(row.querySelectorAll("td")).map(td => td.innerText);
    data.push({ nombre, email, tipo, fecha, hora, evento });
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "registros.json");
  link.click();
}

async function cargarRegistros() {
  const snap = await getDocs(collection(db, "registros"));
  let registros = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

  const tipo = tipoFiltro.value;
  const fecha = fechaFiltro.value;
  if (tipo && tipo !== "todos") registros = registros.filter(r => {
    const tipoFormateado = r.tipo === "tiempo_completo" ? "Tiempo completo" : "Becario";
    return tipoFormateado === tipo;
  });
  if (fecha) registros = registros.filter(r => r.fecha === fecha);

  registros.sort((a, b) => new Date(a.timestamp.seconds * 1000) - new Date(b.timestamp.seconds * 1000));

  tabla.innerHTML = "";
  registros.forEach(r => {
    const { fecha, hora } = formatearFechaHora(r.timestamp);
    const tipoFormateado = r.tipo === "tiempo_completo" ? "Tiempo completo" : "Becario";
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${r.nombre}</td>
      <td>${r.email}</td>
      <td>${tipoFormateado}</td>
      <td>${fecha}</td>
      <td>${hora}</td>
      <td>${r.tipoEvento}</td>
      <td><button class="btn btn-sm btn-danger" data-id="${r.id}"><i class="bi bi-trash"></i></button></td>
    `;
    tabla.appendChild(fila);
  });
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

tipoFiltro.addEventListener("change", cargarRegistros);
fechaFiltro.addEventListener("change", cargarRegistros);

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth).then(() => location.reload()));

onAuthStateChanged(auth, (user) => {
  if (!user || !adminEmails.includes(user.email)) {
    alert("No tienes acceso autorizado.");
    window.location.href = "index.html";
  } else {
    cargarRegistros();
    contarHoy();
    graficarResumen();
  }
});

async function contarHoy() {
  const hoy = new Date().toLocaleDateString("es-MX");
  const snap = await getDocs(collection(db, "registros"));
  let entradas = 0;
  let salidas = 0;
  snap.forEach(doc => {
    const r = doc.data();
    if (r.fecha === hoy) {
      r.tipoEvento === "salida" ? salidas++ : entradas++;
    }
  });
  document.getElementById("entradas-hoy").textContent = entradas;
  document.getElementById("salidas-hoy").textContent = salidas;
}

async function graficarResumen() {
  const snap = await getDocs(collection(db, "registros"));
  const data = {};
  snap.forEach(doc => {
    const r = doc.data();
    const fecha = r.fecha;
    if (!data[fecha]) data[fecha] = { entradas: 0, salidas: 0 };
    if (r.tipoEvento === "salida") data[fecha].salidas++;
    else data[fecha].entradas++;
  });

  const labels = Object.keys(data).sort();
  const entradas = labels.map(l => data[l].entradas);
  const salidas = labels.map(l => data[l].salidas);

  new Chart(document.getElementById("graficaSemanal"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Entradas", data: entradas, borderColor: "#198754", fill: false },
        { label: "Salidas", data: salidas, borderColor: "#0d6efd", fill: false }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: false }
      }
    }
  });
}
