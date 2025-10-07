# 🔄 Guía de Migración - Tu Sistema Específico

## 📊 Tu Estructura Actual de Datos

### Estructura de Usuario en Firestore
```javascript
{
  categoria: "sistemas",
  correo: "sistemas6cielitohome@gmail.com",
  horasQuincenal: 40,
  nombre: "Carmen Viramontes",
  pagoPorHora: 75,
  rol: "admin",
  salarioQuincenal: 3000,
  tipo: "tiempo_completo"
}
```

### Colecciones en tu Firestore
```
✅ usuarios/                 - Datos de empleados
✅ registros/                - Asistencias
✅ meetings/                 - Reuniones
✅ clientes/                 - Clientes
✅ notifications/            - Notificaciones
✅ ausencias/                - Justificantes/ausencias
✅ nominas/                  - Datos de nómina
✅ rankings-mensuales/       - Rankings
✅ configuracion_nomina/     - Config de nómina
✅ accesos_sospechosos/      - Logs de seguridad
✅ qr_tokens/                - Tokens QR
✅ qr_stats/                 - Estadísticas QR
✅ security_violations/      - Violaciones
✅ qr_activity_logs/         - Logs de actividad
✅ qr_security_config/       - Config seguridad QR
✅ qr_metrics/               - Métricas QR
✅ qr_debug_logs/            - Debug logs
✅ nominas_cambios_manuales/ - Ediciones manuales
✅ dias_festivos/            - Festivos
```

---

## 🔧 PASO 1: Actualizar Reglas de Firestore

### ⚠️ IMPORTANTE: Hacer Backup Primero

1. Ve a Firebase Console → Firestore → Rules
2. **Copia tus reglas actuales** a un archivo .txt
3. Guárdalo como `firestore-rules-backup-FECHA.txt`

### Aplicar Nuevas Reglas

1. Abre el archivo `FIRESTORE_RULES_OPTIMIZADAS.txt`
2. **Copia todo el contenido**
3. Pega en Firebase Console → Firestore → Rules
4. Click en **"Publicar"**

### ✅ Mejoras en las Nuevas Reglas

**Antes (tus reglas actuales):**
```javascript
match /meetings/{document} {
  allow read, write: if true; // ⚠️ PÚBLICO (inseguro)
}

match /clientes/{document} {
  allow read: if true; // ⚠️ PÚBLICO
}

match /registros/{docId} {
  allow read, write: if true; // ⚠️ PÚBLICO
}
```

**Después (reglas optimizadas):**
```javascript
match /meetings/{document} {
  allow read: if isSignedIn();      // Solo autenticados
  allow write: if isAdmin();         // Solo admins
}

match /clientes/{document} {
  allow read: if isSignedIn();
  allow write: if isAdmin();
}

match /registros/{docId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn() &&
                   request.resource.data.usuarioId == request.auth.uid;
  allow update, delete: if isAdmin();
}
```

**Beneficios:**
- ✅ Ya no es público
- ✅ Validación de datos
- ✅ Solo admins pueden modificar
- ✅ Usuarios solo pueden crear sus propios registros

---

## 📦 PASO 2: Integrar Módulos en tu Código

### Tu Estructura Actual de Archivos
```
Checador QR/
├── index.html          → Checador QR
├── admin.html          → Panel admin
├── nomina.html         → Nómina
├── script.js           → Lógica checador
├── admin.js            → Lógica admin
├── nomina.js           → Lógica nómina
└── modules/            → NUEVOS MÓDULOS
```

### Opción A: Integración Gradual (Recomendado)

#### 1. Agregar imports al inicio de `nomina.js`

```javascript
// DESPUÉS de tus imports de Firebase existentes
import CONFIG from './modules/config.js';
import { formatearNumero, calcularPagoFinal } from './modules/nominaCalculos.js';
import { mostrarNotificacion, mostrarLoader } from './modules/nominaUI.js';
import { sanitizarNumero, sanitizarString } from './modules/seguridad.js';
```

#### 2. Usar funciones gradualmente

**Ejemplo 1: Reemplazar alertas con notificaciones**

```javascript
// ❌ ANTES
alert('Nómina guardada');

// ✅ DESPUÉS
mostrarNotificacion('Nómina guardada correctamente', 'success');
```

