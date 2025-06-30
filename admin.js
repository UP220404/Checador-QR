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
  addDoc,
  updateDoc,
  orderBy,
  query
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
const tabla = document.querySelector("#tabla-registros tbody");const tipoFiltro = document.getElementById("filtroTipo");
const fechaFiltro = document.getElementById("filtroFecha");
const busquedaFiltro = document.getElementById("filtroBusqueda");
const eventoFiltro = document.getElementById("filtroEvento");

let registros = [];
let graficaSemanal, graficaTipo, graficaHorarios, graficaMensual, graficaUsuarios;
let dataTableInstance = null;

function formatearFecha(timestamp) {
  if (!timestamp || typeof timestamp.seconds !== "number") return "-";
  const fecha = new Date(timestamp.seconds * 1000);
  // Formato YYYY-MM-DD local
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0')
  ].join('-');
}

function formatearHora(timestamp) {
  const fecha = new Date(timestamp.seconds * 1000);
  // Ajustar a zona horaria local
  return fecha.toLocaleTimeString("es-MX", { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
}

function formatearFechaHora(timestamp) {
  const fecha = new Date(timestamp.seconds * 1000);
  return fecha.toLocaleString("es-MX", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Renderizar tabla con filtros
function renderTabla() {
  // Destruye DataTable anterior si existe
  if (dataTableInstance) {
    dataTableInstance.destroy();
    dataTableInstance = null;
  }

  tabla.innerHTML = "";
  const tipo = tipoFiltro.value;
  const fecha = fechaFiltro.value;
  const busqueda = busquedaFiltro.value.toLowerCase();
  const evento = eventoFiltro.value;

  const filtrados = registros.filter(r => {
    const fechaMatch = !fecha || formatearFecha(r.timestamp) === fecha;
    const tipoMatch = !tipo || r.tipo === tipo;
    const busquedaMatch = !busqueda ||
      r.nombre.toLowerCase().includes(busqueda) ||
      r.email.toLowerCase().includes(busqueda);
    const eventoMatch = !evento || r.tipoEvento === evento;

    return fechaMatch && tipoMatch && busquedaMatch && eventoMatch;
  });

  filtrados.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

  if (filtrados.length === 0) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td colspan="7" class="text-center py-4 text-muted">
        <i class="bi bi-exclamation-circle me-2"></i>No se encontraron registros
      </td>
    `;
    tabla.appendChild(fila);
    // NO inicialices DataTables si no hay registros
    return;
  }

filtrados.forEach(r => {
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${r.nombre}</td>
    <td><span class="badge ${r.tipo === 'becario' ? 'bg-info' : 'bg-primary'}">${r.tipo}</span></td>
    <td>${formatearFecha(r.timestamp)}</td>
    <td>${formatearHora(r.timestamp)}</td>
    <td>
      <span class="badge ${r.tipoEvento === 'entrada' ? 'bg-success' : 'bg-warning text-dark'}">
        ${r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'}
      </span>
    </td>
    <td>
      <span class="badge ${
        r.estado === 'puntual' ? 'bg-success' :
        r.estado === 'retardo' ? 'bg-warning text-dark' :
        r.tipoEvento === 'salida' ? 'bg-primary' : 'bg-secondary'
      }">
        ${
          r.tipoEvento === 'entrada'
            ? (r.estado === 'puntual' ? 'Puntual' : r.estado === 'retardo' ? 'Retardo' : 'Entrada')
            : 'Salida'
        }
      </span>
    </td>
    <td class="text-end">
      <button class="btn btn-sm btn-outline-secondary me-1" onclick="verDetalle('${r.id}')" title="Ver detalles">
        <i class="bi bi-eye"></i>
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('${r.id}')" title="Eliminar">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  tabla.appendChild(fila);
});

  // Inicializa DataTable SOLO si hay registros
  dataTableInstance = $('#tabla-registros').DataTable({
    pageLength: 20,
    lengthChange: false, // Oculta el selector "Mostrar X registros"
    searching: false, // Oculta el buscador de la derecha
    language: {
      url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json',
      infoEmpty: "No hay registros para mostrar",
      zeroRecords: "No se encontraron registros"
    },
    order: [[3, "asc"]], // Ordena por hora (columna 3)
    drawCallback: function(settings) {
      var api = this.api();
      var pages = api.page.info().pages;
      if (pages <= 1) {
        $('.dataTables_paginate').hide();
        $('.dataTables_info').hide();
      } else {
        $('.dataTables_paginate').show();
        $('.dataTables_info').show();
      }
    }
  });
}

// Ver detalles de un registro
window.verDetalle = (id) => {
  const registro = registros.find(r => r.id === id);
  if (!registro) return;
  
  alert(`Detalles del registro:\n\nNombre: ${registro.nombre}\nEmail: ${registro.email}\nTipo: ${registro.tipo}\nFecha y hora: ${formatearFechaHora(registro.timestamp)}\nEvento: ${registro.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'}`);
};

// Eliminar registro
window.eliminarRegistro = async (id) => {
  if (!confirm("¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.")) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, "registros", id));
    mostrarNotificacion("Registro eliminado correctamente", "success");
    cargarRegistros();
  } catch (error) {
    console.error("Error al eliminar registro:", error);
    mostrarNotificacion("Error al eliminar registro", "danger");
  }
};

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = "info") {
  const notificacion = document.createElement("div");
  notificacion.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
  notificacion.style.top = "20px";
  notificacion.style.right = "20px";
  notificacion.style.zIndex = "9999";
  notificacion.style.maxWidth = "400px";
  notificacion.role = "alert";
  notificacion.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.body.appendChild(notificacion);
  
  // Auto cerrar después de 5 segundos
  setTimeout(() => {
    notificacion.classList.remove("show");
    setTimeout(() => notificacion.remove(), 150);
  }, 5000);
}


  


// Cargar registros desde Firestore
async function cargarRegistros() {
  try {
    const snap = await getDocs(collection(db, "registros"));
    registros = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calcular KPIs
    await calcularKPIs();
    
    // Renderizar elementos
    renderTabla();
    renderGraficas();
    renderRankingPuntualidad();
    
  } catch (error) {
    console.error("Error al cargar registros:", error);
    mostrarNotificacion("Error al cargar los registros", "danger");
  }
}

function getFechaHoyMX() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
}

