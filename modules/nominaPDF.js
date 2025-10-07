// ===== MÓDULO DE GENERACIÓN DE PDFs =====
// Funciones para generar tickets de nómina en PDF

import { formatearNumero } from './nominaCalculos.js';

/**
 * Genera el HTML del ticket de nómina
 * @param {Object} resultado - Datos del resultado de nómina
 * @param {Date} fecha - Fecha de generación
 * @returns {string} HTML del ticket
 */
export function crearTicketHTML(resultado, fecha = new Date()) {
  const quinceActual = resultado.quincena || '1ra Quincena';
  const mesActual = resultado.mes || fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const pagoFinal = resultado.pagoFinal || 0;

  const emailEmpleado = resultado.empleado.email && resultado.empleado.email !== 'sin-email@cielitohome.com'
    ? resultado.empleado.email
    : '';

  const folio = `NOM-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}-${resultado.empleado.uid.slice(-4).toUpperCase()}`;

  const getTipoNombre = (tipo) => {
    const tipos = {
      'empleado': 'Empleado Tiempo Completo',
      'becario': 'Becario Medio Tiempo'
    };
    return tipos[tipo] || tipo;
  };

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
          letter-spacing: 0.5px;
        ">COMPROBANTE DE PAGO</h2>
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
              Días Esperados
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
              Días Trabajados
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
              Retardos
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
              Faltas
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
          background: #f8f9fa;
          padding: 10px;
          border-radius: 6px;
        ">
          ${resultado.diasTrabajados < resultado.diasLaboralesEsperados ? `
            <div style="
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #eee;
              align-items: center;
            ">
              <span style="font-size: 11px; color: #666;">Base:</span>
              <span style="font-size: 11px; font-weight: 600; color: #333;">$${formatearNumero(resultado.salarioQuincenal)}</span>
            </div>

            ${resultado.descuentoFaltas > 0 ? `
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #eee;
                color: #dc3545;
                align-items: center;
              ">
                <span style="font-size: 10px;">- Faltas (${resultado.diasFaltantes} día${resultado.diasFaltantes !== 1 ? 's' : ''}):</span>
                <span style="font-size: 11px; font-weight: 600;">-$${formatearNumero(resultado.descuentoFaltas)}</span>
              </div>
            ` : ''}
          ` : `
            <div style="
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #eee;
              align-items: center;
            ">
              <span style="font-size: 11px; color: #666;">Salario (${resultado.diasTrabajados} días):</span>
              <span style="font-size: 11px; font-weight: 600; color: #333;">$${formatearNumero(resultado.salarioQuincenal)}</span>
            </div>
          `}

          ${resultado.descuentoRetardos > 0 ? `
            <div style="
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #eee;
              color: #dc3545;
              align-items: center;
            ">
              <span style="font-size: 10px;">- Retardos (${resultado.retardos}):</span>
              <span style="font-size: 11px; font-weight: 600;">-$${formatearNumero(resultado.descuentoRetardos)}</span>
            </div>
          ` : ''}

          ${resultado.descuentoCajaAhorro > 0 ? `
            <div style="
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #eee;
              color: #dc3545;
              align-items: center;
            ">
              <span style="font-size: 10px;">- Caja de Ahorro:</span>
              <span style="font-size: 11px; font-weight: 600;">-$${formatearNumero(resultado.descuentoCajaAhorro)}</span>
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
            <span style="font-size: 11px; font-weight: 700; color: #dc3545;">-$${formatearNumero(resultado.totalDescuentos || 0)}</span>
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

      <!-- TOTAL A PAGAR -->
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
            text-transform: uppercase;
            letter-spacing: 1px;
          ">TOTAL A PAGAR</span>
        </div>
        <div style="
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 1px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          margin-bottom: 8px;
        ">
          ${formatearNumero(pagoFinal)}
        </div>
        <div style="
          font-size: 9px;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">PESOS MEXICANOS (MXN)</div>
      </div>

      <!-- FOOTER -->
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
            Experiencias a la carta
          </div>
          <div style="opacity: 0.7;">
            ${folio}
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

/**
 * Genera un PDF a partir del HTML del ticket
 * @param {Object} resultado - Datos del resultado de nómina
 * @returns {Promise<void>}
 */
export async function generarTicketPDF(resultado) {
  if (!window.jspdf || !window.html2canvas) {
    throw new Error('Librerías jsPDF o html2canvas no están cargadas');
  }

  try {
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
    const quinceActual = resultado.quincena || '1ra Quincena';
    const mesActual = resultado.mes || new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    const nombreArchivo = `Ticket_Nomina_${resultado.empleado.nombre.replace(/\s+/g, '_')}_${quinceActual.replace(' ', '_')}_${mesActual.replace('/', '-')}.pdf`;

    // Guardar PDF
    pdf.save(nombreArchivo);

    return true;

  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
}
