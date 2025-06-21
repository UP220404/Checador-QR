import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
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
const busquedaFiltro = document.getElementById("filtroBusqueda");
const eventoFiltro = document.getElementById("filtroEvento");

let registros = [];
let graficaSemanal, graficaTipo, graficaHorarios, graficaMensual, graficaUsuarios;

// Verificar autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (!adminEmails.includes(user.email)) {
      mostrarNotificacion("No tienes permisos para acceder", "danger");
      setTimeout(() => window.location.href = "index.html", 3000);
      return;
    }
    document.getElementById("admin-name").textContent = user.email;
    cargarRegistros();

    document.getElementById("btn-logout").addEventListener("click", () => {
      signOut(auth).then(() => window.location.href = "index.html")
        .catch(error => mostrarNotificacion("Error al cerrar sesión", "danger"));
    });
  } else {
    window.location.href = "index.html";
  }
});

// Formateo de fechas
function formatearFecha(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "-";
  const fecha = timestamp.toDate();
  return fecha.toLocaleDateString("es-MX", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatearHora(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "-";
  const fecha = timestamp.toDate();
  return fecha.toLocaleTimeString("es-MX", {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Renderizar tabla
function renderTabla() {
  tabla.innerHTML = "";
  const tipo = tipoFiltro.value;
  const fecha = fechaFiltro.value;
  const busqueda = busquedaFiltro.value.toLowerCase();
  const evento = eventoFiltro.value;

  const filtrados = registros.filter(r => {
    const fechaRegistro = formatearFecha(r.timestamp);
    return (!fecha || fechaRegistro === fecha) &&
           (!tipo || r.tipo === tipo) &&
           (!busqueda || r.nombre.toLowerCase().includes(busqueda) || r.email.toLowerCase().includes(busqueda)) &&
           (!evento || r.tipoEvento === evento);
  }).sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

  if (filtrados.length === 0) {
    tabla.innerHTML = `
      <tr><td colspan="7" class="text-center py-4 text-muted">
        <i class="bi bi-exclamation-circle me-2"></i>No se encontraron registros
      </td></tr>
    `;
    return;
  }

  filtrados.forEach(r => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${r.nombre}</td>
      <td>${r.email}</td>
      <td><span class="badge ${r.tipo === 'becario' ? 'bg-info' : 'bg-primary'}">${
        r.tipo === 'becario' ? 'Becario' : 'T. Completo'
      }</span></td>
      <td>${formatearFecha(r.timestamp)}</td>
      <td>${formatearHora(r.timestamp)}</td>
      <td>
        <span class="badge ${
          r.tipoEvento === 'entrada' 
            ? (r.estado === 'puntual' ? 'bg-success' : 'bg-warning text-dark') 
            : 'bg-primary'
        }">
          ${r.tipoEvento === 'entrada' 
            ? (r.estado === 'puntual' ? 'Entrada puntual' : 'Entrada con retardo') 
            : 'Salida'}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="verDetalle('${r.id}')">
          <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('${r.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tabla.appendChild(fila);
  });
}

// Cargar registros desde Firebase
async function cargarRegistros() {
  try {
    const q = query(collection(db, "registros"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    registros = snap.docs.map(doc => ({
      id: doc.id,
      nombre: doc.data().nombre || "Sin nombre",
      email: doc.data().email || "Sin email",
      tipo: doc.data().tipo || "desconocido",
      tipoEvento: doc.data().tipoEvento || "entrada",
      estado: doc.data().estado || "puntual",
      timestamp: doc.data().timestamp || null
    }));
    
    renderTabla();
    renderGraficas();
    mostrarNotificacion(`${registros.length} registros cargados`, "success");
  } catch (error) {
    console.error("Error al cargar registros:", error);
    mostrarNotificacion("Error al cargar registros", "danger");
  }
}

// Funciones globales
window.verDetalle = (id) => {
  const reg = registros.find(r => r.id === id);
  if (!reg) return;
  
  const detalle = `
    Nombre: ${reg.nombre}
    Email: ${reg.email}
    Tipo: ${reg.tipo === 'becario' ? 'Becario' : 'Tiempo completo'}
    Fecha: ${formatearFecha(reg.timestamp)}
    Hora: ${formatearHora(reg.timestamp)}
    Evento: ${reg.tipoEvento === 'entrada' 
      ? (reg.estado === 'puntual' ? 'Entrada puntual' : 'Entrada con retardo') 
      : 'Salida'}
  `;
  alert(detalle);
};

window.eliminarRegistro = async (id) => {
  if (!confirm("¿Eliminar este registro permanentemente?")) return;
  try {
    await deleteDoc(doc(db, "registros", id));
    mostrarNotificacion("Registro eliminado", "success");
    cargarRegistros();
  } catch (error) {
    mostrarNotificacion("Error al eliminar", "danger");
  }
};

function mostrarNotificacion(mensaje, tipo = "info") {
  const notificacion = document.createElement("div");
  notificacion.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
  notificacion.style = "top:20px;right:20px;z-index:9999;max-width:400px";
  notificacion.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(notificacion);
  setTimeout(() => notificacion.remove(), 5000);
}

// Exportación de datos
window.exportarCSV = () => {
  const headers = "Nombre,Email,Tipo,Fecha,Hora,Evento,Estado\n";
  const csvContent = registros
    .map(r => 
      `"${r.nombre}","${r.email}","${r.tipo}","${formatearFecha(r.timestamp)}",` +
      `"${formatearHora(r.timestamp)}","${r.tipoEvento}","${r.estado}"`
    ).join("\n");
  
  const blob = new Blob([headers + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registros_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
};

window.descargarJSON = () => {
  const data = registros.map(r => ({
    nombre: r.nombre,
    email: r.email,
    tipo: r.tipo,
    fecha: formatearFecha(r.timestamp),
    hora: formatearHora(r.timestamp),
    evento: r.tipoEvento,
    estado: r.estado,
    timestamp: r.timestamp?.toMillis() || null
  }));
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registros_${new Date().toISOString().slice(0,10)}.json`;
  link.click();
};

// Event listeners
document.getElementById("filtroBusqueda").addEventListener("input", renderTabla);
document.getElementById("filtroFecha").addEventListener("change", renderTabla);
document.getElementById("filtroTipo").addEventListener("change", renderTabla);
document.getElementById("filtroEvento").addEventListener("change", renderTabla);

// Inicialización
document.getElementById("filtroFecha").valueAsDate = new Date();