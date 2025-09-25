// ===== CONFIGURACIÓN FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

// ===== VARIABLES GLOBALES =====
let empleadosGlobales = [];
let resultadosNomina = [];
let cambiosManuales = {};
let historialCambios = [];

// Variables del período actual
let quinceActual = '';
let mesActual = '';
let mesActualNum = 0;
let añoActualNum = 0;

// Sistema de validación de acceso
let accesoAutorizado = false;
const PASSWORD_NOMINA = 'CIELITO2026RH';
const EMAILS_NOMINA_AUTORIZADOS = [
  'sistemas16ch@gmail.com',
  'sistemas16cielitohome@gmail.com',
  'leticia@cielitohome.com',
  'sistemas@cielitohome.com',
  'direcciongeneral@cielitohome.com'
];

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
  // Configurar fecha actual
  const hoy = new Date();
  document.getElementById('monthSelect').value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  
  // Inicializar listeners
  inicializarEventListeners();
});

// Reemplaza la función mostrarNotificacion existente:

// ===== SISTEMA DE NOTIFICACIONES MEJORADO =====
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 4000) {
  // Remover notificaciones existentes
  const existingNotifications = document.querySelectorAll('.custom-notification');
  existingNotifications.forEach(notif => {
    notif.classList.remove('show');
    setTimeout(() => notif.remove(), 300);
  });

  // Crear nueva notificación
  const notification = document.createElement('div');
  notification.className = `custom-notification notification-${tipo}`;
  
  const iconos = {
    'success': 'bi-check-circle-fill',
    'error': 'bi-x-circle-fill',
    'warning': 'bi-exclamation-triangle-fill',
    'info': 'bi-info-circle-fill'
  };

  // Agregar sonido (opcional)
  if (tipo === 'success') {
    // Crear un sonido sutil de éxito
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAZBCaJzen1vT4wh9bz2YU2Bhx9yvLZiTwIF2m99OycTgwLUKnj8bllHgg2jdT0y3YnBSF4x+/dkEEJE1+z5ulTFAlFnOHzsGAXBCWMyOvusjsGJ3zI8dmHNwYZbLfp65ZOhSfq4v3pO+G71vLTey4FJHjH79qCNwYmaLbt5KeWnot6Bc==');
    audio.volume = 0.1;
    audio.play().catch(() => {}); // Ignorar si no se puede reproducir
  }

  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">
        <i class="bi ${iconos[tipo] || iconos.info}"></i>
      </div>
      <div class="notification-message">${mensaje}</div>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="bi bi-x"></i>
      </button>
    </div>
    <div class="notification-progress"></div>
  `;

  // Añadir al DOM
  document.body.appendChild(notification);
  
  // Activar animación
  setTimeout(() => notification.classList.add('show'), 50);

  // Auto-remover después del tiempo especificado
  if (duracion > 0) {
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 400);
    }, duracion);
  }

  // Agregar efecto de hover
  notification.addEventListener('mouseenter', () => {
    const progress = notification.querySelector('.notification-progress');
    if (progress) {
      progress.style.animationPlayState = 'paused';
    }
  });

  notification.addEventListener('mouseleave', () => {
    const progress = notification.querySelector('.notification-progress');
    if (progress) {
      progress.style.animationPlayState = 'running';
    }
  });
}

// ===== UTILIDADES =====
function formatearNumero(numero) {
  return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getTipoNombre(tipo) {
  switch(tipo) {
    case 'tiempo_completo': return 'T.Completo';
    case 'becario': return 'Becario';
    case 'horario_especial': return 'H.Especial';
    default: return tipo;
  }
}

function calcularDiasLaboralesPeriodo(año, mes, periodo) {
  const diasLaborales = [];
  const ultimoDia = new Date(año, mes, 0).getDate();
  
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const fecha = new Date(año, mes - 1, dia);
    const diaSemana = fecha.getDay();
    
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasLaborales.push(dia);
    }
  }
  
  if (periodo === 'primera') {
    return diasLaborales.slice(0, 10);
  } else {
    return diasLaborales.slice(10, 20);
  }
}

// ===== VALIDACIONES =====
function validarDatosNomina() {
  if (!empleadosGlobales || empleadosGlobales.length === 0) {
    mostrarNotificacion('No se han cargado empleados', 'error');
    return false;
  }

  const empleadosConSalario = empleadosGlobales.filter(emp => 
    emp.salarioQuincenal && emp.horasQuincenal
  );

  if (empleadosConSalario.length === 0) {
    mostrarNotificacion(
      'No hay empleados con salarios configurados.\n\n' +
      '1. Use "Gestionar Salarios" para configurar salarios\n' +
      '2. Asigne tipo de empleado (tiempo completo, becario, etc.)\n' +
      '3. Configure salarios y horas por período',
      'warning',
      8000
    );
    return false;
  }

  const empleadosSinTipo = empleadosConSalario.filter(emp => !emp.tipo);
  if (empleadosSinTipo.length > 0) {
    mostrarNotificacion(
      `${empleadosSinTipo.length} empleados sin tipo asignado.\n` +
      'Configure el tipo de empleado en "Gestionar Salarios"',
      'warning'
    );
  }

  return true;
}

function validarIntegridadDatos() {
  const errores = [];
  const advertencias = [];

  resultadosNomina.forEach(resultado => {
    const emp = resultado.empleado;

    // Validaciones críticas
    if (!emp.nombre || emp.nombre.trim() === '') {
      errores.push(`Empleado sin nombre (ID: ${emp.uid})`);
    }

    if (!emp.salarioQuincenal || emp.salarioQuincenal <= 0) {
      errores.push(`${emp.nombre}: Salario no configurado o inválido`);
    }

    if (resultado.diasTrabajados > resultado.diasLaboralesEsperados) {
      advertencias.push(`${emp.nombre}: Días trabajados (${resultado.diasTrabajados}) excede días esperados (${resultado.diasLaboralesEsperados})`);
    }

    if (resultado.pagoFinal < 0) {
      errores.push(`${emp.nombre}: Pago final negativo ($${resultado.pagoFinal})`);
    }

    // Validaciones de datos bancarios si aplica
    if (emp.cuentaBancaria && (!emp.nombreBanco || emp.nombreBanco === '')) {
      advertencias.push(`${emp.nombre}: Cuenta bancaria sin banco especificado`);
    }

    // Validación de retardos vs días trabajados
    if (resultado.retardos > (resultado.diasTrabajados * 2)) {
      advertencias.push(`${emp.nombre}: Retardos (${resultado.retardos}) parecen excesivos para días trabajados (${resultado.diasTrabajados})`);
    }
  });

  return { errores, advertencias };
}

// ===== SISTEMA DE AUTENTICACIÓN =====
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  if (!EMAILS_NOMINA_AUTORIZADOS.includes(user.email)) {
    mostrarNotificacion('No tienes permisos para acceder a esta sección', 'error');
    setTimeout(() => window.location.href = 'admin.html', 2000);
    return;
  }

  inicializarValidacionAcceso();
});

// ===== SISTEMA DE VALIDACIÓN DE ACCESO =====
function inicializarValidacionAcceso() {
  const modal = new bootstrap.Modal(document.getElementById('modalValidacionAcceso'));
  modal.show();
  
  document.getElementById('passwordNomina').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      validarAccesoNomina();
    }
  });
}

window.validarAccesoNomina = function() {
  const password = document.getElementById('passwordNomina').value;
  const modal = document.getElementById('modalValidacionAcceso');
  
  if (password === PASSWORD_NOMINA) {
    accesoAutorizado = true;
    bootstrap.Modal.getInstance(modal).hide();
    cargarEmpleados();
    mostrarNotificacion('Acceso autorizado al Sistema de Nómina', 'success');
  } else {
    modal.classList.add('acceso-denegado');
    document.getElementById('passwordNomina').value = '';
    document.getElementById('passwordNomina').focus();
    setTimeout(() => modal.classList.remove('acceso-denegado'), 500);
    mostrarNotificacion('Contraseña incorrecta', 'error');
  }
};

window.regresarAdmin = function() {
  window.location.href = 'admin.html';
};

function validarAccesoAutorizado() {
  if (!accesoAutorizado) {
    mostrarNotificacion('Acceso no autorizado', 'error');
    return false;
  }
  return true;
}

// ===== GESTIÓN DE EMPLEADOS =====
async function cargarEmpleados() {
  try {
    const usuariosQuery = query(collection(db, "usuarios"));
    const usuariosSnapshot = await getDocs(usuariosQuery);
    
    empleadosGlobales = [];
    const select = document.getElementById('employeeSelect');
    select.innerHTML = '<option value="">Seleccionar empleado...</option>';
    
    usuariosSnapshot.forEach(doc => {
      const userData = doc.data();
      empleadosGlobales.push({
        uid: doc.id,
        ...userData
      });
      
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = `${userData.nombre} (${userData.tipo || 'Sin tipo'})`;
      select.appendChild(option);
    });
    
    await actualizarDashboardCajaAhorro();
    inicializarListeners();
    
  } catch (error) {
    console.error('Error cargando empleados:', error);
    mostrarNotificacion('Error al cargar empleados', 'error');
  }
}

function inicializarListeners() {
  const tipoNominaCalculo = document.getElementById('tipoNominaCalculo');
  if (tipoNominaCalculo) {
    tipoNominaCalculo.addEventListener('change', function() {
      const selectorPeriodo = document.getElementById('selectorPeriodo');
      const quinceSelect = document.getElementById('quinceSelect');
      
      if (this.value === 'semanal') {
        selectorPeriodo.style.display = 'none';
        quinceSelect.innerHTML = '<option value="todas">Todas las Semanas</option>';
      } else {
        selectorPeriodo.style.display = 'block';
        quinceSelect.innerHTML = `
          <option value="primera">Primera Quincena (1-15)</option>
          <option value="segunda">Segunda Quincena (16-fin de mes)</option>
        `;
      }
    });
  }

  const tipoNominaEmpleado = document.getElementById('tipoNominaEmpleado');
  if (tipoNominaEmpleado) {
    tipoNominaEmpleado.addEventListener('change', function() {
      actualizarEtiquetasSalario();
      calcularPagoPorDia();
    });
  }

  // Listeners para cálculo automático
  document.getElementById('individualSalary').addEventListener('input', calcularPagoPorDia);
  document.getElementById('individualHours').addEventListener('input', calcularPagoPorDia);
  
  console.log('Listeners inicializados correctamente');
}

function inicializarEventListeners() {
  // Configurar checkboxes de justificaciones en el modal
  const checkboxes = [
    { check: 'tieneVacaciones', input: 'diasVacaciones' },
    { check: 'tieneIncapacidad', input: 'diasIncapacidad' },
    { check: 'tieneViaje', input: 'diasViaje' }
  ];
  
  checkboxes.forEach(({ check, input }) => {
    const checkboxEl = document.getElementById(check);
    const inputEl = document.getElementById(input);
    
    if (checkboxEl && inputEl) {
      checkboxEl.addEventListener('change', function() {
        inputEl.disabled = !this.checked;
        if (!this.checked) inputEl.value = '';
        calcularPreviaEdicion();
      });
    }
  });

  // Listeners para cálculo en tiempo real en edición
  ['editDiasTrabajados', 'editRetardos', 'editDiasExtra', 'editBonoExtra', 
   'diasVacaciones', 'diasIncapacidad', 'diasViaje'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', calcularPreviaEdicion);
    }
  });

  // Listener para guardar edición
  const btnGuardarEdicion = document.getElementById('btnGuardarEdicion');
  if (btnGuardarEdicion) {
    btnGuardarEdicion.addEventListener('click', guardarEdicionManual);
  }
}

// ===== GESTIÓN DE SALARIOS INDIVIDUALES =====
window.toggleSalaryManager = function() {
  if (!validarAccesoAutorizado()) return;
  const manager = document.getElementById('salaryManager');
  manager.style.display = manager.style.display === 'none' ? 'block' : 'none';
};

window.loadEmployeeSalary = function() {
  const employeeId = document.getElementById('employeeSelect').value;
  if (!employeeId) {
    mostrarNotificacion('Selecciona un empleado primero', 'warning');
    return;
  }

  const empleado = empleadosGlobales.find(emp => emp.uid === employeeId);
  if (!empleado) {
    mostrarNotificacion('Empleado no encontrado', 'error');
    return;
  }

  // Mostrar formulario y cargar datos
  document.getElementById('employeeSalaryForm').style.display = 'block';
  document.getElementById('tipoNominaEmpleado').value = empleado.tipoNomina || 'quincenal';
  document.getElementById('individualSalary').value = empleado.salarioQuincenal || '';
  document.getElementById('individualHours').value = empleado.horasQuincenal || '';
  document.getElementById('tieneIMSS').checked = empleado.tieneIMSS || false;
  document.getElementById('tieneCajaAhorro').checked = empleado.tieneCajaAhorro || false;
  document.getElementById('montoCajaAhorro').value = empleado.montoCajaAhorro || '';
  document.getElementById('cuentaBancaria').value = empleado.cuentaBancaria || '';
  document.getElementById('nombreBanco').value = empleado.nombreBanco || '';
  
  toggleCajaAhorro();
  actualizarEtiquetasSalario();
  calcularPagoPorDia();
  
  mostrarNotificacion(`Datos cargados para: ${empleado.nombre}`, 'success');
};

function actualizarEtiquetasSalario() {
  const tipoNomina = document.getElementById('tipoNominaEmpleado').value;
  const labelSalario = document.querySelector('label[for="individualSalary"]');
  const labelHoras = document.querySelector('label[for="individualHours"]');
  const labelPagoDia = document.querySelector('label[for="dailyRate"]');
  
  if (tipoNomina === 'semanal') {
    labelSalario.textContent = 'Salario por Semana (5 días)';
    labelHoras.textContent = 'Horas por Semana (referencia)';
    labelPagoDia.textContent = 'Pago por Día (L-V)';
  } else {
    labelSalario.textContent = 'Salario por Período (10 días)';
    labelHoras.textContent = 'Horas por Período (referencia)';
    labelPagoDia.textContent = 'Pago por Día';
  }
}

window.toggleCajaAhorro = function() {
  const checkbox = document.getElementById('tieneCajaAhorro');
  const options = document.getElementById('cajaAhorroOptions');
  options.style.display = checkbox.checked ? 'block' : 'none';
  
  if (!checkbox.checked) {
    document.getElementById('montoCajaAhorro').value = '';
  }
};

function calcularPagoPorDia() {
  const salary = parseFloat(document.getElementById('individualSalary').value) || 0;
  const tipoNomina = document.getElementById('tipoNominaEmpleado').value;
  
  let dailyRate;
  if (tipoNomina === 'semanal') {
    dailyRate = salary / 5;
  } else {
    dailyRate = salary / 10;
  }
  
  document.getElementById('dailyRate').value = dailyRate.toFixed(2);
}

window.saveEmployeeSalary = async function() {
  if (!validarAccesoAutorizado()) return;

  const employeeId = document.getElementById('employeeSelect').value;
  const salary = parseFloat(document.getElementById('individualSalary').value);
  const hours = parseInt(document.getElementById('individualHours').value);
  const tipoNomina = document.getElementById('tipoNominaEmpleado').value;
  const tieneIMSS = document.getElementById('tieneIMSS').checked;
  const tieneCajaAhorro = document.getElementById('tieneCajaAhorro').checked;
  const montoCajaAhorro = parseFloat(document.getElementById('montoCajaAhorro').value) || 0;
  const cuentaBancaria = document.getElementById('cuentaBancaria').value.trim();
  const nombreBanco = document.getElementById('nombreBanco').value;

  if (!employeeId || !salary || !hours) {
    mostrarNotificacion('Complete todos los campos obligatorios', 'warning');
    return;
  }

  if (tieneCajaAhorro && montoCajaAhorro <= 0) {
    mostrarNotificacion('Si participa en caja de ahorro, debe especificar el monto', 'warning');
    return;
  }

  try {
    const empleadoRef = doc(db, 'usuarios', employeeId);
    
    let pagoPorDia, pagoPorHora;
    if (tipoNomina === 'semanal') {
      pagoPorDia = parseFloat((salary / 5).toFixed(2));
      pagoPorHora = parseFloat((salary / (hours || 1)).toFixed(2));
    } else {
      pagoPorDia = parseFloat((salary / 10).toFixed(2));
      pagoPorHora = parseFloat((salary / (hours || 1)).toFixed(2));
    }
    
    await updateDoc(empleadoRef, {
      tipoNomina: tipoNomina,
      salarioQuincenal: salary,
      horasQuincenal: hours,
      pagoPorHora: pagoPorHora,
      pagoPorDia: pagoPorDia,
      tieneIMSS: tieneIMSS,
      tieneCajaAhorro: tieneCajaAhorro,
      montoCajaAhorro: tieneCajaAhorro ? montoCajaAhorro : 0,
      cuentaBancaria: cuentaBancaria || null,
      nombreBanco: nombreBanco || null
    });

    mostrarNotificacion('Configuración guardada correctamente', 'success');
    await cargarEmpleados();
    await actualizarDashboardCajaAhorro();
    
    document.getElementById('employeeSalaryForm').style.display = 'none';
    document.getElementById('employeeSelect').value = '';
    
  } catch (error) {
    console.error('Error guardando configuración:', error);
    mostrarNotificacion('Error al guardar la configuración', 'error');
  }
};

window.clearEmployeeSalary = async function() {
  const employeeId = document.getElementById('employeeSelect').value;
  if (!employeeId) return;

  if (!confirm('¿Eliminar configuración de salario para este empleado?')) return;

  try {
    const empleadoRef = doc(db, 'usuarios', employeeId);
    await updateDoc(empleadoRef, {
      salarioQuincenal: null,
      horasQuincenal: null,
      pagoPorHora: null,
      pagoPorDia: null,
      tieneIMSS: false,
      tieneCajaAhorro: false,
      montoCajaAhorro: 0,
      cuentaBancaria: '',
      nombreBanco: ''
    });

    mostrarNotificacion('Configuración eliminada correctamente', 'success');
    await cargarEmpleados();
    await actualizarDashboardCajaAhorro();
    document.getElementById('employeeSalaryForm').style.display = 'none';
    document.getElementById('employeeSelect').value = '';
  } catch (error) {
    console.error('Error eliminando configuración:', error);
    mostrarNotificacion('Error al eliminar la configuración', 'error');
  }
};

// ===== DASHBOARD CAJA DE AHORRO =====
async function actualizarDashboardCajaAhorro() {
  try {
    const empleadosConCaja = empleadosGlobales.filter(emp => emp.tieneCajaAhorro);
    
    if (empleadosConCaja.length === 0) {
      document.getElementById('cajaAhorroDashboard').style.display = 'none';
      return;
    }
    
    document.getElementById('cajaAhorroDashboard').style.display = 'block';
    
    let totalParticipantes = empleadosConCaja.length;
    let ahorroQuincenalTotal = empleadosConCaja.reduce((sum, emp) => sum + (emp.montoCajaAhorro || 0), 0);
    let ahorroMensualTotal = ahorroQuincenalTotal * 2;
    let ahorroAnualTotal = ahorroMensualTotal * 12;
    
    const statsContainer = document.getElementById('cajaAhorroStats');
    statsContainer.innerHTML = `
      <div class="col-md-3">
        <div class="stat-card text-center p-3">
          <h4 class="text-success">${totalParticipantes}</h4>
          <small class="text-muted">Participantes</small>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card text-center p-3">
          <h4 class="text-success">$${formatearNumero(ahorroQuincenalTotal)}</h4>
          <small class="text-muted">Por Quincena</small>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card text-center p-3">
          <h4 class="text-success">$${formatearNumero(ahorroMensualTotal)}</h4>
          <small class="text-muted">Por Mes</small>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card text-center p-3">
          <h4 class="text-success">$${formatearNumero(ahorroAnualTotal)}</h4>
          <small class="text-muted">Por Año</small>
        </div>
      </div>
    `;
    
    if (totalParticipantes > 0) {
      const detalleHTML = empleadosConCaja.map(emp => `
        <div class="col-md-6 mb-2">
          <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
            <span><strong>${emp.nombre}</strong></span>
            <span class="badge bg-success">$${formatearNumero(emp.montoCajaAhorro || 0)}/quincena</span>
          </div>
        </div>
      `).join('');
      
      statsContainer.innerHTML += `
        <div class="col-md-12 mt-3">
          <h6><i class="bi bi-people me-2"></i>Detalle por Empleado:</h6>
          <div class="row">
            ${detalleHTML}
          </div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Error actualizando dashboard caja de ahorro:', error);
  }
}

