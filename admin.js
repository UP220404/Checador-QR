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

// ==================== FUNCIONES PRINCIPALES ====================

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

// ==================== FORMATEO DE FECHAS ====================

function formatearFecha(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "-";
  const fecha = timestamp.toDate();
  return fecha.toLocaleDateString("es-MX", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Mexico_City'
  });
}

function formatearHora(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "-";
  const fecha = timestamp.toDate();
  return fecha.toLocaleTimeString("es-MX", {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City'
  });
}

// ==================== TABLA ====================

function renderTabla() {
  tabla.innerHTML = "";
  const tipo = tipoFiltro.value;
  const fecha = fechaFiltro.value;
  const busqueda = busquedaFiltro.value.toLowerCase();
  const evento = eventoFiltro.value;

  const filtrados = registros.filter(r => {
    if (!r.timestamp || typeof r.timestamp.toDate !== "function") return false;
    
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

// ==================== CARGA DE REGISTROS ====================

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
    
    // Actualizar métricas
    actualizarMetricas();
    renderTabla();
    renderGraficas();
    mostrarNotificacion(`${registros.length} registros cargados correctamente`, "success");
  } catch (error) {
    console.error("Error al cargar registros:", error);
    mostrarNotificacion("Error al cargar registros", "danger");
  }
}

function actualizarMetricas() {
  const hoy = new Date().toLocaleDateString("es-MX");
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = ayer.toLocaleDateString("es-MX");

  const entradasHoy = registros.filter(r => 
    r.tipoEvento === 'entrada' && formatearFecha(r.timestamp) === hoy
  ).length;
  
  const entradasAyer = registros.filter(r => 
    r.tipoEvento === 'entrada' && formatearFecha(r.timestamp) === ayerStr
  ).length;
  
  const salidasHoy = registros.filter(r => 
    r.tipoEvento === 'salida' && formatearFecha(r.timestamp) === hoy
  ).length;
  
  const salidasAyer = registros.filter(r => 
    r.tipoEvento === 'salida' && formatearFecha(r.timestamp) === ayerStr
  ).length;

  document.getElementById("entradas-hoy").textContent = entradasHoy;
  document.getElementById("salidas-hoy").textContent = salidasHoy;
  
  // Calcular comparación con ayer
  const comparacionEntradas = entradasAyer > 0 ? 
    Math.round(((entradasHoy - entradasAyer) / entradasAyer) * 100) : 0;
  const comparacionSalidas = salidasAyer > 0 ? 
    Math.round(((salidasHoy - salidasAyer) / salidasAyer) * 100) : 0;
  
  const entradasComparacion = document.getElementById("entradas-comparacion");
  const salidasComparacion = document.getElementById("salidas-comparacion");
  
  entradasComparacion.textContent = `${comparacionEntradas >= 0 ? '+' : ''}${comparacionEntradas}%`;
  entradasComparacion.className = comparacionEntradas >= 0 ? 'text-success' : 'text-danger';
  
  salidasComparacion.textContent = `${comparacionSalidas >= 0 ? '+' : ''}${comparacionSalidas}%`;
  salidasComparacion.className = comparacionSalidas >= 0 ? 'text-success' : 'text-danger';
  
  // Usuarios activos (únicos) en los últimos 7 días
  const sieteDiasAtras = new Date();
  sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
  
  const usuariosActivos = new Set(
    registros
      .filter(r => r.timestamp && r.timestamp.toDate() > sieteDiasAtras)
      .map(r => r.email)
  ).size;
  
  document.getElementById("usuarios-totales").textContent = usuariosActivos;
}

// ==================== FUNCIONES SECUNDARIAS ====================

// Ver detalles
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

// Eliminar registro
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

// Mostrar notificación
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

// ==================== REPORTES Y EXPORTACIÓN ====================

window.exportarCSV = () => {
  const headers = "Nombre,Email,Tipo,Fecha,Hora,Evento,Estado\n";
  const csvContent = registros
    .filter(r => r.timestamp && typeof r.timestamp.toDate === "function")
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
  const data = registros
    .filter(r => r.timestamp && typeof r.timestamp.toDate === "function")
    .map(r => ({
      nombre: r.nombre,
      email: r.email,
      tipo: r.tipo,
      fecha: formatearFecha(r.timestamp),
      hora: formatearHora(r.timestamp),
      evento: r.tipoEvento,
      estado: r.estado,
      timestamp: r.timestamp.toMillis()
    }));
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registros_${new Date().toISOString().slice(0,10)}.json`;
  link.click();
};

// ==================== GRÁFICAS ====================

function renderGraficas() {
  renderGraficaSemanal();
  renderGraficaTipo();
  renderGraficaHorarios();
  renderGraficaMensual();
  renderGraficaUsuarios();
}

function renderGraficaSemanal() {
  const ctx = document.getElementById("graficaSemanal").getContext("2d");
  if (graficaSemanal) graficaSemanal.destroy();
  
  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const conteo = Array(7).fill(0);
  
  registros.forEach(r => {
    if (!r.timestamp || typeof r.timestamp.toDate !== "function") return;
    const fecha = r.timestamp.toDate();
    const dia = fecha.getDay(); // 0 (Dom) a 6 (Sáb)
    conteo[dia === 0 ? 6 : dia - 1]++;
  });
  
  graficaSemanal = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dias,
      datasets: [{
        data: conteo,
        backgroundColor: document.body.classList.contains('dark-mode') 
          ? 'rgba(32, 201, 151, 0.7)' 
          : 'rgba(25, 135, 84, 0.7)',
        borderColor: document.body.classList.contains('dark-mode') 
          ? 'rgba(32, 201, 151, 1)' 
          : 'rgba(25, 135, 84, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: getChartOptions("Accesos semanales")
  });
}

function renderGraficaTipo() {
  const ctx = document.getElementById("graficaTipo").getContext("2d");
  if (graficaTipo) graficaTipo.destroy();
  
  const tipos = {
    becario: registros.filter(r => r.tipo === 'becario').length,
    tiempo_completo: registros.filter(r => r.tipo === 'tiempo_completo').length
  };
  
  graficaTipo = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Becarios", "Tiempo completo"],
      datasets: [{
        data: [tipos.becario, tipos.tiempo_completo],
        backgroundColor: [
          'rgba(13, 110, 253, 0.7)',
          'rgba(102, 16, 242, 0.7)'
        ],
        borderColor: [
          'rgba(13, 110, 253, 1)',
          'rgba(102, 16, 242, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderGraficaHorarios() {
  const ctx = document.getElementById("graficaHorarios").getContext("2d");
  if (graficaHorarios) graficaHorarios.destroy();
  
  const horas = Array(24).fill(0);
  registros.forEach(r => {
    if (!r.timestamp || typeof r.timestamp.toDate !== "function") return;
    const fecha = r.timestamp.toDate();
    const hora = fecha.getHours();
    horas[hora]++;
  });
  
  graficaHorarios = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: "Accesos por hora",
        data: horas,
        fill: true,
        backgroundColor: 'rgba(13, 110, 253, 0.2)',
        borderColor: 'rgba(13, 110, 253, 1)',
        tension: 0.4
      }]
    },
    options: getChartOptions("Accesos por hora del día")
  });
}

function renderGraficaMensual() {
  const ctx = document.getElementById("graficaMensual").getContext("2d");
  if (graficaMensual) graficaMensual.destroy();
  
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const conteo = Array(12).fill(0);
  
  registros.forEach(r => {
    if (!r.timestamp || typeof r.timestamp.toDate !== "function") return;
    const fecha = r.timestamp.toDate();
    const mes = fecha.getMonth();
    conteo[mes]++;
  });
  
  graficaMensual = new Chart(ctx, {
    type: "bar",
    data: {
      labels: meses,
      datasets: [{
        label: "Accesos por mes",
        data: conteo,
        backgroundColor: 'rgba(111, 66, 193, 0.7)',
        borderColor: 'rgba(111, 66, 193, 1)',
        borderWidth: 1
      }]
    },
    options: getChartOptions("Accesos mensuales")
  });
}

function renderGraficaUsuarios() {
  const ctx = document.getElementById("graficaUsuarios").getContext("2d");
  if (graficaUsuarios) graficaUsuarios.destroy();
  
  // Obtener los 5 usuarios con más registros
  const usuarios = {};
  registros.forEach(r => {
    if (!r.email) return;
    usuarios[r.email] = (usuarios[r.email] || 0) + 1;
  });
  
  const topUsuarios = Object.entries(usuarios)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const nombres = topUsuarios.map(u => u[0].split('@')[0]);
  const conteo = topUsuarios.map(u => u[1]);
  
  graficaUsuarios = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: nombres,
      datasets: [{
        data: conteo,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Configuración común para gráficas
function getChartOptions(title) {
  const isDarkMode = document.body.classList.contains('dark-mode');
  return {
    responsive: true,
    plugins: { 
      legend: { display: false },
      title: {
        display: true,
        text: title,
        color: isDarkMode ? '#fff' : '#333'
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
        ticks: { color: isDarkMode ? '#fff' : '#333' }
      },
      x: { 
        grid: { display: false },
        ticks: { color: isDarkMode ? '#fff' : '#333' }
      }
    }
  };
}

// ==================== EVENT LISTENERS ====================

document.getElementById("filtroBusqueda").addEventListener("input", renderTabla);
document.getElementById("filtroFecha").addEventListener("change", renderTabla);
document.getElementById("filtroTipo").addEventListener("change", renderTabla);
document.getElementById("filtroEvento").addEventListener("change", renderTabla);

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  renderGraficas();
});

// Inicializar modo oscuro si estaba activo
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

// Inicializar filtros con la fecha de hoy
document.getElementById("filtroFecha").valueAsDate = new Date();