**Ejemplo 2: Usar formateo de números**

```javascript
// ❌ ANTES
const salarioFormateado = salario.toFixed(2);

// ✅ DESPUÉS
const salarioFormateado = formatearNumero(salario);
```

**Ejemplo 3: Sanitizar inputs**

```javascript
// ❌ ANTES
const salario = parseFloat(inputSalario.value);

// ✅ DESPUÉS
const salario = sanitizarNumero(inputSalario.value, { min: 0, max: 100000 });
```

### Opción B: Integración Completa

Si quieres aprovechar TODO el sistema optimizado:

1. Lee `modules/ejemplo-integracion.js`
2. Adapta los ejemplos a tu código
3. Reemplaza queries con versiones con caché
4. Usa validaciones de seguridad

---

## 🔑 PASO 3: Adaptar a tu Estructura de Usuario

### Diferencias Clave

| Campo | Tu DB | Módulos Originales |
|-------|-------|-------------------|
| Email | `correo` | `email` |
| Tipos | `tiempo_completo` | `empleado` |
| Salario | `salarioQuincenal` + `pagoPorHora` | Solo `salarioQuincenal` |

### Ya Actualizado en los Módulos ✅

Los módulos ya están actualizados para usar tu estructura:

```javascript
// modules/seguridad.js
export function validarDatosEmpleado(empleado) {
  // Ahora valida: nombre, correo, tipo, categoria, rol, etc.
  // Tipos válidos: tiempo_completo, becario, medio_tiempo
  // Valida tanto salarioQuincenal como pagoPorHora
}
```

```javascript
// modules/config.js
CONFIG.NOMINA.TIPOS_EMPLEADO = ['tiempo_completo', 'becario', 'medio_tiempo'];
CONFIG.NOMINA.CATEGORIAS = ['sistemas', 'administrativa', 'operaciones', 'ventas', 'general'];
CONFIG.NOMINA.ROLES = ['admin', 'empleado', 'supervisor', 'usuario'];
```

### Ejemplo de Validación con tu Estructura

```javascript
import { validarDatosEmpleado } from './modules/seguridad.js';

const empleado = {
  nombre: "Carmen Viramontes",
  correo: "sistemas6cielitohome@gmail.com",
  tipo: "tiempo_completo",
  categoria: "sistemas",
  rol: "admin",
  salarioQuincenal: 3000,
  pagoPorHora: 75,
  horasQuincenal: 40
};

const validacion = validarDatosEmpleado(empleado);
if (validacion.valido) {
  console.log('✅ Empleado válido');
} else {
  console.error('❌ Errores:', validacion.errores);
}
```

---

## 🚀 PASO 4: Configuración de Firebase

### Crear Índices Compuestos

Basado en tus colecciones, crea estos índices:

#### Para `registros` (asistencias)
```
Campo 1: usuarioId (Ascending)
Campo 2: fecha (Descending)
```

#### Para `usuarios` (empleados)
```
Campo 1: tipo (Ascending)
Campo 2: nombre (Ascending)
```

#### Para `nominas`
```
Campo 1: empleadoId (Ascending)
Campo 2: fecha (Descending)
```

**Cómo crear:**
1. Firebase Console → Firestore → Indexes
2. Click "Create Index"
3. Selecciona colección y campos
4. Espera 1-2 min a que se active

---

## 💾 PASO 5: Habilitar Caché

### En `nomina.js`, después de inicializar Firestore:

```javascript
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore(app);

// AGREGAR ESTO:
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
```

### Usar Caché en Queries

```javascript
import { queryWithCache } from './modules/firestoreOptimizado.js';
import { where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Obtener usuarios con caché
const usuarios = await queryWithCache(
  db,
  'usuarios',
  [where('tipo', '==', 'tiempo_completo'), orderBy('nombre')],
  { useCache: true }
);

// Primera vez: Firestore → Caché (lento)
// Siguientes: Caché → Usuario (instantáneo)
```

---

## 🧪 PASO 6: Testing

### Checklist de Pruebas

- [ ] **Test 1:** Abrir panel de nómina
  - Debe cargar sin errores
  - Consola no debe tener errores rojos