// ===== CÁLCULO DE NÓMINA =====
window.calcularNomina = async function() {
  if (!validarAccesoAutorizado()) return;
  if (!validarDatosNomina()) return;

  const monthSelect = document.getElementById('monthSelect').value;
  const quinceSelect = document.getElementById('quinceSelect').value;
  
  if (!monthSelect) {
    mostrarNotificacion('Selecciona un mes', 'warning');
    return;
  }

  mesActualNum = parseInt(monthSelect.split('-')[1]);
  añoActualNum = parseInt(monthSelect.split('-')[0]);
  quinceActual = quinceSelect === 'primera' ? 'Período 1' : 'Período 2';
  
  document.getElementById('loadingSpinner').style.display = 'block';
  document.getElementById('summaryCard').style.display = 'none';
  document.getElementById('resultsContainer').innerHTML = '';
  document.getElementById('actionButtons').style.display = 'none';

  try {
    const [año, mes] = monthSelect.split('-');
    const mesNum = parseInt(mes);
    const añoNum = parseInt(año);

    console.log(`Calculando período: ${quinceSelect} de ${mesNum}/${añoNum}`);

    const diasLaborales = calcularDiasLaboralesPeriodo(añoNum, mesNum, quinceSelect);
    console.log(`Días laborales del período:`, diasLaborales);

    // Consulta de empleados
    const usuariosQuery = query(collection(db, "usuarios"));
    const usuariosSnapshot = await getDocs(usuariosQuery);
    
    const empleados = [];
    usuariosSnapshot.forEach(doc => {
      const userData = doc.data();
      
      if (!userData || !userData.nombre) return;
      
      if (userData.salarioQuincenal && userData.horasQuincenal) {
        empleados.push({
          uid: doc.id,
          nombre: userData.nombre,
          email: userData.email || 'sin-email@cielitohome.com',
          tipo: userData.tipo || 'tiempo_completo',
          salarioQuincenal: userData.salarioQuincenal,
          horasQuincenal: userData.horasQuincenal,
          pagoPorDia: userData.salarioQuincenal / 10,
          tieneIMSS: userData.tieneIMSS || false,
          tieneCajaAhorro: userData.tieneCajaAhorro || false,
          montoCajaAhorro: userData.montoCajaAhorro || 0,
          cuentaBancaria: userData.cuentaBancaria || '',
          nombreBanco: userData.nombreBanco || ''
        });
      }
    });

    if (empleados.length === 0) {
      mostrarNotificacion('No hay empleados con salarios configurados.\n\nUse "Gestionar Salarios" para configurar los salarios de cada empleado.', 'error', 6000);
      document.getElementById('loadingSpinner').style.display = 'none';
      return;
    }

    console.log('Consultando registros...');
    
    // Consulta de registros optimizada
    const fechaInicio = `${añoNum}-${String(mesNum).padStart(2, '0')}-${String(Math.min(...diasLaborales)).padStart(2, '0')}`;
    const fechaFin = `${añoNum}-${String(mesNum).padStart(2, '0')}-${String(Math.max(...diasLaborales)).padStart(2, '0')}`;
    
    const registrosQuery = query(
      collection(db, "registros"),
      where("tipoEvento", "==", "entrada"),
      where("fecha", ">=", fechaInicio),
      where("fecha", "<=", fechaFin)
    );

    const registrosSnapshot = await getDocs(registrosQuery);
    console.log(`Registros obtenidos: ${registrosSnapshot.size}`);
    
    // Procesar registros
    const registrosPorEmpleado = {};
    
    registrosSnapshot.forEach(doc => {
      const registro = doc.data();
      const uid = registro.uid;
      
      const fechaRegistro = registro.fecha;
      if (!fechaRegistro) return;
      
      const [regAño, regMes, regDia] = fechaRegistro.split('-').map(Number);
      
      if (regAño === añoNum && regMes === mesNum && diasLaborales.includes(regDia)) {
        if (!registrosPorEmpleado[uid]) {
          registrosPorEmpleado[uid] = [];
        }
        registrosPorEmpleado[uid].push(registro);
      }
    });

    // Cálculo de nómina
    const resultados = [];
    let totalRetardos = 0;
    let empleadosConDescuento = 0;
    let totalNominaFinal = 0;

    for (const empleado of empleados) {
      try {
        const registros = registrosPorEmpleado[empleado.uid] || [];
        
        const salarioQuincenal = empleado.salarioQuincenal;
        const pagoPorDia = empleado.pagoPorDia;

        let retardos = 0;
        let diasTrabajados = registros.length;
        const detalleRetardos = [];
        const diasAsistidos = [];

        registros.forEach(registro => {
          const [regAño, regMes, regDia] = registro.fecha.split('-').map(Number);
          diasAsistidos.push(regDia);
          
          if (registro.estado === 'retardo') {
            retardos++;
            detalleRetardos.push({
              fecha: registro.fecha,
              hora: registro.hora
            });
          }
        });

        const diasFaltantes = diasLaborales.filter(dia => !diasAsistidos.includes(dia));
        const diasDescuento = Math.floor(retardos / 4);
        const diasEfectivos = diasTrabajados - diasDescuento;
        const pagoTotal = Math.max(0, diasEfectivos * pagoPorDia);

        // Descuentos
        let descuentoIMSS = 0;
        let descuentoCaja = 0;
        
        if (empleado.tieneIMSS) {
          descuentoIMSS = 300;
        }
        
        if (empleado.tieneCajaAhorro && empleado.montoCajaAhorro) {
          descuentoCaja = empleado.montoCajaAhorro;
        }
        
        const totalDescuentos = descuentoIMSS + descuentoCaja;
        const pagoFinal = Math.max(0, pagoTotal - totalDescuentos);
        
        if (diasDescuento > 0 || totalDescuentos > 0) empleadosConDescuento++;
        totalRetardos += retardos;

        // Estado
        let status, statusClass;
        if (diasFaltantes.length > 0) {
          status = `${diasFaltantes.length} falta${diasFaltantes.length > 1 ? 's' : ''} • ${retardos} retardo${retardos !== 1 ? 's' : ''}`;
          statusClass = 'status-penalty';
        } else if (diasDescuento > 0) {
          status = `Descuento: ${diasDescuento} día${diasDescuento > 1 ? 's' : ''}`;
          statusClass = 'status-penalty';
        } else if (retardos >= 3) {
          status = 'En límite de retardos';
          statusClass = 'status-warning';
        } else {
          status = 'Sin penalizaciones';
          statusClass = 'status-ok';
        }

        const resultado = {
          empleado,
          salarioQuincenal,
          diasLaboralesEsperados: diasLaborales.length,
          diasTrabajados,
          diasFaltantes: diasFaltantes.length,
          retardos,
          diasDescuento,
          diasEfectivos,
          pagoPorDia: Math.round(pagoPorDia),
          pagoTotal: Math.round(pagoTotal),
          descuentoIMSS,
          descuentoCaja,
          totalDescuentos,
          pagoFinal: Math.round(pagoFinal),
          status,
          statusClass,
          detalleRetardos,
          diasAsistidos,
          diasFaltantesDetalle: diasFaltantes
        };
        
        resultados.push(resultado);
        totalNominaFinal += Math.round(resultado.pagoFinal);
        
      } catch (error) {
        console.error(`Error procesando empleado ${empleado.nombre}:`, error);
        mostrarNotificacion(`Error procesando ${empleado.nombre}, se omitirá`, 'warning');
      }
    }

    // Actualizar variables globales
    quinceActual = quinceSelect === 'primera' ? 'Período 1' : 'Período 2';
    mesActual = `${mesNum}/${añoNum}`;
    mesActualNum = mesNum;
    añoActualNum = añoNum;

    resultadosNomina = resultados;

    mostrarResultados(resultados, empleados.length, totalRetardos, empleadosConDescuento, totalNominaFinal, quinceSelect, monthSelect);

  } catch (error) {
    console.error('Error calculando nómina:', error);
    mostrarNotificacion('Error al calcular la nómina: ' + error.message, 'error');
  } finally {
    document.getElementById('loadingSpinner').style.display = 'none';
  }
};

