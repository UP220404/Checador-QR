// ===== MÓDULO DE UI Y NOTIFICACIONES =====
// Funciones para manejar la interfaz de usuario

/**
 * Muestra una notificación toast
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo: 'success', 'error', 'info', 'warning'
 * @param {number} duracion - Duración en ms (default: 3000)
 */
export function mostrarNotificacion(mensaje, tipo = 'info', duracion = 3000) {
  // Verificar si existe el contenedor de notificaciones
  let container = document.getElementById('notification-container');

  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 350px;
    `;
    document.body.appendChild(container);
  }

  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification notification-${tipo}`;

  const colores = {
    success: { bg: '#d4edda', border: '#c3e6cb', color: '#155724', icon: '✓' },
    error: { bg: '#f8d7da', border: '#f5c6cb', color: '#721c24', icon: '✕' },
    warning: { bg: '#fff3cd', border: '#ffeaa7', color: '#856404', icon: '⚠' },
    info: { bg: '#d1ecf1', border: '#bee5eb', color: '#0c5460', icon: 'ℹ' }
  };

  const estilo = colores[tipo] || colores.info;

  notification.style.cssText = `
    background: ${estilo.bg};
    border: 1px solid ${estilo.border};
    border-left: 4px solid ${estilo.border};
    color: ${estilo.color};
    padding: 12px 16px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.3s ease-out;
    font-size: 14px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  `;

  notification.innerHTML = `
    <span style="font-weight: bold; font-size: 16px;">${estilo.icon}</span>
    <span style="flex: 1;">${mensaje}</span>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: ${estilo.color};
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      opacity: 0.7;
    ">&times;</button>
  `;

  // Agregar animación CSS si no existe
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(notification);

  // Auto-remover después de la duración
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, duracion);
}

/**
 * Muestra un loader/spinner
 * @param {string} mensaje - Mensaje a mostrar
 * @returns {Function} Función para ocultar el loader
 */
export function mostrarLoader(mensaje = 'Cargando...') {
  const loader = document.createElement('div');
  loader.id = 'global-loader';
  loader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  `;

  loader.innerHTML = `
    <div style="
      background: white;
      padding: 30px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      text-align: center;
      min-width: 200px;
    ">
      <div style="
        border: 3px solid #f3f3f3;
        border-top: 3px solid #198754;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
      "></div>
      <div style="color: #333; font-size: 14px;">${mensaje}</div>
    </div>
  `;

  // Agregar animación de spinner
  if (!document.getElementById('loader-styles')) {
    const style = document.createElement('style');
    style.id = 'loader-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(loader);

  // Retornar función para ocultar
  return () => {
    const loaderElement = document.getElementById('global-loader');
    if (loaderElement) {
      loaderElement.remove();
    }
  };
}

/**
 * Muestra un diálogo de confirmación
 * @param {string} titulo - Título del diálogo
 * @param {string} mensaje - Mensaje del diálogo
 * @returns {Promise<boolean>} True si confirmó, false si canceló
 */
export function mostrarConfirmacion(titulo, mensaje) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      backdrop-filter: blur(2px);
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 400px;
        width: 90%;
      ">
        <div style="
          background: #198754;
          color: white;
          padding: 15px 20px;
          border-radius: 8px 8px 0 0;
          font-weight: 600;
        ">${titulo}</div>
        <div style="padding: 20px; color: #333;">${mensaje}</div>
        <div style="
          padding: 15px 20px;
          border-top: 1px solid #e9ecef;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        ">
          <button id="modal-cancel" style="
            padding: 8px 20px;
            border: 1px solid #ccc;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">Cancelar</button>
          <button id="modal-confirm" style="
            padding: 8px 20px;
            border: none;
            background: #198754;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
          ">Confirmar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const confirmar = modal.querySelector('#modal-confirm');
    const cancelar = modal.querySelector('#modal-cancel');

    confirmar.onclick = () => {
      modal.remove();
      resolve(true);
    };

    cancelar.onclick = () => {
      modal.remove();
      resolve(false);
    };

    // Cerrar con ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        resolve(false);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

/**
 * Sanitiza HTML para prevenir XSS
 * @param {string} html - HTML a sanitizar
 * @returns {string} HTML sanitizado
 */
export function sanitizarHTML(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Debounce para optimizar eventos que se disparan frecuentemente
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle para limitar la frecuencia de ejecución
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite en ms
 * @returns {Function} Función throttled
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Lazy load de imágenes
 * @param {string} selector - Selector CSS de las imágenes
 */
export function lazyLoadImages(selector = 'img[data-src]') {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll(selector).forEach(img => imageObserver.observe(img));
  } else {
    // Fallback para navegadores antiguos
    document.querySelectorAll(selector).forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

/**
 * Formatea fecha para mostrar en la UI
 * @param {Date} fecha - Fecha a formatear
 * @param {Object} opciones - Opciones de formato
 * @returns {string} Fecha formateada
 */
export function formatearFecha(fecha, opciones = {}) {
  const defaults = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  return fecha.toLocaleDateString('es-MX', { ...defaults, ...opciones });
}

/**
 * Copia texto al portapapeles
 * @param {string} texto - Texto a copiar
 * @returns {Promise<boolean>} True si se copió correctamente
 */
export async function copiarAlPortapapeles(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarNotificacion('Copiado al portapapeles', 'success', 2000);
    return true;
  } catch (err) {
    console.error('Error al copiar:', err);
    mostrarNotificacion('Error al copiar', 'error', 2000);
    return false;
  }
}