- [ ] **Test 2:** Calcular nómina de un empleado
  - Debe funcionar igual que antes
  - Notificaciones deben aparecer (si importaste el módulo)

- [ ] **Test 3:** Generar PDF
  - PDF debe generarse correctamente
  - Debe verse bien (sin espacios en blanco grandes)

- [ ] **Test 4:** Guardar cambios
  - Debe guardar en Firestore
  - No debe dar error de permisos

- [ ] **Test 5:** Caché
  ```javascript
  import { mostrarEstadisticasCache } from './modules/firestoreOptimizado.js';
  mostrarEstadisticasCache();
  ```
  - Primera carga: hits = 0, misses > 0
  - Segunda carga: hits > 0

### Solución de Problemas Comunes

**Error: "Permission denied"**
- Verifica que aplicaste las reglas nuevas
- Verifica que tu email está en la lista de admins

**Error: "Module not found"**
- Verifica rutas relativas: `'./modules/...'`
- Verifica que `<script type="module">` en HTML

**Caché no funciona**
- Verifica imports correctos
- Usa `useCache: true` en queries
- Ejecuta `mostrarEstadisticasCache()` para verificar

---

## 📊 PASO 7: Monitoreo

### Día 1: Verificar Funcionamiento

```javascript
// En consola del navegador
import { mostrarEstadisticasCache } from './modules/firestoreOptimizado.js';

// Cada hora, ejecutar:
mostrarEstadisticasCache();
// Verificar que hits aumenta
```

### Semana 1: Monitorear Firestore

1. Ve a Firebase Console → Firestore → Usage
2. Anota lecturas del día actual
3. Compara con semana anterior
4. **Deberías ver reducción del 50-80%**

### Mes 1: Evaluar Resultados

| Métrica | Objetivo |
|---------|----------|
| Lecturas/día | < 1,000 |
| Hit rate caché | > 70% |
| Tiempo carga | < 1s |
| Errores | 0 |

---

## 🎯 Resumen de Cambios para tu Sistema

### ✅ Configuración Actualizada

```javascript
// modules/config.js
TIPOS_EMPLEADO: ['tiempo_completo', 'becario', 'medio_tiempo']
CATEGORIAS: ['sistemas', 'administrativa', 'operaciones', 'ventas', 'general']
ROLES: ['admin', 'empleado', 'supervisor', 'usuario']
EMAILS_PERMITIDOS_ADMIN: [
  'sistemas16ch@gmail.com',
  'sistemas16cielitohome@gmail.com',
  'leticia@cielitohome.com',
  'sistemas@cielitohome.com',
  'direcciongeneral@cielitohome.com',
  'sistemas6cielitohome@gmail.com'  // ← TU EMAIL AGREGADO
]
```

### ✅ Validación Actualizada

```javascript
// modules/seguridad.js
validarDatosEmpleado(empleado) {
  // Valida: nombre, correo (no email), tipo, categoria, rol
  // Valida: salarioQuincenal, pagoPorHora, horasQuincenal
  // Validación cruzada: pagoPorHora requiere horasQuincenal
}
```

### ✅ Reglas de Firestore Optimizadas

```javascript
// FIRESTORE_RULES_OPTIMIZADAS.txt
- meetings, clientes, registros: Ya no públicos
- Validación de estructura de datos
- Validación de tamaño (< 100 campos)
- Logs inmutables
- Usuario solo puede crear sus propios registros
```

---

## 🚀 Próximo Paso

1. ✅ Lee este archivo completo
2. ✅ Aplica reglas de Firestore (con backup)
3. ✅ Agrega imports a `nomina.js`
4. ✅ Prueba que todo funciona
5. ✅ Crea índices en Firebase
6. ✅ Monitorea resultados por 1 semana

---

## 📞 ¿Necesitas Ayuda?

**Archivos de referencia:**
- `FIRESTORE_RULES_OPTIMIZADAS.txt` - Reglas actualizadas
- `modules/config.js` - Config con tu estructura
- `modules/seguridad.js` - Validaciones adaptadas
- `modules/ejemplo-integracion.js` - Ejemplos de código

**Todo está listo y adaptado a tu sistema específico! 🎉**