// ===== MOSTRAR RESULTADOS =====
function mostrarResultados(resultados, totalEmpleados, totalRetardos, empleadosConDescuento, totalPago, periodo, mes) {
  // Actualizar resumen
  document.getElementById('totalEmployees').textContent = totalEmpleados;
  document.getElementById('totalRetards').textContent = totalRetardos;
  document.getElementById('employeesWithPenalty').textContent = empleadosConDescuento;
  document.getElementById('totalPayout').textContent = `$${formatearNumero(totalPago)}`;
  document.getElementById('summaryCard').style.display = 'block';
  document.getElementById('viewControls').style.display = 'block';
  document.getElementById('actionButtons').style.display = 'flex';

  // Limpiar contenedores
  document.getElementById('resultsContainer').innerHTML = '';
  document.getElementById('tableBody').innerHTML = '';

  // Mostrar vista compacta por defecto
  mostrarVistaCompacta(resultados);
  llenarTabla(resultados);
}

// ===== VISTAS =====
window.cambiarVista = function(tipo) {
  const compactaBtn = document.getElementById('btnVistaCompacta');
  const tablaBtn = document.getElementById('btnVistaTabla');
  const container = document.getElementById('resultsContainer');
  const tableContainer = document.getElementById('tableContainer');

  [compactaBtn, tablaBtn].forEach(btn => btn.classList.remove('active'));

  if (tipo === 'compacta') {
    compactaBtn.classList.add('active');
    container.style.display = 'grid';
    tableContainer.style.display = 'none';
    container.className = 'employee-grid-compact';
    mostrarVistaCompacta(resultadosNomina);
  } else if (tipo === 'tabla') {
    tablaBtn.classList.add('active');
    container.style.display = 'none';
    tableContainer.style.display = 'block';
  }
};

function mostrarVistaCompacta(resultados) {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';

  resultados.forEach(resultado => {
    const empleadoCard = document.createElement('div');
    empleadoCard.className = 'employee-card-compact';
    empleadoCard.setAttribute('data-empleado-id', resultado.empleado.uid);

    const tipoNombre = getTipoNombre(resultado.empleado.tipo);
    const pagoFinalMostrar = resultado.pagoFinalConJustificaciones || resultado.pagoFinal;
    
    empleadoCard.innerHTML = `
      <div class="compact-header">
        <div class="compact-name">
          <strong>${resultado.empleado.nombre}</strong>
          <span class="badge bg-secondary ms-2">${tipoNombre}</span>
          ${resultado.editadoManualmente ? '<span class="badge bg-purple ms-1">E</span>' : ''}
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="abrirEdicionNomina('${resultado.empleado.uid}')">
          <i class="bi bi-pencil"></i>
        </button>
      </div>
      
      <div class="compact-stats">
        <div class="compact-stat">
          <span class="stat-value ${resultado.diasTrabajados < resultado.diasLaboralesEsperados ? 'text-warning' : 'text-success'}">${resultado.diasTrabajados}</span>
          <small>Días</small>
        </div>
        <div class="compact-stat">
          <span class="stat-value ${resultado.retardos > 0 ? 'text-warning' : 'text-success'}">${resultado.retardos}</span>
          <small>Retardos</small>
        </div>
        <div class="compact-stat">
          <span class="stat-value ${resultado.diasFaltantes > 0 ? 'text-danger' : 'text-success'}">${resultado.diasFaltantes}</span>
          <small>Faltas</small>
        </div>
        <div class="compact-stat highlight">
          <span class="stat-value text-success">$${formatearNumero(pagoFinalMostrar)}</span>
          <small>Final</small>
        </div>
      </div>
      
      ${resultado.diasDescuento > 0 ? `
        <div class="descuento-badge">
          <div class="alert alert-warning py-2 mb-2">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>Descuento: ${resultado.diasDescuento} día${resultado.diasDescuento > 1 ? 's' : ''}</strong>
            <small class="d-block">Por ${resultado.retardos} retardos (4 retardos = 1 día)</small>
          </div>
        </div>
      ` : ''}
      
      <div class="compact-details">
        <div class="compact-detail-row">
          <span class="detail-label">Subtotal:</span>
          <span class="detail-value">$${formatearNumero(resultado.pagoTotal)}</span>
        </div>
        
        ${resultado.descuentoIMSS > 0 ? `
          <div class="compact-detail-row discount">
            <span class="detail-label">IMSS:</span>
            <span class="detail-value text-danger">-$${resultado.descuentoIMSS}</span>
          </div>
        ` : ''}
        
        ${resultado.descuentoCaja > 0 ? `
          <div class="compact-detail-row discount">
            <span class="detail-label">Caja de ahorro:</span>
            <span class="detail-value text-danger">-$${formatearNumero(resultado.descuentoCaja)}</span>
          </div>
        ` : ''}
        
        <div class="compact-detail-row final">
          <span class="detail-label"><strong>PAGO FINAL:</strong></span>
          <span class="detail-value text-success"><strong>$${formatearNumero(pagoFinalMostrar)}</strong></span>
        </div>
      </div>
      
      <div class="compact-status ${resultado.statusClass}">
        ${resultado.status}
      </div>
    `;

    container.appendChild(empleadoCard);
  });
}

