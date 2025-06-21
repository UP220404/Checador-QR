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
const busquedaFiltro = document.getElementById("filtroBusqueda");
const eventoFiltro = document.getElementById("filtroEvento");

let registros = [];
let graficaSemanal, graficaTipo, graficaHorarios, graficaMensual, graficaUsuarios;

// Formateadores de fecha corregidos para zona horaria
function formatearFecha(timestamp) {
  const fecha = new Date(timestamp.seconds * 1000);
  // Ajustar a zona horaria local
  const offset = fecha.getTimezoneOffset() * 60000;
  const fechaLocal = new Date(fecha.getTime() - offset);
  return fechaLocal.toISOString().split('T')[0];
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

  // Ordenar por fecha más reciente primero
  filtrados.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

  if (filtrados.length === 0) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td colspan="7" class="text-center py-4 text-muted">
        <i class="bi bi-exclamation-circle me-2"></i>No se encontraron registros
      </td>
    `;
    tabla.appendChild(fila);
    return;
  }

  filtrados.forEach(r => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${r.nombre}</td>
      <td>${r.email}</td>
      <td><span class="badge ${r.tipo === 'becario' ? 'bg-info' : 'bg-primary'}">${r.tipo}</span></td>
      <td>${formatearFecha(r.timestamp)}</td>
      <td>${formatearHora(r.timestamp)}</td>
      <td>
        <span class="badge ${r.tipoEvento === 'entrada' ? 'bg-success' : 'bg-warning text-dark'}">
          ${r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'}
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
    
  } catch (error) {
    console.error("Error al cargar registros:", error);
    mostrarNotificacion("Error al cargar los registros", "danger");
  }
}

// Calcular KPIs y comparaciones
async function calcularKPIs() {
  const hoy = new Date();
  const hoyStr = formatearFecha({ seconds: Math.floor(hoy.getTime() / 1000) });
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const ayerStr = formatearFecha({ seconds: Math.floor(ayer.getTime() / 1000) });
  
  // Entradas hoy
  const entradasHoy = registros.filter(r => 
    formatearFecha(r.timestamp) === hoyStr && r.tipoEvento !== "entrada"
  ).length;
  
  // Salidas hoy
  const salidasHoy = registros.filter(r => 
    formatearFecha(r.timestamp) === hoyStr && r.tipoEvento === "salida"
  ).length;
  
  // Entradas ayer
  const entradasAyer = registros.filter(r => 
    formatearFecha(r.timestamp) === ayerStr && r.tipoEvento !== "entrada"
  ).length;
  
  // Salidas ayer
  const salidasAyer = registros.filter(r => 
    formatearFecha(r.timestamp) === ayerStr && r.tipoEvento === "salida"
  ).length;
  
  // Usuarios únicos (últimos 7 días)
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
  
  // Color según modo oscuro
  const isDarkMode = document.body.classList.contains('dark-mode');
  const textColor = isDarkMode ? '#e0e0e0' : '#666';
  
  // Implementación básica - puedes mejorarla con datos reales
  graficaMensual = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      datasets: [{
        label: "Accesos",
        data: [120, 190, 170, 210, 230, 180],
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
  
  // Color según modo oscuro
  const isDarkMode = document.body.classList.contains('dark-mode');
  const textColor = isDarkMode ? '#e0e0e0' : '#666';
  
  // Implementación básica - puedes mejorarla con datos reales
  graficaUsuarios = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Usuario 1", "Usuario 2", "Usuario 3", "Usuario 4", "Usuario 5"],
      datasets: [{
        label: "Accesos",
        data: [45, 32, 28, 25, 22],
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

// Generar reporte PDF (simulado)
window.generarReportePDF = async () => {
  mostrarNotificacion("Generando reporte PDF...", "info");
  
  // Simulamos un retraso de generación
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Crear contenido del PDF (en una implementación real usarías una librería como jsPDF)
  const blob = new Blob(["Contenido del reporte PDF"], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte_diario_${new Date().toISOString().slice(0,10)}.pdf`;
  link.click();
  
  mostrarNotificacion("Reporte PDF generado con éxito", "success");
};

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
  const filas = ["Nombre,Email,Tipo,Fecha,Hora,Evento"];
  registrosSemana.forEach(r => {
    filas.push(`"${r.nombre}","${r.email}","${r.tipo}","${formatearFecha(r.timestamp)}","${formatearHora(r.timestamp)}","${r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'}"`);
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
  
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  fin.setHours(23, 59, 59);
  
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
    // Simulamos PDF
    blob = new Blob(["Reporte personalizado PDF"], { type: 'application/pdf' });
    extension = 'pdf';
  } else if (formato === 'excel') {
    // Creamos CSV (simulando Excel)
    const filas = ["Nombre,Email,Tipo,Fecha,Hora,Evento"];
    registrosFiltrados.forEach(r => {
      filas.push(`"${r.nombre}","${r.email}","${r.tipo}","${formatearFecha(r.timestamp)}","${formatearHora(r.timestamp)}","${r.tipoEvento === 'entrada' ? 'Entrada' : 'Salida'}"`);
    });
    blob = new Blob([filas.join("\n")], { type: 'text/csv' });
    extension = 'xlsx';
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
fechaFiltro.valueAsDate = new Date();

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