function getFechaAyerMX() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
}

 async function calcularKPIs() {
  // Usar la fecha de CDMX para hoy y ayer
  const hoyStr = getFechaHoyMX();
  const ayerStr = getFechaAyerMX();

  // Entradas hoy
  const entradasHoy = registros.filter(r =>
    formatearFecha(r.timestamp) === hoyStr && r.tipoEvento === "entrada"
  ).length;

  // Salidas hoy
  const salidasHoy = registros.filter(r =>
    formatearFecha(r.timestamp) === hoyStr && r.tipoEvento === "salida"
  ).length;

  // Entradas ayer
  const entradasAyer = registros.filter(r =>
    formatearFecha(r.timestamp) === ayerStr && r.tipoEvento === "entrada"
  ).length;

  // Salidas ayer
  const salidasAyer = registros.filter(r =>
    formatearFecha(r.timestamp) === ayerStr && r.tipoEvento === "salida"
  ).length;

  // Usuarios únicos (últimos 7 días)
  const hoy = new Date();
  const sieteDiasAtras = new Date(hoy);
  sieteDiasAtras.setDate(hoy.getDate() - 7);
  const usuariosUnicos = new Set(
    registros
      .filter(r => new Date(r.timestamp.seconds * 1000) >= sieteDiasAtras)
      .map(r => r.email)
  ).size;

  // Calcular porcentajes de comparación
  const calcVariacion = (actual, anterior) => {
    if (anterior === 0) return actual === 0 ? 0 : 100;
    return Math.round(((actual - anterior) / anterior) * 100);
  };

  const entradasVariacion = calcVariacion(entradasHoy, entradasAyer);
  const salidasVariacion = calcVariacion(salidasHoy, salidasAyer);

  // Actualizar UI
  document.getElementById("entradas-hoy").textContent = entradasHoy;
  document.getElementById("salidas-hoy").textContent = salidasHoy;
  document.getElementById("usuarios-totales").textContent = usuariosUnicos;

  const entradasComparacion = document.getElementById("entradas-comparacion");
  const salidasComparacion = document.getElementById("salidas-comparacion");

  entradasComparacion.textContent = `${entradasVariacion >= 0 ? '+' : ''}${entradasVariacion}%`;
  entradasComparacion.className = entradasVariacion >= 0 ? "text-success" : "text-danger";

  salidasComparacion.textContent = `${salidasVariacion >= 0 ? '+' : ''}${salidasVariacion}%`;
  salidasComparacion.className = salidasVariacion >= 0 ? "text-success" : "text-danger";
}

// Renderizar todas las gráficas
function renderGraficas() {
  renderGraficaSemanal();
  renderGraficaTipo();
  renderGraficaHorarios();
  renderGraficaMensual();
  renderGraficaUsuarios();
}

// Gráfica semanal
function renderGraficaSemanal() {
  const ctx = document.getElementById("graficaSemanal").getContext("2d");
  
  if (graficaSemanal) {
    graficaSemanal.destroy();
  }
  
  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const conteo = Array(7).fill(0);
  const ahora = new Date();
  
  registros.forEach(r => {
    const fecha = new Date(r.timestamp.seconds * 1000);
    if (fecha > new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7)) {
      conteo[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1]++;
    }
  });
  
  // Color según modo oscuro
  const isDarkMode = document.body.classList.contains('dark-mode');
  const bgColor = isDarkMode ? 'rgba(32, 201, 151, 0.7)' : 'rgba(25, 135, 84, 0.7)';
  const borderColor = isDarkMode ? 'rgba(32, 201, 151, 1)' : 'rgba(25, 135, 84, 1)';
  const textColor = isDarkMode ? '#e0e0e0' : '#666';
  
  graficaSemanal = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dias,
      datasets: [{
        label: "Accesos",
        data: conteo,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          },
          ticks: {
            color: textColor
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor
          }
        }
      }
    }
  });
}

// Gráfica por tipo de usuario
function renderGraficaTipo() {
  const ctx = document.getElementById("graficaTipo").getContext("2d");
  
  if (graficaTipo) {
    graficaTipo.destroy();
  }
  
  const tipos = {
    becario: registros.filter(r => r.tipo === "becario").length,
    tiempo_completo: registros.filter(r => r.tipo === "tiempo_completo").length
  };
  
  // Color según modo oscuro
  const isDarkMode = document.body.classList.contains('dark-mode');
  const textColor = isDarkMode ? '#e0e0e0' : '#666';
  
  graficaTipo = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Becarios", "Tiempo completo"],
      datasets: [{
        data: [tipos.becario, tipos.tiempo_completo],
        backgroundColor: [
          "rgba(13, 110, 253, 0.7)",
          "rgba(25, 135, 84, 0.7)"
        ],
        borderColor: [
          "rgba(13, 110, 253, 1)",
          "rgba(25, 135, 84, 1)"
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor
          }
        }
      },
      cutout: "70%"
    }
  });
}

// Gráfica de horarios más activos
function renderGraficaHorarios() {
  const ctx = document.getElementById("graficaHorarios").getContext("2d");
  
  if (graficaHorarios) {
    graficaHorarios.destroy();
  }
  
  const horas = Array(24).fill(0);
  
  registros.forEach(r => {
    const fecha = new Date(r.timestamp.seconds * 1000);
    const hora = fecha.getHours();
    horas[hora]++;
  });
  
  // Color según modo oscuro
  const isDarkMode = document.body.classList.contains('dark-mode');
  const bgColor = isDarkMode ? 'rgba(108, 117, 125, 0.1)' : 'rgba(108, 117, 125, 0.1)';
  const borderColor = isDarkMode ? 'rgba(32, 201, 151, 1)' : 'rgba(108, 117, 125, 1)';
  const textColor = isDarkMode ? '#e0e0e0' : '#666';
  
  graficaHorarios = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: "Accesos por hora",
        data: horas,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 2,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          },
          ticks: {
            color: textColor
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor
          }
        }
      }
    }
  });
}