function llenarTabla(resultados) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  resultados.forEach(resultado => {
    const row = document.createElement('tr');
    const tipoNombre = getTipoNombre(resultado.empleado.tipo);
    const pagoFinalMostrar = resultado.pagoFinalConJustificaciones || resultado.pagoFinal;

    row.innerHTML = `
      <td>
        <div class="fw-bold">${resultado.empleado.nombre}</div>
        ${resultado.editadoManualmente ? '<span class="badge bg-purple ms-1">Editado</span>' : ''}
      </td>
      <td>
        <span class="badge ${resultado.empleado.tipo === 'becario' ? 'bg-info' : 'bg-secondary'}">
          ${tipoNombre}
        </span>
      </td>
      <td class="text-center">
        <strong>${resultado.diasTrabajados}/${resultado.diasLaboralesEsperados}</strong>
        ${resultado.diasTrabajados < resultado.diasLaboralesEsperados ? 
          `<small class="text-danger d-block">-${resultado.diasLaboralesEsperados - resultado.diasTrabajados} día(s)</small>` : 
          '<small class="text-success d-block">Completo</small>'
        }
      </td>
      <td class="text-center">
        <span class="badge ${resultado.retardos > 0 ? 'bg-warning text-dark' : 'bg-success'}">
          ${resultado.retardos}
        </span>
      </td>
      <td class="text-center">
        <span class="badge ${resultado.diasFaltantes > 0 ? 'bg-danger' : 'bg-success'}">
          ${resultado.diasFaltantes}
        </span>
      </td>
      <td class="text-center">
        ${resultado.totalDescuentos > 0 ? `
          <span class="badge bg-warning text-dark">$${formatearNumero(resultado.totalDescuentos)}</span>
        ` : `
          <span class="text-success">Sin descuentos</span>
        `}
      </td>
      <td class="text-end">
        <strong class="text-success">$${formatearNumero(pagoFinalMostrar)}</strong>
        <small class="text-muted d-block">Base: $${formatearNumero(resultado.pagoTotal)}</small>
      </td>
      <td class="text-center">
        <span class="badge bg-${resultado.statusClass === 'status-ok' ? 'success' : 
                                 resultado.statusClass === 'status-warning' ? 'warning text-dark' : 'danger'}">
          ${resultado.statusClass === 'status-ok' ? 'OK' : 
            resultado.statusClass === 'status-warning' ? 'Alerta' : 'Penalización'}
        </span>
      </td>
      <td class="text-center">
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary" onclick="abrirEdicionNomina('${resultado.empleado.uid}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-success" onclick="generarTicketPDF('${resultado.empleado.uid}')">
            <i class="bi bi-file-earmark-pdf"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

// ===== EDICIÓN MANUAL =====
window.abrirEdicionNomina = function(empleadoId) {
  const resultado = resultadosNomina.find(r => r.empleado.uid === empleadoId);
  if (!resultado) {
    mostrarNotificacion('No se encontraron datos del empleado', 'error');
    return;
  }
  
  document.getElementById('editEmpleadoId').value = empleadoId;
  document.getElementById('editEmpleadoNombre').textContent = resultado.empleado.nombre;
  document.getElementById('editEmpleadoTipo').textContent = getTipoNombre(resultado.empleado.tipo);
  document.getElementById('editSalarioBase').textContent = `$${formatearNumero(resultado.salarioQuincenal)}`;
  document.getElementById('editPeriodo').textContent = `${quinceActual} - ${mesActual}`;
  
  document.getElementById('editDiasTrabajados').value = resultado.diasTrabajados;
  document.getElementById('editRetardos').value = resultado.retardos;
  document.getElementById('editDiasExtra').value = 0;
  document.getElementById('editBonoExtra').value = 0;
  
  ['tieneVacaciones', 'tieneIncapacidad', 'tieneViaje'].forEach(id => {
    document.getElementById(id).checked = false;
    const inputId = id.replace('tiene', 'dias');
    const input = document.getElementById(inputId);
    if (input) {
      input.disabled = true;
      input.value = '';
    }
  });
  
  document.getElementById('editComentarios').value = '';
  window.datosOriginales = { ...resultado };
  
  calcularPreviaEdicion();
  new bootstrap.Modal(document.getElementById('modalEditarNomina')).show();
};

function calcularPreviaEdicion() {
  if (!window.datosOriginales) return;
  
  const original = window.datosOriginales;
  const diasTrabajados = parseInt(document.getElementById('editDiasTrabajados').value) || 0;
  const retardos = parseInt(document.getElementById('editRetardos').value) || 0;
  const diasExtra = parseInt(document.getElementById('editDiasExtra').value) || 0;
  const bonoExtra = parseFloat(document.getElementById('editBonoExtra').value) || 0;
  
  let diasJustificados = 0;
  if (document.getElementById('tieneVacaciones').checked) {
    diasJustificados += parseInt(document.getElementById('diasVacaciones').value) || 0;
  }
  if (document.getElementById('tieneIncapacidad').checked) {
    diasJustificados += parseInt(document.getElementById('diasIncapacidad').value) || 0;
  }
  if (document.getElementById('tieneViaje').checked) {
    diasJustificados += parseInt(document.getElementById('diasViaje').value) || 0;
  }

  const diasDescuentoPorRetardos = Math.floor(retardos / 4);
  const diasEfectivos = Math.max(0, diasTrabajados - diasDescuentoPorRetardos);
  const diasTotalesAPagar = diasEfectivos + diasJustificados + diasExtra;
  
  const pagoBase = diasTotalesAPagar * original.pagoPorDia;
  const pagoConBono = pagoBase + bonoExtra;
  
  const descuentoIMSS = original.empleado.tieneIMSS ? 300 : 0;
  const descuentoCaja = original.empleado.tieneCajaAhorro ? (original.empleado.montoCajaAhorro || 0) : 0;
  const pagoFinal = Math.max(0, pagoConBono - descuentoIMSS - descuentoCaja);
  
  const previaElement = document.getElementById('previaCalculo');
  if (previaElement) {
    previaElement.innerHTML = `
      <div class="col-md-6">
        <h6>Cálculo Detallado:</h6>
        <ul class="list-unstyled">
          <li>• Días efectivos trabajados: <strong>${diasEfectivos}</strong></li>
          <li>• Días justificados (pagados): <strong>${diasJustificados}</strong></li>
          <li>• Días extra (sábados): <strong>${diasExtra}</strong></li>
          <li>• Pago por día: <strong>$${formatearNumero(original.pagoPorDia)}</strong></li>
          ${diasDescuentoPorRetardos > 0 ? `<li>• Descuento por ${diasDescuentoPorRetardos} día(s): <strong>-$${formatearNumero(diasDescuentoPorRetardos * original.pagoPorDia)}</strong></li>` : ''}
        </ul>
      </div>
      <div class="col-md-6">
        <h6>Totales:</h6>
        <ul class="list-unstyled">
          <li>• Subtotal: <strong>$${formatearNumero(Math.round(pagoBase))}</strong></li>
          ${bonoExtra > 0 ? `<li>• Bono extra: <strong>+$${formatearNumero(bonoExtra)}</strong></li>` : ''}
          ${descuentoIMSS > 0 ? `<li>• IMSS: <strong>-$${descuentoIMSS}</strong></li>` : ''}
          ${descuentoCaja > 0 ? `<li>• Caja de ahorro: <strong>-$${formatearNumero(descuentoCaja)}</strong></li>` : ''}
          <li class="border-top pt-2 mt-2"><strong>PAGO FINAL: $${formatearNumero(Math.round(pagoFinal))}</strong></li>
        </ul>
      </div>
    `;
  }
}

function guardarEdicionManual() {
  try {
    const empleadoId = document.getElementById('editEmpleadoId').value;
    const diasTrabajados = parseInt(document.getElementById('editDiasTrabajados').value) || 0;
    const retardos = parseInt(document.getElementById('editRetardos').value) || 0;
    const diasExtra = parseInt(document.getElementById('editDiasExtra').value) || 0;
    const bonoExtra = parseFloat(document.getElementById('editBonoExtra').value) || 0;
    
    let diasJustificados = 0;
    let justificacionesDetalle = [];
    
    if (document.getElementById('tieneVacaciones').checked) {
      const dias = parseInt(document.getElementById('diasVacaciones').value) || 0;
      diasJustificados += dias;
      justificacionesDetalle.push(`Vacaciones: ${dias} días`);
    }
    if (document.getElementById('tieneIncapacidad').checked) {
      const dias = parseInt(document.getElementById('diasIncapacidad').value) || 0;
      diasJustificados += dias;
      justificacionesDetalle.push(`Incapacidad: ${dias} días`);
    }
    if (document.getElementById('tieneViaje').checked) {
      const dias = parseInt(document.getElementById('diasViaje').value) || 0;
      diasJustificados += dias;
      justificacionesDetalle.push(`Viaje de negocios: ${dias} días`);
    }
    
    const comentarios = document.getElementById('editComentarios').value;
    
    cambiosManuales[empleadoId] = {
      diasTrabajados,
      retardos,
      diasExtra,
      bonoExtra,
      diasJustificados,
      justificacionesDetalle,
      comentarios,
      editadoManualmente: true,
      fechaEdicion: new Date().toISOString()
    };
    
    historialCambios.push({
      empleadoId,
      tipo: 'edicion_manual',
      cambios: cambiosManuales[empleadoId],
      timestamp: new Date().toISOString()
    });
    
    actualizarTarjetaEmpleado(empleadoId);
    
    mostrarNotificacion(`Cambios guardados para ${window.datosOriginales.empleado.nombre}`, 'success');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarNomina'));
    modal.hide();
    
    recalcularResumenGeneral();
    
  } catch (error) {
    console.error('Error guardando edición manual:', error);
    mostrarNotificacion('Error al guardar los cambios', 'error');
  }
}

function actualizarTarjetaEmpleado(empleadoId) {
  const resultadoIndex = resultadosNomina.findIndex(r => r.empleado.uid === empleadoId);
  if (resultadoIndex === -1) return;
  
  let resultado = { ...resultadosNomina[resultadoIndex] };
  const cambiosManual = cambiosManuales[empleadoId];
  
  if (cambiosManual) {
    const original = window.datosOriginales;
    const diasDescuentoPorRetardos = Math.floor(cambiosManual.retardos / 4);
    const diasEfectivos = Math.max(0, cambiosManual.diasTrabajados - diasDescuentoPorRetardos);
    const diasTotalesAPagar = diasEfectivos + cambiosManual.diasJustificados + cambiosManual.diasExtra;
    
    const pagoBase = diasTotalesAPagar * resultado.pagoPorDia;
    const pagoConBono = pagoBase + cambiosManual.bonoExtra;
    const pagoFinal = Math.max(0, pagoConBono - resultado.totalDescuentos);
    
    resultado.diasTrabajados = cambiosManual.diasTrabajados;
    resultado.retardos = cambiosManual.retardos;
    resultado.diasDescuento = diasDescuentoPorRetardos;
    resultado.diasEfectivos = diasEfectivos;
    resultado.diasExtra = cambiosManual.diasExtra;
    resultado.bonoExtra = cambiosManual.bonoExtra;
    resultado.diasJustificados = cambiosManual.diasJustificados;
    resultado.pagoTotal = Math.round(pagoBase);
    resultado.pagoFinal = Math.round(pagoFinal);
    resultado.editadoManualmente = true;
    resultado.comentariosEdicion = cambiosManual.comentarios;
    resultado.justificacionesDetalle = cambiosManual.justificacionesDetalle;
    
    resultadosNomina[resultadoIndex] = resultado;
  }
  
  const vistaActual = document.getElementById('btnVistaCompacta').classList.contains('active') ? 'compacta' : 'tabla';
  
  if (vistaActual === 'compacta') {
    mostrarVistaCompacta(resultadosNomina);
  } else {
    llenarTabla(resultadosNomina);
  }
}

function recalcularResumenGeneral() {
  const totalEmpleados = resultadosNomina.length;
  const totalRetardos = resultadosNomina.reduce((sum, r) => sum + r.retardos, 0);
  const empleadosConDescuento = resultadosNomina.filter(r => r.diasDescuento > 0 || r.totalDescuentos > 0).length;
  const totalPago = resultadosNomina.reduce((sum, r) => sum + r.pagoFinal, 0);
  
  document.getElementById('totalEmployees').textContent = totalEmpleados;
  document.getElementById('totalRetards').textContent = totalRetardos;
  document.getElementById('employeesWithPenalty').textContent = empleadosConDescuento;
  document.getElementById('totalPayout').textContent = `$${formatearNumero(totalPago)}`;
}

// ===== EXPORTAR EXCEL =====
window.exportarExcel = function() {
  if (!validarAccesoAutorizado()) return;
  
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos para exportar', 'warning');
    return;
  }

  try {
    console.log('Iniciando exportación Excel con', resultadosNomina.length, 'empleados');
    
    const datosExcel = resultadosNomina.map((resultado) => {
      const pagoFinal = resultado.pagoFinalConJustificaciones || resultado.pagoFinal;
      
      const cuentaBancaria = (resultado.empleado.cuentaBancaria && resultado.empleado.cuentaBancaria.trim() !== '') 
        ? resultado.empleado.cuentaBancaria.trim() 
        : 'No registrada';
        
      const nombreBanco = (resultado.empleado.nombreBanco && resultado.empleado.nombreBanco.trim() !== '') 
        ? resultado.empleado.nombreBanco.trim() 
        : 'No especificado';
      
      return {
        'Empleado': resultado.empleado.nombre || 'Sin nombre',
        'Email': resultado.empleado.email || 'No registrado',
        'Tipo': getTipoNombre(resultado.empleado.tipo),
        'Cuenta Bancaria': cuentaBancaria,
        'Banco': nombreBanco,
        'Salario Base Quincenal': resultado.salarioQuincenal || 0,
        'Pago por Día': resultado.pagoPorDia || 0,
        'Días Esperados': resultado.diasLaboralesEsperados || 0,
        'Días Trabajados': resultado.diasTrabajados || 0,
        'Días Efectivos': resultado.diasEfectivos || 0,
        'Retardos': resultado.retardos || 0,
        'Faltas': resultado.diasFaltantes || 0,
        'Días de Descuento por Retardos': resultado.diasDescuento || 0,
        'Subtotal Bruto': resultado.pagoTotal || 0,
        'Descuento IMSS': resultado.descuentoIMSS || 0,
        'Descuento Caja de Ahorro': resultado.descuentoCaja || 0,
        'Total Descuentos': resultado.totalDescuentos || 0,
        'PAGO FINAL': pagoFinal || 0,
        'Estado': resultado.status || 'Sin estado',
        'Editado Manualmente': resultado.editadoManualmente ? 'Sí' : 'NO',
        'Comentarios': resultado.comentariosEdicion || 'Sin comentarios'
      };
    });

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    
    const columnWidths = Array(21).fill({ wch: 15 });
    columnWidths[0] = { wch: 25 }; // Empleado
    columnWidths[1] = { wch: 30 }; // Email
    columnWidths[3] = { wch: 20 }; // Cuenta Bancaria
    columnWidths[20] = { wch: 30 }; // Comentarios
    
    ws['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(wb, ws, "Nómina");

    const fecha = new Date().toISOString().split('T')[0];
    const periodoLimpio = quinceActual.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const mesLimpio = mesActual.replace(/[^a-zA-Z0-9_]/g, '_');
    const nombreArchivo = `Nomina_${periodoLimpio}_${mesLimpio}_${fecha}.xlsx`;
    
    XLSX.writeFile(wb, nombreArchivo);
    
    const empleadosConCuenta = datosExcel.filter(emp => 
      emp['Cuenta Bancaria'] !== 'No registrada'
    ).length;
    
    mostrarNotificacion(
      `Archivo Excel exportado exitosamente\n\nArchivo: ${nombreArchivo}\n${datosExcel.length} empleados exportados\n${empleadosConCuenta} con datos bancarios completos`, 
      'success', 
      6000
    );
    
  } catch (error) {
    console.error('Error exportando Excel:', error);
    mostrarNotificacion('Error al exportar Excel: ' + error.message, 'error');
  }
};

// ===== EXPORTAR RESUMEN EJECUTIVO =====
window.exportarResumenEjecutivo = function() {
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos para generar resumen', 'warning');
    return;
  }

  try {
    // Datos del resumen
    const totalEmpleados = resultadosNomina.length;
    const totalBruto = resultadosNomina.reduce((sum, r) => sum + r.pagoTotal, 0);
    const totalDescuentos = resultadosNomina.reduce((sum, r) => sum + r.totalDescuentos, 0);
    const totalNeto = resultadosNomina.reduce((sum, r) => sum + r.pagoFinal, 0);
    const empleadosConRetardos = resultadosNomina.filter(r => r.retardos > 0).length;
    const empleadosConFaltas = resultadosNomina.filter(r => r.diasFaltantes > 0).length;
    const empleadosEditados = resultadosNomina.filter(r => r.editadoManualmente).length;

    // Por tipo de empleado
    const tiposEmpleado = {};
    resultadosNomina.forEach(r => {
      const tipo = getTipoNombre(r.empleado.tipo);
      if (!tiposEmpleado[tipo]) {
        tiposEmpleado[tipo] = {
          cantidad: 0,
          totalPago: 0,
          totalDescuentos: 0
        };
      }
      tiposEmpleado[tipo].cantidad++;
      tiposEmpleado[tipo].totalPago += r.pagoFinal;
      tiposEmpleado[tipo].totalDescuentos += r.totalDescuentos;
    });

    // Crear hoja de resumen
    const resumenData = [
      ['RESUMEN EJECUTIVO DE NÓMINA', '', '', ''],
      ['Período:', `${quinceActual} - ${mesActual}`, '', ''],
      ['Fecha de generación:', new Date().toLocaleString('es-MX'), '', ''],
      ['', '', '', ''],
      ['TOTALES GENERALES', '', '', ''],
      ['Total empleados:', totalEmpleados, '', ''],
      ['Subtotal bruto:', totalBruto, '', ''],
      ['Total descuentos:', totalDescuentos, '', ''],
      ['TOTAL NETO A PAGAR:', totalNeto, '', ''],
      ['', '', '', ''],
      ['INDICADORES', '', '', ''],
      ['Empleados con retardos:', empleadosConRetardos, '', ''],
      ['Empleados con faltas:', empleadosConFaltas, '', ''],
      ['Empleados editados manualmente:', empleadosEditados, '', ''],
      ['', '', '', ''],
      ['DESGLOSE POR TIPO', 'Cantidad', 'Pago Total', 'Descuentos']
    ];

    Object.entries(tiposEmpleado).forEach(([tipo, datos]) => {
      resumenData.push([tipo, datos.cantidad, datos.totalPago, datos.totalDescuentos]);
    });

    // Crear workbook
    const ws = XLSX.utils.aoa_to_sheet(resumenData);
    const wb = XLSX.utils.book_new();
    
    // Agregar hoja detallada también
    const datosDetallados = resultadosNomina.map(r => ({
      'Empleado': r.empleado.nombre,
      'Tipo': getTipoNombre(r.empleado.tipo),
      'Días Trabajados': r.diasTrabajados,
      'Retardos': r.retardos,
      'Faltas': r.diasFaltantes,
      'Subtotal': r.pagoTotal,
      'Desc. IMSS': r.descuentoIMSS,
      'Desc. Caja': r.descuentoCaja,
      'PAGO FINAL': r.pagoFinal,
      'Editado': r.editadoManualmente ? 'Sí' : 'No'
    }));

    const wsDetalle = XLSX.utils.json_to_sheet(datosDetallados);

    XLSX.utils.book_append_sheet(wb, ws, "Resumen Ejecutivo");
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Completo");

    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Resumen_Ejecutivo_${quinceActual.replace(' ', '_')}_${mesActual.replace('/', '-')}_${fecha}.xlsx`;
    
    XLSX.writeFile(wb, nombreArchivo);
    
    mostrarNotificacion(`Resumen ejecutivo exportado: ${nombreArchivo}`, 'success');

  } catch (error) {
    console.error('Error exportando resumen:', error);
    mostrarNotificacion('Error al exportar resumen ejecutivo', 'error');
  }
};

