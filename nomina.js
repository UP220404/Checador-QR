// ===== CONFIGURACIÓN FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

// ===== PERSISTENCIA OFFLINE =====
// NOTA: Persistencia deshabilitada temporalmente - Firebase ya tiene caché automático
// que funciona sin configuración adicional. Si se necesita persistencia offline,
// debe habilitarse ANTES de cualquier otra operación de Firestore.
/*
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('✅ Persistencia offline habilitada');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Múltiples pestañas abiertas, persistencia deshabilitada');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Navegador no soporta persistencia');
    }
  });
*/

// ===== VARIABLES GLOBALES =====
let empleadosGlobales = [];
let resultadosNomina = [];
let cambiosManuales = {};
let historialCambios = [];
let diasFestivosCache = {}; // Cache de días festivos

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

// NOTA: Persistencia offline comentada - causa conflicto de inicialización
/*
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('✅ Persistencia offline habilitada');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Múltiples pestañas abiertas, persistencia deshabilitada');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Navegador no soporta persistencia');
    }
  });
*/

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

function calcularDiasLaborablesPeriodo(año, mes, periodo, festivosDelAño = {}) {
  const diasLaborales = [];
  const ultimoDia = new Date(año, mes, 0).getDate();

  if (periodo === 'primera') {
    // Primera catorcena: día 1 al 15
    for (let dia = 1; dia <= 15; dia++) {
      const fecha = new Date(año, mes - 1, dia);
      const diaSemana = fecha.getDay();

      // ✅ Excluir fines de semana Y días festivos
      if (diaSemana >= 1 && diaSemana <= 5 && !esDiaFestivo(año, mes, dia, festivosDelAño)) {
        diasLaborales.push(dia);
      }
    }
    // ✅ Limitar a máximo 10 días laborables
    return diasLaborales.slice(0, 10);
  } else {
    // Segunda catorcena: día 16 al fin de mes
    for (let dia = 16; dia <= ultimoDia; dia++) {
      const fecha = new Date(año, mes - 1, dia);
      const diaSemana = fecha.getDay();

      // ✅ Excluir fines de semana Y días festivos
      if (diaSemana >= 1 && diaSemana <= 5 && !esDiaFestivo(año, mes, dia, festivosDelAño)) {
        diasLaborales.push(dia);
      }
    }
    // ✅ Retornar TODOS los días laborables del 16 al fin de mes (excluyendo festivos)
    return diasLaborales;
  }
}