// Gráfica mensual (simplificada)
function renderGraficaMensual() {
  const ctx = document.getElementById("graficaMensual").getContext("2d");

  if (graficaMensual) {
    graficaMensual.destroy();
  }

  // Inicializa los meses
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const conteo = Array(12).fill(0);
  const year = new Date().getFullYear();

  registros.forEach(r => {
    const fecha = new Date(r.timestamp.seconds * 1000);
    if (fecha.getFullYear() === year) {
      conteo[fecha.getMonth()]++;
    }
  });

  // Color según modo oscuro
  const isDarkMode = document.body.classList.contains('dark-mode');
  const textColor = isDarkMode ? '#e0e0e0' : '#666';

  graficaMensual = new Chart(ctx, {
    type: "bar",
    data: {
      labels: meses,
      datasets: [{
        label: "Accesos",
        data: conteo,
        backgroundColor: "rgba(13, 110, 253, 0.7)",
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          },
          ticks: {
            color: textColor
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor
          }
        }
      }
    }
  });
}

// Gráfica de usuarios más activos (simplificada)
function renderGraficaUsuarios() {
  const ctx = document.getElementById("graficaUsuarios").getContext("2d");

  if (graficaUsuarios) {
    graficaUsuarios.destroy();
  }

  // Contar accesos por usuario (por email)
 // Contar accesos por usuario (por nombre)
const conteoUsuarios = {};
registros.forEach(r => {
  conteoUsuarios[r.nombre] = (conteoUsuarios[r.nombre] || 0) + 1;
});

// Ordenar y tomar top 5
const topUsuarios = Object.entries(conteoUsuarios)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

const labels = topUsuarios.map(([nombre]) => nombre);
const data = topUsuarios.map(([, count]) => count);
  // Color según modo oscuro
  const isDarkMode = document.body.classList.contains('dark-mode');
  const textColor = isDarkMode ? '#e0e0e0' : '#666';

  graficaUsuarios = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Accesos",
        data,
        backgroundColor: "rgba(111, 66, 193, 0.7)",
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor
          }
        },
        x: {
          grid: {
            color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          },
          ticks: {
            color: textColor
          }
        }
      }
    }
  });
}


// Generar reporte PDF 
window.generarReportePDF = async () => {
  mostrarNotificacion("Generando reporte PDF...", "info");

  await new Promise(resolve => setTimeout(resolve, 1000));

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Cargar logo (debe estar en la misma carpeta o usar ruta absoluta)
  const logoUrl = "img/cielitohome.png";
  const logoBase64 = await toDataURL(logoUrl);

  // Logo institucional
  doc.addImage(logoBase64, "PNG", 10, 8, 24, 24);

  // Título con color institucional
  doc.setFontSize(18);
  doc.setTextColor(25, 135, 84); // Verde institucional
  doc.text("Reporte Diario - Cielito Home", 38, 20);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text("Resumen de actividades del día.", 38, 28);

  // Línea decorativa
  doc.setDrawColor(25, 135, 84);
  doc.setLineWidth(1.2);
  doc.line(10, 34, 200, 34);

  // Filtrar registros del día
  const hoyStr = getFechaHoyMX();
  const registrosHoy = registros.filter(r => formatearFecha(r.timestamp) === hoyStr);

  // Separar y ordenar entradas y salidas por hora ascendente
  const entradas = registrosHoy
    .filter(r => r.tipoEvento === "entrada")
    .sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

  const salidas = registrosHoy
    .filter(r => r.tipoEvento === "salida")
    .sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

  // Prepara los datos para la tabla: primero entradas, luego salidas
  const rows = [
    ...entradas.map(r => [
      r.nombre,
      r.tipo,
      formatearFecha(r.timestamp),
      formatearHora(r.timestamp),
      "Entrada",
      r.estado === 'retardo' ? 'Retardo' : (r.estado === 'puntual' ? 'Puntual' : 'Entrada')
    ]),
    ...salidas.map(r => [
      r.nombre,
      r.tipo,
      formatearFecha(r.timestamp),
      formatearHora(r.timestamp),
      "Salida",
      "Salida"
    ])
  ];

  // Usa autoTable para formato y colores
  doc.autoTable({
    head: [['Nombre', 'Tipo', 'Fecha', 'Hora', 'Evento', 'Estado']],
    body: rows,
    startY: 38,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [25, 135, 84], // Verde institucional
      textColor: 255,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fillColor: [240, 240, 240],
      textColor: 30
    },
    alternateRowStyles: {
      fillColor: [220, 255, 220]
    },
    margin: { left: 10, right: 10 },
    // Cambia el color de fondo si es retardo
    didParseCell: function (data) {
      if (
        data.section === 'body' &&
        data.column.index === 5 && // Columna "Estado"
        data.cell.raw === 'Retardo'
      ) {
        data.cell.styles.fillColor = [255, 221, 51]; // Amarillo
        data.cell.styles.textColor = [0, 0, 0]; // Texto negro
      }
    }
  });

  doc.save(`reporte_diario_${hoyStr}.pdf`);
  mostrarNotificacion("Reporte PDF generado con éxito", "success");
};

