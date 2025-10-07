// ===== MÓDULO DE FIRESTORE OPTIMIZADO =====
// Funciones optimizadas para consultas a Firestore con caché

import { firestoreCache, invalidarCacheColeccion } from './firestoreCache.js';

/**
 * Configuración de índices recomendados para Firestore
 * IMPORTANTE: Estos índices deben crearse en la consola de Firebase
 */
export const INDICES_RECOMENDADOS = {
  asistencias: [
    { fields: ['usuarioId', 'fecha'], order: 'desc' },
    { fields: ['tipo', 'fecha'], order: 'desc' },
    { fields: ['usuarioId', 'tipo', 'fecha'], order: 'desc' }
  ],
  empleados: [
    { fields: ['activo', 'nombre'], order: 'asc' },
    { fields: ['tipo', 'activo'], order: 'asc' }
  ],
  nominas: [
    { fields: ['quincena', 'mes', 'anio'], order: 'desc' },
    { fields: ['empleadoId', 'fecha'], order: 'desc' }
  ]
};

/**
 * Batch read optimizado - Lee múltiples documentos en una sola llamada
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} collection - Nombre de la colección
 * @param {Array<string>} docIds - Array de IDs de documentos
 * @param {Object} options - Opciones {useCache: boolean}
 * @returns {Promise<Array>} Array de documentos
 */
export async function batchRead(db, collection, docIds, options = {}) {
  const { useCache = true } = options;

  if (!docIds || docIds.length === 0) return [];

  // Dividir en lotes de 10 (límite de Firestore para getAll)
  const batchSize = 10;
  const batches = [];

  for (let i = 0; i < docIds.length; i += batchSize) {
    batches.push(docIds.slice(i, i + batchSize));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const key = `${collection}::batch::${batch.join(',')}`;

      if (useCache) {
        const cached = firestoreCache.get(key);
        if (cached) return cached;
      }

      const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const docs = await Promise.all(
        batch.map(id => getDoc(doc(db, collection, id)))
      );

      const data = docs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() }));

      if (useCache) {
        firestoreCache.set(key, data);
      }

      return data;
    })
  );

  return results.flat();
}

/**
 * Query con caché automático
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {Array} constraints - Array de constraints [where('field', '==', 'value'), orderBy('date')]
 * @param {Object} options - Opciones {useCache: boolean, ttl: number}
 * @returns {Promise<Array>} Array de documentos
 */
export async function queryWithCache(db, collectionName, constraints = [], options = {}) {
  const { useCache = true, ttl = null } = options;

  const key = `${collectionName}::query::${JSON.stringify(constraints)}`;

  if (useCache) {
    const cached = firestoreCache.get(key);
    if (cached) {
      console.log(`📦 Cache HIT: ${collectionName} query`);
      return cached;
    }
  }

  console.log(`🔍 Cache MISS: ${collectionName} query - Fetching...`);

  const { collection, query, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const colRef = collection(db, collectionName);
  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (useCache) {
    const originalTtl = firestoreCache.ttl;
    if (ttl) firestoreCache.ttl = ttl;
    firestoreCache.set(key, data);
    if (ttl) firestoreCache.ttl = originalTtl;
  }

  return data;
}

/**
 * Actualización optimizada con invalidación de caché
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<void>}
 */
export async function updateWithCache(db, collectionName, docId, data) {
  const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  await updateDoc(doc(db, collectionName, docId), data);

  // Invalidar caché
  invalidarCacheColeccion(collectionName);
  console.log(`✅ Documento actualizado y caché invalidado: ${collectionName}/${docId}`);
}

/**
 * Creación optimizada con invalidación de caché
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {Object} data - Datos a crear
 * @returns {Promise<string>} ID del documento creado
 */
export async function createWithCache(db, collectionName, data) {
  const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const docRef = await addDoc(collection(db, collectionName), data);

  // Invalidar caché
  invalidarCacheColeccion(collectionName);
  console.log(`✅ Documento creado y caché invalidado: ${collectionName}/${docRef.id}`);

  return docRef.id;
}

/**
 * Eliminación optimizada con invalidación de caché
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @returns {Promise<void>}
 */
export async function deleteWithCache(db, collectionName, docId) {
  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  await deleteDoc(doc(db, collectionName, docId));

  // Invalidar caché
  invalidarCacheColeccion(collectionName);
  console.log(`✅ Documento eliminado y caché invalidado: ${collectionName}/${docId}`);
}

/**
 * Obtener empleados activos (query frecuente optimizada)
 * @param {Firestore} db - Instancia de Firestore
 * @param {Object} options - Opciones {useCache: boolean, tipo: 'empleado'|'becario'|null}
 * @returns {Promise<Array>} Array de empleados
 */
export async function obtenerEmpleadosActivos(db, options = {}) {
  const { useCache = true, tipo = null } = options;
  const { where } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const constraints = [where('activo', '==', true)];
  if (tipo) {
    constraints.push(where('tipo', '==', tipo));
  }

  return queryWithCache(db, 'empleados', constraints, {
    useCache,
    ttl: 10 * 60 * 1000 // 10 minutos (los empleados cambian poco)
  });
}

/**
 * Obtener asistencias de un empleado en un rango de fechas
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} empleadoId - ID del empleado
 * @param {Date} fechaInicio - Fecha inicio
 * @param {Date} fechaFin - Fecha fin
 * @param {Object} options - Opciones {useCache: boolean}
 * @returns {Promise<Array>} Array de asistencias
 */
export async function obtenerAsistenciasEmpleado(db, empleadoId, fechaInicio, fechaFin, options = {}) {
  const { useCache = true } = options;
  const { where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  const constraints = [
    where('usuarioId', '==', empleadoId),
    where('fecha', '>=', fechaInicio),
    where('fecha', '<=', fechaFin),
    orderBy('fecha', 'desc')
  ];

  return queryWithCache(db, 'asistencias', constraints, {
    useCache,
    ttl: 2 * 60 * 1000 // 2 minutos (asistencias cambian frecuentemente)
  });
}

/**
 * Listener en tiempo real con caché (para datos que cambian poco)
 * @param {Firestore} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {Array} constraints - Constraints
 * @param {Function} callback - Callback que recibe los datos
 * @returns {Function} Función para desuscribirse
 */
export function realtimeListenerWithCache(db, collectionName, constraints, callback) {
  const { collection, query, onSnapshot } = window.firebase?.firestore || {};

  if (!onSnapshot) {
    console.error('Firestore no está disponible');
    return () => {};
  }

  const colRef = collection(db, collectionName);
  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Actualizar caché
    const key = `${collectionName}::query::${JSON.stringify(constraints)}`;
    firestoreCache.set(key, data);

    callback(data);
  });
}

/**
 * Mostrar estadísticas del caché en consola
 */
export function mostrarEstadisticasCache() {
  const stats = firestoreCache.getStats();
  console.table(stats);
  return stats;
}

/**
 * Limpiar caché manualmente
 */
export function limpiarCache() {
  firestoreCache.clear();
  console.log('🗑️ Caché limpiado completamente');
}