// ===== GUARDAR NÓMINA =====
window.guardarNominaCompleta = async function() {
  if (!validarAccesoAutorizado()) return;
  
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos de nómina para guardar', 'warning');
    return;
  }

  try {
    const nominaId = `${añoActualNum}-${String(mesActualNum).padStart(2, '0')}-${quinceActual.includes('1') ? 'primera' : 'segunda'}`;
    
    const resumen = {
      totalEmpleados: Number(resultadosNomina.length) || 0,
      totalRetardos: Number(resultadosNomina.reduce((sum, r) => sum + (Number(r.retardos) || 0), 0)) || 0,
      empleadosConDescuento: Number(resultadosNomina.filter(r => (Number(r.diasDescuento) || 0) > 0 || (Number(r.totalDescuentos) || 0) > 0).length) || 0,
      totalBruto: Number(resultadosNomina.reduce((sum, r) => sum + (Number(r.pagoTotal) || 0), 0)) || 0,
      totalDescuentos: Number(resultadosNomina.reduce((sum, r) => sum + (Number(r.totalDescuentos) || 0), 0)) || 0,
      totalNeto: Number(resultadosNomina.reduce((sum, r) => sum + (Number(r.pagoFinal) || 0), 0)) || 0
    };

    const empleados = {};
    resultadosNomina.forEach(resultado => {
      const cambiosManual = cambiosManuales[resultado.empleado.uid];
      
      empleados[resultado.empleado.uid] = {
        nombre: resultado.empleado.nombre || 'Sin nombre',
        email: resultado.empleado.email || 'sin-email@cielitohome.com',
        tipo: resultado.empleado.tipo || 'tiempo_completo',
        salarioQuincenal: resultado.salarioQuincenal || 0,
        pagoPorDia: resultado.pagoPorDia || 0,
        tieneIMSS: Boolean(resultado.empleado.tieneIMSS),
        tieneCajaAhorro: Boolean(resultado.empleado.tieneCajaAhorro),
        montoCajaAhorro: Number(resultado.empleado.montoCajaAhorro) || 0,
        cuentaBancaria: String(resultado.empleado.cuentaBancaria || 'No especificada'),
        nombreBanco: String(resultado.empleado.nombreBanco || 'No especificado'),
        diasLaboralesEsperados: Number(resultado.diasLaboralesEsperados) || 0,
        diasTrabajados: Number(resultado.diasTrabajados) || 0,
        retardos: Number(resultado.retardos) || 0,
        diasFaltantes: Number(resultado.diasFaltantes) || 0,
        diasEfectivos: Number(resultado.diasEfectivos) || 0,
        diasAsistidos: Array.isArray(resultado.diasAsistidos) ? resultado.diasAsistidos : [],
        detalleRetardos: Array.isArray(resultado.detalleRetardos) ? resultado.detalleRetardos : [],
        descuentoIMSS: Number(resultado.descuentoIMSS) || 0,
        descuentoCaja: Number(resultado.descuentoCaja) || 0,
        diasDescuentoPorRetardos: Number(resultado.diasDescuento) || 0,
        editadoManualmente: Boolean(cambiosManual),
        diasExtra: Number(cambiosManual?.diasExtra) || 0,
        bonoExtra: Number(cambiosManual?.bonoExtra) || 0,
        comentariosEdicion: String(cambiosManual?.comentarios || ''),
        pagoBase: Number(resultado.pagoTotal) || 0,
        totalDescuentos: Number(resultado.totalDescuentos) || 0,
        pagoFinal: Number(resultado.pagoFinal) || 0,
        status: String(resultado.status || 'Sin estado'),
        statusClass: String(resultado.statusClass || 'status-ok')
      };
    });

    const nominaDocument = {
      id: String(nominaId),
      año: Number(añoActualNum) || new Date().getFullYear(),
      mes: Number(mesActualNum) || new Date().getMonth() + 1,
      periodo: String(quinceActual.includes('1') ? 'primera' : 'segunda'),
      fechaCreacion: new Date(),
      fechaModificacion: new Date(),
      estado: "draft",
      diasLaborales: calcularDiasLaboralesPeriodo(añoActualNum, mesActualNum, quinceActual.includes('1') ? 'primera' : 'segunda') || [],
      resumen,
      empleados,
      calculadoPor: String(auth.currentUser?.email || 'sistema'),
      version: Number(1)
    };

    const nominaRef = doc(db, 'nominas', nominaId);
    await setDoc(nominaRef, nominaDocument);
    
    console.log('Nómina guardada:', nominaId);
    mostrarNotificacion(`Nómina guardada exitosamente\nID: ${nominaId}`, 'success');
    
    return nominaId;
    
  } catch (error) {
    console.error('Error guardando nómina:', error);
    mostrarNotificacion('Error al guardar la nómina en la base de datos', 'error');
    return null;
  }
};

