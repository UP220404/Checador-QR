// ===== CONFIGURACIÓN EMAILJS ACTUALIZADA =====
const EMAIL_CONFIG = {
  // Configuración de EmailJS (actualizada)
  USER_ID: 'TsUC1dOMXmxb4h00Y',
  SERVICE_ID: 'service_je1e978',
  TEMPLATE_ID: 'template_vobe2vd',
  
  // Configuración del remitente
  FROM_NAME: 'Recursos Humanos - Cielito Home',
  FROM_EMAIL: 'direcciongeneral@cielitohome.com',
  
  // Límites de servicio
  DAILY_LIMIT: 200,
  MONTHLY_LIMIT: 200
};

// ===== INICIALIZACIÓN DE EMAILJS =====
function inicializarEmailJS() {
  try {
    // Verificar que EmailJS esté disponible
    if (typeof emailjs === 'undefined') {
      console.error('❌ EmailJS no está cargado. Verifica que el CDN esté incluido correctamente.');
      return false;
    }
    
    // Inicializar EmailJS con la nueva sintaxis
    emailjs.init({
      publicKey: EMAIL_CONFIG.USER_ID,
      blockHeadless: true,
      blockList: {
        list: ['foo@emailjs.com', 'bar@emailjs.com'],
        watchVariable: 'userEmail'
      },
      limitRate: {
        id: 'app',
        throttle: 10000,
      }
    });
    
    console.log('✅ EmailJS inicializado correctamente');
    console.log('🎯 EmailJS listo para enviar desde:', EMAIL_CONFIG.FROM_EMAIL);
    console.log('📊 Límite diario:', EMAIL_CONFIG.DAILY_LIMIT, 'emails');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error inicializando EmailJS:', error);
    return false;
  }
}

// ===== FUNCIÓN DE VALIDACIÓN =====
function validarConfiguracionEmail() {
  // Verificar que EmailJS esté disponible
  if (typeof emailjs === 'undefined') {
    console.error('❌ EmailJS no está disponible globalmente');
    return false;
  }
  
  // Verificar configuración
  if (!EMAIL_CONFIG.USER_ID || EMAIL_CONFIG.USER_ID === 'TU_USER_ID') {
    console.error('❌ USER_ID no configurado en EMAIL_CONFIG');
    return false;
  }
  
  if (!EMAIL_CONFIG.SERVICE_ID || EMAIL_CONFIG.SERVICE_ID === 'TU_SERVICE_ID') {
    console.error('❌ SERVICE_ID no configurado en EMAIL_CONFIG');
    return false;
  }
  
  if (!EMAIL_CONFIG.TEMPLATE_ID || EMAIL_CONFIG.TEMPLATE_ID === 'TU_TEMPLATE_ID') {
    console.error('❌ TEMPLATE_ID no configurado en EMAIL_CONFIG');
    return false;
  }
  
  console.log('✅ Configuración de EmailJS válida');
  return true;
}

// ===== FUNCIÓN DE VALIDACIÓN DE EMAIL =====
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ===== FUNCIÓN PRINCIPAL DE ENVÍO (ACTUALIZADA) =====
async function enviarEmailIndividual(empleadoData, ticketHTML = '', pdfBase64 = null) {
  try {
    // Verificar configuración
    if (!validarConfiguracionEmail()) {
      throw new Error('EmailJS no está configurado correctamente');
    }

    // Validar email del empleado
    if (!empleadoData.email || !validarEmail(empleadoData.email)) {
      throw new Error('Email del empleado inválido');
    }

    // Preparar el contenido del email (solo texto)
    const emailContent = generarContenidoEmailTexto(empleadoData);
    
    // Preparar parámetros para EmailJS
    const templateParams = {
      to_email: empleadoData.email,
      to_name: empleadoData.nombre,
      subject: empleadoData.subject,
      message: emailContent,
      from_name: EMAIL_CONFIG.FROM_NAME,
      from_email: EMAIL_CONFIG.FROM_EMAIL
    };

    console.log('📧 Enviando email a:', empleadoData.email);
    console.log('📝 Parámetros:', templateParams);

    // Enviar usando EmailJS con la nueva sintaxis
    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Email enviado exitosamente:', response);
    return { success: true, response };

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return { success: false, error: error.message || error.text || 'Error desconocido' };
  }
}

