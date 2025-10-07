// ===== MÓDULO DE CACHÉ PARA FIRESTORE =====
// Optimiza consultas a Firestore con sistema de caché inteligente

class FirestoreCache {
  constructor(ttlMinutes = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000; // Convertir a milisegundos
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0
    };
  }

  /**
   * Genera una clave única para el caché
   * @param {string} collection - Nombre de la colección
   * @param {string} docId - ID del documento
   * @param {Object} queryParams - Parámetros de la consulta
   * @returns {string} Clave única
   */
  _generateKey(collection, docId = null, queryParams = null) {
    const parts = [collection];
    if (docId) parts.push(docId);
    if (queryParams) parts.push(JSON.stringify(queryParams));
    return parts.join('::');
  }

  /**
   * Obtiene datos del caché
   * @param {string} key - Clave del caché
   * @returns {any|null} Datos o null si no existe/expiró
   */
  get(key) {
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      // Expiró
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.data;
  }

  /**
   * Guarda datos en el caché
   * @param {string} key - Clave del caché
   * @param {any} data - Datos a guardar
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Invalida una entrada específica del caché
   * @param {string} key - Clave a invalidar
   */
  invalidate(key) {
    this.cache.delete(key);
    this.stats.invalidations++;
  }

  /**
   * Invalida todas las entradas de una colección
   * @param {string} collection - Nombre de la colección
   */
  invalidateCollection(collection) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(collection + '::')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    this.stats.invalidations += keysToDelete.length;
  }

  /**
   * Limpia todo el caché
   */
  clear() {
    this.cache.clear();
    this.stats.invalidations++;
  }

  /**
   * Obtiene estadísticas del caché
   * @returns {Object} Estadísticas
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size
    };
  }

  /**
   * Wrapper para consultas de Firestore con caché
   * @param {string} collection - Colección
   * @param {Function} fetchFn - Función que ejecuta la consulta a Firestore
   * @param {Object} options - Opciones {useCache: boolean, ttl: number}
   * @returns {Promise<any>} Datos
   */
  async cachedQuery(collection, fetchFn, options = {}) {
    const { useCache = true, ttl = null, docId = null, queryParams = null } = options;

    if (!useCache) {
      return await fetchFn();
    }

    const key = this._generateKey(collection, docId, queryParams);
    const cached = this.get(key);

    if (cached !== null) {
      console.log(`📦 Cache HIT: ${key}`);
      return cached;
    }

    console.log(`🔍 Cache MISS: ${key} - Fetching from Firestore...`);
    const data = await fetchFn();

    // Usar TTL personalizado si se especifica
    const originalTtl = this.ttl;
    if (ttl) {
      this.ttl = ttl;
    }

    this.set(key, data);

    if (ttl) {
      this.ttl = originalTtl;
    }

    return data;
  }
}

// Instancia global del caché (5 minutos de TTL por defecto)
export const firestoreCache = new FirestoreCache(5);

// Función helper para limpiar caché cuando se modifica data
export function invalidarCacheColeccion(collection) {
  firestoreCache.invalidateCollection(collection);
  console.log(`🗑️ Caché invalidado para colección: ${collection}`);
}

// Exportar clase para crear instancias personalizadas si es necesario
export { FirestoreCache };