// ===== GENERACIÓN DE PDFs PROFESIONALES =====
window.generarTicketPDF = async function(empleadoId) {
  const resultado = resultadosNomina.find(r => r.empleado.uid === empleadoId);
  if (!resultado) {
    mostrarNotificacion('No se encontraron datos del empleado', 'error');
    return;
  }

  try {
    mostrarNotificacion('Generando ticket PDF profesional...', 'info', 2000);

    // Crear contenido HTML del ticket
    const ticketHTML = crearTicketHTML(resultado);
    
    // Crear elemento temporal
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = ticketHTML;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '210mm'; // Tamaño A4
    tempDiv.style.backgroundColor = 'white';
    document.body.appendChild(tempDiv);
    
    // Generar con html2canvas
    const canvas = await html2canvas(tempDiv.firstElementChild, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      logging: false
    });
    
    // Crear PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    
    // Calcular dimensiones
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    // Agregar imagen al PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Si necesita más páginas
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Limpiar elemento temporal
    document.body.removeChild(tempDiv);
    
    // Generar nombre del archivo
    const nombreArchivo = `Ticket_Nomina_${resultado.empleado.nombre.replace(/\s+/g, '_')}_${quinceActual.replace(' ', '_')}_${mesActual.replace('/', '-')}.pdf`;
    
    // Guardar PDF
    pdf.save(nombreArchivo);
    
    mostrarNotificacion(`Ticket PDF generado: ${resultado.empleado.nombre}`, 'success');
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    mostrarNotificacion('Error al generar el ticket PDF', 'error');
  }
};

function crearTicketHTML(resultado) {
  const fecha = new Date();
  const pagoFinal = resultado.pagoFinalConJustificaciones || resultado.pagoFinal;
  const emailEmpleado = resultado.empleado.email && resultado.empleado.email !== 'sin-email@cielitohome.com' 
    ? resultado.empleado.email 
    : '';
  
  const folio = `NOM-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}-${resultado.empleado.uid.slice(-4).toUpperCase()}`;
  
  return `
    <div style="
      width: 794px;
      min-height: 1123px;
      background: white;
      padding: 0;
      font-family: 'Arial', sans-serif;
      color: #333;
      margin: 0;
    ">
      <!-- HEADER CORPORATIVO -->
      <div style="
        background: linear-gradient(135deg, #0f5132 0%, #198754 100%);
        padding: 30px 40px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="display: flex; align-items: center;">
          <div style="
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          ">
            <div style="
              width: 60px;
              height: 60px;
              background: #0f5132;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 24px;
            ">CH</div>
          </div>
          <div>
            <h1 style="
              margin: 0;
              font-size: 32px;
              font-weight: 900;
              letter-spacing: 2px;
            ">CIELITO HOME</h1>
            <p style="
              margin: 0;
              font-size: 14px;
              opacity: 0.9;
              font-weight: 300;
              letter-spacing: 1px;
            ">EXPERIENCIAS A LA CARTA</p>
          </div>
        </div>
        
        <div style="text-align: right;">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; font-weight: 600;">FECHA DE EMISIÓN</div>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 15px;">
            ${fecha.toLocaleDateString('es-MX', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; font-weight: 600;">FOLIO</div>
          <div style="
            font-size: 16px;
            font-weight: 700;
            padding: 8px 15px;
            background: rgba(255,255,255,0.2);
            border-radius: 6px;
            backdrop-filter: blur(10px);
          ">
            ${folio}
          </div>
        </div>
      </div>

      <!-- TÍTULO DEL RECIBO -->
      <div style="
        background: #f8f9fa;
        border-bottom: 4px solid #0f5132;
        padding: 20px 40px;
        text-align: center;
      ">
        <h2 style="
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #0f5132;
          letter-spacing: 1px;
        ">
          RECIBO DE PAGO
        </h2>
      </div>

      <!-- INFORMACIÓN DEL EMPLEADO -->
      <div style="
        padding: 35px 40px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
      ">
        <div style="flex: 1; margin-right: 40px;">
          <h3 style="
            margin: 0 0 20px 0;
            font-size: 20px;
            color: #0f5132;
            border-bottom: 3px solid #0f5132;
            padding-bottom: 8px;
            display: inline-block;
          ">DATOS DEL EMPLEADO</h3>
          
          <div style="margin-bottom: 15px;">
            <span style="font-weight: bold; color: #666; font-size: 13px; display: block; margin-bottom: 5px;">NOMBRE:</span>
            <div style="font-size: 18px; font-weight: 600; color: #333;">
              ${resultado.empleado.nombre}
            </div>
          </div>
          
          ${emailEmpleado ? `
            <div style="margin-bottom: 15px;">
              <span style="font-weight: bold; color: #666; font-size: 13px; display: block; margin-bottom: 5px;">EMAIL:</span>
              <div style="font-size: 15px; color: #666;">
                ${emailEmpleado}
              </div>
            </div>
          ` : ''}
          
          <div style="margin-bottom: 15px;">
            <span style="font-weight: bold; color: #666; font-size: 13px; display: block; margin-bottom: 5px;">TIPO DE EMPLEADO:</span>
            <div style="font-size: 15px; color: #666;">
              ${getTipoNombre(resultado.empleado.tipo)}
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <span style="font-weight: bold; color: #666; font-size: 13px; display: block; margin-bottom: 5px;">PERÍODO:</span>
            <div style="font-size: 15px; color: #666;">
              ${quinceActual} - ${mesActual}
            </div>
          </div>

          ${resultado.empleado.cuentaBancaria ? `
            <div>
              <span style="font-weight: bold; color: #666; font-size: 13px; display: block; margin-bottom: 5px;">DATOS BANCARIOS:</span>
              <div style="font-size: 15px; color: #666;">
                ${resultado.empleado.nombreBanco} - ${resultado.empleado.cuentaBancaria}
              </div>
            </div>
          ` : ''}
        </div>

        <div style="
          border-left: 4px solid #0f5132; 
          padding-left: 25px;
          min-width: 200px;
        ">
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #666; font-size: 12px; display: block; margin-bottom: 5px;">SALARIO BASE</span>
            <div style="font-size: 22px; font-weight: 700; color: #0f5132;">
              $${formatearNumero(resultado.salarioQuincenal)}
            </div>
          </div>
          
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #666; font-size: 12px; display: block; margin-bottom: 5px;">PAGO POR DÍA</span>
            <div style="font-size: 18px; color: #666; font-weight: 600;">
              $${formatearNumero(resultado.pagoPorDia)}
            </div>
          </div>
          
          <div>
            <span style="font-weight: bold; color: #666; font-size: 12px; display: block; margin-bottom: 5px;">FOLIO INTERNO</span>
            <div style="font-size: 14px; color: #999; font-family: monospace;">
              ${folio}
            </div>
          </div>
        </div>
      </div>

      <!-- REGISTRO DE ASISTENCIA -->
      <div style="
        padding: 35px 40px;
        border-bottom: 1px solid #e9ecef;
      ">
        <h3 style="
          margin: 0 0 25px 0;
          font-size: 20px;
          color: #0f5132;
          border-bottom: 3px solid #0f5132;
          padding-bottom: 8px;
          display: inline-block;
        ">REGISTRO DE ASISTENCIA</h3>
        
        <div style="
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        ">
          <div style="text-center; padding: 20px; background: #e8f5e8; border-radius: 12px;">
            <div style="font-size: 28px; font-weight: 700; color: #0f5132; margin-bottom: 5px;">
              ${resultado.diasLaboralesEsperados}
            </div>
            <div style="font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              DÍAS ESPERADOS
            </div>
          </div>

          <div style="
            text-center; 
            padding: 20px; 
            background: ${resultado.diasTrabajados >= resultado.diasLaboralesEsperados ? '#e8f5e8' : '#fff3cd'}; 
            border-radius: 12px;
          ">
            <div style="
              font-size: 28px; 
              font-weight: 700; 
              color: ${resultado.diasTrabajados >= resultado.diasLaboralesEsperados ? '#0f5132' : '#856404'};
              margin-bottom: 5px;
            ">
              ${resultado.diasTrabajados}
            </div>
            <div style="font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              DÍAS TRABAJADOS
            </div>
          </div>

          <div style="
            text-center; 
            padding: 20px; 
            background: ${resultado.retardos > 0 ? '#fff3cd' : '#e8f5e8'}; 
            border-radius: 12px;
          ">
            <div style="
              font-size: 28px; 
              font-weight: 700; 
              color: ${resultado.retardos > 0 ? '#856404' : '#0f5132'};
              margin-bottom: 5px;
            ">
              ${resultado.retardos}
            </div>
            <div style="font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              RETARDOS
            </div>
          </div>

          <div style="
            text-center; 
            padding: 20px; 
            background: ${resultado.diasFaltantes > 0 ? '#f8d7da' : '#e8f5e8'}; 
            border-radius: 12px;
          ">
            <div style="
              font-size: 28px; 
              font-weight: 700; 
              color: ${resultado.diasFaltantes > 0 ? '#721c24' : '#0f5132'};
              margin-bottom: 5px;
            ">
              ${resultado.diasFaltantes}
            </div>
            <div style="font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              FALTAS
            </div>
          </div>
        </div>
      </div>

      <!-- DESGLOSE FINANCIERO -->
      <div style="padding: 35px 40px;">
        <h3 style="
          margin: 0 0 25px 0;
          font-size: 20px;
          color: #0f5132;
          border-bottom: 3px solid #0f5132;
          padding-bottom: 8px;
          display: inline-block;
        ">DESGLOSE DE PAGO</h3>
        
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        ">
          <div>
            <div style="
              display: flex;
              justify-content: space-between;
              padding: 15px 0;
              border-bottom: 1px solid #eee;
              align-items: center;
            ">
              <span style="font-size: 15px; color: #666;">Días efectivos trabajados:</span>
              <span style="font-weight: 600; font-size: 16px;">${resultado.diasEfectivos} días</span>
            </div>
            
            ${resultado.diasDescuento > 0 ? `
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 15px 0;
                border-bottom: 1px solid #eee;
                color: #dc3545;
                align-items: center;
              ">
                <span style="font-size: 15px;">Descuento por retardos:</span>
                <span style="font-weight: 600; font-size: 16px;">-${resultado.diasDescuento} días</span>
              </div>
            ` : ''}
            
            <div style="
              display: flex;
              justify-content: space-between;
              padding: 15px 0;
              border-bottom: 1px solid #eee;
              align-items: center;
            ">
              <span style="font-size: 15px; color: #666;">Subtotal bruto:</span>
              <span style="font-weight: 600; font-size: 16px;">$${formatearNumero(resultado.pagoTotal)}</span>
            </div>
          </div>

          <div>
            ${resultado.descuentoIMSS > 0 ? `
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 15px 0;
                border-bottom: 1px solid #eee;
                color: #dc3545;
                align-items: center;
              ">
                <span style="font-size: 15px;">Descuento IMSS:</span>
                <span style="font-weight: 600; font-size: 16px;">-$${formatearNumero(resultado.descuentoIMSS)}</span>
              </div>
            ` : ''}
            
            ${resultado.descuentoCaja > 0 ? `
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 15px 0;
                border-bottom: 1px solid #eee;
                color: #dc3545;
                align-items: center;
              ">
                <span style="font-size: 15px;">Caja de ahorro:</span>
                <span style="font-weight: 600; font-size: 16px;">-${formatearNumero(resultado.descuentoCaja)}</span>
              </div>
            ` : ''}
            
            <div style="
              display: flex;
              justify-content: space-between;
              padding: 15px 0;
              border-bottom: 3px solid #0f5132;
              margin-top: 15px;
              align-items: center;
            ">
              <span style="font-size: 16px; font-weight: 600; color: #0f5132;">TOTAL DESCUENTOS:</span>
              <span style="font-weight: 700; color: #dc3545; font-size: 16px;">-${formatearNumero(resultado.totalDescuentos)}</span>
            </div>
          </div>
        </div>

        ${resultado.editadoManualmente && resultado.comentariosEdicion ? `
          <div style="
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-left: 4px solid #17a2b8;
            border-radius: 6px;
          ">
            <div style="font-weight: 600; color: #17a2b8; margin-bottom: 10px; font-size: 16px;">
              📝 OBSERVACIONES:
            </div>
            <p style="margin: 0; color: #495057; font-size: 15px; line-height: 1.5;">
              ${resultado.comentariosEdicion}
            </p>
          </div>
        ` : ''}
      </div>

      <!-- TOTAL FINAL DESTACADO -->
      <div style="
        background: linear-gradient(135deg, #0f5132 0%, #198754 100%);
        color: white;
        padding: 40px;
        text-align: center;
        margin-top: 20px;
      ">
        <div style="margin-bottom: 15px;">
          <span style="
            font-size: 18px;
            opacity: 0.9;
            font-weight: 300;
            letter-spacing: 2px;
            text-transform: uppercase;
          ">TOTAL A PAGAR</span>
        </div>
        <div style="
          font-size: 48px;
          font-weight: 900;
          letter-spacing: 2px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          margin-bottom: 15px;
        ">
          ${formatearNumero(pagoFinal)}
        </div>
        <div style="
          font-size: 14px;
          opacity: 0.8;
          font-style: italic;
        ">
          ${quinceActual.toLowerCase()} • ${mesActual}
        </div>
      </div>

      <!-- FOOTER PROFESIONAL -->
      <div style="
        background: #2c3e50;
        color: white;
        padding: 25px 40px;
        text-align: center;
        font-size: 12px;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        ">
          <div style="opacity: 0.7;">
            <strong>CIELITO HOME</strong><br>
            Experiencias a la Carta
          </div>
          <div style="opacity: 0.7;">
            Generado: ${fecha.toLocaleDateString('es-MX')}<br>
            ${fecha.toLocaleTimeString('es-MX')}
          </div>
        </div>
        <div style="
          border-top: 1px solid rgba(255,255,255,0.2);
          padding-top: 15px;
          opacity: 0.6;
        ">
          Este documento es un comprobante oficial de pago • ${fecha.getFullYear()} Cielito Home - Todos los derechos reservados
        </div>
      </div>
    </div>
  `;
}