function validarDatosNominaExtendida() {
  if (!empleadosGlobales || empleadosGlobales.length === 0) {
    mostrarNotificacion('No se han cargado empleados', 'error');
    return false;
  }

  const tipoNominaCalculo = document.getElementById('tipoNominaCalculo').value;
  
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

  // Validación específica por tipo de nómina
  const empleadosDelTipo = empleadosConSalario.filter(emp => {
    if (tipoNominaCalculo === 'semanal') {
      return emp.tipoNomina === 'semanal';
    } else {
      return emp.tipoNomina !== 'semanal'; // Quincenal por defecto
    }
  });

  if (empleadosDelTipo.length === 0) {
    const tipoTexto = tipoNominaCalculo === 'semanal' ? 'semanal' : 'quincenal';
    mostrarNotificacion(
      `No hay empleados configurados con nómina ${tipoTexto}.\n\n` +
      `Total de empleados: ${empleadosConSalario.length}\n` +
      `Configure el tipo de nómina en "Gestionar Salarios"`,
      'warning',
      6000
    );
    return false;
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
  const button = modal.querySelector('.btn-success');
  
  // Mostrar loading en el botón
  button.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Validando...';
  button.disabled = true;
  
  setTimeout(() => {
    if (password === PASSWORD_NOMINA) {
      accesoAutorizado = true;
      bootstrap.Modal.getInstance(modal).hide();
      cargarEmpleados();
      mostrarNotificacion('✅ Acceso autorizado correctamente', 'success');
    } else {
      // Restaurar botón
      button.innerHTML = '<i class="bi bi-unlock me-2"></i>Validar Acceso';
      button.disabled = false;
      
      // Animación de error
      modal.classList.add('acceso-denegado');
      document.getElementById('passwordNomina').value = '';
      document.getElementById('passwordNomina').focus();
      
      setTimeout(() => modal.classList.remove('acceso-denegado'), 500);
      mostrarNotificacion('❌ Contraseña incorrecta', 'error');
    }
  }, 800); // Simular procesamiento
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

// Agregar después de window.regresarAdmin
window.togglePasswordVisibility = function() {
  const passwordInput = document.getElementById('passwordNomina');
  const eyeIcon = document.getElementById('eyeIcon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.className = 'bi bi-eye-slash';
  } else {
    passwordInput.type = 'password';
    eyeIcon.className = 'bi bi-eye';
  }
};

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
        ...userData,
        email: userData.correo || 'sin-email@cielitohome.com' // ← AGREGAR ESTA LÍNEA
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


// Actualizar el listener del tipo de nómina para manejar semanas
function inicializarListenersExtendido() {
  const tipoNominaCalculo = document.getElementById('tipoNominaCalculo');
  if (tipoNominaCalculo) {
    tipoNominaCalculo.addEventListener('change', function() {
      const selectorPeriodo = document.getElementById('selectorPeriodo');
      const quinceSelect = document.getElementById('quinceSelect');
      const labelPeriodo = selectorPeriodo.querySelector('label');
      
      if (this.value === 'semanal') {
        selectorPeriodo.style.display = 'block';
        labelPeriodo.textContent = 'Seleccionar Semana';
        
        // Obtener el mes seleccionado
        const monthSelect = document.getElementById('monthSelect').value;
        if (monthSelect) {
          const [año, mes] = monthSelect.split('-');
          const semanas = obtenerSemanasDelMes(parseInt(año), parseInt(mes));
          
          quinceSelect.innerHTML = '';
          semanas.forEach((semana, index) => {
            const option = document.createElement('option');
            option.value = `semana_${semana.numero}`;
            option.textContent = semana.label;
            quinceSelect.appendChild(option);
          });
          
          // Seleccionar la semana actual si está en el mes
          const semanaActual = obtenerSemanaActual();
          if (semanaActual.año === parseInt(año) && semanaActual.mes === parseInt(mes)) {
            const opcionActual = Array.from(quinceSelect.options).find(option => 
              option.textContent.includes(semanaActual.label)
            );
            if (opcionActual) {
              opcionActual.selected = true;
            }
          }
        } else {
          quinceSelect.innerHTML = '<option value="">Selecciona un mes primero</option>';
        }
      } else {
        selectorPeriodo.style.display = 'block';
        labelPeriodo.textContent = 'Quincena';
        quinceSelect.innerHTML = `
          <option value="primera">Primera Quincena (1-15)</option>
          <option value="segunda">Segunda Quincena (16-fin de mes)</option>
        `;
      }
    });
  }

  // Actualizar semanas cuando cambie el mes
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    monthSelect.addEventListener('change', function() {
      const tipoNomina = document.getElementById('tipoNominaCalculo').value;
      if (tipoNomina === 'semanal') {
        // Trigger para actualizar las semanas
        document.getElementById('tipoNominaCalculo').dispatchEvent(new Event('change'));
      }
    });
  }

  // Otros listeners existentes...
  const tipoNominaEmpleado = document.getElementById('tipoNominaEmpleado');
  if (tipoNominaEmpleado) {
    tipoNominaEmpleado.addEventListener('change', function() {
      actualizarEtiquetasSalario();
      calcularPagoPorDia();
    });
  }

  document.getElementById('individualSalary')?.addEventListener('input', calcularPagoPorDia);
  document.getElementById('individualHours')?.addEventListener('input', calcularPagoPorDia);
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

window.calcularNomina = async function() {
  if (!validarAccesoAutorizado()) return;
  if (!validarDatosNomina()) return;

  const monthSelect = document.getElementById('monthSelect').value;
  const quinceSelect = document.getElementById('quinceSelect').value;
  const tipoNominaCalculo = document.getElementById('tipoNominaCalculo').value;
  
  if (!monthSelect) {
    mostrarNotificacion('Selecciona un mes', 'warning');
    return;
  }

  const [año, mes] = monthSelect.split('-');
  const mesNum = parseInt(mes);
  const añoNum = parseInt(año);

  mesActualNum = mesNum;
  añoActualNum = añoNum;

  document.getElementById('loadingSpinner').style.display = 'block';
  document.getElementById('summaryCard').style.display = 'none';
  document.getElementById('resultsContainer').innerHTML = '';
  document.getElementById('actionButtons').style.display = 'none';

  try {
    console.log(`Calculando nómina ${tipoNominaCalculo}: ${quinceSelect} de ${mesNum}/${añoNum}`);

    // ✅ CARGAR DÍAS FESTIVOS DEL AÑO
    const festivosDelAño = await cargarDiasFestivos(añoNum);

    // Determinar días laborales según el tipo de nómina
    let diasLaborales = [];
    let periodoTexto = '';

    if (tipoNominaCalculo === 'semanal') {
      if (quinceSelect.startsWith('semana_')) {
        const numeroSemana = parseInt(quinceSelect.split('_')[1]);
        diasLaborales = obtenerDiasLaboralesSemana(añoNum, mesNum, numeroSemana);

        const semanas = obtenerSemanasDelMes(añoNum, mesNum);
        const semanaInfo = semanas.find(s => s.numero === numeroSemana);
        periodoTexto = semanaInfo ? semanaInfo.label : `Semana ${numeroSemana}`;
        quinceActual = `Nómina Semanal - ${periodoTexto}`;
      } else {
        mostrarNotificacion('Selecciona una semana específica', 'warning');
        document.getElementById('loadingSpinner').style.display = 'none';
        return;
      }
    } else {
      // ✅ Pasar festivos a la función
      diasLaborales = calcularDiasLaborablesPeriodo(añoNum, mesNum, quinceSelect, festivosDelAño);
      quinceActual = quinceSelect === 'primera' ? 'Período 1' : 'Período 2';
      periodoTexto = quinceActual;
    }

    console.log(`Días laborales del período (${periodoTexto}):`, diasLaborales);

    // ✅ Mostrar festivos detectados en el período
    const festivosEnPeriodo = diasLaborales.length > 0
      ? Object.values(festivosDelAño).filter(f => {
          const [fAño, fMes, fDia] = f.fecha.split('-').map(Number);
          return fAño === añoNum && fMes === mesNum;
        })
      : [];

    if (festivosEnPeriodo.length > 0) {
      console.log(`🎉 ${festivosEnPeriodo.length} día(s) festivo(s) excluido(s):`, festivosEnPeriodo.map(f => `${f.fecha} - ${f.nombre}`));
    }

    if (diasLaborales.length === 0) {
      mostrarNotificacion('No se encontraron días laborales para el período seleccionado', 'error');
      document.getElementById('loadingSpinner').style.display = 'none';
      return;
    }

    // Consulta de empleados
    const usuariosQuery = query(collection(db, "usuarios"));
    const usuariosSnapshot = await getDocs(usuariosQuery);
    
    const todosLosEmpleados = [];
    usuariosSnapshot.forEach(doc => {
      const userData = doc.data();
      
      if (!userData || !userData.nombre) return;
      
      if (userData.salarioQuincenal && userData.horasQuincenal) {
        todosLosEmpleados.push({
          uid: doc.id,
          nombre: userData.nombre,
          email: userData.correo || 'sin-email@cielitohome.com',
          tipo: userData.tipo || 'tiempo_completo',
          tipoNomina: userData.tipoNomina || 'quincenal',
          salarioQuincenal: userData.salarioQuincenal,
          horasQuincenal: userData.horasQuincenal,
          pagoPorDia: userData.salarioQuincenal / (userData.tipoNomina === 'semanal' ? 5 : 10),
          tieneIMSS: userData.tieneIMSS || false,
          tieneCajaAhorro: userData.tieneCajaAhorro || false,
          montoCajaAhorro: userData.montoCajaAhorro || 0,
          cuentaBancaria: userData.cuentaBancaria || '',
          nombreBanco: userData.nombreBanco || ''
        });
      }
    });

    // Filtrar empleados según el tipo de nómina seleccionado
    const empleados = todosLosEmpleados.filter(emp => {
      if (tipoNominaCalculo === 'semanal') {
        return emp.tipoNomina === 'semanal';
      } else {
        return emp.tipoNomina === 'quincenal' || !emp.tipoNomina;
      }
    });

    // Validar que hay empleados del tipo seleccionado
    if (empleados.length === 0) {
      let mensajeError = '';
      if (tipoNominaCalculo === 'semanal') {
        mensajeError = `No hay empleados configurados con nómina semanal.\n\n` +
                      `Empleados totales en el sistema: ${todosLosEmpleados.length}\n` +
                      `Empleados con nómina quincenal: ${todosLosEmpleados.filter(e => e.tipoNomina !== 'semanal').length}\n\n` +
                      `Para configurar empleados semanales:\n` +
                      `1. Ve a "Gestionar Salarios"\n` +
                      `2. Selecciona un empleado\n` +
                      `3. Cambia el "Tipo de Nómina" a "Semanal"\n` +
                      `4. Configura su salario por semana (5 días)`;
      } else {
        mensajeError = `No hay empleados configurados con nómina quincenal.\n\n` +
                      `Use "Gestionar Salarios" para configurar los salarios.`;
      }
      
      mostrarNotificacion(mensajeError, 'warning', 8000);
      document.getElementById('loadingSpinner').style.display = 'none';
      return;
    }

    console.log(`Empleados encontrados para nómina ${tipoNominaCalculo}: ${empleados.length}`);

    // Consulta de registros optimizada - solo para los días específicos
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
    
    // Procesar registros solo para los días específicos del período
    const registrosPorEmpleado = {};
    
    registrosSnapshot.forEach(doc => {
      const registro = doc.data();
      const uid = registro.uid;
      
      const fechaRegistro = registro.fecha;
      if (!fechaRegistro) return;
      
      const [regAño, regMes, regDia] = fechaRegistro.split('-').map(Number);
      
      // Solo incluir si el día está en la lista específica de días laborales
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

    // 🆕 CARGAR TODAS LAS AUSENCIAS APROBADAS DEL PERÍODO
    console.log('📋 Cargando ausencias aprobadas del período...');
    const ausenciasPorEmpleado = {};

    try {
      // Convertir quinceSelect a número para comparar (primera = 1, segunda = 2)
      const periodoNumero = quinceSelect === 'primera' ? 1 : quinceSelect === 'segunda' ? 2 : null;

      console.log(`🔍 Buscando ausencias: mes=${mesNum}, año=${añoNum}, periodo=${periodoNumero} (quinceSelect="${quinceSelect}")`);

      // Si es nómina quincenal, filtrar por período
      let qAusencias;
      if (tipoNominaCalculo === 'quincenal' && periodoNumero) {
        qAusencias = query(
          collection(db, 'ausencias'),
          where('estado', '==', 'aprobada'),
          where('quincena.mes', '==', mesNum),
          where('quincena.anio', '==', añoNum),
          where('quincena.periodo', '==', periodoNumero)
        );
      } else {
        // Para nómina semanal o si no hay período, buscar solo por mes/año
        qAusencias = query(
          collection(db, 'ausencias'),
          where('estado', '==', 'aprobada'),
          where('quincena.mes', '==', mesNum),
          where('quincena.anio', '==', añoNum)
        );
      }

      const ausenciasSnapshot = await getDocs(qAusencias);
      console.log(`✅ ${ausenciasSnapshot.size} ausencias aprobadas encontradas para el período`);

      ausenciasSnapshot.forEach(doc => {
        const ausencia = { id: doc.id, ...doc.data() };
        const email = ausencia.emailUsuario;

        console.log(`  📄 Ausencia: ${ausencia.nombreUsuario} - ${ausencia.tipo} - ${ausencia.diasJustificados} días`);

        if (!ausenciasPorEmpleado[email]) {
          ausenciasPorEmpleado[email] = [];
        }
        ausenciasPorEmpleado[email].push(ausencia);
      });
    } catch (error) {
      console.error('❌ Error cargando ausencias:', error);
    }

    for (const empleado of empleados) {
      try {
        const registros = registrosPorEmpleado[empleado.uid] || [];

        const salarioBase = empleado.salarioQuincenal;
        const pagoPorDia = empleado.pagoPorDia;

        let retardos = 0;
        let diasTrabajados = registros.length;
        const detalleRetardos = [];
        const diasAsistidos = [];
        let retardosCorregidos = 0; // 🆕 Contador de retardos corregidos

        // 🆕 Obtener ausencias del empleado
        const ausenciasEmpleado = ausenciasPorEmpleado[empleado.email] || [];

        registros.forEach(registro => {
          const [regAño, regMes, regDia] = registro.fecha.split('-').map(Number);
          diasAsistidos.push(regDia);

          // 🆕 Solo contar como retardo si NO fue corregido por ausencia
          if (registro.estado === 'retardo' && !registro.corregidoPorAusencia) {
            console.log(`⚠️ Contando retardo: ${registro.fecha} ${registro.hora} | corregidoPorAusencia=${registro.corregidoPorAusencia} | ausenciaRef=${registro.ausenciaRef}`);
            retardos++;
            detalleRetardos.push({
              fecha: registro.fecha,
              hora: registro.hora
            });
          } else if (registro.estado === 'retardo' && registro.corregidoPorAusencia) {
            console.log(`✅ Retardo corregido (NO se cuenta): ${registro.fecha} ${registro.hora}`);
            retardosCorregidos++; // 🆕 Contar retardo corregido
          } else if (registro.estado === 'puntual' && registro.corregidoPorAusencia) {
            console.log(`💚 Puntual por corrección: ${registro.fecha} ${registro.hora} (era retardo)`);
            retardosCorregidos++; // 🆕 Contar corrección
          }
        });

        // ✅ Determinar días estándar según el tipo de nómina
        const DIAS_ESTANDAR = tipoNominaCalculo === 'semanal' ? 5 : 10;

        // Contar SOLO los días asistidos que están dentro del período estándar
        const diasLaboralesEstandar = diasLaborales.slice(0, DIAS_ESTANDAR);
        const diasAsistidosValidos = diasAsistidos.filter(dia => diasLaboralesEstandar.includes(dia));
        const diasTrabajadosEfectivos = diasAsistidosValidos.length;

        // 🆕 CALCULAR DÍAS JUSTIFICADOS POR AUSENCIAS PRIMERO
        let diasJustificadosTotal = 0;
        let diasJustificadosCompletos = 0; // Solo permisos/vacaciones completas
        const justificacionesDetalle = [];

        ausenciasEmpleado.forEach(ausencia => {
          const dias = ausencia.diasJustificados || 0;
          if (dias > 0) {
            const mapeo = mapearTipoAusenciaANomina(ausencia.tipo);

            // Si es retardo justificado, NO cuenta para días trabajados ni faltas
            if (ausencia.tipo !== 'retardo_justificado') {
              diasJustificadosTotal += dias;
              diasJustificadosCompletos += dias;
            }

            justificacionesDetalle.push({
              tipo: ausencia.tipo,
              dias: dias,
              motivo: ausencia.motivo,
              nombreTipo: mapeo ? mapeo.nombre : ausencia.tipo,
              fechaInicio: ausencia.fechaInicio,
              fechaFin: ausencia.fechaFin
            });
            console.log(`✅ ${empleado.nombre}: +${dias} días por ${mapeo?.nombre || ausencia.tipo}`);
          }
        });

        // Calcular faltas sobre los días estándar - RESTANDO solo días justificados completos (no retardos)
        const faltasSinJustificar = DIAS_ESTANDAR - diasTrabajadosEfectivos - diasJustificadosCompletos;
        const cantidadFaltas = Math.max(0, faltasSinJustificar); // No puede ser negativo
        const diasFaltantes = diasLaboralesEstandar.filter(dia => !diasAsistidos.includes(dia));

        // Días trabajados mostrados = días efectivos + días justificados completos
        const diasTrabajadosMostrar = diasTrabajadosEfectivos + diasJustificadosCompletos;

        // 🔍 DEBUG para todos los empleados con ausencias
        if (ausenciasEmpleado.length > 0) {
          console.log(`🔍 CÁLCULO ${empleado.nombre}:`, {
            diasEstandar: DIAS_ESTANDAR,
            diasTrabajadosReales: diasTrabajadosEfectivos,
            diasJustificadosCompletos: diasJustificadosCompletos,
            diasTrabajadosMostrar: diasTrabajadosMostrar,
            formula: `${DIAS_ESTANDAR} - ${diasTrabajadosEfectivos} - ${diasJustificadosCompletos} = ${cantidadFaltas}`,
            faltasCalculadas: cantidadFaltas,
            ausencias: ausenciasEmpleado.length,
            detalleAusencias: justificacionesDetalle
          });
        }

        // 🔍 DEBUG: Log para ver qué está pasando
        if (empleado.nombre.includes('Lenin') || empleado.nombre.includes('lenin')) {
          console.log('🔍 DEBUG DETALLADO:', {
            empleado: empleado.nombre,
            diasLaboralesDelPeriodo: diasLaborales,
            totalDiasDelPeriodo: diasLaborales.length,
            diasLaboralesEstandar: diasLaboralesEstandar,
            diasQueAsistio: diasAsistidos,
            diasAsistidosValidos: diasAsistidosValidos,
            diasTrabajadosEfectivos: diasTrabajadosEfectivos,
            diasQueFalto: diasFaltantes,
            cantidadFaltas: cantidadFaltas
          });
        }

        // Descuento por retardos (cada 4 retardos = 1 día)
        const diasDescuentoPorRetardos = Math.floor(retardos / 4);

        // Días efectivos pagados = días trabajados - descuento por retardos + días justificados
        const diasEfectivos = diasTrabajadosEfectivos - diasDescuentoPorRetardos;
        const diasTotalesAPagar = diasEfectivos + diasJustificadosTotal;
        const pagoTotal = Math.max(0, diasTotalesAPagar * pagoPorDia);

        // Descuentos ajustados por tipo de nómina
        let descuentoIMSS = 0;
        let descuentoCaja = 0;
        
        if (empleado.tieneIMSS) {
          if (tipoNominaCalculo === 'semanal') {
            descuentoIMSS = 150; // Proporcional para una semana
          } else {
            descuentoIMSS = 300; // Quincenal completo
          }
        }
        
        if (empleado.tieneCajaAhorro && empleado.montoCajaAhorro) {
          if (tipoNominaCalculo === 'semanal') {
            descuentoCaja = Math.round(empleado.montoCajaAhorro / 2);
          } else {
            descuentoCaja = empleado.montoCajaAhorro;
          }
        }
        
        const totalDescuentos = descuentoIMSS + descuentoCaja;
        const pagoFinal = Math.max(0, pagoTotal - totalDescuentos);

        if (diasDescuentoPorRetardos > 0 || totalDescuentos > 0) empleadosConDescuento++;
        totalRetardos += retardos;

        // Estado
        let status, statusClass;
        if (cantidadFaltas > 0) {
          status = `${cantidadFaltas} falta${cantidadFaltas > 1 ? 's' : ''} • ${retardos} retardo${retardos !== 1 ? 's' : ''}`;
          statusClass = 'status-penalty';
        } else if (diasDescuentoPorRetardos > 0) {
          status = `Descuento: ${diasDescuentoPorRetardos} día${diasDescuentoPorRetardos > 1 ? 's' : ''}`;
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
          salarioQuincenal: salarioBase,
          tipoNominaEmpleado: empleado.tipoNomina,
          diasLaboralesEsperados: DIAS_ESTANDAR, // 5 días para semanal, 10 para quincenal
          diasLaboralesReales: diasLaborales.length, // Días reales del período
          diasTrabajados: diasTrabajadosMostrar, // Días trabajados mostrados (incluye justificados)
          diasTrabajadosReales: diasTrabajadosEfectivos, // Días realmente trabajados
          diasFaltantes: cantidadFaltas, // Número de faltas
          retardos,
          diasDescuento: diasDescuentoPorRetardos, // Días descontados por retardos
          diasEfectivos,
          diasJustificados: diasJustificadosTotal, // 🆕 Días justificados por ausencias
          justificacionesDetalle: justificacionesDetalle, // 🆕 Detalle de ausencias aplicadas
          tieneAusencias: ausenciasEmpleado.length > 0, // 🆕 Indicador de ausencias
          retardosCorregidos: retardosCorregidos, // 🆕 Contador de retardos corregidos
          tieneCorrecciones: retardosCorregidos > 0, // 🆕 Indicador de correcciones
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
          diasFaltantesDetalle: diasFaltantes,
          periodoTexto
        };
        
        resultados.push(resultado);
        totalNominaFinal += Math.round(resultado.pagoFinal);
        
      } catch (error) {
        console.error(`Error procesando empleado ${empleado.nombre}:`, error);
        mostrarNotificacion(`Error procesando ${empleado.nombre}, se omitirá`, 'warning');
      }
    }

    // Actualizar variables globales
    mesActual = `${mesNum}/${añoNum}`;
    resultadosNomina = resultados;

    // ✅ CARGAR CAMBIOS MANUALES GUARDADOS EN FIREBASE
    await cargarTodosCambiosDelPeriodo();

    // ✅ APLICAR CAMBIOS MANUALES A LOS RESULTADOS
    if (Object.keys(cambiosManuales).length > 0) {
      console.log('🔄 Aplicando cambios manuales guardados...');

      resultadosNomina.forEach((resultado, index) => {
        const cambiosManual = cambiosManuales[resultado.empleado.uid];

        if (cambiosManual) {
          console.log(`✏️ Aplicando cambios a ${resultado.empleado.nombre}`);

          // Recalcular con los datos editados
          const diasDescuentoPorRetardos = Math.floor(cambiosManual.retardos / 4);
          const diasEfectivos = Math.max(0, cambiosManual.diasTrabajados - diasDescuentoPorRetardos);
          const diasTotalesAPagar = diasEfectivos + (cambiosManual.diasJustificados || 0) + (cambiosManual.diasExtra || 0);

          const pagoBase = diasTotalesAPagar * resultado.pagoPorDia;
          const pagoConBono = pagoBase + (cambiosManual.bonoExtra || 0);
          const pagoFinal = Math.max(0, pagoConBono - resultado.totalDescuentos);

          // Actualizar resultado
          resultadosNomina[index] = {
            ...resultado,
            diasTrabajados: cambiosManual.diasTrabajados,
            retardos: cambiosManual.retardos,
            diasDescuento: diasDescuentoPorRetardos,
            diasEfectivos: diasEfectivos,
            diasExtra: cambiosManual.diasExtra || 0,
            bonoExtra: cambiosManual.bonoExtra || 0,
            diasJustificados: cambiosManual.diasJustificados || 0,
            pagoTotal: Math.round(pagoBase),
            pagoFinal: Math.round(pagoFinal),
            editadoManualmente: true,
            comentariosEdicion: cambiosManual.comentarios,
            justificacionesDetalle: cambiosManual.justificacionesDetalle || []
          };
        }
      });

      // Recalcular totales
      totalNominaFinal = resultadosNomina.reduce((sum, r) => sum + r.pagoFinal, 0);
      totalRetardos = resultadosNomina.reduce((sum, r) => sum + r.retardos, 0);
      empleadosConDescuento = resultadosNomina.filter(r => r.diasDescuento > 0 || r.totalDescuentos > 0).length;

      mostrarNotificacion(
        `✅ Se aplicaron ${Object.keys(cambiosManuales).length} cambio(s) manual(es) guardado(s)`,
        'success',
        4000
      );
    }

    // Mostrar resultados
    const tipoTexto = tipoNominaCalculo === 'semanal' ? 'Semanal' : 'Quincenal';
    mostrarResultados(resultados, empleados.length, totalRetardos, empleadosConDescuento, totalNominaFinal, quinceSelect, monthSelect, tipoTexto);

    // Mostrar información específica para nómina semanal
    if (tipoNominaCalculo === 'semanal') {
      mostrarNotificacion(
        `✅ Nómina semanal calculada exitosamente\n\n` +
        `📅 Período: ${periodoTexto}\n` +
        `👥 Empleados: ${empleados.length}\n` +
        `📊 Días laborales considerados: 5 días (L-V)\n` +
        `📋 Días específicos: ${diasLaborales.slice(0, 5).join(', ')}\n` +
        `💰 Total a pagar: $${formatearNumero(totalNominaFinal)}`,
        'success',
        8000
      );
    }

  } catch (error) {
    console.error('Error calculando nómina:', error);
    mostrarNotificacion('Error al calcular la nómina: ' + error.message, 'error');
  } finally {
    document.getElementById('loadingSpinner').style.display = 'none';
  }
};

// Actualizar la función mostrarResultados para incluir el tipo de nómina
function mostrarResultados(resultados, totalEmpleados, totalRetardos, empleadosConDescuento, totalPago, periodo, mes, tipoNomina = 'Quincenal') {
  // Actualizar resumen
  document.getElementById('totalEmployees').textContent = totalEmpleados;
  document.getElementById('totalRetards').textContent = totalRetardos;
  document.getElementById('employeesWithPenalty').textContent = empleadosConDescuento;
  document.getElementById('totalPayout').textContent = `$${formatearNumero(totalPago)}`;
  document.getElementById('summaryCard').style.display = 'block';
  document.getElementById('viewControls').style.display = 'block';
  document.getElementById('actionButtons').style.display = 'flex';

  // Actualizar el título del resumen para mostrar el tipo de nómina
  const resumenTitle = document.querySelector('.summary-stat h4');
  if (resumenTitle) {
    resumenTitle.innerHTML = `<i class="bi bi-graph-up me-2"></i>Resumen ${tipoNomina}`;
  }

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

// Actualizar la función mostrarVistaCompacta para mostrar el tipo de nómina del empleado
function mostrarVistaCompactaExtendida(resultados) {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';

  resultados.forEach(resultado => {
    const empleadoCard = document.createElement('div');
    empleadoCard.className = 'employee-card-compact';
    empleadoCard.setAttribute('data-empleado-id', resultado.empleado.uid);

    const tipoNombre = getTipoNombre(resultado.empleado.tipo);
    const tipoNomina = resultado.tipoNominaEmpleado === 'semanal' ? 'Semanal' : 'Quincenal';
    const pagoFinalMostrar = resultado.pagoFinalConJustificaciones || resultado.pagoFinal;
    
    // 🆕 Agregar clase especial si tiene ausencias
    if (resultado.tieneAusencias) {
      empleadoCard.classList.add('tiene-ausencias');
    }

    empleadoCard.innerHTML = `
      <div class="compact-header">
        <div class="compact-name">
          <strong>${resultado.empleado.nombre}</strong>
          <span class="badge bg-secondary ms-2">${tipoNombre}</span>
          <span class="badge ${resultado.tipoNominaEmpleado === 'semanal' ? 'bg-info' : 'bg-success'} ms-1">${tipoNomina}</span>
          ${resultado.editadoManualmente ? '<span class="badge bg-purple ms-1">E</span>' : ''}
          ${resultado.tieneAusencias ? '<span class="badge bg-warning ms-1" title="Tiene ausencias/justificantes aplicados"><i class="bi bi-calendar-check"></i></span>' : ''}
          ${resultado.tieneCorrecciones ? '<span class="badge bg-primary ms-1" title="${resultado.retardosCorregidos} retardo(s) corregido(s)"><i class="bi bi-clock-history"></i></span>' : ''}
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
          ${resultado.diasJustificados > 0 ? `<small class="text-muted d-block" style="font-size: 9px;">-${resultado.diasJustificados} justif.</small>` : ''}
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

      ${resultado.justificacionesDetalle && resultado.justificacionesDetalle.length > 0 ? `
        <div class="ausencias-badge">
          <div class="alert alert-info py-2 mb-2">
            <i class="bi bi-calendar-check me-2"></i>
            <strong>Ajustes Aplicados:</strong>
            ${resultado.justificacionesDetalle.map(j => {
              // Si es retardo justificado (0.5 días), mostrar mensaje diferente
              if (j.tipo === 'retardo_justificado') {
                const cantidad = Math.round(j.dias * 2); // 0.5 → 1, 1 → 2
                return `<small class="d-block mt-1">
                  <i class="bi bi-check-circle text-success"></i> ${cantidad} retardo${cantidad > 1 ? 's' : ''} justificado${cantidad > 1 ? 's' : ''}
                </small>`;
              } else {
                return `<small class="d-block mt-1">
                  <i class="bi bi-check-circle text-success"></i> ${j.nombreTipo}: ${j.dias} día${j.dias > 1 ? 's' : ''}
                </small>`;
              }
            }).join('')}
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

    // 🆕 Agregar clase especial si tiene ausencias
    if (resultado.tieneAusencias) {
      row.classList.add('tiene-ausencias');
    }

    row.innerHTML = `
      <td>
        <div class="fw-bold">${resultado.empleado.nombre}</div>
        ${resultado.editadoManualmente ? '<span class="badge bg-purple ms-1">Editado</span>' : ''}
        ${resultado.tieneAusencias ? '<span class="badge bg-warning ms-1" title="Tiene ausencias/justificantes"><i class="bi bi-calendar-check"></i></span>' : ''}
        ${resultado.tieneCorrecciones ? '<span class="badge bg-primary ms-1" title="${resultado.retardosCorregidos} retardo(s) corregido(s)"><i class="bi bi-clock-history"></i></span>' : ''}
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
        ${resultado.diasJustificados > 0 ? `
          <span class="badge bg-info" title="${resultado.justificacionesDetalle.map(j => `${j.nombreTipo}: ${j.dias} día(s)`).join(', ')}">
            +${resultado.diasJustificados}
          </span>
        ` : `
          <span class="text-muted">-</span>
        `}
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
window.abrirEdicionNomina = async function(empleadoId) {
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

  // Resetear checkboxes de justificaciones
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

  // Ocultar alerta de ausencias importadas por defecto
  document.getElementById('alertaAusenciasImportadas').classList.add('d-none');

  // 🆕 CARGAR AUSENCIAS APROBADAS AUTOMÁTICAMENTE
  try {
    const ausencias = await obtenerAusenciasDelPeriodo(
      resultado.empleado.email,
      mesActualNum,
      añoActualNum,
      quinceActual
    );

    if (ausencias.length > 0) {
      console.log(`📋 ${ausencias.length} ausencias encontradas para pre-llenar`);

      // Acumular días por tipo
      const diasPorTipo = {
        vacaciones: 0,
        incapacidad: 0,
        viaje: 0
      };

      let comentariosAusencias = [];
      const ausenciasIds = [];

      ausencias.forEach(ausencia => {
        const mapeo = mapearTipoAusenciaANomina(ausencia.tipo);
        if (mapeo && mapeo.campo) {
          diasPorTipo[mapeo.campo] += ausencia.diasJustificados || 0;
          comentariosAusencias.push(`${mapeo.nombre}: ${ausencia.diasJustificados} día(s) - ${ausencia.motivo}`);
        }
        ausenciasIds.push(ausencia.id);
      });

      // Pre-llenar campos de vacaciones
      if (diasPorTipo.vacaciones > 0) {
        document.getElementById('tieneVacaciones').checked = true;
        document.getElementById('diasVacaciones').disabled = false;
        document.getElementById('diasVacaciones').value = Math.round(diasPorTipo.vacaciones);
      }

      // Pre-llenar campos de incapacidad
      if (diasPorTipo.incapacidad > 0) {
        document.getElementById('tieneIncapacidad').checked = true;
        document.getElementById('diasIncapacidad').disabled = false;
        document.getElementById('diasIncapacidad').value = Math.round(diasPorTipo.incapacidad);
      }

      // Pre-llenar campos de viaje
      if (diasPorTipo.viaje > 0) {
        document.getElementById('tieneViaje').checked = true;
        document.getElementById('diasViaje').disabled = false;
        document.getElementById('diasViaje').value = Math.round(diasPorTipo.viaje);
      }

      // Agregar comentarios automáticos
      const comentariosTexto = '📋 Justificaciones importadas desde ausencias:\n' + comentariosAusencias.join('\n');
      document.getElementById('editComentarios').value = comentariosTexto;

      // Guardar IDs de ausencias para marcarlas después
      window.ausenciasAplicadas = ausenciasIds;

      // 🆕 MOSTRAR ALERTA VISUAL DE AUSENCIAS IMPORTADAS
      const alertaElement = document.getElementById('alertaAusenciasImportadas');
      const textoElement = document.getElementById('textoAusenciasImportadas');
      textoElement.textContent = `Se cargaron ${ausencias.length} ausencia(s) aprobada(s) automáticamente.`;
      alertaElement.classList.remove('d-none');

      mostrarNotificacion(`✅ ${ausencias.length} ausencia(s) pre-cargada(s) automáticamente`, 'success');
    } else {
      window.ausenciasAplicadas = [];
    }
  } catch (error) {
    console.error('Error cargando ausencias:', error);
    window.ausenciasAplicadas = [];
  }

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

async function guardarEdicionManual() {
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

    // 🆕 Generar ID único para esta nómina
    const nominaReferencia = `nomina_${empleadoId}_${añoActualNum}_${mesActualNum}_${quinceActual}_${Date.now()}`;

    const datosEdicion = {
      diasTrabajados,
      retardos,
      diasExtra,
      bonoExtra,
      diasJustificados,
      justificacionesDetalle,
      comentarios,
      editadoManualmente: true,
      fechaEdicion: new Date().toISOString(),
      // 🆕 Guardar referencia de ausencias aplicadas
      ausenciasAplicadas: window.ausenciasAplicadas || [],
      nominaReferencia: nominaReferencia
    };

    // Guardar en memoria
    cambiosManuales[empleadoId] = datosEdicion;

    historialCambios.push({
      empleadoId,
      tipo: 'edicion_manual',
      cambios: datosEdicion,
      timestamp: new Date().toISOString()
    });

    // ✅ GUARDAR EN FIREBASE AUTOMÁTICAMENTE
    await guardarCambiosEnFirebase(empleadoId, datosEdicion);

    // 🆕 MARCAR AUSENCIAS COMO APLICADAS EN NÓMINA
    if (window.ausenciasAplicadas && window.ausenciasAplicadas.length > 0) {
      console.log(`📋 Marcando ${window.ausenciasAplicadas.length} ausencias como aplicadas...`);
      for (const ausenciaId of window.ausenciasAplicadas) {
        await marcarAusenciaAplicada(ausenciaId, nominaReferencia);
      }
      console.log('✅ Ausencias marcadas como aplicadas');
    }

    actualizarTarjetaEmpleado(empleadoId);

    mostrarNotificacion(`Cambios guardados para ${window.datosOriginales.empleado.nombre}`, 'success');

    const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarNomina'));
    modal.hide();

    recalcularResumenGeneral();

  } catch (error) {
    console.error('Error guardando edición manual:', error);
    mostrarNotificacion('Error al guardar los cambios: ' + error.message, 'error');
  }
}

// ===== GUARDAR CAMBIOS EN FIREBASE =====
async function guardarCambiosEnFirebase(empleadoId, datosEdicion) {
  try {
    // Crear identificador único del período
    const periodoId = `${añoActualNum}_${String(mesActualNum).padStart(2, '0')}_${quinceActual.replace(/\s+/g, '_')}`;

    // Referencia al documento en Firestore
    const docRef = doc(db, 'nominas_cambios_manuales', `${empleadoId}_${periodoId}`);

    // Datos a guardar
    const datosGuardar = {
      empleadoId,
      periodo: {
        quincena: quinceActual,
        mes: mesActual,
        mesNum: mesActualNum,
        año: añoActualNum,
        periodoId
      },
      cambios: datosEdicion,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };

    // Guardar en Firebase
    await setDoc(docRef, datosGuardar, { merge: true });

    console.log('✅ Cambios guardados en Firebase:', periodoId);

  } catch (error) {
    console.error('❌ Error guardando en Firebase:', error);
    throw error;
  }
}

// ===== CARGAR CAMBIOS DESDE FIREBASE =====
async function cargarCambiosDesdeFirebase(empleadoId, periodoId) {
  try {
    const docRef = doc(db, 'nominas_cambios_manuales', `${empleadoId}_${periodoId}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const datos = docSnap.data();
      console.log('✅ Cambios cargados desde Firebase para:', empleadoId);
      return datos.cambios;
    } else {
      console.log('ℹ️ No hay cambios guardados para:', empleadoId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error cargando cambios desde Firebase:', error);
    return null;
  }
}

// ===== CARGAR TODOS LOS CAMBIOS DEL PERÍODO =====
async function cargarTodosCambiosDelPeriodo() {
  try {
    const periodoId = `${añoActualNum}_${String(mesActualNum).padStart(2, '0')}_${quinceActual.replace(/\s+/g, '_')}`;

    console.log('🔄 Cargando cambios manuales del período:', periodoId);

    // Consultar todos los documentos de este período
    const q = query(
      collection(db, 'nominas_cambios_manuales'),
      where('periodo.periodoId', '==', periodoId)
    );

    const querySnapshot = await getDocs(q);

    cambiosManuales = {};

    querySnapshot.forEach((doc) => {
      const datos = doc.data();
      cambiosManuales[datos.empleadoId] = datos.cambios;
    });

    console.log(`✅ ${Object.keys(cambiosManuales).length} cambios manuales cargados desde Firebase`);

    return cambiosManuales;

  } catch (error) {
    console.error('❌ Error cargando cambios del período:', error);
    return {};
  }
}

// ===== SISTEMA DE INTEGRACIÓN CON AUSENCIAS =====

// Función para obtener ausencias aprobadas de un período
async function obtenerAusenciasDelPeriodo(emailEmpleado, mes, anio, periodo) {
  try {
    console.log(`🔄 Buscando ausencias aprobadas para ${emailEmpleado} - ${mes}/${anio} periodo ${periodo}`);

    // Convertir periodo a número si es necesario
    let periodoNumero = null;

    // Si periodo contiene "Período" seguido de un número, extraerlo
    if (typeof periodo === 'string' && periodo.includes('Período')) {
      const match = periodo.match(/Período\s+(\d+)/);
      if (match) {
        periodoNumero = parseInt(match[1]);
      }
    }
    // Si es "primera" o "segunda", convertir a número
    else if (periodo === 'primera') {
      periodoNumero = 1;
    } else if (periodo === 'segunda') {
      periodoNumero = 2;
    }
    // Si ya es un número, usarlo directamente
    else if (typeof periodo === 'number') {
      periodoNumero = periodo;
    }
    // Para nóminas semanales, no filtrar por periodo
    else if (typeof periodo === 'string' && periodo.includes('Semana')) {
      periodoNumero = null; // No filtrar por periodo para semanales
    }

    // Construir query base
    let queryConstraints = [
      where('emailUsuario', '==', emailEmpleado),
      where('estado', '==', 'aprobada'),
      where('quincena.mes', '==', mes),
      where('quincena.anio', '==', anio)
    ];

    // Agregar filtro de periodo solo si es quincenal
    if (periodoNumero !== null) {
      queryConstraints.push(where('quincena.periodo', '==', periodoNumero));
    }

    const q = query(collection(db, 'ausencias'), ...queryConstraints);

    const querySnapshot = await getDocs(q);
    const ausencias = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      ausencias.push({
        id: doc.id,
        ...data
      });
    });

    console.log(`✅ ${ausencias.length} ausencias aprobadas encontradas`);
    return ausencias;

  } catch (error) {
    console.error('❌ Error obteniendo ausencias del período:', error);
    return [];
  }
}

// Función para marcar ausencia como aplicada en nómina
async function marcarAusenciaAplicada(ausenciaId, nominaReferencia) {
  try {
    const ausenciaRef = doc(db, 'ausencias', ausenciaId);
    await updateDoc(ausenciaRef, {
      aplicadaEnNomina: true,
      nominaReferencia: nominaReferencia,
      fechaAplicacion: new Date().toISOString()
    });
    console.log(`✅ Ausencia ${ausenciaId} marcada como aplicada`);
  } catch (error) {
    console.error('❌ Error marcando ausencia como aplicada:', error);
  }
}

// Función para mapear tipo de ausencia a campo de nómina
function mapearTipoAusenciaANomina(tipo) {
  const mapeo = {
    'vacaciones': { campo: 'vacaciones', nombre: 'Vacaciones' },
    'incapacidad': { campo: 'incapacidad', nombre: 'Incapacidad' },
    'viaje_negocios': { campo: 'viaje', nombre: 'Viaje de negocios' },
    'permiso': { campo: 'vacaciones', nombre: 'Permiso' }, // Permisos se cuentan como vacaciones
    'justificante': { campo: 'incapacidad', nombre: 'Justificante médico' }, // Justificantes como incapacidad
    'retardo_justificado': { campo: null, nombre: 'Retardo justificado' } // No descuenta día completo
  };
  return mapeo[tipo] || null;
}

// ===== SISTEMA DE DÍAS FESTIVOS =====

// Cargar días festivos del año desde Firebase
async function cargarDiasFestivos(año) {
  try {
    if (diasFestivosCache[año]) {
      console.log(`✅ Días festivos ${año} cargados desde cache`);
      return diasFestivosCache[año];
    }

    console.log(`🔄 Cargando días festivos de ${año} desde Firebase...`);

    const q = query(
      collection(db, 'dias_festivos'),
      where('año', '==', año),
      where('activo', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const festivos = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const fecha = data.fecha; // Formato: "2025-09-16"
      festivos[fecha] = {
        id: doc.id,
        nombre: data.nombre,
        tipo: data.tipo || 'federal',
        fecha: fecha
      };
    });

    diasFestivosCache[año] = festivos;
    console.log(`✅ ${Object.keys(festivos).length} días festivos cargados para ${año}`);

    return festivos;

  } catch (error) {
    console.error('❌ Error cargando días festivos:', error);
    return {};
  }
}

// Verificar si una fecha es festivo
function esDiaFestivo(año, mes, dia, festivosDelAño) {
  const fechaStr = `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  return festivosDelAño.hasOwnProperty(fechaStr);
}

// Guardar día festivo en Firebase
async function guardarDiaFestivo(fecha, nombre, tipo = 'federal') {
  try {
    const [año, mes, dia] = fecha.split('-').map(Number);

    const festivo = {
      fecha: fecha,
      año: año,
      mes: mes,
      dia: dia,
      nombre: nombre,
      tipo: tipo,
      activo: true,
      fechaCreacion: new Date(),
      creadoPor: auth.currentUser?.email || 'sistema'
    };

    await addDoc(collection(db, 'dias_festivos'), festivo);

    // Limpiar cache
    delete diasFestivosCache[año];

    console.log('✅ Día festivo guardado:', fecha, nombre);
    return true;

  } catch (error) {
    console.error('❌ Error guardando día festivo:', error);
    return false;
  }
}

// Eliminar día festivo
async function eliminarDiaFestivo(festivoId) {
  try {
    await deleteDoc(doc(db, 'dias_festivos', festivoId));

    // Limpiar cache
    diasFestivosCache = {};

    console.log('✅ Día festivo eliminado:', festivoId);
    return true;

  } catch (error) {
    console.error('❌ Error eliminando día festivo:', error);
    return false;
  }
}

// ===== GESTIÓN DE FESTIVOS CON MODAL =====

// Abrir modal de gestión de festivos
window.abrirModalFestivos = async function() {
  const modal = new bootstrap.Modal(document.getElementById('modalGestionFestivos'));

  // Establecer año actual por defecto
  const añoActual = new Date().getFullYear();
  document.getElementById('festivoAñoFiltro').value = añoActual;

  // Cargar festivos existentes
  await cargarFestivosEnModal();

  modal.show();
};

// Cargar festivos en la tabla del modal
window.cargarFestivosEnModal = async function() {
  try {
    const añoSeleccionado = parseInt(document.getElementById('festivoAñoFiltro').value);
    const festivos = await cargarDiasFestivos(añoSeleccionado);

    const tbody = document.getElementById('tablaFestivos');

    if (Object.keys(festivos).length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            <i class="bi bi-calendar3 fs-3"></i>
            <p class="mb-0">No hay festivos configurados para ${añoSeleccionado}</p>
            <small>Agrega el primer festivo usando el formulario arriba</small>
          </td>
        </tr>
      `;
      return;
    }

    // Ordenar por fecha
    const festivosArray = Object.values(festivos).sort((a, b) => a.fecha.localeCompare(b.fecha));

    tbody.innerHTML = festivosArray.map(festivo => {
      const fecha = new Date(festivo.fecha + 'T00:00:00');
      const fechaFormateada = fecha.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const tipoBadge = festivo.tipo === 'federal' ? 'bg-primary' : 'bg-info';

      return `
        <tr>
          <td>${fechaFormateada}</td>
          <td>${festivo.nombre}</td>
          <td><span class="badge ${tipoBadge}">${festivo.tipo}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarFestivoDesdeModal('${festivo.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error cargando festivos en modal:', error);
    document.getElementById('tablaFestivos').innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-danger py-4">
          Error al cargar festivos
        </td>
      </tr>
    `;
  }
};

// Guardar festivo desde el modal
window.guardarFestivoDesdeModal = async function() {
  try {
    const fecha = document.getElementById('festivoFecha').value;
    const nombre = document.getElementById('festivoNombre').value;
    const tipo = document.getElementById('festivoTipo').value;

    if (!fecha) {
      mostrarNotificacion('Selecciona una fecha', 'warning');
      return;
    }

    if (!nombre || nombre.trim() === '') {
      mostrarNotificacion('Ingresa el nombre del festivo', 'warning');
      return;
    }

    const exito = await guardarDiaFestivo(fecha, nombre.trim(), tipo);

    if (exito) {
      mostrarNotificacion(`✅ Festivo agregado: ${nombre}`, 'success');

      // Limpiar formulario
      document.getElementById('festivoFecha').value = '';
      document.getElementById('festivoNombre').value = '';
      document.getElementById('festivoTipo').value = 'federal';

      // Recargar tabla
      await cargarFestivosEnModal();
    } else {
      mostrarNotificacion('Error al guardar el festivo', 'error');
    }

  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error al agregar festivo: ' + error.message, 'error');
  }
};

// Eliminar festivo desde el modal
window.eliminarFestivoDesdeModal = async function(festivoId) {
  if (!confirm('¿Estás seguro de eliminar este festivo?')) return;

  try {
    const exito = await eliminarDiaFestivo(festivoId);

    if (exito) {
      mostrarNotificacion('Festivo eliminado correctamente', 'success');
      await cargarFestivosEnModal();
    } else {
      mostrarNotificacion('Error al eliminar el festivo', 'error');
    }

  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error al eliminar festivo: ' + error.message, 'error');
  }
};

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
    
    // Crear elemento temporal con tamaño exacto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = ticketHTML;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '794px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '0';
    tempDiv.style.margin = '0';
    document.body.appendChild(tempDiv);

    // Esperar a que se renderice
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generar con html2canvas con configuración optimizada
    const canvas = await html2canvas(tempDiv.firstElementChild, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
      logging: false,
      removeContainer: false,
      allowTaint: true
    });

    // Crear PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('portrait', 'mm', 'a4');

    // Dimensiones de página A4
    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const margin = 3; // Margen mínimo

    // Calcular dimensiones manteniendo proporción
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);

    // Calcular la altura de la imagen basada en el ancho completo
    const imgHeight = (canvas.height * availableWidth) / canvas.width;

    let finalWidth, finalHeight;

    if (imgHeight <= availableHeight) {
      // La imagen cabe en altura, usar ancho completo
      finalWidth = availableWidth;
      finalHeight = imgHeight;
    } else {
      // La imagen es muy alta, ajustar por altura
      finalHeight = availableHeight;
      finalWidth = (canvas.width * availableHeight) / canvas.height;
    }

    // Posicionar con márgenes mínimos
    const xOffset = margin;
    const yOffset = margin;

    // Agregar imagen al PDF con calidad máxima
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
    
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
      background: white;
      padding: 0;
      font-family: 'Arial', sans-serif;
      color: #333;
      margin: 0;
    ">
      <!-- HEADER CORPORATIVO -->
      <div style="
        background: linear-gradient(135deg, #0f5132 0%, #198754 100%);
        padding: 15px 25px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="display: flex; align-items: center;">
          <div style="
            width: 50px;
            height: 50px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
          ">
            <div style="
              width: 38px;
              height: 38px;
              background: #0f5132;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 15px;
            ">CH</div>
          </div>
          <div>
            <h1 style="
              margin: 0;
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 1px;
            ">CIELITO HOME</h1>
            <p style="
              margin: 0;
              font-size: 10px;
              opacity: 0.9;
              font-weight: 300;
              letter-spacing: 0.5px;
            ">EXPERIENCIAS A LA CARTA</p>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 9px; opacity: 0.9; margin-bottom: 3px; font-weight: 600;">FECHA</div>
          <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px;">
            ${fecha.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>

          <div style="font-size: 9px; opacity: 0.9; margin-bottom: 3px; font-weight: 600;">FOLIO</div>
          <div style="
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
          ">
            ${folio}
          </div>
        </div>
      </div>

      <!-- TÍTULO DEL RECIBO -->
      <div style="
        background: #f8f9fa;
        border-bottom: 2px solid #0f5132;
        padding: 8px 25px;
        text-align: center;
      ">
        <h2 style="
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #0f5132;
          letter-spacing: 0.8px;
        ">
          RECIBO DE PAGO
        </h2>
      </div>

      <!-- INFORMACIÓN DEL EMPLEADO -->
      <div style="
        padding: 15px 25px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
      ">
        <div style="flex: 1; margin-right: 25px;">
          <h3 style="
            margin: 0 0 8px 0;
            font-size: 13px;
            color: #0f5132;
            border-bottom: 2px solid #0f5132;
            padding-bottom: 3px;
            display: inline-block;
          ">DATOS DEL EMPLEADO</h3>

          <div style="margin-bottom: 7px;">
            <span style="font-weight: bold; color: #666; font-size: 9px; display: block; margin-bottom: 2px;">NOMBRE:</span>
            <div style="font-size: 12px; font-weight: 600; color: #333;">
              ${resultado.empleado.nombre}
            </div>
          </div>

          ${emailEmpleado ? `
            <div style="margin-bottom: 7px;">
              <span style="font-weight: bold; color: #666; font-size: 9px; display: block; margin-bottom: 2px;">EMAIL:</span>
              <div style="font-size: 10px; color: #666;">
                ${emailEmpleado}
              </div>
            </div>
          ` : ''}

          <div style="margin-bottom: 7px;">
            <span style="font-weight: bold; color: #666; font-size: 9px; display: block; margin-bottom: 2px;">TIPO:</span>
            <div style="font-size: 10px; color: #666;">
              ${getTipoNombre(resultado.empleado.tipo)}
            </div>
          </div>

          <div style="margin-bottom: 7px;">
            <span style="font-weight: bold; color: #666; font-size: 9px; display: block; margin-bottom: 2px;">PERÍODO:</span>
            <div style="font-size: 10px; color: #666;">
              ${quinceActual} - ${mesActual}
            </div>
          </div>

          ${resultado.empleado.cuentaBancaria ? `
            <div>
              <span style="font-weight: bold; color: #666; font-size: 9px; display: block; margin-bottom: 2px;">BANCO:</span>
              <div style="font-size: 10px; color: #666;">
                ${resultado.empleado.nombreBanco} - ${resultado.empleado.cuentaBancaria}
              </div>
            </div>
          ` : ''}
        </div>

        <div style="
          border-left: 2px solid #0f5132;
          padding-left: 15px;
          min-width: 150px;
        ">
          <div style="margin-bottom: 7px;">
            <span style="font-weight: bold; color: #666; font-size: 9px; display: block; margin-bottom: 2px;">SALARIO BASE</span>
            <div style="font-size: 15px; font-weight: 700; color: #0f5132;">
              $${formatearNumero(resultado.salarioQuincenal)}
            </div>
          </div>

          <div style="margin-bottom: 7px;">
            <span style="font-weight: bold; color: #666; font-size: 9px; display: block; margin-bottom: 2px;">PAGO/DÍA</span>
            <div style="font-size: 13px; color: #666; font-weight: 600;">
              $${formatearNumero(resultado.pagoPorDia)}
            </div>
          </div>

          <div>
            <span style="font-weight: bold; color: #666; font-size: 9px; display: block; margin-bottom: 2px;">FOLIO</span>
            <div style="font-size: 10px; color: #999; font-family: monospace;">
              ${folio}
            </div>
          </div>
        </div>
      </div>

      <!-- REGISTRO DE ASISTENCIA -->
      <div style="
        padding: 12px 25px;
        border-bottom: 1px solid #e9ecef;
      ">
        <h3 style="
          margin: 0 0 10px 0;
          font-size: 13px;
          color: #0f5132;
          border-bottom: 2px solid #0f5132;
          padding-bottom: 3px;
          display: inline-block;
        ">ASISTENCIA</h3>

        <div style="
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        ">
          <div style="text-align: center; padding: 10px; background: #e8f5e8; border-radius: 6px;">
            <div style="font-size: 18px; font-weight: 700; color: #0f5132; margin-bottom: 3px;">
              ${resultado.diasLaboralesEsperados}
            </div>
            <div style="font-size: 8px; color: #666; font-weight: 600; text-transform: uppercase;">
              ESPERADOS
            </div>
          </div>

          <div style="
            text-align: center;
            padding: 10px;
            background: ${resultado.diasTrabajados >= resultado.diasLaboralesEsperados ? '#e8f5e8' : '#fff3cd'};
            border-radius: 6px;
          ">
            <div style="
              font-size: 18px;
              font-weight: 700;
              color: ${resultado.diasTrabajados >= resultado.diasLaboralesEsperados ? '#0f5132' : '#856404'};
              margin-bottom: 3px;
            ">
              ${resultado.diasTrabajados}
            </div>
            <div style="font-size: 8px; color: #666; font-weight: 600; text-transform: uppercase;">
              TRABAJADOS
            </div>
          </div>

          <div style="
            text-align: center;
            padding: 10px;
            background: ${resultado.retardos > 0 ? '#fff3cd' : '#e8f5e8'};
            border-radius: 6px;
          ">
            <div style="
              font-size: 18px;
              font-weight: 700;
              color: ${resultado.retardos > 0 ? '#856404' : '#0f5132'};
              margin-bottom: 3px;
            ">
              ${resultado.retardos}
            </div>
            <div style="font-size: 8px; color: #666; font-weight: 600; text-transform: uppercase;">
              RETARDOS
            </div>
          </div>

          <div style="
            text-align: center;
            padding: 10px;
            background: ${resultado.diasFaltantes > 0 ? '#f8d7da' : '#e8f5e8'};
            border-radius: 6px;
          ">
            <div style="
              font-size: 18px;
              font-weight: 700;
              color: ${resultado.diasFaltantes > 0 ? '#721c24' : '#0f5132'};
              margin-bottom: 3px;
            ">
              ${resultado.diasFaltantes}
            </div>
            <div style="font-size: 8px; color: #666; font-weight: 600; text-transform: uppercase;">
              FALTAS
            </div>
          </div>
        </div>
      </div>

      <!-- DESGLOSE FINANCIERO -->
      <div style="padding: 12px 25px;">
        <h3 style="
          margin: 0 0 10px 0;
          font-size: 13px;
          color: #0f5132;
          border-bottom: 2px solid #0f5132;
          padding-bottom: 3px;
          display: inline-block;
        ">DESGLOSE</h3>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        ">
          <div>
            <div style="
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #eee;
              align-items: center;
            ">
              <span style="font-size: 10px; color: #666;">Días efectivos:</span>
              <span style="font-weight: 600; font-size: 11px;">${resultado.diasEfectivos} días</span>
            </div>

            ${resultado.diasDescuento > 0 ? `
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #eee;
                color: #dc3545;
                align-items: center;
              ">
                <span style="font-size: 10px;">Desc. retardos:</span>
                <span style="font-weight: 600; font-size: 11px;">-${resultado.diasDescuento} días</span>
              </div>
            ` : ''}

            <div style="
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #eee;
              align-items: center;
            ">
              <span style="font-size: 10px; color: #666;">Subtotal:</span>
              <span style="font-weight: 600; font-size: 11px;">$${formatearNumero(resultado.pagoTotal)}</span>
            </div>
          </div>

          <div>
            ${resultado.descuentoIMSS > 0 ? `
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #eee;
                color: #dc3545;
                align-items: center;
              ">
                <span style="font-size: 10px;">IMSS:</span>
                <span style="font-weight: 600; font-size: 11px;">-$${formatearNumero(resultado.descuentoIMSS)}</span>
              </div>
            ` : ''}

            ${resultado.descuentoCaja > 0 ? `
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #eee;
                color: #dc3545;
                align-items: center;
              ">
                <span style="font-size: 10px;">Caja ahorro:</span>
                <span style="font-weight: 600; font-size: 11px;">-${formatearNumero(resultado.descuentoCaja)}</span>
              </div>
            ` : ''}

            <div style="
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 2px solid #0f5132;
              margin-top: 6px;
              align-items: center;
            ">
              <span style="font-size: 11px; font-weight: 600; color: #0f5132;">DESCUENTOS:</span>
              <span style="font-weight: 700; color: #dc3545; font-size: 11px;">-$${formatearNumero(resultado.totalDescuentos)}</span>
            </div>
          </div>
        </div>

        ${resultado.editadoManualmente && resultado.comentariosEdicion ? `
          <div style="
            margin-top: 12px;
            padding: 10px;
            background: #f8f9fa;
            border-left: 2px solid #17a2b8;
            border-radius: 4px;
          ">
            <div style="font-weight: 600; color: #17a2b8; margin-bottom: 5px; font-size: 10px;">
              📝 OBSERVACIONES:
            </div>
            <p style="margin: 0; color: #495057; font-size: 9px; line-height: 1.3;">
              ${resultado.comentariosEdicion}
            </p>
          </div>
        ` : ''}
      </div>

      <!-- TOTAL FINAL DESTACADO -->
      <div style="
        background: linear-gradient(135deg, #0f5132 0%, #198754 100%);
        color: white;
        padding: 18px 25px;
        text-align: center;
        margin-top: 10px;
      ">
        <div style="margin-bottom: 8px;">
          <span style="
            font-size: 12px;
            opacity: 0.9;
            font-weight: 300;
            letter-spacing: 1px;
            text-transform: uppercase;
          ">TOTAL A PAGAR</span>
        </div>
        <div style="
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 1px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          margin-bottom: 8px;
        ">
          ${formatearNumero(pagoFinal)}
        </div>
        <div style="
          font-size: 10px;
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
        padding: 12px 25px;
        text-align: center;
        font-size: 8px;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        ">
          <div style="opacity: 0.7;">
            <strong>CIELITO HOME</strong><br>
            Experiencias a la Carta
          </div>
          <div style="opacity: 0.7;">
            ${fecha.toLocaleDateString('es-MX')} ${fecha.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}
          </div>
        </div>
        <div style="
          border-top: 1px solid rgba(255,255,255,0.2);
          padding-top: 8px;
          opacity: 0.6;
        ">
          Comprobante oficial de pago • ${fecha.getFullYear()} Cielito Home
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


// ===== EXTENSIÓN PARA NÓMINA SEMANAL =====
// Agregar estas funciones al archivo nomina.js existente

// Función para calcular días laborales semanales del mes
function calcularDiasLaboralesSemanales(año, mes) {
  const diasLaborales = [];
  const ultimoDia = new Date(año, mes, 0).getDate();
  
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const fecha = new Date(año, mes - 1, dia);
    const diaSemana = fecha.getDay();
    
    // Solo días de lunes (1) a viernes (5)
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasLaborales.push(dia);
    }
  }
  
  return diasLaborales;
}

// Función para organizar días laborales por semanas
function organizarDiasPorSemanas(año, mes) {
  const diasLaborales = calcularDiasLaboralesSemanales(año, mes);
  const semanas = [];
  let semanaActual = [];
  
  diasLaborales.forEach(dia => {
    const fecha = new Date(año, mes - 1, dia);
    const diaSemana = fecha.getDay();
    
    // Si es lunes y ya hay días en la semana actual, empezar nueva semana
    if (diaSemana === 1 && semanaActual.length > 0) {
      semanas.push([...semanaActual]);
      semanaActual = [];
    }
    
    semanaActual.push(dia);
  });
  
  // Agregar la última semana si tiene días
  if (semanaActual.length > 0) {
    semanas.push(semanaActual);
  }
  
  return semanas;
}

// ===== CORRECCIÓN PARA NÓMINA SEMANAL CON SELECTOR DE SEMANA =====

// Función para obtener todas las semanas de un mes
function obtenerSemanasDelMes(año, mes) {
  const semanas = [];
  const primerDia = new Date(año, mes - 1, 1);
  const ultimoDia = new Date(año, mes, 0);
  
  // Encontrar el primer lunes del mes o anterior
  let fechaActual = new Date(primerDia);
  while (fechaActual.getDay() !== 1) {
    fechaActual.setDate(fechaActual.getDate() - 1);
  }
  
  let numeroSemana = 1;
  
  while (fechaActual <= ultimoDia || fechaActual.getMonth() === mes - 1) {
    const inicioSemana = new Date(fechaActual);
    const finSemana = new Date(fechaActual);
    finSemana.setDate(finSemana.getDate() + 4); // Viernes
    
    // Solo incluir si tiene días del mes actual
    if (inicioSemana.getMonth() === mes - 1 || finSemana.getMonth() === mes - 1 || 
        (inicioSemana.getMonth() < mes - 1 && finSemana.getMonth() > mes - 1)) {
      
      const diasLaborales = [];
      for (let i = 0; i < 5; i++) {
        const dia = new Date(inicioSemana);
        dia.setDate(dia.getDate() + i);
        
        // Solo agregar si está en el rango del mes seleccionado o es parte de la semana
        if (dia <= ultimoDia) {
          diasLaborales.push(dia.getDate());
        }
      }
      
      if (diasLaborales.length > 0) {
        semanas.push({
          numero: numeroSemana,
          inicio: new Date(inicioSemana),
          fin: new Date(finSemana),
          diasLaborales: diasLaborales.filter(dia => {
            const fecha = new Date(año, mes - 1, dia);
            return fecha.getMonth() === mes - 1;
          }),
          label: `Semana ${numeroSemana}: ${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1} - ${finSemana.getDate()}/${finSemana.getMonth() + 1}`
        });
      }
    }
    
    fechaActual.setDate(fechaActual.getDate() + 7);
    numeroSemana++;
  }
  
  return semanas;
}

// Función para obtener la semana actual
function obtenerSemanaActual() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  
  // Encontrar el lunes de esta semana
  const inicioSemana = new Date(hoy);
  const diasHastaLunes = (hoy.getDay() + 6) % 7;
  inicioSemana.setDate(hoy.getDate() - diasHastaLunes);
  
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 4);
  
  return {
    año: año,
    mes: mes,
    inicio: inicioSemana,
    fin: finSemana,
    label: `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1} - ${finSemana.getDate()}/${finSemana.getMonth() + 1}`
  };
}



// Función para obtener días laborales de una semana específica
function obtenerDiasLaboralesSemana(año, mes, numeroSemana) {
  const semanas = obtenerSemanasDelMes(año, mes);
  const semanaSeleccionada = semanas.find(s => s.numero === numeroSemana);
  
  if (!semanaSeleccionada) {
    return [];
  }
  
  return semanaSeleccionada.diasLaborales;
}



// Reemplazar el inicializador existente
window.inicializarListeners = inicializarListenersExtendido;

// Llamar al inicializador cuando se cargue
document.addEventListener('DOMContentLoaded', function() {
  // Configurar fecha actual
  const hoy = new Date();
  document.getElementById('monthSelect').value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  
  // Inicializar listeners extendidos
  inicializarListenersExtendido();
});

console.log('🔧 Corrección de Nómina Semanal con selector de semana cargada');

// Reemplazar la función original
window.mostrarVistaCompacta = mostrarVistaCompactaExtendida;



// Reemplazar la función original
window.validarDatosNomina = validarDatosNominaExtendida;

console.log('🔧 Extensión de Nómina Semanal cargada correctamente');

window.guardarConfiguracion = function() {
  mostrarNotificacion('Configuración guardada exitosamente', 'success');
  bootstrap.Modal.getInstance(document.getElementById('modalConfigAvanzada')).hide();
};

// ===== PROTECCIÓN DE FUNCIONES CRÍTICAS =====
const calcularNominaOriginal = window.calcularNomina;
window.calcularNomina = async function() {
  if (!validarAccesoAutorizado()) return;
  return await calcularNominaOriginal();
};

const guardarNominaCompletaOriginal = window.guardarNominaCompleta;
window.guardarNominaCompleta = async function() {
  if (!validarAccesoAutorizado()) return;
  return await guardarNominaCompletaOriginal();
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

// ===== FUNCIONES DE EMAIL ACTUALIZADAS PARA NOMINA.JS =====
// Reemplazar las funciones de email anteriores por estas versiones actualizadas

// ===== ENVÍO INDIVIDUAL DESDE TARJETA DE EMPLEADO =====
window.enviarEmailIndividualEmpleado = async function(empleadoId) {
  if (!validarAccesoAutorizado()) return;
  
  const resultado = resultadosNomina.find(r => r.empleado.uid === empleadoId);
  if (!resultado) {
    mostrarNotificacion('No se encontraron datos del empleado', 'error');
    return;
  }
  
  const email = resultado.empleado.email;
  if (!email || email === 'sin-email@cielitohome.com' || !window.validarEmail(email)) {
    mostrarNotificacion(`${resultado.empleado.nombre} no tiene un email válido registrado`, 'warning');
    return;
  }
  
  // Verificar configuración
  if (!window.validarConfiguracionEmail || !window.validarConfiguracionEmail()) {
    mostrarNotificacion('EmailJS no está configurado correctamente', 'error');
    return;
  }
  
  const confirmar = confirm(
    `¿Enviar ticket por email a ${resultado.empleado.nombre}?\n\n` +
    `Email: ${email}\n` +
    `Pago: $${formatearNumero(resultado.pagoFinal)}`
  );
  
  if (!confirmar) return;
  
  mostrarNotificacion(`Enviando email a ${resultado.empleado.nombre}...`, 'info', 3000);
  
  try {
    // Preparar datos del empleado
    const empleadoData = {
      email: resultado.empleado.email,
      nombre: resultado.empleado.nombre,
      subject: 'Ticket de Nómina - Cielito Home',
      customMessage: '',
      periodo: `${quinceActual} - ${mesActual}`,
      diasTrabajados: resultado.diasTrabajados,
      retardos: resultado.retardos,
      pagoFinal: formatearNumero(resultado.pagoFinal)
    };
    
    const response = await window.enviarEmailIndividual(empleadoData);
    
    if (response.success) {
      mostrarNotificacion(`✅ Email enviado exitosamente a ${resultado.empleado.nombre}`, 'success');
    } else {
      mostrarNotificacion(`❌ Error enviando email a ${resultado.empleado.nombre}: ${response.error}`, 'error');
    }
    
  } catch (error) {
    console.error('Error enviando email individual:', error);
    mostrarNotificacion('Error enviando el email', 'error');
  }
};

// ===== PROCESO DE ENVÍO MASIVO OPTIMIZADO =====
async function procesarEnvioMasivo(empleados, configuracion) {
  let exitosos = 0;
  let fallidos = 0;
  const errores = [];
  
  mostrarNotificacion(
    `Iniciando envío masivo de ${empleados.length} emails...\nPor favor no cierres la ventana.`, 
    'info', 
    5000
  );
  
  for (let i = 0; i < empleados.length; i++) {
    const resultado = empleados[i];
    
    // Mostrar progreso
    mostrarNotificacion(
      `Enviando email ${i + 1}/${empleados.length}: ${resultado.empleado.nombre}`, 
      'info', 
      2000
    );
    
    try {
      // Preparar datos del empleado
      const empleadoData = {
        email: resultado.empleado.email,
        nombre: resultado.empleado.nombre,
        subject: configuracion.subject,
        customMessage: configuracion.customMessage,
        periodo: `${quinceActual} - ${mesActual}`,
        diasTrabajados: resultado.diasTrabajados,
        retardos: resultado.retardos,
        pagoFinal: formatearNumero(resultado.pagoFinal)
      };
      
      const response = await window.enviarEmailIndividual(empleadoData);
      
      if (response.success) {
        exitosos++;
        console.log(`✅ Email enviado a: ${resultado.empleado.nombre}`);
      } else {
        fallidos++;
        errores.push(`${resultado.empleado.nombre}: ${response.error}`);
      }
      
      // Pausa para no saturar el servicio EmailJS
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      fallidos++;
      errores.push(`${resultado.empleado.nombre}: ${error.message}`);
      console.error(`❌ Error enviando email a ${resultado.empleado.nombre}:`, error);
    }
  }
  
  // Mostrar resultado final
  mostrarResultadoEnvioMasivo(exitosos, fallidos, errores);
}

// ===== MODAL DE CONFIGURACIÓN DE ENVÍO =====
window.mostrarModalEnvioEmail = function() {
  if (!validarAccesoAutorizado()) return;
  
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos de nómina para enviar', 'warning');
    return;
  }
  
  // Verificar configuración de EmailJS
  if (!window.validarConfiguracionEmail || !window.validarConfiguracionEmail()) {
    mostrarNotificacion(
      'EmailJS no está configurado correctamente.\n\n' +
      'Por favor verifica:\n' +
      '1. CDN de EmailJS actualizado\n' +
      '2. Configuración en emailConfig.js\n' +
      '3. Recarga la página\n\n' +
      'Ve a https://www.emailjs.com/ para más información.',
      'error',
      8000
    );
    return;
  }
  
  // Llenar lista de empleados
  actualizarListaEmpleadosEmail();
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modalEnvioEmail'));
  modal.show();
};

// ===== ACTUALIZAR LISTA DE EMPLEADOS EN MODAL =====
function actualizarListaEmpleadosEmail() {
  const container = document.getElementById('listaEmpleadosEmail');
  if (!container) return;

  let html = '';
  let empleadosConEmail = 0;
  let empleadosSinEmail = 0;

  resultadosNomina.forEach((resultado, index) => {
    const email = resultado.empleado.email;
    const tieneEmail = email && email !== 'sin-email@cielitohome.com' && window.validarEmail(email);

    if (tieneEmail) {
      empleadosConEmail++;
    } else {
      empleadosSinEmail++;
    }

    // Crear item con checkbox
    html += `
      <label class="list-group-item d-flex align-items-center gap-3 ${!tieneEmail ? 'disabled' : ''}" style="cursor: ${tieneEmail ? 'pointer' : 'not-allowed'};">
        <input
          type="checkbox"
          class="form-check-input flex-shrink-0 empleado-email-checkbox"
          value="${resultado.empleado.uid}"
          data-email="${email || ''}"
          ${tieneEmail ? 'checked' : 'disabled'}
          onchange="actualizarContadorSeleccionados()"
          style="width: 1.2rem; height: 1.2rem;">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <strong class="${!tieneEmail ? 'text-muted' : ''}">${resultado.empleado.nombre}</strong>
              <br>
              <small class="text-muted">
                <i class="bi bi-envelope me-1"></i>${email || 'Sin email registrado'}
              </small>
            </div>
            <div class="text-end">
              <span class="badge ${tieneEmail ? 'bg-success' : 'bg-danger'} mb-1">
                ${tieneEmail ? '✓ Válido' : '✗ Sin email'}
              </span>
              <br>
              <span class="badge bg-info">
                <i class="bi bi-cash me-1"></i>$${formatearNumero(resultado.pagoFinal)}
              </span>
            </div>
          </div>
        </div>
      </label>
    `;
  });

  container.innerHTML = html;

  // Actualizar contador inicial
  actualizarContadorSeleccionados();
}

// ===== FUNCIONES AUXILIARES PARA CHECKBOXES =====
window.seleccionarTodosEmails = function(seleccionar) {
  const checkboxes = document.querySelectorAll('.empleado-email-checkbox:not(:disabled)');
  checkboxes.forEach(checkbox => {
    checkbox.checked = seleccionar;
  });
  actualizarContadorSeleccionados();
};

window.actualizarContadorSeleccionados = function() {
  const checkboxes = document.querySelectorAll('.empleado-email-checkbox:checked');
  const contador = document.getElementById('contadorSeleccionados');
  if (contador) {
    contador.textContent = checkboxes.length;
  }
};

// ===== CONFIRMAR ENVÍO DE EMAILS (ACTUALIZADO) =====
window.confirmarEnvioEmails = async function() {
  const subject = document.getElementById('emailSubject').value.trim();
  const customMessage = document.getElementById('emailMessage').value.trim();

  if (!subject) {
    mostrarNotificacion('Por favor ingresa un asunto para el email', 'warning');
    return;
  }

  // Obtener empleados seleccionados
  const checkboxesSeleccionados = document.querySelectorAll('.empleado-email-checkbox:checked');
  const uidsSeleccionados = Array.from(checkboxesSeleccionados).map(cb => cb.value);

  if (uidsSeleccionados.length === 0) {
    mostrarNotificacion('No has seleccionado ningún empleado para enviar', 'warning');
    return;
  }

  // Filtrar empleados seleccionados de resultadosNomina
  const empleadosSeleccionados = resultadosNomina.filter(resultado => {
    return uidsSeleccionados.includes(resultado.empleado.uid);
  });

  const confirmar = confirm(
    `¿Enviar tickets por email a ${empleadosSeleccionados.length} empleado(s) seleccionado(s)?\n\n` +
    `Asunto: ${subject}\n` +
    `Mensaje personalizado: ${customMessage ? 'Sí' : 'No'}\n\n` +
    'Esta operación puede tomar varios minutos.'
  );

  if (!confirmar) return;

  // Cerrar modal
  bootstrap.Modal.getInstance(document.getElementById('modalEnvioEmail')).hide();

  // Iniciar proceso de envío
  await procesarEnvioMasivo(empleadosSeleccionados, {
    subject,
    customMessage
  });
};

// ===== ENVÍO MASIVO RÁPIDO =====
window.enviarTodosLosEmails = function() {
  if (!validarAccesoAutorizado()) return;
  
  if (!resultadosNomina || resultadosNomina.length === 0) {
    mostrarNotificacion('No hay datos de nómina para enviar', 'warning');
    return;
  }
  
  // Verificar configuración
  if (!window.validarConfiguracionEmail || !window.validarConfiguracionEmail()) {
    mostrarNotificacion('EmailJS no está configurado correctamente', 'error');
    return;
  }
  
  // Filtrar empleados con email válido
  const empleadosConEmail = resultadosNomina.filter(resultado => {
    const email = resultado.empleado.email;
    return email && email !== 'sin-email@cielitohome.com' && window.validarEmail(email);
  });
  
  if (empleadosConEmail.length === 0) {
    mostrarNotificacion('No hay empleados con emails válidos', 'error');
    return;
  }
  
  const confirmar = confirm(
    `¿Enviar tickets por email a ${empleadosConEmail.length} empleados?\n\n` +
    'Se usará la configuración predeterminada:\n' +
    '• Asunto: Ticket de Nómina - Cielito Home\n' +
    '• Sin mensaje personalizado\n' +
    '• Solo texto (sin PDFs)\n\n' +
    'Esta operación puede tomar varios minutos.'
  );
  
  if (!confirmar) return;
  
  // Configuración predeterminada
  const configuracion = {
    subject: 'Ticket de Nómina - Cielito Home',
    customMessage: ''
  };
  
  // Iniciar envío
  procesarEnvioMasivo(empleadosConEmail, configuracion);
};

// ===== MOSTRAR RESULTADO DE ENVÍO MASIVO =====
function mostrarResultadoEnvioMasivo(exitosos, fallidos, errores) {
  const totalEnviados = exitosos + fallidos;
  
  let modalHtml = `
    <div class="modal fade" id="modalResultadoEnvio" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header ${fallidos === 0 ? 'bg-success' : 'bg-warning'} text-white">
            <h5 class="modal-title">
              <i class="bi bi-envelope-check me-2"></i>Resultado del Envío Masivo
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col-md-4">
                <div class="text-center p-3 bg-success text-white rounded">
                  <h3>${exitosos}</h3>
                  <small>Enviados exitosamente</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="text-center p-3 bg-danger text-white rounded">
                  <h3>${fallidos}</h3>
                  <small>Fallidos</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="text-center p-3 bg-info text-white rounded">
                  <h3>${totalEnviados}</h3>
                  <small>Total procesados</small>
                </div>
              </div>
            </div>
  `;
  
  if (errores.length > 0) {
    modalHtml += `
      <div class="alert alert-warning">
        <h6>Errores detectados:</h6>
        <ul class="mb-0">
          ${errores.slice(0, 10).map(error => `<li>${error}</li>`).join('')}
          ${errores.length > 10 ? `<li>... y ${errores.length - 10} errores más</li>` : ''}
        </ul>
      </div>
    `;
  }
  
  if (exitosos > 0) {
    modalHtml += `
      <div class="alert alert-success">
        <i class="bi bi-check-circle me-2"></i>
        <strong>¡Envío exitoso!</strong> ${exitosos} empleados recibieron su ticket por email.
      </div>
    `;
  }
  
  modalHtml += `
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remover modal anterior si existe
  const existingModal = document.getElementById('modalResultadoEnvio');
  if (existingModal) existingModal.remove();
  
  // Mostrar nuevo modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('modalResultadoEnvio'));
  modal.show();
  
  // Mostrar notificación
  const mensaje = `Envío completado: ${exitosos} exitosos, ${fallidos} fallidos`;
  mostrarNotificacion(mensaje, fallidos === 0 ? 'success' : 'warning', 5000);
}

// ===== EXPORTAR FUNCIONES GLOBALMENTE =====
window.mostrarModalEnvioEmail = window.mostrarModalEnvioEmail;
window.confirmarEnvioEmails = window.confirmarEnvioEmails;
window.enviarTodosLosEmails = window.enviarTodosLosEmails;
window.enviarEmailIndividualEmpleado = window.enviarEmailIndividualEmpleado;

console.log('📧 Funciones de Email actualizadas para Nómina cargadas correctamente');



// ===== EXPORTAR FUNCIONES GLOBALMENTE =====
window.toggleSalaryManager = window.toggleSalaryManager || function() {
  if (!validarAccesoAutorizado()) return;
  const manager = document.getElementById('salaryManager');
  manager.style.display = manager.style.display === 'none' ? 'block' : 'none';
};



// ===== EXPONER VARIABLES AL SCOPE GLOBAL PARA DEBUG =====
window.resultadosNomina = resultadosNomina;
window.empleadosGlobales = empleadosGlobales;
window.cambiosManuales = cambiosManuales;
window.quinceActual = quinceActual;
window.mesActual = mesActual;
// ===== MENSAJES DE ESTADO =====
console.log(`
🏢 Sistema de Nómina Cielito Home
📅 Versión: 2.0.0
🔒 Estado: Inicializado correctamente
⚡ Funcionalidades: Cálculo automático, edición manual, exportación, PDFs, validación
🛡️  Seguridad: Autenticación Firebase + validación de acceso
`);

// ===== FIN DEL SISTEMA DE NÓMINA =====