// Utilidad para convertir imagen a base64
async function toDataURL(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
// Generar reporte Excel
window.generarReporteExcel = async () => {
  mostrarNotificacion("Generando reporte Excel...", "info");
  
  // Filtrar registros de la semana actual
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  
  const registrosSemana = registros.filter(r => 
    new Date(r.timestamp.seconds * 1000) >= inicioSemana
  );
  
  if (registrosSemana.length === 0) {
    mostrarNotificacion("No hay registros esta semana", "warning");
    return;
  }
  
  // Crear CSV (simulando Excel)
  const filas = ["Nombre,Tipo,Fecha,Hora,Evento,Estado"];
  registrosSemana.forEach(r => {
    filas.push(`"${r.nombre}","${r.tipo}","${formatearFecha(r.timestamp)}","${formatearHora(r.timestamp)}","${r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'}", "${r.estado === 'retardo' ? 'Retardo' : (r.estado === 'puntual' ? 'Puntual' : 'Entrada')}"`);
  });
  
  const blob = new Blob([filas.join("\n")], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte_semanal_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  
  mostrarNotificacion("Reporte Excel generado con éxito", "success");
};

// Generar reporte personalizado
window.generarReportePersonalizado = async () => {
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;
  const tipo = document.getElementById("reporteTipo").value;
  const formato = document.getElementById("reporteFormato").value;
  
  if (!fechaInicio || !fechaFin) {
    mostrarNotificacion("Selecciona un rango de fechas", "warning");
    return;
  }
  
  const inicio = new Date(fechaInicio + "T00:00:00");
  const fin = new Date(fechaFin + "T23:59:59");

  const registrosFiltrados = registros.filter(r => {
  const fechaReg = new Date(r.timestamp.seconds * 1000);
  const tipoMatch = !tipo || r.tipo === tipo;
  return fechaReg >= inicio && fechaReg <= fin && tipoMatch;
  });
  
  if (registrosFiltrados.length === 0) {
    mostrarNotificacion("No hay registros en el rango seleccionado", "warning");
    return;
  }
  
  mostrarNotificacion(`Generando reporte en formato ${formato.toUpperCase()}...`, "info");
  
  // Simulamos generación según formato
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  let blob, extension;

  if (formato === 'pdf') {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Cargar logo institucional
  const logoUrl = "img/cielitohome.png";
  const logoBase64 = await toDataURL(logoUrl);
  doc.addImage(logoBase64, "PNG", 10, 8, 24, 24);

  // Título y colores institucionales
  doc.setFontSize(16);
  doc.setTextColor(25, 135, 84);
  doc.text("Reporte Personalizado - Cielito Home", 38, 20);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`Rango: ${fechaInicio} a ${fechaFin}`, 38, 28);

  // Línea decorativa
  doc.setDrawColor(25, 135, 84);
  doc.setLineWidth(1.2);
  doc.line(10, 34, 200, 34);

  // Agrupar por día
  const registrosPorDia = {};
  registrosFiltrados.forEach(r => {
    const dia = formatearFecha(r.timestamp);
    if (!registrosPorDia[dia]) registrosPorDia[dia] = [];
    registrosPorDia[dia].push(r);
  });

  let startY = 38;

  // ...existing code...
for (const dia of Object.keys(registrosPorDia).sort()) {
  doc.setFontSize(13);
  doc.setTextColor(25, 135, 84);
  doc.text(`Fecha: ${dia}`, 10, startY + 8);

  // Separar y ordenar entradas y salidas
  const entradas = registrosPorDia[dia]
    .filter(r => r.tipoEvento === "entrada")
    .sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

  const salidas = registrosPorDia[dia]
    .filter(r => r.tipoEvento === "salida")
    .sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

  // Incluye el estado en la fila y la fecha
  const rows = [
    ...entradas.map(r => [
      r.nombre,
      r.tipo,
      formatearFecha(r.timestamp),
      formatearHora(r.timestamp),
      "Entrada",
      r.estado === 'retardo' ? 'Retardo' : (r.estado === 'puntual' ? 'Puntual' : 'Entrada')
    ]),
    ...salidas.map(r => [
      r.nombre,
      r.tipo,
      formatearFecha(r.timestamp),
      formatearHora(r.timestamp),
      "Salida",
      "Salida"
    ])
  ];

  doc.autoTable({
    head: [['Nombre', 'Tipo', 'Fecha', 'Hora', 'Evento', 'Estado']],
    body: rows,
    startY: startY + 12,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: {
      fillColor: [25, 135, 84],
      textColor: 255,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fillColor: [240, 240, 240],
      textColor: 30
    },
    alternateRowStyles: {
      fillColor: [220, 255, 220]
    },
    margin: { left: 10, right: 10 },
    // Cambia el color de fondo si es retardo
    didParseCell: function (data) {
      if (
        data.section === 'body' &&
        data.column.index === 5 && // Columna "Estado"
        data.cell.raw === 'Retardo'
      ) {
        data.cell.styles.fillColor = [255, 221, 51]; // Amarillo
        data.cell.styles.textColor = [0, 0, 0]; // Texto negro
      }
    }
  });

  // Calcular nueva posición Y para el siguiente día
  startY = doc.lastAutoTable.finalY + 8;
  if (startY > 250) {
    doc.addPage();
    startY = 20;
  }
}


  doc.save(`reporte_personalizado_${fechaInicio}_a_${fechaFin}.pdf`);
  mostrarNotificacion(`Reporte PDF generado con éxito`, "success");
  bootstrap.Modal.getInstance(document.getElementById('modalReporte')).hide();
  return;


  }else if (formato === 'excel') {
  const filas = ["Nombre,Tipo,Fecha,Hora,Evento,Estado"];
  registrosFiltrados.forEach(r => {
  filas.push(`"${r.nombre}","${r.tipo}","${formatearFecha(r.timestamp)}","${formatearHora(r.timestamp)}","${r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'}", "${r.estado === 'retardo' ? 'Retardo' : (r.estado === 'puntual' ? 'Puntual' : 'Entrada')}"`);
  });
  const blob = new Blob([filas.join("\n")], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte_personalizado_${fechaInicio}_a_${fechaFin}.csv`;
  link.click();
  mostrarNotificacion(`Reporte Excel generado con éxito`, "success");
  bootstrap.Modal.getInstance(document.getElementById('modalReporte')).hide();
  return;
  } else {
    // JSON
    const datos = registrosFiltrados.map(r => ({
      nombre: r.nombre,
      email: r.email,
      tipo: r.tipo,
      fecha: formatearFecha(r.timestamp),
      hora: formatearHora(r.timestamp),
      evento: r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'
    }));
    blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    extension = 'json';
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte_personalizado_${new Date().toISOString().slice(0,10)}.${extension}`;
  link.click();
  
  mostrarNotificacion(`Reporte ${formato.toUpperCase()} generado con éxito`, "success");
  
  // Cerrar modal
  bootstrap.Modal.getInstance(document.getElementById('modalReporte')).hide();
};

// Exportar a CSV
window.exportarCSV = () => {
  if (registros.length === 0) {
    mostrarNotificacion("No hay datos para exportar", "warning");
    return;
  }
  
  const filas = ["Nombre,Email,Tipo,Fecha,Hora,Evento"];
  registros.forEach(r => {
    filas.push(`"${r.nombre}","${r.email}","${r.tipo}","${formatearFecha(r.timestamp)}","${formatearHora(r.timestamp)}","${r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'}"`);
  });
  
  const blob = new Blob([filas.join("\n")], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registros_acceso_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarNotificacion("Archivo CSV exportado correctamente", "success");
};

// Exportar a JSON
window.descargarJSON = () => {
  if (registros.length === 0) {
    mostrarNotificacion("No hay datos para exportar", "warning");
    return;
  }
  
  const datos = registros.map(r => ({
    nombre: r.nombre,
    email: r.email,
    tipo: r.tipo,
    fecha: formatearFecha(r.timestamp),
    hora: formatearHora(r.timestamp),
    evento: r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida',
    timestamp: r.timestamp.seconds
  }));
  
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registros_acceso_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarNotificacion("Archivo JSON exportado correctamente", "success");
};

// Event listeners
tipoFiltro.addEventListener("change", renderTabla);
fechaFiltro.addEventListener("change", renderTabla);
busquedaFiltro.addEventListener("input", renderTabla);
eventoFiltro.addEventListener("change", renderTabla);

// Configurar fecha por defecto en el filtro
fechaFiltro.value = getFechaHoyMX();

// Modo oscuro
const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Verificar preferencias del sistema o almacenamiento local
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && prefersDarkScheme.matches)) {
  document.body.classList.add('dark-mode');
  themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
}

// Alternar modo oscuro
themeToggle.addEventListener('click', () => {
  if (document.body.classList.contains('dark-mode')) {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
    themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
  } else {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
    themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
  }
  
  // Re-renderizar gráficas para que se adapten al nuevo tema
  if (graficaSemanal) renderGraficaSemanal();
  if (graficaTipo) renderGraficaTipo();
  if (graficaHorarios) renderGraficaHorarios();
  if (graficaMensual) renderGraficaMensual();
  if (graficaUsuarios) renderGraficaUsuarios();
});

// Cerrar sesión
document.getElementById("btn-logout").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  }).catch(error => {
    console.error("Error al cerrar sesión:", error);
    mostrarNotificacion("Error al cerrar sesión", "danger");
  });
});

