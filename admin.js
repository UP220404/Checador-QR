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
  query,
  where,
  getDoc,
  setDoc,
  limit
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

const adminEmails = ["sistemas16ch@gmail.com", "direcciongeneral@cielitohome.com", "sistemas@cielitohome.com"];
const USUARIOS_REMOTOS = [
  "sistemas20cielitoh@gmail.com",
  "operacionescielitoh@gmail.com",
  "atencionmedicacielitoh@gmail.com"
];
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


async function cargarRegistros() {
  try {
    console.log("🔄 Cargando registros desde Firestore...");
    
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const q = query(
      collection(db, "registros"),
      where("timestamp", ">=", hace30Dias),
      orderBy("timestamp", "desc"),
      limit(1000)
    );
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.warn("⚠️ No se encontraron registros");
      registros = [];
      renderTabla();
      return;
    }
    
    registros = snap.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    console.log(`✅ ${registros.length} registros cargados correctamente`);
    renderTabla();
    
  } catch (error) {
    console.error("❌ Error al cargar registros:", error);
    mostrarNotificacion("Error al cargar registros", "danger");
    registros = [];
    renderTabla();
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
  
  // Solo días laborales (Lunes a Viernes)
  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie"];
  const conteo = Array(5).fill(0);
  
  // Calcular el inicio y fin de la semana laboral actual (Lunes a Viernes)
  const ahora = new Date();
  const diaActual = ahora.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const diasHastaLunes = diaActual === 0 ? 6 : diaActual - 1; // Ajustar para que Lunes sea el inicio
  
  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(ahora.getDate() - diasHastaLunes);
  inicioSemana.setHours(0, 0, 0, 0);
  
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 4); // Solo hasta Viernes (4 días después del Lunes)
  finSemana.setHours(23, 59, 59, 999);
  
  // Filtrar registros solo de la semana laboral actual
  registros.forEach(r => {
    const fecha = new Date(r.timestamp.seconds * 1000);
    const diaSemana = fecha.getDay();
    
    // Solo contar días laborales (Lunes=1 a Viernes=5)
    if (fecha >= inicioSemana && fecha <= finSemana && diaSemana >= 1 && diaSemana <= 5) {
      const indice = diaSemana - 1; // Convertir Lunes=1 a índice 0, Martes=2 a índice 1, etc.
      conteo[indice]++;
    }
  });
  
  // Actualizar el título con el rango de fechas (solo días laborales)
  const tituloElemento = document.querySelector('#dashboard .chart-container h4');
  if (tituloElemento) {
    const formatoFecha = { day: 'numeric', month: 'short' };
    const fechaInicio = inicioSemana.toLocaleDateString("es-MX", formatoFecha);
    const fechaFin = finSemana.toLocaleDateString("es-MX", formatoFecha);
    tituloElemento.innerHTML = `<i class="bi bi-calendar-week"></i> Actividad Semanal (${fechaInicio} - ${fechaFin})`;
  }
  
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
cargarRegistros().then(async () => {
  await calcularKPIs();
  await renderGraficas();
  await inicializarSelectoresPuntualidad();
  await renderRankingPuntualidad();
}).catch(error => {
  console.error("Error cargando datos:", error);
  mostrarNotificacion("Error al cargar datos del panel", "danger");
});

});

