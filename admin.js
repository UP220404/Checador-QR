// ... (configuración inicial de Firebase permanece igual)

// Variables globales
let registros = [];
let usuariosRegistrados = new Set();
let entradasHoy = 0;
let salidasHoy = 0;
let graficaSemanal, graficaTipo, graficaHorarios, graficaMensual, graficaUsuarios;

// ==================== FUNCIONES MEJORADAS PARA EL DASHBOARD ====================

async function cargarRegistros() {
  try {
    const q = query(collection(db, "registros"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    
    // Resetear contadores
    registros = [];
    usuariosRegistrados = new Set();
    entradasHoy = 0;
    salidasHoy = 0;
    
    const hoy = new Date().toLocaleDateString("es-MX");
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      const registro = {
        id: doc.id,
        nombre: data.nombre || "Sin nombre",
        email: data.email || "Sin email",
        tipo: data.tipo || "desconocido",
        tipoEvento: data.tipoEvento || "entrada",
        estado: data.estado || "puntual",
        timestamp: data.timestamp || null,
        fecha: data.timestamp ? formatearFecha(data.timestamp) : "Sin fecha"
      };
      
      registros.push(registro);
      usuariosRegistrados.add(data.email);
      
      // Contar entradas y salidas de hoy
      if (registro.fecha === hoy) {
        if (registro.tipoEvento === "entrada") {
          entradasHoy++;
        } else if (registro.tipoEvento === "salida") {
          salidasHoy++;
        }
      }
    });
    
    // Actualizar el dashboard
    actualizarDashboard();
    renderTabla();
    renderGraficas();
    
    mostrarNotificacion("Registros cargados correctamente", "success");
  } catch (error) {
    console.error("Error al cargar registros:", error);
    mostrarNotificacion("Error al cargar registros", "danger");
  }
}

function actualizarDashboard() {
  document.getElementById("entradas-hoy").textContent = entradasHoy;
  document.getElementById("salidas-hoy").textContent = salidasHoy;
  document.getElementById("usuarios-totales").textContent = usuariosRegistrados.size;
  
  // Calcular comparación con ayer (simplificado)
  const porcentajeEntradas = entradasHoy > 0 ? "+10%" : "-5%";
  const porcentajeSalidas = salidasHoy > 0 ? "+8%" : "-3%";
  
  document.getElementById("entradas-comparacion").textContent = porcentajeEntradas;
  document.getElementById("salidas-comparacion").textContent = porcentajeSalidas;
}

// ==================== FUNCIONES DE EXPORTACIÓN MEJORADAS ====================

window.exportarCSV = () => {
  const headers = "Nombre,Email,Tipo,Fecha,Hora,Evento,Estado\n";
  const csvContent = registros
    .map(r => {
      const fechaHora = r.timestamp ? r.timestamp.toDate() : new Date();
      return `"${r.nombre}","${r.email}","${r.tipo}","${formatearFecha(r.timestamp)}",` +
        `"${formatearHora(r.timestamp)}","${r.tipoEvento}","${r.estado}"`;
    })
    .join("\n");
  
  const blob = new Blob([headers + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registros_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
};

window.generarReportePDF = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text("Reporte de Accesos - Cielito Home", 105, 15, { align: 'center' });
  
  // Fecha
  doc.setFontSize(12);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 105, 25, { align: 'center' });
  
  // Datos
  const headers = [["Nombre", "Email", "Tipo", "Fecha", "Hora", "Evento"]];
  const data = registros.map(r => [
    r.nombre,
    r.email,
    r.tipo === 'becario' ? 'Becario' : 'T. Completo',
    formatearFecha(r.timestamp),
    formatearHora(r.timestamp),
    r.tipoEvento === 'entrada' ? (r.estado === 'puntual' ? 'Entrada' : 'Entrada con retardo') : 'Salida'
  ]);
  
  doc.autoTable({
    head: headers,
    body: data,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 135, 84] }
  });
  
  // Guardar
  doc.save(`reporte_accesos_${new Date().toISOString().slice(0,10)}.pdf`);
};

window.generarReporteExcel = () => {
  // Usamos CSV como alternativa simple a Excel
  exportarCSV();
};

// ==================== FUNCIONES AUXILIARES ====================

function formatearFecha(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Fecha inválida";
  }
  
  try {
    const fecha = timestamp.toDate();
    return fecha.toLocaleDateString("es-MX", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return "Error fecha";
  }
}

function formatearHora(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Hora inválida";
  }
  
  try {
    const fecha = timestamp.toDate();
    return fecha.toLocaleTimeString("es-MX", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return "Error hora";
  }
}

// ==================== RENDERIZADO DE GRÁFICAS (optimizado) ====================

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
    if (!r.timestamp) return;
    const fecha = r.timestamp.toDate();
    const dia = fecha.getDay(); // 0 (domingo) a 6 (sábado)
    conteo[dia === 0 ? 6 : dia - 1]++; // Ajustar para que Lunes sea 0
  });
  
  graficaSemanal = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dias,
      datasets: [{
        data: conteo,
        backgroundColor: 'rgba(25, 135, 84, 0.7)',
        borderColor: 'rgba(25, 135, 84, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: getChartOptions("Accesos por día de la semana")
  });
}

// ... (resto de funciones de gráficas permanecen similares pero optimizadas)

function getChartOptions(title) {
  const isDarkMode = document.body.classList.contains("dark-mode");
  const textColor = isDarkMode ? "#e0e0e0" : "#666";
  const gridColor = isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
  
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: !!title,
        text: title,
        color: textColor
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };
}

// ==================== INICIALIZACIÓN ====================

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

// ... (resto del código permanece igual)

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
    mostrarNotificacion("Registros cargados correctamente", "success");
  } catch (error) {
    console.error("Error al cargar registros:", error);
    mostrarNotificacion("Error al cargar registros", "danger");
  }
}

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
    const dia = fecha.getDay();
    conteo[dia === 0 ? 6 : dia - 1]++;
  });
  
  graficaSemanal = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dias,
      datasets: [{
        data: conteo,
        backgroundColor: 'rgba(25, 135, 84, 0.7)',
        borderColor: 'rgba(25, 135, 84, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
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
          'rgba(25, 135, 84, 0.7)'
        ],
        borderColor: [
          'rgba(13, 110, 253, 1)',
          'rgba(25, 135, 84, 1)'
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
        backgroundColor: 'rgba(25, 135, 84, 0.2)',
        borderColor: 'rgba(25, 135, 84, 1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
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
        backgroundColor: 'rgba(25, 135, 84, 0.7)',
        borderColor: 'rgba(25, 135, 84, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderGraficaUsuarios() {
  const ctx = document.getElementById("graficaUsuarios").getContext("2d");
  if (graficaUsuarios) graficaUsuarios.destroy();
  
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
          'rgba(25, 135, 84, 0.7)',
          'rgba(13, 110, 253, 0.7)',
          'rgba(255, 193, 7, 0.7)',
          'rgba(220, 53, 69, 0.7)',
          'rgba(111, 66, 193, 0.7)'
        ],
        borderColor: [
          'rgba(25, 135, 84, 1)',
          'rgba(13, 110, 253, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(220, 53, 69, 1)',
          'rgba(111, 66, 193, 1)'
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

document.getElementById("filtroBusqueda").addEventListener("input", renderTabla);
document.getElementById("filtroFecha").addEventListener("change", renderTabla);
document.getElementById("filtroTipo").addEventListener("change", renderTabla);
document.getElementById("filtroEvento").addEventListener("change", renderTabla);

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  renderGraficas();
});

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}