// ===== GENERAR CONTENIDO DE EMAIL EN TEXTO =====
function generarContenidoEmailTexto(empleadoData) {
  const fecha = new Date().toLocaleDateString('es-MX');
  
  let content = `Hola ${empleadoData.nombre},

Adjunto encontrarás tu ticket de nómina correspondiente al período ${empleadoData.periodo}.

═══════════════════════════════════════════════════════════
                    RESUMEN DE TU NÓMINA
═══════════════════════════════════════════════════════════

👤 EMPLEADO: ${empleadoData.nombre}
📅 PERÍODO: ${empleadoData.periodo}
📊 DÍAS TRABAJADOS: ${empleadoData.diasTrabajados}
⏰ RETARDOS: ${empleadoData.retardos}
💰 PAGO FINAL: $${empleadoData.pagoFinal}

═══════════════════════════════════════════════════════════`;

  // Agregar mensaje personalizado si existe
  if (empleadoData.customMessage && empleadoData.customMessage.trim() !== '') {
    content += `

📝 MENSAJE ESPECIAL:
${empleadoData.customMessage}

═══════════════════════════════════════════════════════════`;
  }

  content += `

Este es tu comprobante oficial de pago generado automáticamente el ${fecha}.

Si tienes alguna duda sobre tu nómina, por favor contacta al departamento de Recursos Humanos.

Atentamente,
Equipo de Recursos Humanos
Cielito Home - Experiencias a la Carta

═══════════════════════════════════════════════════════════
Este es un mensaje automático, por favor no responder a este correo.
Para consultas, contactar: direcciongeneral@cielitohome.com
═══════════════════════════════════════════════════════════`;

  return content;
}

// ===== FUNCIÓN DE PRUEBA ACTUALIZADA =====
async function enviarEmailPrueba() {
  if (!validarConfiguracionEmail()) {
    console.error('❌ EmailJS no está configurado correctamente');
    return;
  }
  
  const emailPrueba = prompt('Ingresa un email para la prueba:');
  if (!emailPrueba || !validarEmail(emailPrueba)) {
    console.error('❌ Email inválido');
    return;
  }
  
  console.log('🧪 Iniciando prueba de email con EmailJS actualizado...');
  
  const empleadoData = {
    email: emailPrueba,
    nombre: 'Empleado de Prueba',
    subject: 'Prueba de Ticket de Nómina - Cielito Home',
    customMessage: 'Este es un email de prueba del sistema de nómina.',
    periodo: 'Primera Quincena - 12/2024',
    diasTrabajados: 10,
    retardos: 2,
    pagoFinal: '3,500'
  };
  
  try {
    const response = await enviarEmailIndividual(empleadoData);
    
    if (response.success) {
      console.log('✅ Email de prueba enviado exitosamente a:', emailPrueba);
      console.log('📬 Respuesta:', response.response);
      alert(`✅ Email enviado exitosamente a: ${emailPrueba}`);
    } else {
      console.error('❌ Error enviando email de prueba:', response.error);
      alert(`❌ Error: ${response.error}`);
    }
  } catch (error) {
    console.error('❌ Error en prueba de email:', error);
    alert(`❌ Error: ${error.message}`);
  }
}

// ===== EXPORTAR FUNCIONES GLOBALMENTE =====
window.EMAIL_CONFIG = EMAIL_CONFIG;
window.inicializarEmailJS = inicializarEmailJS;
window.validarConfiguracionEmail = validarConfiguracionEmail;
window.validarEmail = validarEmail;
window.enviarEmailIndividual = enviarEmailIndividual;
window.generarContenidoEmailTexto = generarContenidoEmailTexto;
window.enviarEmailPrueba = enviarEmailPrueba;

// ===== AUTO-INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
  // Esperar un poco para asegurar que EmailJS esté cargado
  setTimeout(() => {
    inicializarEmailJS();
  }, 1000);
});

// ===== INICIALIZACIÓN INMEDIATA SI YA ESTÁ CARGADO =====
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    inicializarEmailJS();
  }, 500);
}

console.log('📧 emailConfig.js cargado - Esperando inicialización de EmailJS...');