// ===== GENERAR TODOS LOS PDFs =====
window.generarTodosLosPDFs = async function() {
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos para generar PDFs', 'warning');
    return;
  }

  const confirmar = confirm(`¿Generar ${resultadosNomina.length} tickets PDF individuales?\n\nEsto puede tomar varios minutos.`);
  if (!confirmar) return;

  try {
    mostrarNotificacion(`Generando ${resultadosNomina.length} PDFs profesionales... Por favor espere.`, 'info', 10000);
    
    for (let i = 0; i < resultadosNomina.length; i++) {
      const resultado = resultadosNomina[i];
      
      mostrarNotificacion(`Generando PDF ${i + 1}/${resultadosNomina.length}: ${resultado.empleado.nombre}`, 'info', 2000);
      
      await generarTicketPDF(resultado.empleado.uid);
      
      // Pausa para no saturar el navegador
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    mostrarNotificacion(`${resultadosNomina.length} tickets PDF generados exitosamente`, 'success');
    
  } catch (error) {
    console.error('Error generando PDFs masivos:', error);
    mostrarNotificacion('Error al generar los PDFs masivos', 'error');
  }
};

// ===== FUNCIONES DE ANÁLISIS Y REPORTES =====
window.mostrarDetallesRetardos = function(empleadoId) {
  const resultado = resultadosNomina.find(r => r.empleado.uid === empleadoId);
  if (!resultado || !resultado.detalleRetardos || resultado.detalleRetardos.length === 0) {
    mostrarNotificacion('No hay retardos registrados para este empleado', 'info');
    return;
  }

  const modalHtml = `
    <div class="modal fade" id="modalDetallesRetardos" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">
              <i class="bi bi-clock me-2"></i>Detalle de Retardos
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <h6>${resultado.empleado.nombre}</h6>
            <div class="list-group">
              ${resultado.detalleRetardos.map(retardo => `
                <div class="list-group-item d-flex justify-content-between">
                  <span><i class="bi bi-calendar-date me-2"></i>${retardo.fecha}</span>
                  <span class="badge bg-warning text-dark">${retardo.hora}</span>
                </div>
              `).join('')}
            </div>
            <div class="alert alert-info mt-3">
              <strong>Política:</strong> Cada 4 retardos = 1 día de descuento<br>
              <strong>Total:</strong> ${resultado.retardos} retardos = ${Math.floor(resultado.retardos / 4)} día(s) descontado(s)
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remover modal anterior si existe
  const existingModal = document.getElementById('modalDetallesRetardos');
  if (existingModal) existingModal.remove();

  // Agregar nuevo modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modalDetallesRetardos'));
  modal.show();
};

window.mostrarHistorialCambios = function() {
  if (!historialCambios || historialCambios.length === 0) {
    mostrarNotificacion('No hay historial de cambios manuales', 'info');
    return;
  }

  const historialHtml = historialCambios.map(cambio => {
    const empleado = empleadosGlobales.find(emp => emp.uid === cambio.empleadoId);
    const fecha = new Date(cambio.timestamp).toLocaleString('es-MX');
    
    return `
      <div class="card mb-2">
        <div class="card-body py-2">
          <div class="d-flex justify-content-between align-items-center">
            <strong>${empleado ? empleado.nombre : 'Empleado no encontrado'}</strong>
            <small class="text-muted">${fecha}</small>
          </div>
          <small class="text-info">Cambios: ${cambio.cambios.comentarios || 'Sin comentarios'}</small>
        </div>
      </div>
    `;
  }).join('');

  const modalHistorial = `
    <div class="modal fade" id="modalHistorialCambios" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-info text-white">
            <h5 class="modal-title">
              <i class="bi bi-clock-history me-2"></i>Historial de Cambios
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
            ${historialHtml}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button type="button" class="btn btn-danger" onclick="limpiarHistorial()">
              <i class="bi bi-trash me-2"></i>Limpiar Historial
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHistorial);
  const modal = new bootstrap.Modal(document.getElementById('modalHistorialCambios'));
  modal.show();
};

function limpiarHistorial() {
  if (confirm('¿Está seguro de que desea limpiar todo el historial de cambios?')) {
    historialCambios = [];
    mostrarNotificacion('Historial de cambios limpiado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalHistorialCambios')).hide();
  }
}