// Verificar autenticación
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  
  if (!adminEmails.includes(user.email)) {
    mostrarNotificacion("No tienes permisos para acceder a esta página", "danger");
    setTimeout(() => signOut(auth).then(() => window.location.href = "index.html"), 2000);
    return;
  }
  
  // Mostrar nombre del administrador
  document.getElementById("admin-name").textContent = user.displayName || user.email.split('@')[0];
  
  // Cargar datos
  cargarRegistros();
});

// Inicializar tooltips
document.addEventListener('DOMContentLoaded', () => {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(tooltipTriggerEl => {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

function renderRankingPuntualidad() {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  // Solo entradas del mes actual y que sean puntuales o retardo (para puntaje)
  const entradasMes = registros.filter(r =>
    r.tipoEvento === "entrada" &&
    new Date(r.timestamp.seconds * 1000).getMonth() === mesActual &&
    new Date(r.timestamp.seconds * 1000).getFullYear() === anioActual
  );

  // Puntaje por usuario
  const puntaje = {};
  entradasMes.forEach(r => {
    const fecha = new Date(r.timestamp.seconds * 1000);
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    let puntos = 0;

    if (hora === 7 && minutos <= 45) {
      puntos = 4; // Entrada entre  7:00 y 7:45 
    }else if (hora < 8) {
      puntos = 3; // Entrada antes de las 8:00
    } else if (hora === 8 && minutos <= 5) {
      puntos = 2; // Entrada entre 8:00 y 8:05
    } else if (hora === 8 && minutos <= 10) {
      puntos = 1; // Entrada entre 8:06 y 8:10
    } 
    // después de 8:10 no suma puntos
    if (puntos > 0) {
      puntaje[r.nombre] = (puntaje[r.nombre] || 0) + puntos;
    }
  });

  // Top 5 por puntaje
  const top = Object.entries(puntaje)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const rankingList = document.getElementById("ranking-puntualidad");
  if (!rankingList) return;

  rankingList.innerHTML = "";

  // Configuración de íconos y estilos para cada puesto
  const estilos = [
    { icon: '<i class="bi bi-gem"></i>', color: "#0dcaf0", nombre: "Diamante" }, // Top 1
    { icon: '<i class="bi bi-gem"></i>', color: "#dc3545", nombre: "Rubí" },     // Top 2
    { icon: '<i class="bi bi-award-fill"></i>', color: "#ffc107", nombre: "Oro" }, // Top 3
    { icon: '<i class="bi bi-award-fill"></i>', color: "#adb5bd", nombre: "Plata" }, // Top 4
    { icon: '<i class="bi bi-award-fill"></i>', color: "#b87333", nombre: "Bronce" } // Top 5
  ];

  const medallaClases = [
    "ranking-medalla ranking-diamante",
    "ranking-medalla ranking-rubi",
    "ranking-medalla ranking-oro",
    "ranking-medalla ranking-plata",
    "ranking-medalla ranking-bronce"
  ];

  if (top.length === 0) {
    rankingList.innerHTML = `<li class="list-group-item text-muted">Sin datos de puntualidad este mes</li>`;
    return;
  }

  top.forEach(([nombre, puntos], idx) => {
    const { icon, color, nombre: nombreMedalla } = estilos[idx];
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span class="d-flex align-items-center">
        <span style="font-size:1.7em; color:${color}; margin-right:10px;">${icon}</span>
        <strong style="color:${color};">${nombre}</strong>
        <span class="${medallaClases[idx]} ms-2">${nombreMedalla}</span>
      </span>
      <span class="badge bg-success rounded-pill">${puntos} punto${puntos > 1 ? 's' : ''}</span>`;
    rankingList.appendChild(li);
  });
}


// ================== GESTIÓN DE AUSENCIAS ==================

let ausenciasData = [];
let ausenciaEditandoId = null;

/**
 * Carga la lista de usuarios para el select de ausencias
 */
/**
 * Carga la lista de usuarios para el select de ausencias
 */
async function cargarUsuariosParaAusencias() {
  try {
    console.log("🔄 Cargando usuarios para ausencias...");
    
    // Obtener usuarios únicos de los registros
    const registrosSnapshot = await getDocs(collection(db, "registros"));
    const usuariosUnicos = new Map();
    
    if (registrosSnapshot.empty) {
      console.warn("⚠️ No hay registros de usuarios en la base de datos");
      return;
    }
    
    registrosSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email && data.nombre) {
        usuariosUnicos.set(data.email, {
          email: data.email,
          nombre: data.nombre,
          tipo: data.tipo || 'empleado'
        });
      }
    });

    console.log("👥 Usuarios encontrados:", usuariosUnicos.size);

    const selectUsuario = document.getElementById("ausenciaUsuario");
    if (!selectUsuario) {
      console.error("❌ No se encontró el elemento ausenciaUsuario");
      return;
    }
    
    selectUsuario.innerHTML = '<option value="">Seleccionar usuario...</option>';
    
    usuariosUnicos.forEach(usuario => {
      const option = document.createElement("option");
      option.value = usuario.email;
      option.textContent = `${usuario.nombre} (${usuario.email})`;
      option.dataset.tipo = usuario.tipo;
      selectUsuario.appendChild(option);
    });
    
    console.log("✅ Usuarios cargados correctamente en el select");
  } catch (error) {
    console.error("❌ Error cargando usuarios:", error);
    mostrarNotificacion("Error al cargar la lista de usuarios", "danger");
  }
}

/**
 * Carga todas las ausencias desde Firestore
 */
async function cargarAusencias() {
  try {
    // Primero intentar cargar sin ordenamiento
    const ausenciasSnapshot = await getDocs(collection(db, "ausencias"));
    
    if (ausenciasSnapshot.empty) {
      console.log("No hay ausencias registradas");
      ausenciasData = [];
      actualizarTablaAusenciasSafe();
      actualizarEstadisticasAusenciasSafe();
      return;
    }

    // Mapear los documentos
    ausenciasData = ausenciasSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fechaCreacion: data.fechaCreacion ? 
          (data.fechaCreacion.toDate ? data.fechaCreacion.toDate() : new Date(data.fechaCreacion)) : 
          new Date(),
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null
      };
    });

    // Ordenar manualmente por fecha de creación (más reciente primero)
    ausenciasData.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    
    actualizarTablaAusenciasSafe();
    actualizarEstadisticasAusenciasSafe();
    
  } catch (error) {
    console.error("Error cargando ausencias:", error);
    mostrarNotificacion("Error al cargar las ausencias. Verifica la configuración de Firebase.", "danger");
    
    // Inicializar con datos vacíos para evitar errores en la UI
    ausenciasData = [];
    actualizarTablaAusenciasSafe();
    actualizarEstadisticasAusenciasSafe();
  }
}

function actualizarTablaAusenciasSafe() {
  try {
    const tbody = document.querySelector("#tabla-ausencias tbody");
    if (!tbody) {
      console.warn("⚠️ Elemento #tabla-ausencias tbody no encontrado");
      return;
    }
    
    tbody.innerHTML = "";

    if (ausenciasData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-muted">
            <i class="bi bi-inbox me-2"></i>
            No hay ausencias registradas
          </td>
        </tr>
      `;
      return;
    }

    // Aplicar filtros
    let ausenciasFiltradas = [...ausenciasData];
    
    const filtroEstado = document.getElementById("filtroEstadoAusencia")?.value;
    const filtroTipo = document.getElementById("filtroTipoAusencia")?.value;
    const filtroFecha = document.getElementById("filtroFechaAusencia")?.value;
    const filtroBusqueda = document.getElementById("filtroBusquedaAusencia")?.value?.toLowerCase();

    if (filtroEstado) {
      ausenciasFiltradas = ausenciasFiltradas.filter(a => a.estado === filtroEstado);
    }
    if (filtroTipo) {
      ausenciasFiltradas = ausenciasFiltradas.filter(a => a.tipo === filtroTipo);
    }
    if (filtroFecha) {
      const fechaFiltro = new Date(filtroFecha);
      ausenciasFiltradas = ausenciasFiltradas.filter(a => 
        a.fechaInicio <= fechaFiltro && (!a.fechaFin || a.fechaFin >= fechaFiltro)
      );
    }
    if (filtroBusqueda) {
      ausenciasFiltradas = ausenciasFiltradas.filter(a => 
        a.nombreUsuario.toLowerCase().includes(filtroBusqueda) ||
        a.emailUsuario.toLowerCase().includes(filtroBusqueda)
      );
    }

    if (ausenciasFiltradas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-muted">
            <i class="bi bi-funnel me-2"></i>
            No se encontraron ausencias con los filtros aplicados
          </td>
        </tr>
      `;
      return;
    }

    ausenciasFiltradas.forEach(ausencia => {
      const tr = document.createElement("tr");
      
      // Calcular días
      const diasAusencia = calcularDiasAusencia(ausencia.fechaInicio, ausencia.fechaFin);
      
      // Formatear fechas
      const fechaInicioStr = ausencia.fechaInicio.toLocaleDateString("es-MX");
      const fechaFinStr = ausencia.fechaFin ? ausencia.fechaFin.toLocaleDateString("es-MX") : "";
      const rangoFecha = fechaFinStr ? `${fechaInicioStr} - ${fechaFinStr}` : fechaInicioStr;

      tr.innerHTML = `
        <td>
          <div class="fw-bold">${ausencia.nombreUsuario}</div>
          <small class="text-muted">${ausencia.emailUsuario}</small>
        </td>
        <td>
          <span class="badge ${getBadgeClassTipo(ausencia.tipo)}">
            ${getIconoTipo(ausencia.tipo)} ${formatearTipo(ausencia.tipo)}
          </span>
        </td>
        <td>${rangoFecha}</td>
        <td>
          <span class="badge bg-light text-dark">${diasAusencia} día${diasAusencia !== 1 ? 's' : ''}</span>
        </td>
        <td>
          <span class="text-truncate d-inline-block" style="max-width: 200px;" 
                title="${ausencia.motivo}">
            ${ausencia.motivo}
          </span>
        </td>
        <td>
          <span class="badge ${getBadgeClassEstado(ausencia.estado)}">
            ${getIconoEstado(ausencia.estado)} ${formatearEstado(ausencia.estado)}
          </span>
        </td>
        <td>
          <small class="text-muted">
            ${ausencia.fechaCreacion.toLocaleDateString("es-MX")}<br>
            ${ausencia.fechaCreacion.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}
          </small>
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editarAusencia('${ausencia.id}')" 
                    title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-success" onclick="aprobarAusencia('${ausencia.id}')" 
                    title="Aprobar" ${ausencia.estado === 'aprobada' ? 'disabled' : ''}>
              <i class="bi bi-check-lg"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="rechazarAusencia('${ausencia.id}')" 
                    title="Rechazar" ${ausencia.estado === 'rechazada' ? 'disabled' : ''}>
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </td>
      `;
      
      tbody.appendChild(tr);
    });
    
  } catch (error) {
    console.error("Error actualizando tabla de ausencias:", error);
  }
}

/**
 * Actualiza las estadísticas de ausencias de forma segura
 */
function actualizarEstadisticasAusenciasSafe() {
  try {
    const stats = {
      pendientes: ausenciasData.filter(a => a.estado === 'pendiente').length,
      aprobadas: ausenciasData.filter(a => a.estado === 'aprobada').length,
      rechazadas: ausenciasData.filter(a => a.estado === 'rechazada').length,
      total: ausenciasData.length
    };

    // Verificar que los elementos existen antes de actualizar
    const pendientesEl = document.getElementById("stat-pendientes");
    const aprobadasEl = document.getElementById("stat-aprobadas");
    const rechazadasEl = document.getElementById("stat-rechazadas");
    const totalEl = document.getElementById("stat-total");

    if (pendientesEl) pendientesEl.textContent = stats.pendientes;
    if (aprobadasEl) aprobadasEl.textContent = stats.aprobadas;
    if (rechazadasEl) rechazadasEl.textContent = stats.rechazadas;
    if (totalEl) totalEl.textContent = stats.total;
    
    console.log("📊 Estadísticas actualizadas:", stats);
  } catch (error) {
    console.error("Error actualizando estadísticas:", error);
  }
}
/**
 * Calcula los días de ausencia
 */
function calcularDiasAusencia(fechaInicio, fechaFin) {
  if (!fechaFin) return 1;
  const diffTime = Math.abs(fechaFin - fechaInicio);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Funciones auxiliares para formatear y obtener clases CSS
 */
function getBadgeClassTipo(tipo) {
  const classes = {
    permiso: "bg-warning text-dark",
    justificante: "bg-info",
    vacaciones: "bg-success",
    incapacidad: "bg-danger"
  };
  return classes[tipo] || "bg-secondary";
}

function getBadgeClassEstado(estado) {
  const classes = {
    pendiente: "bg-warning text-dark",
    aprobada: "bg-success",
    rechazada: "bg-danger"
  };
  return classes[estado] || "bg-secondary";
}

function getIconoTipo(tipo) {
  const iconos = {
    permiso: "🕐",
    justificante: "📋",
    vacaciones: "🏖️",
    incapacidad: "🏥"
  };
  return iconos[tipo] || "📄";
}

function getIconoEstado(estado) {
  const iconos = {
    pendiente: "⏳",
    aprobada: "✅",
    rechazada: "❌"
  };
  return iconos[estado] || "❓";
}

function formatearTipo(tipo) {
  const nombres = {
    permiso: "Permiso",
    justificante: "Justificante",
    vacaciones: "Vacaciones",
    incapacidad: "Incapacidad"
  };
  return nombres[tipo] || tipo;
}

function formatearEstado(estado) {
  const nombres = {
    pendiente: "Pendiente",
    aprobada: "Aprobada",
    rechazada: "Rechazada"
  };
  return nombres[estado] || estado;
}

/**
 * Maneja el envío del formulario de nueva ausencia
 */
async function manejarNuevaAusencia(e) {
  e.preventDefault();
  
  const formData = {
    emailUsuario: document.getElementById("ausenciaUsuario").value,
    nombreUsuario: document.getElementById("ausenciaUsuario").selectedOptions[0]?.textContent.split(' (')[0] || '',
    tipo: document.getElementById("ausenciaTipo").value,
    fechaInicio: document.getElementById("ausenciaFechaInicio").value,
    fechaFin: document.getElementById("ausenciaFechaFin").value || null,
    motivo: document.getElementById("ausenciaMotivo").value,
    estado: document.getElementById("ausenciaEstado").value,
    comentariosAdmin: "",
    fechaCreacion: new Date()
  };

  // Validaciones
  if (!formData.emailUsuario || !formData.tipo || !formData.fechaInicio || !formData.motivo) {
    mostrarNotificacion("Por favor completa todos los campos obligatorios", "error");
    return;
  }

  try {
    await addDoc(collection(db, "ausencias"), formData);
    mostrarNotificacion("Ausencia agregada correctamente", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalNuevaAusencia")).hide();
    document.getElementById("formNuevaAusencia").reset();
    cargarAusencias();
  } catch (error) {
    console.error("Error agregando ausencia:", error);
    mostrarNotificacion("Error al agregar la ausencia", "error");
  }
}

/**
 * Edita una ausencia
 */
function editarAusencia(id) {
  const ausencia = ausenciasData.find(a => a.id === id);
  if (!ausencia) return;

  ausenciaEditandoId = id;
  
  // Llenar el formulario
  document.getElementById("editarAusenciaId").value = id;
  document.getElementById("editarUsuario").value = `${ausencia.nombreUsuario} (${ausencia.emailUsuario})`;
  document.getElementById("editarTipo").value = ausencia.tipo;
  document.getElementById("editarFechaInicio").value = ausencia.fechaInicio.toISOString().split('T')[0];
  document.getElementById("editarFechaFin").value = ausencia.fechaFin ? ausencia.fechaFin.toISOString().split('T')[0] : '';
  document.getElementById("editarMotivo").value = ausencia.motivo;
  document.getElementById("editarEstado").value = ausencia.estado;
  document.getElementById("editarComentarios").value = ausencia.comentariosAdmin || '';

  new bootstrap.Modal(document.getElementById("modalEditarAusencia")).show();
}

/**
 * Maneja el envío del formulario de editar ausencia
 */
async function manejarEditarAusencia(e) {
  e.preventDefault();
  
  if (!ausenciaEditandoId) return;

  const datosActualizados = {
    tipo: document.getElementById("editarTipo").value,
    fechaInicio: document.getElementById("editarFechaInicio").value,
    fechaFin: document.getElementById("editarFechaFin").value || null,
    motivo: document.getElementById("editarMotivo").value,
    estado: document.getElementById("editarEstado").value,
    comentariosAdmin: document.getElementById("editarComentarios").value,
    fechaModificacion: new Date()
  };

  try {
    await updateDoc(doc(db, "ausencias", ausenciaEditandoId), datosActualizados);
    mostrarNotificacion("Ausencia actualizada correctamente", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalEditarAusencia")).hide();
    cargarAusencias();
  } catch (error) {
    console.error("Error actualizando ausencia:", error);
    mostrarNotificacion("Error al actualizar la ausencia", "error");
  }
}

/**
 * Aprueba una ausencia
 */
async function aprobarAusencia(id) {
  if (!confirm("¿Estás seguro de aprobar esta ausencia?")) return;

  try {
    await updateDoc(doc(db, "ausencias", id), {
      estado: "aprobada",
      fechaAprobacion: new Date(),
      comentariosAdmin: "Aprobada por administrador"
    });
    mostrarNotificacion("Ausencia aprobada", "success");
    cargarAusencias();
  } catch (error) {
    console.error("Error aprobando ausencia:", error);
    mostrarNotificacion("Error al aprobar la ausencia", "error");
  }
}

/**
 * Rechaza una ausencia
 */
async function rechazarAusencia(id) {
  const motivo = prompt("Motivo del rechazo (opcional):");
  if (motivo === null) return; // Cancelado

  try {
    await updateDoc(doc(db, "ausencias", id), {
      estado: "rechazada",
      fechaRechazo: new Date(),
      comentariosAdmin: motivo || "Rechazada por administrador"
    });
    mostrarNotificacion("Ausencia rechazada", "success");
    cargarAusencias();
  } catch (error) {
    console.error("Error rechazando ausencia:", error);
    mostrarNotificacion("Error al rechazar la ausencia", "error");
  }
}

/**
 * Elimina una ausencia
 */
async function eliminarAusencia() {
  if (!ausenciaEditandoId) return;
  if (!confirm("¿Estás seguro de eliminar esta ausencia? Esta acción no se puede deshacer.")) return;

  try {
    await deleteDoc(doc(db, "ausencias", ausenciaEditandoId));
    mostrarNotificacion("Ausencia eliminada correctamente", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalEditarAusencia")).hide();
    cargarAusencias();
  } catch (error) {
    console.error("Error eliminando ausencia:", error);
    mostrarNotificacion("Error al eliminar la ausencia", "error");
  }
}

// Event Listeners para ausencias
document.addEventListener('DOMContentLoaded', function() {
  // ...existing code...

  // Formulario nueva ausencia
  document.getElementById("formNuevaAusencia")?.addEventListener("submit", manejarNuevaAusencia);
  
  // Formulario editar ausencia
  document.getElementById("formEditarAusencia")?.addEventListener("submit", manejarEditarAusencia);

  // Filtros de ausencias
  document.getElementById("filtroEstadoAusencia")?.addEventListener("change", actualizarTablaAusencias);
  document.getElementById("filtroTipoAusencia")?.addEventListener("change", actualizarTablaAusencias);
  document.getElementById("filtroFechaAusencia")?.addEventListener("change", actualizarTablaAusencias);
  document.getElementById("filtroBusquedaAusencia")?.addEventListener("input", actualizarTablaAusencias);

  // Cargar datos de ausencias al mostrar la sección
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target.id === 'justificantes' && !mutation.target.classList.contains('d-none')) {
        cargarUsuariosParaAusencias();
        cargarAusencias();
      }
    });
  });

  const justificantesSection = document.getElementById('justificantes');
  if (justificantesSection) {
    observer.observe(justificantesSection, { attributes: true, attributeFilter: ['class'] });
  }
});

// Reemplazar las últimas líneas con:
window.cargarUsuariosParaAusencias = cargarUsuariosParaAusencias;
window.editarAusencia = editarAusencia;     
window.aprobarAusencia = aprobarAusencia;   
window.rechazarAusencia = rechazarAusencia;
window.eliminarAusencia = eliminarAusencia;

// También agregar esta función para los filtros:
function actualizarTablaAusencias() {
  actualizarTablaAusenciasSafe();
}
window.actualizarTablaAusencias = actualizarTablaAusencias;