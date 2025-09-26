// ===== CONFIGURACIÓN EMAILJS - CIELITO HOME =====
// Archivo: emailConfig.js

const EMAIL_CONFIG = {
  // Tu User ID de EmailJS (lo obtienes en Account -> API Keys)
  USER_ID: 'YOUR_USER_ID', // ⚠️ CAMBIAR: Ve a Account > API Keys para obtenerlo
  
  // Tu Service ID (ya lo tienes configurado)
  SERVICE_ID: 'service_dr0t5od', // ✅ CONFIGURADO
  
  // Tu Template ID (lo vas a crear en el siguiente paso)
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID', // ⚠️ CAMBIAR: Crear template y poner el ID aquí
  
  // Configuración de la plantilla
  TEMPLATE_PARAMS: {
    // Estos son los nombres de variables que usarás en tu plantilla EmailJS
    TO_EMAIL: 'to_email',
    TO_NAME: 'to_name',
    FROM_NAME: 'from_name',
    SUBJECT: 'subject',
    MESSAGE: 'message',
    COMPANY_NAME: 'company_name',
    PERIOD: 'period',
    SALARY_AMOUNT: 'salary_amount',
    WORK_DAYS: 'work_days',
    RETARDS: 'retards',
    FINAL_PAY: 'final_pay',
    TICKET_HTML: 'ticket_html',
    ATTACHMENT_PDF: 'attachment_pdf'
  }
};

// ===== FUNCIONES DE INICIALIZACIÓN =====
function inicializarEmailJS() {
  try {
    // Verificar que EmailJS esté disponible
    if (typeof emailjs === 'undefined') {
      console.error('EmailJS no está cargado. Verifica que el script esté incluido.');
      return false;
    }
    
    // Inicializar EmailJS con tu User ID
    emailjs.init(EMAIL_CONFIG.USER_ID);
    
    console.log('✅ EmailJS inicializado correctamente');
    console.log('📧 Servicio configurado: sistemas@cielitohome.com');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando EmailJS:', error);
    return false;
  }
}

// ===== FUNCIÓN PARA VALIDAR CONFIGURACIÓN =====
function validarConfiguracionEmail() {
  const errores = [];
  
  if (EMAIL_CONFIG.USER_ID === 'YOUR_USER_ID' || !EMAIL_CONFIG.USER_ID) {
    errores.push('USER_ID no configurado - Ve a Account > API Keys');
  }
  
  if (EMAIL_CONFIG.SERVICE_ID === 'YOUR_SERVICE_ID' || !EMAIL_CONFIG.SERVICE_ID) {
    errores.push('SERVICE_ID no configurado');
  } else if (EMAIL_CONFIG.SERVICE_ID === 'service_dr0t5od') {
    console.log('✅ Service ID configurado correctamente');
  }
  
  if (EMAIL_CONFIG.TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || !EMAIL_CONFIG.TEMPLATE_ID) {
    errores.push('TEMPLATE_ID no configurado - Crea una plantilla en Email Templates');
  }
  
  if (errores.length > 0) {
    console.error('❌ Configuración de EmailJS incompleta:', errores);
    return false;
  }
  
  console.log('✅ Configuración de EmailJS válida');
  return true;
}

// ===== FUNCIÓN PARA ENVIAR EMAIL INDIVIDUAL =====
async function enviarEmailIndividual(empleadoData, ticketHTML, pdfBase64 = null) {
  try {
    if (!validarConfiguracionEmail()) {
      throw new Error('Configuración de EmailJS incompleta');
    }
    
    const templateParams = {
      [EMAIL_CONFIG.TEMPLATE_PARAMS.TO_EMAIL]: empleadoData.email,
      [EMAIL_CONFIG.TEMPLATE_PARAMS.TO_NAME]: empleadoData.nombre,
      [EMAIL_CONFIG.TEMPLATE_PARAMS.FROM_NAME]: 'Recursos Humanos - Cielito Home',
      [EMAIL_CONFIG.TEMPLATE_PARAMS.SUBJECT]: empleadoData.subject || 'Ticket de Nómina - Cielito Home',
      [EMAIL_CONFIG.TEMPLATE_PARAMS.MESSAGE]: empleadoData.customMessage || '',
      [EMAIL_CONFIG.TEMPLATE_PARAMS.COMPANY_NAME]: 'CIELITO HOME',
      [EMAIL_CONFIG.TEMPLATE_PARAMS.PERIOD]: empleadoData.periodo,
      [EMAIL_CONFIG.TEMPLATE_PARAMS.WORK_DAYS]: empleadoData.diasTrabajados,
      [EMAIL_CONFIG.TEMPLATE_PARAMS.RETARDS]: empleadoData.retardos,
      [EMAIL_CONFIG.TEMPLATE_PARAMS.FINAL_PAY]: empleadoData.pagoFinal,
      [EMAIL_CONFIG.TEMPLATE_PARAMS.TICKET_HTML]: ticketHTML,
      [EMAIL_CONFIG.TEMPLATE_PARAMS.ATTACHMENT_PDF]: pdfBase64
    };
    
    console.log('📤 Enviando email a:', empleadoData.email);
    
    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ID,
      templateParams
    );
    
    console.log('✅ Email enviado exitosamente a:', empleadoData.email, response);
    return { success: true, response };
    
  } catch (error) {
    console.error('❌ Error enviando email a', empleadoData.email, ':', error);
    return { success: false, error: error.message };
  }
}

// ===== FUNCIÓN PARA VALIDAR EMAIL =====
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ===== FUNCIÓN DE PRUEBA =====
async function enviarEmailPrueba() {
  try {
    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ID,
      {
        to_email: 'sistemas@cielitohome.com',
        to_name: 'Administrador',
        from_name: 'Sistema de Nómina',
        subject: 'Prueba de configuración EmailJS',
        message: 'Este es un email de prueba para verificar la configuración.',
        company_name: 'CIELITO HOME',
        period: 'Prueba',
        work_days: '10',
        retards: '0',
        final_pay: '5000',
        ticket_html: '<p>Email de prueba funcionando correctamente</p>'
      }
    );
    
    console.log('✅ Email de prueba enviado exitosamente:', response);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email de prueba:', error);
    return false;
  }
}

// ===== EXPORTAR CONFIGURACIÓN =====
window.EMAIL_CONFIG = EMAIL_CONFIG;
window.inicializarEmailJS = inicializarEmailJS;
window.validarConfiguracionEmail = validarConfiguracionEmail;
window.enviarEmailIndividual = enviarEmailIndividual;
window.validarEmail = validarEmail;
window.enviarEmailPrueba = enviarEmailPrueba;

// Inicializar automáticamente cuando se cargue el script
document.addEventListener('DOMContentLoaded', function() {
  // Pequeño delay para asegurar que EmailJS esté cargado
  setTimeout(() => {
    const inicializado = inicializarEmailJS();
    if (inicializado) {
      console.log('🎯 EmailJS listo para enviar desde: sistemas@cielitohome.com');
      console.log('📊 Límite diario: 500 emails');
    }
  }, 500);
});

console.log('📧 EmailJS Config cargado - Service ID: service_dr0t5od');