// Inicializar tooltips
document.addEventListener('DOMContentLoaded', () => {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(tooltipTriggerEl => {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});


// ✅ FUNCIÓN OPTIMIZADA PARA RANKINGS MENSUALES
async function cargarRankingMensualOptimizado(mes, anio) {
  const rankingId = `${anio}-${String(mes + 1).padStart(2, '0')}`;
  
  try {
    // 1. ✅ PRIORIDAD: Buscar ranking pre-calculado
    const rankingRef = doc(db, "rankings-mensuales", rankingId);
    const rankingDoc = await getDoc(rankingRef);
    
    if (rankingDoc.exists()) {
      console.log(`🏆 Ranking cargado desde caché: ${rankingId}`);
      return rankingDoc.data().ranking;
    }
    
    // 2. ✅ SOLO PARA MES ACTUAL: Calcular en tiempo real
    const ahora = new Date();
    const esMonthActual = (mes === ahora.getMonth() && anio === ahora.getFullYear());
    
    if (esMonthActual) {
      console.log(`📊 Calculando ranking del mes actual: ${rankingId}`);
      return await calcularRankingMesActual();
    } else {
      // 3. ✅ MESES HISTÓRICOS: Consulta específica y guardar
      console.log(`📚 Calculando ranking histórico: ${rankingId}`);
      return await calcularYGuardarRankingHistorico(mes, anio);
    }
    
  } catch (error) {
    console.error("Error cargando ranking:", error);
    return {};
  }
}



async function calcularRankingMesActual() {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  
  // Usar los registros ya cargados (últimos 30 días)
  const entradasMes = registros.filter(r => {
    if (r.tipoEvento !== "entrada") return false;
    const fecha = new Date(r.timestamp.seconds * 1000);
    return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
  });

  return calcularPuntajes(entradasMes);
}

async function calcularYGuardarRankingHistorico(mes, anio) {
  // Consulta SOLO del mes específico
  const inicioMes = new Date(anio, mes, 1);
  const finMes = new Date(anio, mes + 1, 0, 23, 59, 59);
  
  const q = query(
    collection(db, "registros"),
    where("timestamp", ">=", inicioMes),
    where("timestamp", "<=", finMes),
    where("tipoEvento", "==", "entrada")
  );
  
  const querySnapshot = await getDocs(q);
  const entradasMes = querySnapshot.docs.map(doc => doc.data());
  
  console.log(`📊 Entradas encontradas para ${mes+1}/${anio}: ${entradasMes.length}`);
  
  const puntajes = calcularPuntajes(entradasMes);
  
  // Guardar para futuras consultas
  if (Object.keys(puntajes).length > 0) {
    const rankingId = `${anio}-${String(mes + 1).padStart(2, '0')}`;
    await setDoc(doc(db, "rankings-mensuales", rankingId), {
      mes,
      anio,
      ranking: puntajes,
      fechaCreacion: new Date(),
      totalEntradas: entradasMes.length
    });
    console.log(`✅ Ranking histórico guardado: ${rankingId}`);
  }
  
  return puntajes;
}


function calcularPuntajes(entradas) {
  const puntajes = {};

  entradas.forEach(r => {
    // Excluir usuarios remotos del ranking
    if (r.email && USUARIOS_REMOTOS.includes(r.email)) {
      return; // Saltar este usuario
    }

    const fecha = new Date(r.timestamp.seconds * 1000);
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    let puntos = 0;

    if (hora === 7 && minutos <= 45) {
      puntos = 4; // 7:00-7:45
    } else if (hora < 8) {
      puntos = 3; // Antes de 8:00
    } else if (hora === 8 && minutos <= 5) {
      puntos = 2; // 8:00-8:05
    } else if (hora === 8 && minutos <= 10) {
      puntos = 1; // 8:06-8:10
    }

    if (puntos > 0) {
      const nombre = r.nombre || 'Usuario Desconocido';
      puntajes[nombre] = (puntajes[nombre] || 0) + puntos;
    }
  });
  
  return puntajes;
}

async function renderRankingPuntualidad() {
  const selectorMes = document.getElementById("selectorMesPuntualidad");
  const selectorAnio = document.getElementById("selectorAnioPuntualidad");
  
  let mesSeleccionado, anioSeleccionado;
  
  if (selectorMes && selectorAnio) {
    mesSeleccionado = parseInt(selectorMes.value);
    anioSeleccionado = parseInt(selectorAnio.value);
  } else {
    const ahora = new Date();
    mesSeleccionado = ahora.getMonth();
    anioSeleccionado = ahora.getFullYear();
  }

  console.log(`📊 Cargando ranking para ${mesSeleccionado + 1}/${anioSeleccionado}`);

  // ✅ USAR FUNCIÓN OPTIMIZADA
  const puntaje = await cargarRankingMensualOptimizado(mesSeleccionado, anioSeleccionado);

  const rankingList = document.getElementById("ranking-puntualidad");
  if (!rankingList) {
    console.error("❌ Elemento ranking-puntualidad no encontrado");
    return;
  }

  // Actualizar título del mes
  const tituloRanking = document.querySelector('.card:has(#ranking-puntualidad) .card-header');
  if (tituloRanking) {
    const nombreMes = new Date(anioSeleccionado, mesSeleccionado).toLocaleDateString("es-MX", { 
      month: 'long', 
      year: 'numeric' 
    });
    tituloRanking.innerHTML = `🏆 Ranking de Puntualidad - ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}`;
  }

  rankingList.innerHTML = "";

  // Crear array de usuarios y ordenar por puntos
  const usuarios = Object.entries(puntaje)
    .filter(([nombre, puntos]) => puntos > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log(`👥 Usuarios en el ranking:`, usuarios);

  // Configuración de estilos para cada medalla
  const estilos = [
    { icon: '<i class="bi bi-gem"></i>', color: "#0dcaf0", bgGradient: "linear-gradient(135deg, #0dcaf0, #17a2b8)", nombre: "Diamante", emoji: "💎" },
    { icon: '<i class="bi bi-gem"></i>', color: "#dc3545", bgGradient: "linear-gradient(135deg, #dc3545, #c82333)", nombre: "Rubí", emoji: "🔴" },
    { icon: '<i class="bi bi-award-fill"></i>', color: "#ffc107", bgGradient: "linear-gradient(135deg, #ffc107, #e0a800)", nombre: "Oro", emoji: "🥇" },
    { icon: '<i class="bi bi-award-fill"></i>', color: "#6c757d", bgGradient: "linear-gradient(135deg, #6c757d, #5a6268)", nombre: "Plata", emoji: "🥈" },
    { icon: '<i class="bi bi-award-fill"></i>', color: "#b87333", bgGradient: "linear-gradient(135deg, #b87333, #996633)", nombre: "Bronce", emoji: "🥉" }
  ];

  if (usuarios.length === 0) {
    const nombreMes = new Date(anioSeleccionado, mesSeleccionado).toLocaleDateString("es-MX", { 
      month: 'long', 
      year: 'numeric' 
    });
    rankingList.innerHTML = `
      <div class="ranking-empty">
        <i class="bi bi-trophy" style="font-size: 3rem; color: #6c757d;"></i>
        <h5 class="mt-3 text-muted">Sin datos de puntualidad</h5>
        <p class="text-muted">No hay registros para ${nombreMes}</p>
      </div>
    `;
    return;
  }

  // Renderizar usuarios en el ranking
  let indiceMedalla = 0;
  let puntajeAnterior = null;
  
  usuarios.forEach(([nombre, puntos], indice) => {
    // Si el puntaje es diferente al anterior, avanzar a la siguiente medalla
    if (puntajeAnterior !== null && puntajeAnterior !== puntos) {
      indiceMedalla++;
    }
    
    // Asegurar que no exceda el array de medallas
    const medallaActual = Math.min(indiceMedalla, estilos.length - 1);
    
    const { icon, bgGradient, nombre: nombreMedalla, emoji } = estilos[medallaActual];
    const posicionDisplay = indice + 1;
    
    // Crear elemento con diseño mejorado
    const rankingItem = document.createElement("li");
    rankingItem.className = "ranking-item-nuevo";
    rankingItem.innerHTML = `
      <div class="ranking-card-nuevo" style="background: ${bgGradient};">
        <div class="ranking-position-nuevo">
          <span class="position-number-nuevo">${posicionDisplay}</span>
          <span class="position-emoji-nuevo">${emoji}</span>
        </div>
        <div class="ranking-info-nuevo">
          <div class="ranking-name-nuevo">${nombre}</div>
          <div class="ranking-medal-nuevo">
            ${icon} <span>${nombreMedalla}</span>
          </div>
        </div>
        <div class="ranking-points-nuevo">
          <span class="points-number-nuevo">${puntos}</span>
          <span class="points-text-nuevo">punto${puntos !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
    
    rankingList.appendChild(rankingItem);
    
    puntajeAnterior = puntos;
  });

  console.log(`✅ Ranking renderizado con ${usuarios.length} usuarios`);
}


// También asegúrate de que la función calcularYGuardarRankingMensual esté guardando correctamente:
async function calcularYGuardarRankingMensual() {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  
  console.log(`📊 Calculando ranking para ${mesActual + 1}/${anioActual}`);
  
  // Solo entradas del mes actual
  const entradasMes = registros.filter(r => {
    if (r.tipoEvento !== "entrada") return false;
    
    const fecha = new Date(r.timestamp.seconds * 1000);
    return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
  });

  console.log(`📝 Total de entradas en el mes: ${entradasMes.length}`);

  // Calcular puntaje del mes actual
  const puntaje = {};
  entradasMes.forEach(r => {
    const fecha = new Date(r.timestamp.seconds * 1000);
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    let puntos = 0;

    if (hora === 7 && minutos <= 45) {
      puntos = 4; // Entrada entre 7:00 y 7:45 
    } else if (hora < 8) {
      puntos = 3; // Entrada antes de las 8:00
    } else if (hora === 8 && minutos <= 5) {
      puntos = 2; // Entrada entre 8:00 y 8:05
    } else if (hora === 8 && minutos <= 10) {
      puntos = 1; // Entrada entre 8:06 y 8:10
    }
    
    if (puntos > 0) {
      // Usar el campo nombre directamente
      const nombreUsuario = r.nombre || 'Usuario Desconocido';
      puntaje[nombreUsuario] = (puntaje[nombreUsuario] || 0) + puntos;
      console.log(`➕ ${nombreUsuario}: +${puntos} puntos`);
    }
  });

  console.log("📊 Puntajes calculados:", puntaje);

  // Guardar en Firebase
  const rankingId = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  
  try {
    const rankingRef = doc(db, "rankings-mensuales", rankingId);
    
    await setDoc(rankingRef, {
      mes: mesActual,
      anio: anioActual,
      ranking: puntaje,
      fechaActualizacion: new Date(),
      top5: Object.entries(puntaje)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([nombre, puntos], index) => ({
          posicion: index + 1,
          nombre,
          puntos
        }))
    });
    
    console.log(`✅ Ranking guardado en Firebase: ${rankingId}`);
  } catch (error) {
    console.error("❌ Error al guardar ranking mensual:", error);
  }
}

// Función para debug - agrégala temporalmente para verificar los datos
window.debugRanking = async function() {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  
  console.log("=== DEBUG RANKING ===");
  console.log(`Mes actual: ${mesActual + 1}/${anioActual}`);
  console.log(`Total registros cargados: ${registros.length}`);
  
  const entradasMes = registros.filter(r => {
    if (r.tipoEvento !== "entrada") return false;
    const fecha = new Date(r.timestamp.seconds * 1000);
    return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
  });
  
  console.log(`Entradas este mes: ${entradasMes.length}`);
  console.log("Primeras 5 entradas:", entradasMes.slice(0, 5).map(e => ({
    nombre: e.nombre,
    fecha: new Date(e.timestamp.seconds * 1000).toLocaleString(),
    hora: new Date(e.timestamp.seconds * 1000).getHours() + ':' + new Date(e.timestamp.seconds * 1000).getMinutes()
  })));
  
  // Ver ranking guardado
  const rankingId = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  try {
    const rankingRef = doc(db, "rankings-mensuales", rankingId);
    const rankingDoc = await getDoc(rankingRef);
    
    if (rankingDoc.exists()) {
      console.log("Ranking guardado en Firebase:", rankingDoc.data());
    } else {
      console.log("No hay ranking guardado para este mes");
    }
  } catch (error) {
    console.error("Error obteniendo ranking:", error);
  }
}

// Función para inicializar selectores
function inicializarSelectoresPuntualidad() {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  
  const rankingContainer = document.querySelector('.card:has(#ranking-puntualidad)');
  if (!rankingContainer) return;
  
  let selectorContainer = rankingContainer.querySelector('.selector-mes-container');
  
  if (!selectorContainer) {
    selectorContainer = document.createElement('div');
    selectorContainer.className = 'selector-mes-container p-3 border-bottom';
    selectorContainer.innerHTML = `
      <div class="row g-2 align-items-center">
        <div class="col-auto">
          <label class="form-label mb-0 small text-muted">Ver mes:</label>
        </div>
        <div class="col-auto">
          <select id="selectorMesPuntualidad" class="form-select form-select-sm">
            <option value="0">Enero</option>
            <option value="1">Febrero</option>
            <option value="2">Marzo</option>
            <option value="3">Abril</option>
            <option value="4">Mayo</option>
            <option value="5">Junio</option>
            <option value="6">Julio</option>
            <option value="7">Agosto</option>
            <option value="8">Septiembre</option>
            <option value="9">Octubre</option>
            <option value="10">Noviembre</option>
            <option value="11">Diciembre</option>
          </select>
        </div>
        <div class="col-auto">
          <select id="selectorAnioPuntualidad" class="form-select form-select-sm">
            ${generarOpcionesAnio(anioActual)}
          </select>
        </div>
        <div class="col-auto">
          <button id="btnActualizarRanking" class="btn btn-sm btn-outline-success">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>
    `;
    
    const cardBody = rankingContainer.querySelector('.card-body');
    rankingContainer.insertBefore(selectorContainer, cardBody);
  }
  
  document.getElementById("selectorMesPuntualidad").value = mesActual;
  document.getElementById("selectorAnioPuntualidad").value = anioActual;
  
  document.getElementById("selectorMesPuntualidad").addEventListener('change', renderRankingPuntualidad);
  document.getElementById("selectorAnioPuntualidad").addEventListener('change', renderRankingPuntualidad);
  document.getElementById("btnActualizarRanking").addEventListener('click', renderRankingPuntualidad);
  
  
 
}

// Función auxiliar para generar opciones de año
function generarOpcionesAnio(anioActual) {
  let opciones = '';
  for (let i = anioActual - 2; i <= anioActual; i++) {
    opciones += `<option value="${i}" ${i === anioActual ? 'selected' : ''}>${i}</option>`;
  }
  return opciones;
}

// Función que se ejecuta automáticamente cada día para cerrar el mes anterior
async function verificarCierreMensual() {
  const ahora = new Date();
  const diaDelMes = ahora.getDate();
  
  // Si es día 1 del mes, cerrar el mes anterior
  if (diaDelMes === 1) {
    const mesAnterior = ahora.getMonth() === 0 ? 11 : ahora.getMonth() - 1;
    const anioAnterior = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear();
    
    await calcularYGuardarRankingMensual();
  }
}

// ✅ AGREGAR AQUÍ EL CÓDIGO DE MIGRACIÓN:

// Función para migrar datos históricos (ejecutar una sola vez)
// Función para migrar datos históricos (ejecutar una sola vez)
async function migrarDatosHistoricos() {
  try {
    console.log("🔄 Iniciando migración de datos históricos...");
    
    // Obtener todos los meses únicos de los registros
    const mesesUnicos = new Set();
    registros.forEach(r => {
      const fecha = new Date(r.timestamp.seconds * 1000);
      // CORREGIR: usar getMonth() + 1 para el mes real
      const mesAnio = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      mesesUnicos.add(mesAnio);
    });

    console.log("📅 Meses encontrados:", Array.from(mesesUnicos));

    // Procesar cada mes
    for (const mesAnio of mesesUnicos) {
      const [anio, mesNum] = mesAnio.split('-').map(Number);
      const mes = mesNum - 1; // Convertir de 1-12 a 0-11 para JavaScript
      
      console.log(`🔄 Procesando ${anio}-${mesNum} (mes JS: ${mes})`);
      
      // Filtrar registros del mes
      const entradasMes = registros.filter(r => {
        const fecha = new Date(r.timestamp.seconds * 1000);
        return r.tipoEvento === "entrada" &&
               fecha.getMonth() === mes &&
               fecha.getFullYear() === anio;
      });

      console.log(`📊 Entradas encontradas para ${anio}-${mesNum}: ${entradasMes.length}`);

      // Calcular puntajes
      const puntaje = {};
      entradasMes.forEach(r => {
        const fecha = new Date(r.timestamp.seconds * 1000);
        const hora = fecha.getHours();
        const minutos = fecha.getMinutes();
        let puntos = 0;

        if (hora === 7 && minutos <= 45) {
          puntos = 4;
        } else if (hora < 8) {
          puntos = 3;
        } else if (hora === 8 && minutos <= 5) {
          puntos = 2;
        } else if (hora === 8 && minutos <= 10) {
          puntos = 1;
        }
        
        if (puntos > 0) {
          puntaje[r.nombre] = (puntaje[r.nombre] || 0) + puntos;
        }
      });

      console.log(`🏆 Puntajes calculados para ${anio}-${mesNum}:`, Object.keys(puntaje).length, "usuarios");

      // Solo crear si hay datos
      if (Object.keys(puntaje).length > 0) {
        const rankingId = `${anio}-${String(mesNum).padStart(2, '0')}`;
        
        // Verificar si ya existe
        const rankingRef = doc(db, "rankings-mensuales", rankingId);
        const rankingDoc = await getDoc(rankingRef);
        
        if (!rankingDoc.exists()) {
          await setDoc(rankingRef, {
            mes: mes, // Mes en formato JavaScript (0-11)
            anio: anio,
            ranking: puntaje,
            fechaActualizacion: new Date(),
            top5: Object.entries(puntaje)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([nombre, puntos], index) => ({
                posicion: index + 1,
                nombre,
                puntos
              })),
            migrado: true // Marca para identificar datos migrados
          });
          
          console.log(`✅ Ranking creado para ${rankingId}`);
        } else {
          console.log(`⚠️ Ranking ya existe para ${rankingId}`);
        }
      } else {
        console.log(`ℹ️ Sin datos para ${anio}-${mesNum}`);
      }
    }
    
    console.log("🎉 Migración completada");
    mostrarNotificación("Datos históricos migrados correctamente", "success");
    
    // Recargar el ranking
    await renderRankingPuntualidad();
    
  } catch (error) {
    console.error("❌ Error en migración:", error);
    mostrarNotificación(`Error en la migración: ${error.message}`, "danger");
  }
}






// ================== GESTIÓN DE AUSENCIAS ==================

let ausenciasData = [];
let ausenciaEditandoId = null;


async function cargarUsuariosParaAusencias() {
  try {
    console.log("📄 Cargando usuarios para ausencias...");
    
    const usuariosUnicos = new Map();
    
    // ✅ BUSCAR DIRECTAMENTE EN COLECCIÓN "usuarios" 
    try {
      const usuariosQuery = query(
        collection(db, "usuarios"),
        limit(50) // Suficiente para todos los usuarios
      );
      
      const usuariosSnapshot = await getDocs(usuariosQuery);
      console.log(`📊 Documentos en colección 'usuarios': ${usuariosSnapshot.size}`);
      
      let usuariosSinDatos = [];
      
      usuariosSnapshot.forEach(doc => {
        const data = doc.data();
        
        // ✅ DEBUG: Mostrar usuarios encontrados
        console.log("👤 Usuario encontrado:", { 
          id: doc.id, 
          nombre: data.nombre, 
          correo: data.correo,
          tipo: data.tipo
        });
        
        // ✅ VERIFICAR CONDICIONES DE VALIDACIÓN
        const tieneCorreo = data.correo && data.correo.trim() !== '';
        const tieneNombre = data.nombre && data.nombre.trim() !== '';
        
        if (!tieneCorreo || !tieneNombre) {
          usuariosSinDatos.push({
            id: doc.id,
            nombre: data.nombre,
            correo: data.correo,
            problema: !tieneCorreo ? 'SIN_CORREO' : 'SIN_NOMBRE'
          });
        }
        
        // ✅ AGREGAR AL MAP SI PASA LAS VALIDACIONES (USAR TRIM SIEMPRE)
        if (tieneCorreo && tieneNombre) {
          usuariosUnicos.set(data.correo.trim(), {
            email: data.correo.trim(),
            nombre: data.nombre.trim(),
            tipo: data.tipo || 'empleado'
          });
        }
      });
      
      // ✅ MOSTRAR USUARIOS CON PROBLEMAS (VALIDACIÓN GENERAL)
      if (usuariosSinDatos.length > 0) {
        console.warn(`⚠️ ${usuariosSinDatos.length} usuarios con datos incompletos:`);
        usuariosSinDatos.forEach(u => {
          console.warn(`  - ${u.nombre || 'SIN_NOMBRE'} (${u.correo || 'SIN_CORREO'}) - ${u.problema}`);
        });
      }
      
    } catch (usuariosError) {
      console.error("❌ Error consultando colección usuarios:", usuariosError);
    }

    console.log("👥 Total usuarios únicos encontrados:", usuariosUnicos.size);

    // Verificar que el elemento select existe
    const selectUsuario = document.getElementById("ausenciaUsuario");
    if (!selectUsuario) {
      console.error("❌ No se encontró el elemento ausenciaUsuario");
      mostrarNotificacion("Error: Elemento del formulario no encontrado", "danger");
      return;
    }

    // Limpiar y llenar el select
    selectUsuario.innerHTML = '<option value="">Seleccionar usuario...</option>';
    
    if (usuariosUnicos.size === 0) {
      selectUsuario.innerHTML += '<option disabled>No hay usuarios disponibles</option>';
      mostrarNotificacion("No se encontraron usuarios en la base de datos", "warning");
      return;
    }
    
    // ✅ ORDENAR ALFABÉTICAMENTE y llenar select
    const usuariosArray = Array.from(usuariosUnicos.values()).sort((a, b) => 
      a.nombre.localeCompare(b.nombre)
    );
    
    usuariosArray.forEach(usuario => {
      const option = document.createElement("option");
      option.value = usuario.email;
      option.textContent = usuario.nombre;
      option.dataset.nombre = usuario.nombre; // Guardar nombre en dataset
      option.dataset.tipo = usuario.tipo;
      selectUsuario.appendChild(option);
    });
    
    console.log("✅ Select poblado con", usuariosArray.length, "usuarios");
    mostrarNotificacion(`${usuariosArray.length} usuarios cargados correctamente`, "success");
    
    // ✅ VERIFICACIÓN GENERAL: Alertar si el número no coincide con lo esperado
    const usuariosEsperados = 24; // Cambiar este número según tus usuarios reales
    if (usuariosArray.length !== usuariosEsperados) {
      console.warn(`⚠️ Se esperaban ${usuariosEsperados} usuarios, pero se encontraron ${usuariosArray.length}`);
    }
    
  } catch (error) {
    console.error("❌ Error general cargando usuarios:", error);
    mostrarNotificacion("Error al cargar la lista de usuarios: " + error.message, "danger");
  }
}

// ✅ FUNCIÓN CORREGIDA PARA CARGAR AUSENCIAS CON FILTRO DE MES
async function cargarAusencias() {
  try {
    console.log("📄 Cargando ausencias desde Firestore...");
    
    // ✅ OBTENER FILTRO DE MES
    const filtroMes = document.getElementById('filtroMesAusencia')?.value;
    
    let q;
    
    if (filtroMes && filtroMes !== '') {
      // ✅ FILTRAR POR MES ESPECÍFICO - MEJORADO
      const [año, mes] = filtroMes.split('-').map(Number);
      const inicioMes = new Date(año, mes - 1, 1); // mes-1 porque Date usa índice 0-11
      const finMes = new Date(año, mes, 0, 23, 59, 59); // día 0 del mes siguiente = último día del mes actual
      
      console.log(`📅 Filtrando ausencias del mes: ${filtroMes}`, { inicioMes, finMes });
      
      q = query(
        collection(db, "ausencias"),
        where("fechaInicio", ">=", inicioMes.toISOString().split('T')[0]),
        where("fechaInicio", "<=", finMes.toISOString().split('T')[0]),
        orderBy("fechaInicio", "desc"),
        limit(100)
      );
    } else {
      // ✅ CARGAR SOLO ÚLTIMOS 30 DÍAS SI NO HAY FILTRO
      const hace30Dias = new Date();
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      const fecha30Dias = hace30Dias.toISOString().split('T')[0];
      
      console.log(`📅 Cargando ausencias de los últimos 30 días desde: ${fecha30Dias}`);
      
      q = query(
        collection(db, "ausencias"),
        where("fechaInicio", ">=", fecha30Dias),
        orderBy("fechaInicio", "desc"),
        limit(100)
      );
    }
    
    const ausenciasSnapshot = await getDocs(q);
    ausenciasData = [];
    
    if (ausenciasSnapshot.empty) {
      console.warn("⚠️ No se encontraron ausencias para el período seleccionado");
      actualizarTablaAusenciasSafe();
      actualizarEstadisticasAusenciasSafe();
      return;
    }
    
    ausenciasSnapshot.forEach(doc => {
      const data = doc.data();
      
      // ✅ CONVERSIÓN MEJORADA DE FECHAS
      let fechaInicio = data.fechaInicio;
      let fechaFin = data.fechaFin;
      
      // Manejar diferentes formatos de fecha
      if (typeof fechaInicio === 'string') {
        fechaInicio = new Date(fechaInicio + 'T00:00:00');
      } else if (fechaInicio && fechaInicio.toDate) {
        fechaInicio = fechaInicio.toDate();
      } else if (fechaInicio && fechaInicio.seconds) {
        fechaInicio = new Date(fechaInicio.seconds * 1000);
      }
      
      if (fechaFin) {
        if (typeof fechaFin === 'string') {
          fechaFin = new Date(fechaFin + 'T00:00:00');
        } else if (fechaFin.toDate) {
          fechaFin = fechaFin.toDate();
        } else if (fechaFin.seconds) {
          fechaFin = new Date(fechaFin.seconds * 1000);
        }
      }
      
      ausenciasData.push({
        id: doc.id,
        emailUsuario: data.emailUsuario || '',
        nombreUsuario: data.nombreUsuario || 'Usuario desconocido',
        tipo: data.tipo || 'permiso',
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        motivo: data.motivo || '',
        estado: data.estado || 'pendiente',
        comentariosAdmin: data.comentariosAdmin || '',
        fechaCreacion: data.fechaCreacion && data.fechaCreacion.toDate ?
          data.fechaCreacion.toDate() :
          (data.fechaCreacion ? new Date(data.fechaCreacion) : new Date()),
        fechaModificacion: data.fechaModificacion ?
          (data.fechaModificacion.toDate ? data.fechaModificacion.toDate() : new Date(data.fechaModificacion))
          : null,
        correccionHora: data.correccionHora || null, // ✅ NUEVO: Incluir datos de corrección de hora
        quincena: data.quincena || null,
        diasJustificados: data.diasJustificados || 0,
        aplicadaEnNomina: data.aplicadaEnNomina || false
      });
    });
    
    const periodoTexto = filtroMes ? `del mes ${filtroMes}` : 'de los últimos 30 días';
    console.log(`✅ ${ausenciasData.length} ausencias cargadas ${periodoTexto}`);
    
    actualizarTablaAusenciasSafe();
    actualizarEstadisticasAusenciasSafe();
    
  } catch (error) {
    console.error("❌ Error cargando ausencias:", error);
    mostrarNotificacion("Error al cargar las ausencias", "danger");
    
    const tbody = document.querySelector("#tabla-ausencias tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Error al cargar ausencias. Recarga la página.
          </td>
        </tr>
      `;
    }
  }
}

// ✅ AGREGAR ESTO A admin.js
function mostrarSeccionModificada(id) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.add('d-none'));
  document.getElementById(id).classList.remove('d-none');
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  document.querySelector(`.sidebar a[href="#${id}"]`)?.classList.add('active');

  // Cargar datos específicos de cada sección
  if (id === 'justificantes') {
    inicializarSeccionAusencias();
  }

  // Actualizar el título de la página
  const tituloSeccion = document.querySelector(`.sidebar a[href="#${id}"]`).textContent.trim();
  document.title = `CH Panel Admin | ${tituloSeccion}`;
}


function inicializarSeccionAusencias() {
  console.log("🔧 Inicializando sección de ausencias...");
  
  // Establecer mes actual por defecto
  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const selectorMes = document.getElementById('filtroMesAusencia');
  if (selectorMes) {
    selectorMes.value = mesActual;
    // Agregar event listener
    selectorMes.addEventListener('change', cargarAusencias);
  }
  
  // Cargar usuarios y ausencias
  setTimeout(() => {
    if (typeof cargarUsuariosParaAusencias === 'function') {
      cargarUsuariosParaAusencias();
    }
    if (typeof cargarAusencias === 'function') {
      cargarAusencias();
    }
  }, 100);
}


// ✅ Hacer funciones disponibles globalmente
window.mostrarSeccionModificada = mostrarSeccionModificada;



async function eliminarAusenciaDirecta(id) {
  const ausencia = ausenciasData.find(a => a.id === id);
  if (!ausencia) {
    mostrarNotificacion("Ausencia no encontrada", "warning");
    return;
  }

  // Mostrar información de la ausencia antes de confirmar
  const detalleEliminacion = `
¿Estás seguro de eliminar esta ausencia?

👤 Usuario: ${ausencia.nombreUsuario}
📅 Tipo: ${formatearTipo(ausencia.tipo)}
📅 Fecha: ${ausencia.fechaInicio.toLocaleDateString("es-MX")}
📊 Estado: ${formatearEstado(ausencia.estado)}

⚠️ Esta acción no se puede deshacer.
  `;

  if (!confirm(detalleEliminacion)) return;

  try {
    // 🆕 Si tiene corrección de hora aplicada, revertirla antes de eliminar
    if (ausencia.correccionHora && ausencia.correccionHora.aplicada) {
      await revertirCorreccionHora(ausencia);
    }

    await deleteDoc(doc(db, "ausencias", id));
    mostrarNotificacion("Ausencia eliminada correctamente", "success");
    cargarAusencias(); // Recargar la tabla
  } catch (error) {
    console.error("Error eliminando ausencia:", error);
    mostrarNotificacion("Error al eliminar la ausencia", "danger");
  }
}




function actualizarEstadisticasAusenciasSafe() {
  try {
    const stats = {
      pendientes: ausenciasData.filter(a => a.estado === 'pendiente').length,
      aprobadas: ausenciasData.filter(a => a.estado === 'aprobada').length,
      rechazadas: ausenciasData.filter(a => a.estado === 'rechazada').length,
      total: ausenciasData.length
    };

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

function calcularDiasAusencia(fechaInicio, fechaFin) {
  if (!fechaFin) return 1;
  const diffTime = Math.abs(fechaFin - fechaInicio);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function getBadgeClassTipo(tipo) {
  const classes = {
    permiso: "bg-warning text-dark",
    justificante: "bg-info",
    vacaciones: "bg-success",
    incapacidad: "bg-danger",
    viaje_negocios: "bg-primary",
    retardo_justificado: "bg-secondary"
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
  return "";
}

function getIconoEstado(estado) {
  return "";
}

function formatearTipo(tipo) {
  const nombres = {
    permiso: "Permiso",
    justificante: "Justificante",
    vacaciones: "Vacaciones",
    incapacidad: "Incapacidad",
    viaje_negocios: "Viaje de Negocios",
    retardo_justificado: "Retardo Justificado"
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

// Función para calcular la quincena de una fecha
function calcularQuincenaDeAusencia(fechaString) {
  const fecha = new Date(fechaString + 'T00:00:00');
  const dia = fecha.getDate();
  const mes = fecha.getMonth() + 1; // 1-12
  const anio = fecha.getFullYear();

  // Calcular periodo (1 = días 1-15, 2 = días 16-fin)
  const periodo = dia <= 15 ? 1 : 2;

  // Calcular semana del mes (para nómina semanal)
  const primerDiaMes = new Date(anio, mes - 1, 1);
  const semana = Math.ceil((dia + primerDiaMes.getDay()) / 7);

  return {
    mes: mes,
    anio: anio,
    periodo: periodo,
    semana: semana
  };
}

// Función para calcular días justificados según tipo y rango de fechas
function calcularDiasJustificados(fechaInicio, fechaFin, tipo) {
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = fechaFin ? new Date(fechaFin + 'T00:00:00') : inicio;

  // Calcular días calendario
  const diffTime = Math.abs(fin - inicio);
  const diasCalendario = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Para retardo justificado, contar solo 0.5 días
  if (tipo === 'retardo_justificado') {
    return 0.5;
  }

  // Para otros tipos, contar solo días laborales (lunes a viernes)
  let diasLaborales = 0;
  const fechaActual = new Date(inicio);

  while (fechaActual <= fin) {
    const diaSemana = fechaActual.getDay();
    // Si es lunes (1) a viernes (5), contar
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasLaborales++;
    }
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return diasLaborales;
}

async function manejarNuevaAusencia(e) {
  e.preventDefault();

  const selectUsuario = document.getElementById("ausenciaUsuario");
  const emailUsuario = selectUsuario.value;
  const nombreUsuario = selectUsuario.selectedOptions[0]?.dataset.nombre || selectUsuario.selectedOptions[0]?.textContent.trim() || emailUsuario;

  const tipo = document.getElementById("ausenciaTipo").value;
  const fechaInicio = document.getElementById("ausenciaFechaInicio").value;
  const fechaFin = document.getElementById("ausenciaFechaFin").value || null;

  // Calcular quincena automáticamente
  const quincenaInfo = calcularQuincenaDeAusencia(fechaInicio);

  // Calcular días justificados automáticamente
  const diasJustificados = calcularDiasJustificados(fechaInicio, fechaFin, tipo);

  const formData = {
    emailUsuario: emailUsuario,
    nombreUsuario: nombreUsuario,
    tipo: tipo,
    fechaInicio: fechaInicio, // Guardar como string YYYY-MM-DD
    fechaFin: fechaFin, // Guardar como string YYYY-MM-DD o null
    motivo: document.getElementById("ausenciaMotivo").value,
    estado: document.getElementById("ausenciaEstado").value,
    comentariosAdmin: "",
    fechaCreacion: new Date(), // Timestamp de Firebase

    // NUEVO: Datos para nómina
    quincena: quincenaInfo,
    diasJustificados: diasJustificados,
    aplicadaEnNomina: false,
    nominaReferencia: null
  };

  // 🆕 NUEVO: Si es retardo justificado, incluir datos de corrección de hora
  if (tipo === 'retardo_justificado') {
    const horaCorregida = document.getElementById("ausenciaHoraCorregida").value;
    const fechaEntrada = document.getElementById("ausenciaFechaEntrada").value;
    const retardoSeleccionado = document.querySelector('input[name="retardoSeleccionado"]:checked');

    console.log("🔍 Verificando datos de retardo justificado:", {
      horaCorregida,
      fechaEntrada,
      retardoSeleccionado: retardoSeleccionado?.value
    });

    if (horaCorregida && fechaEntrada && retardoSeleccionado) {
      formData.correccionHora = {
        horaCorregida: horaCorregida,
        fechaEntrada: fechaEntrada,
        registroId: retardoSeleccionado.value, // ID del documento de Firestore
        aplicada: false
      };
      console.log("✅ correccionHora guardado:", formData.correccionHora);
    } else {
      console.warn("⚠️ Falta información para guardar corrección de hora");
    }
  }

  // Validaciones
  if (!formData.emailUsuario || !formData.tipo || !formData.fechaInicio || !formData.motivo) {
    mostrarNotificacion("Por favor completa todos los campos obligatorios", "danger");
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
    mostrarNotificacion("Error al agregar la ausencia", "danger");
  }
}


// FUNCIÓN EDITAR AUSENCIA COMPLETA (línea ~2002)
function editarAusencia(id) {
  const ausencia = ausenciasData.find(a => a.id === id);
  if (!ausencia) {
    mostrarNotificacion("Ausencia no encontrada", "warning");
    return;
  }

  ausenciaEditandoId = id;

  const fechaInicioLocal = new Date(ausencia.fechaInicio.getTime() - (ausencia.fechaInicio.getTimezoneOffset() * 60000));
  const fechaFinLocal = ausencia.fechaFin ? new Date(ausencia.fechaFin.getTime() - (ausencia.fechaFin.getTimezoneOffset() * 60000)) : null;

  document.getElementById("editarAusenciaId").value = id;
  document.getElementById("editarUsuario").value = ausencia.nombreUsuario;
  document.getElementById("editarTipo").value = ausencia.tipo;
  document.getElementById("editarFechaInicio").value = fechaInicioLocal.toISOString().split('T')[0];
  document.getElementById("editarFechaFin").value = fechaFinLocal ? fechaFinLocal.toISOString().split('T')[0] : '';
  document.getElementById("editarMotivo").value = ausencia.motivo;
  document.getElementById("editarEstado").value = ausencia.estado;
  document.getElementById("editarComentarios").value = ausencia.comentariosAdmin || '';

  // 🆕 Mostrar/ocultar y pre-llenar campos de corrección de hora
  const divHoraCorregida = document.getElementById("divHoraCorregida");
  if (ausencia.tipo === 'retardo_justificado') {
    divHoraCorregida.classList.remove("d-none");

    // Pre-llenar si existe corrección de hora
    if (ausencia.correccionHora) {
      document.getElementById("editarHoraCorregida").value = ausencia.correccionHora.horaCorregida || '';
      document.getElementById("editarFechaEntrada").value = ausencia.correccionHora.fechaEntrada || '';
    } else {
      document.getElementById("editarHoraCorregida").value = '';
      document.getElementById("editarFechaEntrada").value = '';
    }
  } else {
    divHoraCorregida.classList.add("d-none");
    document.getElementById("editarHoraCorregida").value = '';
    document.getElementById("editarFechaEntrada").value = '';
  }

  new bootstrap.Modal(document.getElementById("modalEditarAusencia")).show();
}

// FUNCIÓN MANEJAR EDITAR AUSENCIA COMPLETA
async function manejarEditarAusencia(e) {
  e.preventDefault();

  if (!ausenciaEditandoId) {
    mostrarNotificacion("No hay ausencia seleccionada para editar", "warning");
    return;
  }

  const tipo = document.getElementById("editarTipo").value;

  const datosActualizados = {
    tipo: tipo,
    fechaInicio: document.getElementById("editarFechaInicio").value,
    fechaFin: document.getElementById("editarFechaFin").value || null,
    motivo: document.getElementById("editarMotivo").value,
    estado: document.getElementById("editarEstado").value,
    comentariosAdmin: document.getElementById("editarComentarios").value,
    fechaModificacion: new Date()
  };

  // 🆕 NUEVO: Si es retardo justificado, incluir/actualizar datos de corrección de hora
  if (tipo === 'retardo_justificado') {
    const horaCorregida = document.getElementById("editarHoraCorregida").value;
    const fechaEntrada = document.getElementById("editarFechaEntrada").value;

    if (horaCorregida && fechaEntrada) {
      datosActualizados.correccionHora = {
        horaCorregida: horaCorregida,
        fechaEntrada: fechaEntrada,
        aplicada: false
      };
    }
  } else {
    // Si cambió de tipo y ya NO es retardo justificado, eliminar corrección de hora
    datosActualizados.correccionHora = null;
  }

  if (!datosActualizados.tipo || !datosActualizados.fechaInicio || !datosActualizados.motivo) {
    mostrarNotificacion("Por favor completa todos los campos obligatorios", "warning");
    return;
  }

  try {
    await updateDoc(doc(db, "ausencias", ausenciaEditandoId), datosActualizados);
    mostrarNotificacion("Ausencia actualizada correctamente", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalEditarAusencia")).hide();
    ausenciaEditandoId = null;
    cargarAusencias();
  } catch (error) {
    console.error("Error actualizando ausencia:", error);
    mostrarNotificacion("Error al actualizar la ausencia", "danger");
  }
}

// FUNCIÓN ELIMINAR AUSENCIA COMPLETA
async function eliminarAusencia() {
  if (!ausenciaEditandoId) {
    mostrarNotificacion("No hay ausencia seleccionada para eliminar", "warning");
    return;
  }
  
  const ausencia = ausenciasData.find(a => a.id === ausenciaEditandoId);
  if (!ausencia) {
    mostrarNotificacion("Ausencia no encontrada", "warning");
    return;
  }

  const confirmar = confirm(`¿Estás seguro de eliminar esta ausencia de ${ausencia.nombreUsuario}?\n\nEsta acción no se puede deshacer.`);
  if (!confirmar) return;

  try {
    // 🆕 Si tiene corrección de hora aplicada, revertirla antes de eliminar
    if (ausencia.correccionHora && ausencia.correccionHora.aplicada) {
      await revertirCorreccionHora(ausencia);
    }

    await deleteDoc(doc(db, "ausencias", ausenciaEditandoId));
    mostrarNotificacion("Ausencia eliminada correctamente", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalEditarAusencia")).hide();
    ausenciaEditandoId = null;
    cargarAusencias();
  } catch (error) {
    console.error("Error eliminando ausencia:", error);
    mostrarNotificacion("Error al eliminar la ausencia", "danger");
  }
}

async function aprobarAusencia(id) {
  if (!confirm("¿Estás seguro de aprobar esta ausencia?")) return;

  try {
    // Obtener datos de la ausencia
    const ausencia = ausenciasData.find(a => a.id === id);
    if (!ausencia) {
      mostrarNotificacion("Ausencia no encontrada", "danger");
      return;
    }

    // Actualizar estado de ausencia
    await updateDoc(doc(db, "ausencias", id), {
      estado: "aprobada",
      fechaAprobacion: new Date(),
      comentariosAdmin: "Aprobada por administrador"
    });

    // 🆕 Si tiene corrección de hora, modificar el registro de asistencia
    if (ausencia.correccionHora && !ausencia.correccionHora.aplicada) {
      console.log("📋 Ausencia tiene corrección de hora, aplicando...", ausencia.correccionHora);
      await aplicarCorreccionHora(ausencia);
    } else if (!ausencia.correccionHora) {
      console.log("⚠️ Ausencia NO tiene corrección de hora");
    } else if (ausencia.correccionHora.aplicada) {
      console.log("ℹ️ Corrección de hora ya fue aplicada anteriormente");
    }

    mostrarNotificacion("Ausencia aprobada" + (ausencia.correccionHora ? " y hora corregida" : ""), "success");
    cargarAusencias();
  } catch (error) {
    console.error("Error aprobando ausencia:", error);
    mostrarNotificacion("Error al aprobar la ausencia", "danger");
  }
}

// 🆕 Función para aplicar corrección de hora en registro de asistencia
async function aplicarCorreccionHora(ausencia) {
  try {
    const { horaCorregida, fechaEntrada, registroId } = ausencia.correccionHora;

    console.log(`🔧 Aplicando corrección de hora para ${ausencia.emailUsuario} en fecha ${fechaEntrada}`);

    // Si tenemos el ID del registro, usarlo directamente
    if (registroId) {
      // Obtener el registro actual para guardar la hora original
      const registroRef = doc(db, "registros", registroId);
      const registroSnap = await getDoc(registroRef);

      if (!registroSnap.exists()) {
        console.warn(`⚠️ No se encontró el registro con ID ${registroId}`);
        return;
      }

      const horaOriginal = registroSnap.data().hora;

      // Actualizar el registro directamente
      await updateDoc(registroRef, {
        hora: horaCorregida,
        estado: "puntual",
        corregidoPorAusencia: true,
        ausenciaRef: ausencia.id,
        fechaCorreccion: new Date(),
        horaOriginal: horaOriginal // Guardar hora original
      });

      console.log(`✅ Hora corregida: ${horaOriginal} → ${horaCorregida}`);

      // Verificar que se guardó correctamente
      const verificacion = await getDoc(registroRef);
      console.log(`🔍 Verificación del registro actualizado:`, verificacion.data());
    } else {
      // Fallback: Buscar por fecha (método antiguo)
      const registrosQuery = query(
        collection(db, "registros"),
        where("email", "==", ausencia.emailUsuario),
        where("fecha", "==", fechaEntrada),
        where("tipoEvento", "==", "entrada")
      );

      const registrosSnapshot = await getDocs(registrosQuery);

      if (registrosSnapshot.empty) {
        console.warn(`⚠️ No se encontró registro de entrada para ${ausencia.emailUsuario} en ${fechaEntrada}`);
        return;
      }

      const registroDoc = registrosSnapshot.docs[0];
      await updateDoc(doc(db, "registros", registroDoc.id), {
        hora: horaCorregida,
        estado: "puntual",
        corregidoPorAusencia: true,
        ausenciaRef: ausencia.id,
        fechaCorreccion: new Date(),
        horaOriginal: registroDoc.data().hora
      });

      console.log(`✅ Hora corregida: ${registroDoc.data().hora} → ${horaCorregida}`);
    }

    // Marcar corrección como aplicada
    await updateDoc(doc(db, "ausencias", ausencia.id), {
      "correccionHora.aplicada": true,
      "correccionHora.fechaAplicacion": new Date()
    });

  } catch (error) {
    console.error("❌ Error aplicando corrección de hora:", error);
    throw error;
  }
}

// 🆕 Función para revertir corrección de hora cuando se elimina una ausencia
async function revertirCorreccionHora(ausencia) {
  try {
    const { registroId } = ausencia.correccionHora;

    console.log(`🔄 Revirtiendo corrección de hora para ${ausencia.emailUsuario}`);

    if (registroId) {
      // Obtener el registro
      const registroRef = doc(db, "registros", registroId);
      const registroSnap = await getDoc(registroRef);

      if (!registroSnap.exists()) {
        console.warn(`⚠️ No se encontró el registro con ID ${registroId}`);
        return;
      }

      const datosRegistro = registroSnap.data();

      // Restaurar la hora original y el estado de retardo
      const actualizacion = {
        corregidoPorAusencia: false,
        ausenciaRef: null,
        fechaCorreccion: null
      };

      // Si tiene hora original guardada, restaurarla
      if (datosRegistro.horaOriginal) {
        actualizacion.hora = datosRegistro.horaOriginal;
        actualizacion.estado = "retardo"; // Volver a marcar como retardo
        actualizacion.horaOriginal = null;
      }

      await updateDoc(registroRef, actualizacion);

      console.log(`✅ Corrección revertida para registro ${registroId}`);
    }

  } catch (error) {
    console.error("❌ Error revirtiendo corrección de hora:", error);
    throw error;
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
    mostrarNotificacion("Error al rechazar la ausencia", "danger");
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

/**
 * Muestra los detalles completos de una ausencia
 */
function verDetalleAusencia(id) {
  const ausencia = ausenciasData.find(a => a.id === id);
  if (!ausencia) return;
  
  const fechaInicioStr = ausencia.fechaInicio.toLocaleDateString("es-MX", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const fechaFinStr = ausencia.fechaFin ? ausencia.fechaFin.toLocaleDateString("es-MX", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : "No especificada";
  
  const diasAusencia = calcularDiasAusencia(ausencia.fechaInicio, ausencia.fechaFin);

  // Limpiar el correo del nombre si existe
  const nombreLimpio = ausencia.nombreUsuario.replace(/\s*\([^)]*\)\s*$/, '').trim();

  const detalles = `
📋 DETALLE DE AUSENCIA

👤 Usuario: ${nombreLimpio}

📅 Tipo: ${formatearTipo(ausencia.tipo)} 
📅 Fecha inicio: ${fechaInicioStr}
📅 Fecha fin: ${fechaFinStr}
⏱️ Duración: ${diasAusencia} día${diasAusencia !== 1 ? 's' : ''}

📝 Motivo:
${ausencia.motivo}

📊 Estado: ${formatearEstado(ausencia.estado)} 

${ausencia.comentariosAdmin ? `💬 Comentarios del admin:\n${ausencia.comentariosAdmin}` : ''}

🗓️ Solicitado: ${ausencia.fechaCreacion.toLocaleString("es-MX")}
  `;
  
  alert(detalles);
}

// Reemplazar las últimas líneas con:
window.cargarUsuariosParaAusencias = cargarUsuariosParaAusencias;
window.editarAusencia = editarAusencia;     
window.aprobarAusencia = aprobarAusencia;   
window.rechazarAusencia = rechazarAusencia;
window.eliminarAusencia = eliminarAusencia;
window.eliminarAusenciaDirecta = eliminarAusenciaDirecta;
window.verDetalleAusencia = verDetalleAusencia;

// También agregar esta función para los filtros:
function actualizarTablaAusencias() {
  actualizarTablaAusenciasSafe();
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
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-inbox me-2"></i>
            No hay ausencias registradas
          </td>
        </tr>
      `;
      return;
    }

    // Obtener filtros (quitar filtroFechaAusencia)
    const filtroEstado = document.getElementById("filtroEstadoAusencia")?.value || "";
    const filtroTipo = document.getElementById("filtroTipoAusencia")?.value || "";
    const filtroBusqueda = document.getElementById("filtroBusquedaAusencia")?.value.toLowerCase() || "";

    // Aplicar filtros (quitar fechaMatch)
    const ausenciasFiltradas = ausenciasData.filter(ausencia => {
      const estadoMatch = !filtroEstado || ausencia.estado === filtroEstado;
      const tipoMatch = !filtroTipo || ausencia.tipo === filtroTipo;
      
      const busquedaMatch = !filtroBusqueda || 
        ausencia.nombreUsuario.toLowerCase().includes(filtroBusqueda) ||
        ausencia.emailUsuario.toLowerCase().includes(filtroBusqueda) ||
        ausencia.motivo.toLowerCase().includes(filtroBusqueda);

      return estadoMatch && tipoMatch && busquedaMatch;
    });


    if (ausenciasFiltradas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-search me-2"></i>
            No se encontraron ausencias con los filtros aplicados
          </td>
        </tr>
      `;
      return;
    }

    // Renderizar ausencias filtradas
    ausenciasFiltradas.forEach(ausencia => {
      const tr = document.createElement("tr");
      const diasAusencia = calcularDiasAusencia(ausencia.fechaInicio, ausencia.fechaFin);
      
      const fechaInicioStr = ausencia.fechaInicio.toLocaleDateString("es-MX", {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const fechaFinStr = ausencia.fechaFin ? ausencia.fechaFin.toLocaleDateString("es-MX", {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }) : "";
      const rangoFecha = fechaFinStr ? `${fechaInicioStr} - ${fechaFinStr}` : fechaInicioStr;

      // Limpiar el correo del nombre si existe (formato "Nombre (correo)")
      const nombreLimpio = ausencia.nombreUsuario.replace(/\s*\([^)]*\)\s*$/, '').trim();

      tr.innerHTML = `
        <td><div class="fw-bold">${nombreLimpio}</div></td>
        <td><span class="badge ${getBadgeClassTipo(ausencia.tipo)}">${formatearTipo(ausencia.tipo)}</span></td>
        <td>${rangoFecha}</td>
        <td><span class="badge bg-light text-dark">${diasAusencia} día${diasAusencia !== 1 ? 's' : ''}</span></td>
        <td><span class="badge ${getBadgeClassEstado(ausencia.estado)}">${formatearEstado(ausencia.estado)}</span></td>
        <td>
          <small class="text-muted">
            ${ausencia.fechaCreacion.toLocaleDateString("es-MX")}<br>
            ${ausencia.fechaCreacion.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}
          </small>
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-info" onclick="verDetalleAusencia('${ausencia.id}')" title="Ver detalle">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-primary" onclick="editarAusencia('${ausencia.id}')" title="Editar">
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
            <button class="btn btn-outline-dark" onclick="eliminarAusenciaDirecta('${ausencia.id}')" 
                    title="Eliminar permanentemente">
              <i class="bi bi-trash text-white"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    console.log(`✅ Tabla actualizada con ${ausenciasFiltradas.length} ausencias`);
    
  } catch (error) {
    console.error("Error actualizando tabla de ausencias:", error);
  }
}

// ...existing code...

// Función para mostrar secciones (faltaba esta función)
window.mostrarSeccion = function(id) {
  // Ocultar todas las secciones
  document.querySelectorAll('.seccion').forEach(s => s.classList.add('d-none'));
  
  // Mostrar la sección seleccionada
  document.getElementById(id).classList.remove('d-none');
  
  // Actualizar estado activo en el sidebar
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  document.querySelector(`.sidebar a[href="#${id}"]`)?.classList.add('active');

  // Actualizar el título de la página
  const tituloSeccion = document.querySelector(`.sidebar a[href="#${id}"]`).textContent.trim();
  document.title = `CH Panel Admin | ${tituloSeccion}`;

  // Acciones específicas por sección
  if (id === 'seguridad') {
    cargarAccesosSospechosos();
  } else if (id === 'analisis') {
    renderRankingPuntualidad();
  }
};


async function obtenerNombreRealUsuario(email) {
  try {
    // Buscar en la colección "usuarios" por email
    const usuariosQuery = query(
      collection(db, "usuarios"), 
      where("email", "==", email)
    );
    
    const querySnapshot = await getDocs(usuariosQuery);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return `<strong>${userData.nombre}</strong><br><small class="text-muted">${email}</small>`;
    } else {
      // Si no existe en usuarios, buscar en registros
      const registrosQuery = query(
        collection(db, "registros"),
        where("email", "==", email)
      );
      
      const registrosSnapshot = await getDocs(registrosQuery);
      
      if (!registrosSnapshot.empty) {
        const registroData = registrosSnapshot.docs[0].data();
        return `<strong>${registroData.nombre}</strong><br><small class="text-muted">${email}</small>`;
      }
    }
    
    // Si no se encuentra en ninguna colección
    return `<strong>Usuario no encontrado</strong><br><small class="text-muted">${email}</small>`;
    
  } catch (error) {
    console.error("Error obteniendo nombre real:", error);
    return `<strong>Error al cargar</strong><br><small class="text-muted">${email}</small>`;
  }
}

async function cargarAccesosSospechosos() {
  try {
    const hace24h = new Date();
    hace24h.setHours(hace24h.getHours() - 24);
    
    const q = query(
      collection(db, "accesos_sospechosos"),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const tbody = document.getElementById("tabla-accesos-sospechosos");
    
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (querySnapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-success">
            <i class="bi bi-shield-check"></i> No hay accesos sospechosos registrados
          </td>
        </tr>
      `;
      return;
    }
    
    // Contadores para métricas
    let accesos24h = 0, accesos1h = 0, recargas = 0, directos = 0;
    const ahora = new Date();
    const hace1h = new Date(ahora.getTime() - 60 * 60 * 1000);
    
    // CAMBIO AQUÍ: usar for...of en lugar de forEach para manejar async/await
    for (const docSnapshot of querySnapshot.docs) {
      const acceso = docSnapshot.data();
      const fecha = acceso.timestamp.toDate();
      
      // Contar métricas
      if (fecha >= hace24h) {
        accesos24h++;
        if (fecha >= hace1h) accesos1h++;
        if (acceso.tipo === 'recarga_pagina') recargas++;
        if (acceso.tipo === 'acceso_directo') directos++;
      }
      
      // Mostrar solo los últimos 20
      if (tbody.children.length >= 20) continue;
      
      const row = document.createElement("tr");
      row.className = acceso.tipo === 'recarga_pagina' ? 'table-warning' : 
                     acceso.tipo === 'acceso_directo' ? 'table-danger' : '';
      
      // CAMBIO AQUÍ: await funciona correctamente con for...of
      const nombreUsuario = acceso.usuario ? 
        await obtenerNombreRealUsuario(acceso.usuario.email) : 
        '<span class="text-muted">No autenticado</span>';

      row.innerHTML = `
        <td>
          <small>
            ${fecha.toLocaleDateString("es-MX")}<br>
            ${fecha.toLocaleTimeString("es-MX")}
          </small>
        </td>
        <td>
          ${nombreUsuario}
        </td>
        <td>
          <span class="badge ${acceso.tipo === 'recarga_pagina' ? 'bg-warning text-dark' : 'bg-danger'}">
            ${acceso.tipo === 'recarga_pagina' ? 'Recarga' : 
              acceso.tipo === 'acceso_directo' ? 'Acceso Directo' : acceso.tipo}
          </span>
          ${acceso.tieneQR ? '<br><small class="text-info">Con QR</small>' : '<br><small class="text-warning">Sin QR</small>'}
        </td>
        <td>
          <small class="font-monospace">
            ${acceso.url.length > 30 ? acceso.url.substring(0, 30) + '...' : acceso.url}
          </small>
        </td>
        <td>
          <small class="font-monospace">${acceso.ip || 'N/A'}</small>
        </td>
        <td>
          <small class="text-muted">
            ${acceso.userAgent.includes('Chrome') ? 'Chrome' : 
              acceso.userAgent.includes('Firefox') ? 'Firefox' : 'Otro'}
          </small>
        </td>
      `;
      
      tbody.appendChild(row);
    }
    
    // Actualizar métricas
    document.getElementById("accesos-24h").textContent = accesos24h;
    document.getElementById("accesos-1h").textContent = accesos1h;
    document.getElementById("total-recargas").textContent = recargas;
    document.getElementById("total-directos").textContent = directos;
    
    console.log(`📊 Cargados ${querySnapshot.size} accesos sospechosos`);
    
  } catch (error) {
    console.error("Error cargando accesos sospechosos:", error);
    mostrarNotificacion("Error al cargar accesos sospechosos", "danger");
  }
}

// Función global
window.cargarAccesosSospechosos = cargarAccesosSospechosos;


// Cargar automáticamente al inicio

window.actualizarTablaAusencias = actualizarTablaAusencias;

// =================== EVENT LISTENERS PARA AUSENCIAS ===================
document.addEventListener('DOMContentLoaded', function() {
  // Función para cargar retardos del empleado seleccionado
  async function cargarRetardosEmpleado() {
    const usuarioSelect = document.getElementById("ausenciaUsuario");
    const listaRetardos = document.getElementById("listaRetardosEmpleado");

    if (!usuarioSelect || !listaRetardos) return;

    const emailSeleccionado = usuarioSelect.value;

    if (!emailSeleccionado) {
      listaRetardos.innerHTML = `
        <div class="text-muted text-center py-3" style="font-size: 13px;">
          <i class="bi bi-clock"></i> Selecciona un empleado primero
        </div>
      `;
      return;
    }

    listaRetardos.innerHTML = `
      <div class="text-center py-3" style="font-size: 13px;">
        <div class="spinner-border spinner-border-sm" role="status"></div>
        <span class="ms-2">Cargando retardos...</span>
      </div>
    `;

    try {
      // Calcular rango de la quincena actual
      const hoy = new Date();
      const diaActual = hoy.getDate();
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();

      let inicioQuincena, finQuincena;

      if (diaActual <= 15) {
        // Primera quincena (1-15)
        inicioQuincena = new Date(anioActual, mesActual, 1, 0, 0, 0);
        finQuincena = new Date(anioActual, mesActual, 15, 23, 59, 59);
      } else {
        // Segunda quincena (16-fin de mes)
        inicioQuincena = new Date(anioActual, mesActual, 16, 0, 0, 0);
        finQuincena = new Date(anioActual, mesActual + 1, 0, 23, 59, 59); // Último día del mes
      }

      const q = query(
        collection(db, "registros"),
        where("email", "==", emailSeleccionado),
        where("tipoEvento", "==", "entrada"),
        where("timestamp", ">=", inicioQuincena),
        where("timestamp", "<=", finQuincena),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(q);
      const retardos = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.estado === "retardo" && !data.corregidoPorAusencia) {
          retardos.push({
            id: doc.id,
            fecha: formatearFecha(data.timestamp),
            hora: formatearHora(data.timestamp),
            timestamp: data.timestamp
          });
        }
      });

      if (retardos.length === 0) {
        listaRetardos.innerHTML = `
          <div class="text-success text-center py-3" style="font-size: 13px;">
            <i class="bi bi-check-circle"></i> Sin retardos en esta quincena
          </div>
        `;
        return;
      }

      // Mostrar lista de retardos como lista compacta y legible
      listaRetardos.innerHTML = retardos.map(retardo => `
        <div style="display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #dee2e6; cursor: pointer; background: #fff;"
             onmouseover="this.style.backgroundColor='#f8f9fa'"
             onmouseout="this.style.backgroundColor='#fff'"
             onclick="document.getElementById('retardo_${retardo.id}').click();">
          <input type="radio"
                 name="retardoSeleccionado"
                 id="retardo_${retardo.id}"
                 value="${retardo.id}"
                 data-fecha="${retardo.fecha}"
                 data-hora="${retardo.hora}"
                 onchange="seleccionarRetardo('${retardo.fecha}', '${retardo.hora}')"
                 style="width: 16px !important; height: 16px !important; min-width: 16px !important; min-height: 16px !important; margin: 0 8px 0 0 !important; flex-shrink: 0;">
          <span style="flex: 1; font-size: 13px; color: #333;">${retardo.fecha}</span>
          <span style="background: #ffc107; color: #000; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 500;">${retardo.hora}</span>
        </div>
      `).join('');

    } catch (error) {
      console.error("Error cargando retardos:", error);
      listaRetardos.innerHTML = `
        <div class="text-danger text-center py-3" style="font-size: 13px;">
          <i class="bi bi-exclamation-triangle"></i> Error al cargar retardos
        </div>
      `;
    }
  }

  // Función global para seleccionar un retardo
  window.seleccionarRetardo = function(fecha, hora) {
    const inputFecha = document.getElementById("ausenciaFechaEntrada");
    const inputHora = document.getElementById("ausenciaHoraCorregida");

    if (inputFecha) inputFecha.value = fecha;
    if (inputHora && inputHora.value === "08:00") {
      // Sugerir una hora antes del límite
      inputHora.value = "08:05";
    }
  };

  // Formulario nueva ausencia
  const formNuevaAusencia = document.getElementById("formNuevaAusencia");
  if (formNuevaAusencia) {
    formNuevaAusencia.addEventListener("submit", manejarNuevaAusencia);
  }

  // Formulario editar ausencia
  const formEditarAusencia = document.getElementById("formEditarAusencia");
  if (formEditarAusencia) {
    formEditarAusencia.addEventListener("submit", manejarEditarAusencia);
  }

  // Mostrar/ocultar campo de hora corregida en modal nueva ausencia
  const ausenciaTipo = document.getElementById("ausenciaTipo");
  if (ausenciaTipo) {
    ausenciaTipo.addEventListener("change", function() {
      const divHoraCorregida = document.getElementById("divHoraCorregidaNueva");
      if (this.value === "retardo_justificado") {
        divHoraCorregida.classList.remove("d-none");
        cargarRetardosEmpleado(); // Cargar retardos cuando se selecciona este tipo
      } else {
        divHoraCorregida.classList.add("d-none");
      }
    });
  }

  // Listener para cuando cambie el empleado seleccionado
  const ausenciaUsuario = document.getElementById("ausenciaUsuario");
  if (ausenciaUsuario) {
    ausenciaUsuario.addEventListener("change", function() {
      const tipoSeleccionado = document.getElementById("ausenciaTipo")?.value;
      if (tipoSeleccionado === "retardo_justificado") {
        cargarRetardosEmpleado();
      }
    });
  }

  // Mostrar/ocultar campo de hora corregida en modal editar ausencia
  const editarTipo = document.getElementById("editarTipo");
  if (editarTipo) {
    editarTipo.addEventListener("change", function() {
      const divHoraCorregida = document.getElementById("divHoraCorregida");
      if (this.value === "retardo_justificado") {
        divHoraCorregida.classList.remove("d-none");
      } else {
        divHoraCorregida.classList.add("d-none");
      }
    });
  }

  // Filtros de ausencias
  const filtros = [
    { id: "filtroEstadoAusencia", event: "change" },
    { id: "filtroTipoAusencia", event: "change" },
    { id: "filtroFechaAusencia", event: "change" },
    { id: "filtroBusquedaAusencia", event: "input" }
  ];

  filtros.forEach(filtro => {
    const elemento = document.getElementById(filtro.id);
    if (elemento) {
      elemento.addEventListener(filtro.event, actualizarTablaAusenciasSafe);
    }
  });
});

// =================== GENERACIÓN DE REPORTE PDF DE AUSENCIAS ===================

async function generarReporteAusenciasPDF() {
  try {
    const { jsPDF } = window.jspdf;

    if (!jsPDF) {
      mostrarNotificacion("Error: jsPDF no está cargado", "danger");
      return;
    }

    mostrarNotificacion("Generando reporte PDF...", "info");

    // Obtener filtro de mes actual
    const filtroMes = document.getElementById("filtroMesAusencias")?.value || "";

    // Usar ausenciasData actual (ya filtrado por el mes seleccionado)
    const ausencias = [...ausenciasData];

    if (ausencias.length === 0) {
      mostrarNotificacion("No hay ausencias para generar el reporte", "warning");
      return;
    }

    // Crear documento PDF
    const doc = new jsPDF();

    // ===== ENCABEZADO =====
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Ausencias y Permisos", 105, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const fechaGeneracion = new Date().toLocaleString('es-MX');
    doc.text(`Generado: ${fechaGeneracion}`, 105, 22, { align: "center" });

    // Filtro aplicado
    if (filtroMes) {
      const [anio, mes] = filtroMes.split('-');
      const nombreMes = new Date(anio, mes - 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      doc.text(`Período: ${nombreMes}`, 105, 28, { align: "center" });
    } else {
      doc.text("Período: Últimos 30 días", 105, 28, { align: "center" });
    }

    // ===== RESUMEN ESTADÍSTICO =====
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen", 14, 38);

    const pendientes = ausencias.filter(a => a.estado === 'pendiente').length;
    const aprobadas = ausencias.filter(a => a.estado === 'aprobada').length;
    const rechazadas = ausencias.filter(a => a.estado === 'rechazada').length;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${ausencias.length} ausencias`, 14, 44);
    doc.text(`Aprobadas: ${aprobadas}`, 14, 49);
    doc.text(`Pendientes: ${pendientes}`, 60, 49);
    doc.text(`Rechazadas: ${rechazadas}`, 106, 49);

    // ===== TABLA DE AUSENCIAS =====
    const tableData = ausencias.map(ausencia => {
      const fechaInicio = ausencia.fechaInicio instanceof Date
        ? ausencia.fechaInicio.toLocaleDateString('es-MX')
        : new Date(ausencia.fechaInicio).toLocaleDateString('es-MX');

      const fechaFin = ausencia.fechaFin
        ? (ausencia.fechaFin instanceof Date
          ? ausencia.fechaFin.toLocaleDateString('es-MX')
          : new Date(ausencia.fechaFin).toLocaleDateString('es-MX'))
        : '-';

      return [
        ausencia.nombreUsuario,
        formatearTipo(ausencia.tipo),
        fechaInicio,
        fechaFin,
        ausencia.diasJustificados || '-',
        formatearEstado(ausencia.estado),
        ausencia.motivo.substring(0, 30) + (ausencia.motivo.length > 30 ? '...' : '')
      ];
    });

    doc.autoTable({
      head: [['Empleado', 'Tipo', 'Inicio', 'Fin', 'Días', 'Estado', 'Motivo']],
      body: tableData,
      startY: 55,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 30 },  // Empleado
        1: { cellWidth: 25 },  // Tipo
        2: { cellWidth: 20 },  // Inicio
        3: { cellWidth: 20 },  // Fin
        4: { cellWidth: 12 },  // Días
        5: { cellWidth: 20 },  // Estado
        6: { cellWidth: 'auto' }  // Motivo
      },
      didParseCell: function(data) {
        // Colorear filas según estado
        if (data.section === 'body') {
          const estado = data.row.raw[5]; // índice del estado
          if (estado === 'Aprobada') {
            data.cell.styles.fillColor = [230, 255, 230];
          } else if (estado === 'Rechazada') {
            data.cell.styles.fillColor = [255, 230, 230];
          } else if (estado === 'Pendiente') {
            data.cell.styles.fillColor = [255, 250, 230];
          }
        }
      }
    });

    // ===== RESUMEN POR TIPO =====
    const finalY = doc.lastAutoTable.finalY + 10;

    if (finalY < 250) { // Si hay espacio en la página
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Resumen por Tipo de Ausencia", 14, finalY);

      const resumenPorTipo = {};
      ausencias.forEach(a => {
        if (!resumenPorTipo[a.tipo]) {
          resumenPorTipo[a.tipo] = { total: 0, dias: 0 };
        }
        resumenPorTipo[a.tipo].total++;
        resumenPorTipo[a.tipo].dias += a.diasJustificados || 0;
      });

      let yPos = finalY + 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      Object.keys(resumenPorTipo).forEach(tipo => {
        const data = resumenPorTipo[tipo];
        doc.text(`• ${formatearTipo(tipo)}: ${data.total} ausencias (${data.dias} días)`, 14, yPos);
        yPos += 5;
      });
    }

    // ===== PIE DE PÁGINA =====
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Página ${i} de ${pageCount} - Cielito Home - Sistema de Gestión de Ausencias`,
        105,
        285,
        { align: "center" }
      );
    }

    // ===== GUARDAR PDF =====
    const nombreArchivo = filtroMes
      ? `Reporte_Ausencias_${filtroMes}.pdf`
      : `Reporte_Ausencias_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(nombreArchivo);

    mostrarNotificacion(`✅ Reporte PDF generado: ${nombreArchivo}`, "success");

  } catch (error) {
    console.error("Error generando PDF:", error);
    mostrarNotificacion("Error al generar el reporte PDF", "danger");
  }
}

window.generarReporteAusenciasPDF = generarReporteAusenciasPDF;