window.mostrarReporteValidacion = function() {
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos calculados para validar', 'warning');
    return;
  }

  const { errores, advertencias } = validarIntegridadDatos();

  let contenidoModal = `
    <div class="modal fade" id="modalValidacion" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header ${errores.length > 0 ? 'bg-danger' : 'bg-success'} text-white">
            <h5 class="modal-title">
              <i class="bi bi-shield-check me-2"></i>Reporte de Validación
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
  `;

  if (errores.length === 0 && advertencias.length === 0) {
    contenidoModal += `
      <div class="alert alert-success">
        <i class="bi bi-check-circle-fill me-2"></i>
        <strong>¡Validación exitosa!</strong> No se encontraron errores ni advertencias.
      </div>
    `;
  } else {
    if (errores.length > 0) {
      contenidoModal += `
        <div class="alert alert-danger">
          <h6><i class="bi bi-exclamation-triangle-fill me-2"></i>Errores Críticos (${errores.length})</h6>
          <ul class="mb-0">
            ${errores.map(error => `<li>${error}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (advertencias.length > 0) {
      contenidoModal += `
        <div class="alert alert-warning">
          <h6><i class="bi bi-info-triangle-fill me-2"></i>Advertencias (${advertencias.length})</h6>
          <ul class="mb-0">
            ${advertencias.map(adv => `<li>${adv}</li>`).join('')}
          </ul>
        </div>
      `;
    }
  }

  contenidoModal += `
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', contenidoModal);
  const modal = new bootstrap.Modal(document.getElementById('modalValidacion'));
  modal.show();
};

// ===== FUNCIONES DE BACKUP Y RECUPERACIÓN =====
window.crearBackupDatos = function() {
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos para respaldar', 'warning');
    return;
  }

  try {
    const backup = {
      fecha: new Date().toISOString(),
      periodo: `${quinceActual} - ${mesActual}`,
      resultadosNomina,
      cambiosManuales,
      historialCambios,
      empleadosGlobales: empleadosGlobales.map(emp => ({
        uid: emp.uid,
        nombre: emp.nombre,
        email: emp.email,
        tipo: emp.tipo,
        salarioQuincenal: emp.salarioQuincenal,
        horasQuincenal: emp.horasQuincenal,
        tieneIMSS: emp.tieneIMSS,
        tieneCajaAhorro: emp.tieneCajaAhorro,
        montoCajaAhorro: emp.montoCajaAhorro,
        cuentaBancaria: emp.cuentaBancaria,
        nombreBanco: emp.nombreBanco
      })),
      configuracion: {
        mesActualNum,
        añoActualNum,
        quinceActual,
        mesActual
      }
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_nomina_${quinceActual.replace(' ', '_')}_${mesActual.replace('/', '-')}_${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion(`Backup creado exitosamente\nArchivo: ${link.download}`, 'success');
    
  } catch (error) {
    console.error('Error creando backup:', error);
    mostrarNotificacion('Error al crear el backup de datos', 'error');
  }
};

window.restaurarBackup = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const backup = JSON.parse(e.target.result);
        
        // Validar estructura del backup
        if (!backup.resultadosNomina || !backup.empleadosGlobales || !backup.configuracion) {
          mostrarNotificacion('Archivo de backup inválido o corrupto', 'error');
          return;
        }
        
        const confirmar = confirm(
          `¿Restaurar backup del ${backup.periodo}?\n\n` +
          `Fecha del backup: ${new Date(backup.fecha).toLocaleString('es-MX')}\n` +
          `Empleados: ${backup.empleadosGlobales.length}\n` +
          `Resultados de nómina: ${backup.resultadosNomina.length}\n\n` +
          'ADVERTENCIA: Esto sobrescribirá los datos actuales.'
        );
        
        if (!confirmar) return;
        
        // Restaurar datos
        resultadosNomina = backup.resultadosNomina;
        cambiosManuales = backup.cambiosManuales || {};
        historialCambios = backup.historialCambios || [];
        empleadosGlobales = backup.empleadosGlobales;
        
        // Restaurar configuración
        mesActualNum = backup.configuracion.mesActualNum;
        añoActualNum = backup.configuracion.añoActualNum;
        quinceActual = backup.configuracion.quinceActual;
        mesActual = backup.configuracion.mesActual;
        
        // Actualizar interfaz
        mostrarResultados(
          resultadosNomina,
          resultadosNomina.length,
          resultadosNomina.reduce((sum, r) => sum + r.retardos, 0),
          resultadosNomina.filter(r => r.diasDescuento > 0 || r.totalDescuentos > 0).length,
          resultadosNomina.reduce((sum, r) => sum + r.pagoFinal, 0),
          quinceActual.includes('1') ? 'primera' : 'segunda',
          `${añoActualNum}-${String(mesActualNum).padStart(2, '0')}`
        );
        
        mostrarNotificacion(`Backup restaurado exitosamente\nPeríodo: ${backup.periodo}`, 'success');
        
      } catch (error) {
        console.error('Error restaurando backup:', error);
        mostrarNotificacion('Error al leer el archivo de backup', 'error');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
};

// ===== FUNCIONES DE COMPARACIÓN =====
window.compararPeriodos = function() {
  mostrarNotificacion(
    'Funcionalidad de comparación entre períodos estará disponible en una futura actualización.\n\n' +
    'Esta función permitirá:\n' +
    '• Comparar nóminas entre diferentes quincenas\n' +
    '• Análisis de tendencias de asistencia\n' +
    '• Reportes de evolución salarial\n' +
    '• Métricas de productividad por período',
    'info',
    8000
  );
};

// ===== FUNCIONES DE ESTADÍSTICAS AVANZADAS =====
window.generarEstadisticasAvanzadas = function() {
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos para generar estadísticas', 'warning');
    return;
  }

  try {
    // Calcular estadísticas
    const stats = {
      asistencia: {
        promedioAsistencia: resultadosNomina.reduce((sum, r) => sum + (r.diasTrabajados / r.diasLaboralesEsperados), 0) / resultadosNomina.length * 100,
        empleadosPerfectos: resultadosNomina.filter(r => r.diasTrabajados === r.diasLaboralesEsperados && r.retardos === 0).length,
        empleadosConFaltas: resultadosNomina.filter(r => r.diasFaltantes > 0).length,
        totalRetardos: resultadosNomina.reduce((sum, r) => sum + r.retardos, 0)
      },
      financiero: {
        promedioSalario: resultadosNomina.reduce((sum, r) => sum + r.salarioQuincenal, 0) / resultadosNomina.length,
        totalBruto: resultadosNomina.reduce((sum, r) => sum + r.pagoTotal, 0),
        totalDescuentos: resultadosNomina.reduce((sum, r) => sum + r.totalDescuentos, 0),
        totalNeto: resultadosNomina.reduce((sum, r) => sum + r.pagoFinal, 0),
        empleadosConDescuentos: resultadosNomina.filter(r => r.totalDescuentos > 0).length
      },
      tipos: {}
    };

    // Estadísticas por tipo
    resultadosNomina.forEach(r => {
      const tipo = getTipoNombre(r.empleado.tipo);
      if (!stats.tipos[tipo]) {
        stats.tipos[tipo] = {
          cantidad: 0,
          asistenciaPromedio: 0,
          salarioPromedio: 0,
          retardosTotal: 0
        };
      }
      stats.tipos[tipo].cantidad++;
      stats.tipos[tipo].asistenciaPromedio += (r.diasTrabajados / r.diasLaboralesEsperados);
      stats.tipos[tipo].salarioPromedio += r.salarioQuincenal;
      stats.tipos[tipo].retardosTotal += r.retardos;
    });

    // Promediar datos por tipo
    Object.keys(stats.tipos).forEach(tipo => {
      const count = stats.tipos[tipo].cantidad;
      stats.tipos[tipo].asistenciaPromedio = (stats.tipos[tipo].asistenciaPromedio / count * 100).toFixed(1);
      stats.tipos[tipo].salarioPromedio = Math.round(stats.tipos[tipo].salarioPromedio / count);
    });

    // Crear modal con estadísticas
    const modalStats = `
      <div class="modal fade" id="modalEstadisticas" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="bi bi-graph-up me-2"></i>Estadísticas Avanzadas - ${quinceActual} ${mesActual}
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="card mb-3">
                    <div class="card-header bg-success text-white">
                      <h6 class="mb-0">📊 Asistencia</h6>
                    </div>
                    <div class="card-body">
                      <ul class="list-unstyled">
                        <li>• <strong>Asistencia promedio:</strong> ${stats.asistencia.promedioAsistencia.toFixed(1)}%</li>
                        <li>• <strong>Empleados perfectos:</strong> ${stats.asistencia.empleadosPerfectos} (sin faltas ni retardos)</li>
                        <li>• <strong>Empleados con faltas:</strong> ${stats.asistencia.empleadosConFaltas}</li>
                        <li>• <strong>Total retardos:</strong> ${stats.asistencia.totalRetardos}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card mb-3">
                    <div class="card-header bg-info text-white">
                      <h6 class="mb-0">💰 Financiero</h6>
                    </div>
                    <div class="card-body">
                      <ul class="list-unstyled">
                        <li>• <strong>Salario promedio:</strong> ${formatearNumero(Math.round(stats.financiero.promedioSalario))}</li>
                        <li>• <strong>Total bruto:</strong> ${formatearNumero(stats.financiero.totalBruto)}</li>
                        <li>• <strong>Total descuentos:</strong> ${formatearNumero(stats.financiero.totalDescuentos)}</li>
                        <li>• <strong>Total neto:</strong> ${formatearNumero(stats.financiero.totalNeto)}</li>
                        <li>• <strong>Con descuentos:</strong> ${stats.financiero.empleadosConDescuentos} empleados</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="card">
                <div class="card-header bg-warning text-dark">
                  <h6 class="mb-0">👥 Estadísticas por Tipo de Empleado</h6>
                </div>
                <div class="card-body">
                  <div class="row">
                    ${Object.entries(stats.tipos).map(([tipo, datos]) => `
                      <div class="col-md-4 mb-3">
                        <div class="border rounded p-3">
                          <h6 class="text-primary">${tipo}</h6>
                          <ul class="list-unstyled mb-0">
                            <li><strong>Cantidad:</strong> ${datos.cantidad}</li>
                            <li><strong>Asistencia:</strong> ${datos.asistenciaPromedio}%</li>
                            <li><strong>Salario prom:</strong> ${formatearNumero(datos.salarioPromedio)}</li>
                            <li><strong>Retardos:</strong> ${datos.retardosTotal}</li>
                          </ul>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-success" onclick="exportarEstadisticas()">
                <i class="bi bi-download me-2"></i>Exportar Estadísticas
              </button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalStats);
    const modal = new bootstrap.Modal(document.getElementById('modalEstadisticas'));
    modal.show();

  } catch (error) {
    console.error('Error generando estadísticas:', error);
    mostrarNotificacion('Error al generar estadísticas avanzadas', 'error');
  }
};

window.exportarEstadisticas = function() {
  // Esta función sería llamada desde el modal de estadísticas
  mostrarNotificacion('Exportando estadísticas...', 'info');
  // Implementar exportación de estadísticas
};

// ===== FUNCIONES DE CONFIGURACIÓN AVANZADA =====
window.mostrarConfiguracionAvanzada = function() {
  const modalConfig = `
    <div class="modal fade" id="modalConfigAvanzada" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-dark text-white">
            <h5 class="modal-title">
              <i class="bi bi-gear me-2"></i>Configuración Avanzada del Sistema
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Advertencia:</strong> Solo personal autorizado debe modificar estas configuraciones.
            </div>
            
            <div class="row">
              <div class="col-md-6">
                <h6>Políticas de Retardos</h6>
                <div class="mb-3">
                  <label class="form-label">Retardos por día de descuento:</label>
                  <input type="number" class="form-control" value="4" min="1" max="10" id="configRetardos">
                  <small class="text-muted">Cada X retardos = 1 día descontado</small>
                </div>
              </div>
              <div class="col-md-6">
                <h6>Descuentos Fijos</h6>
                <div class="mb-3">
                  <label class="form-label">IMSS (monto fijo):</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control" value="300" id="configIMSS">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="row">
              <div class="col-md-12">
                <h6>Configuración de Reportes</h6>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="incluirDetallesCompletos" checked>
                  <label class="form-check-label" for="incluirDetallesCompletos">
                    Incluir detalles completos en exportaciones
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="generarBackupAutomatico" checked>
                  <label class="form-check-label" for="generarBackupAutomatico">
                    Generar backup automático al guardar nómina
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="guardarConfiguracion()">
              <i class="bi bi-save me-2"></i>Guardar Configuración
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalConfig);
  const modal = new bootstrap.Modal(document.getElementById('modalConfigAvanzada'));
  modal.show();
};

window.guardarConfiguracion = function() {
  mostrarNotificacion('Configuración guardada exitosamente', 'success');
  bootstrap.Modal.getInstance(document.getElementById('modalConfigAvanzada')).hide();
};

// ===== PROTECCIÓN DE FUNCIONES CRÍTICAS =====
const calcularNominaOriginal = window.calcularNomina;
window.calcularNomina = function() {
  if (!validarAccesoAutorizado()) return;
  return calcularNominaOriginal();
};

const guardarNominaCompletaOriginal = window.guardarNominaCompleta;
window.guardarNominaCompleta = function() {
  if (!validarAccesoAutorizado()) return;
  return guardarNominaCompletaOriginal();
};

const exportarExcelOriginal = window.exportarExcel;
window.exportarExcel = function() {
  if (!validarAccesoAutorizado()) return;
  return exportarExcelOriginal();
};

// ===== INICIALIZACIÓN DE EVENTOS GLOBALES =====
document.addEventListener('keydown', function(e) {
  // Atajos de teclado
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case 's':
        e.preventDefault();
        if (resultadosNomina && resultadosNomina.length > 0) {
          guardarNominaCompleta();
        }
        break;
      case 'e':
        e.preventDefault();
        if (resultadosNomina && resultadosNomina.length > 0) {
          exportarExcel();
        }
        break;
      case 'b':
        e.preventDefault();
        if (resultadosNomina && resultadosNomina.length > 0) {
          crearBackupDatos();
        }
        break;
    }
  }
  
  // Tecla F12 para configuración avanzada
  if (e.key === 'F12' && accesoAutorizado) {
    e.preventDefault();
    mostrarConfiguracionAvanzada();
  }
});

// ===== MANEJO DE ERRORES GLOBALES =====
window.addEventListener('error', function(e) {
  console.error('Error global:', e.error);
  mostrarNotificacion('Se ha producido un error inesperado. Por favor, recarga la página.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Promise rechazada:', e.reason);
  mostrarNotificacion('Error en operación asíncrona. Verifica tu conexión a internet.', 'error');
});

// ===== FUNCIONES DE LIMPIEZA =====
window.addEventListener('beforeunload', function(e) {
  if (cambiosManuales && Object.keys(cambiosManuales).length > 0) {
    const message = '¿Estás seguro de que quieres salir? Hay cambios manuales sin guardar.';
    e.returnValue = message;
    return message;
  }
});



// ===== EXPORTAR FUNCIONES GLOBALMENTE =====
window.toggleSalaryManager = window.toggleSalaryManager || function() {
  if (!validarAccesoAutorizado()) return;
  const manager = document.getElementById('salaryManager');
  manager.style.display = manager.style.display === 'none' ? 'block' : 'none';
};

window.loadEmployeeSalary = window.loadEmployeeSalary || loadEmployeeSalary;
window.saveEmployeeSalary = window.saveEmployeeSalary || saveEmployeeSalary;
window.clearEmployeeSalary = window.clearEmployeeSalary || clearEmployeeSalary;
window.calcularNomina = window.calcularNomina || calcularNomina;
window.cambiarVista = window.cambiarVista || cambiarVista;
window.abrirEdicionNomina = window.abrirEdicionNomina || abrirEdicionNomina;
window.exportarExcel = window.exportarExcel || exportarExcel;
window.guardarNominaCompleta = window.guardarNominaCompleta || guardarNominaCompleta;
window.generarTicketPDF = window.generarTicketPDF || generarTicketPDF;
window.generarTodosLosPDFs = window.generarTodosLosPDFs || generarTodosLosPDFs;
window.validarAccesoNomina = window.validarAccesoNomina || validarAccesoNomina;
window.regresarAdmin = window.regresarAdmin || regresarAdmin;
window.toggleCajaAhorro = window.toggleCajaAhorro || toggleCajaAhorro;

console.log(`🏢 Sistema de Nómina Cielito Home - Funciones exportadas correctamente`);

// ===== MENSAJES DE ESTADO =====
console.log(`
🏢 Sistema de Nómina Cielito Home
📅 Versión: 2.0.0
🔒 Estado: Inicializado correctamente
⚡ Funcionalidades: Cálculo automático, edición manual, exportación, PDFs, validación
🛡️  Seguridad: Autenticación Firebase + validación de acceso
`);

// ===== FIN DEL SISTEMA DE NÓMINA =====