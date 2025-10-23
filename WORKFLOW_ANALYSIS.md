# Permiso/Ausencia to Nomina Workflow Analysis

## Executive Summary
When a **permiso** (or any ausencia) is created for October 21, 2025, it is **NOT** automatically reflected in the nomina calculation in real-time. The system requires a **manual workflow** where an admin must approve the ausencia in admin.html, and then explicitly open the nomina editor to have the system pull the approved ausencias. There are **NO real-time listeners** in the nomina.js system.

---

## 1. PERMISO CREATION WORKFLOW

### Location: admin.html → admin.js
**Function:** `manejarNuevaAusencia()` (Line 2186 in admin.js)

#### Flow:
1. **User Action**: Admin creates a new permiso in the ausencias section
2. **Form Data Collected**:
   - Email usuario
   - Type (permiso, vacaciones, incapacidad, viaje_negocios, retardo_justificado, justificante)
   - Fecha Inicio
   - Fecha Fin (optional)
   - Motivo
   - Estado (defaults to "pendiente" or "aprobada")

3. **Automatic Calculations**:
   - `calcularQuincenaDeAusencia()` - Determines which payroll period (1st or 2nd half)
   - `calcularDiasJustificados()` - Counts working days in the absence period

4. **Data Structure Saved to Firestore**:
```
emailUsuario: "employee@cielitohome.com"
nombreUsuario: "Employee Name"
tipo: "permiso"
fechaInicio: "2025-10-21"
fechaFin: "2025-10-21"
motivo: "Reason for absence"
estado: "pendiente" | "aprobada"
quincena: { mes: 10, anio: 2025, periodo: "segunda" }
diasJustificados: 1
aplicadaEnNomina: false
nominaReferencia: null
fechaCreacion: new Date()
```

**Code Location**: Lines 2203-2219 in admin.js

---

## 2. KEY FINDING: AUSENCIAS ARE FILTERED BY STATUS IN NOMINA

### Critical Query Filter (nomina.js, Line 1736):
```javascript
where('estado', '==', 'aprobada')  // ONLY APPROVED ONES LOADED
```

**This means**:
- Ausencias with estado: "pendiente" are NEVER loaded in nomina
- Only "aprobada" ausencias appear in nomina editor
- Must be explicitly approved in admin.html first

---

## 3. APPROVAL WORKFLOW (REQUIRED STEP)

### Function: `aprobarAusencia(id)` in admin.js (Line 2399)

When admin clicks "Aprobar":

1. Updates ausencia estado to "aprobada"
2. **FOR TARDINESS CORRECTIONS ONLY** (retardo_justificado):
   - Calls `aplicarCorreccionHora()`
   - IMMEDIATELY updates attendance record:
     - Changes hora to corrected time
     - Sets estado to "puntual"
     - Marks corregidoPorAusencia: true
3. For permiso/vacaciones: No immediate changes to other data

**Code**: Lines 2399-2431, 2434-2507 in admin.js

---

## 4. NOMINA CALCULATION (NO AUSENCIAS FETCHED HERE)

### Function: `calcularNomina()` in nomina.js (Line 770)

**Important**: The main calculation does NOT fetch ausencias:

1. Gets attendance records from "registros" collection
2. Counts: days worked, tardiness, absences
3. Does NOT query "ausencias" collection
4. Ausencias are only loaded later when editing individual employee

**Code**: Lines 770-920 in nomina.js

---

## 5. AUSENCIAS AUTO-LOAD IN NOMINA EDITOR ONLY

### Function: `abrirEdicionNomina(empleadoId)` in nomina.js (Line 1384)

This is the ONLY place where ausencias are fetched:

```javascript
const ausencias = await obtenerAusenciasDelPeriodo(
  resultado.empleado.correo,
  mesActual,
  añoActual,
  quinceActual
);
```

#### Function: `obtenerAusenciasDelPeriodo()` (Line 1730)

Query filters:
- emailUsuario == employee email
- estado == "aprobada"  ← CRITICAL
- quincena.mes == month
- quincena.anio == year
- quincena.periodo == period ("primera" or "segunda")

#### Auto-Population (Lines 1427-1486):
- Maps absence types to nomina fields:
  - permiso → vacaciones
  - vacaciones → vacaciones
  - incapacidad → incapacidad
  - viaje_negocios → viaje
  - retardo_justificado → (no mapping, already corrected in registros)

- Sums days by type
- Pre-fills form fields
- Shows notification

---

## 6. NO REAL-TIME LISTENERS FOUND

Searched for but NOT FOUND in nomina.js:
- ✗ onSnapshot()
- ✗ MutationObserver
- ✗ Polling intervals
- ✗ Web sockets
- ✗ Service workers

Only found: Local DOM listeners (addEventListener)
- Lines 415-489: change/input events on form controls

**Code Location**: Lines 1, 3-4 imports show NO onSnapshot imported

---

## 7. TARDINESS vs PERMISO WORKFLOW

### Tardiness Correction (retardo_justificado):

**Admin Action** (REAL-TIME):
1. Create with tipo: "retardo_justificado"
2. Enter corrected time
3. Click "Aprobar"
4. IMMEDIATELY modifies registros collection
5. Changes hora, estado, corregidoPorAusencia fields

**Nomina Reflects Automatically**:
- nomina.js line 966: `if (registro.estado === 'retardo' && !registro.corregidoPorAusencia)`
- If corregidoPorAusencia == true, doesn't count as tardiness
- Next calculation automatically reflects the correction

### Permiso/Vacaciones (NO real-time):

**Admin Action**:
1. Create permiso
2. Mark as "aprobada"
3. Does NOT modify any other records

**Nomina**:
- NOT loaded during calcularNomina()
- Only loaded when employee editor opened
- Requires manual review and save
- No automatic calculation update

---

## 8. COMPLETE TIMELINE: OCTOBER 21 PERMISO

**10:00 AM**: Admin creates permiso
- Saved to ausencias collection
- Estado: "aprobada"
- Stored in Firestore

**10:05 AM**: Check nomina.html
- RESULT: Permiso NOT visible
- Main calculation doesn't query ausencias

**10:10 AM**: Admin opens nomina calculation
- Selects: Oct 2025, Segunda quincena
- Clicks "Calcular"
- RESULT: Shows employee as if no permiso exists

**10:15 AM**: Admin clicks "Edit" on employee
- Function: abrirEdicionNomina()
- Queries ausencias with estado: "aprobada"
- RESULT: Finds and pre-fills the permiso
- Shows alert: "✅ 1 ausencia(s) pre-cargada(s)"

**10:20 AM**: Admin reviews and saves
- Can edit auto-filled values
- Clicks "Guardar Cambios"
- RESULT: Nomina updated with deduction

**Summary**: 5-20 minutes between creation and nomina reflection (not automatic)

---

## 9. REQUIREMENTS FOR PERMISO TO APPEAR IN NOMINA

All of these must be true:

1. ✓ In ausencias collection
2. ✓ estado == "aprobada"
3. ✓ emailUsuario matches employee
4. ✓ quincena.mes == selected month
5. ✓ quincena.anio == selected year
6. ✓ quincena.periodo == selected period
7. ✓ diasJustificados > 0
8. ✓ Employee editor manually opened
9. ✓ Changes manually saved by admin

---

## 10. TYPE MAPPING REFERENCE

```javascript
'permiso' → { campo: 'vacaciones', nombre: 'Permiso' }
'vacaciones' → { campo: 'vacaciones', nombre: 'Vacaciones' }
'incapacidad' → { campo: 'incapacidad', nombre: 'Incapacidad' }
'viaje_negocios' → { campo: 'viaje', nombre: 'Viaje de negocios' }
'retardo_justificado' → { campo: null, nombre: 'Retardo justificado' }
'justificante' → { campo: 'incapacidad', nombre: 'Justificante médico' }
```

**Code**: Lines 1780-1789 in nomina.js

---

## 11. CODE LOCATION SUMMARY

| What | File | Function | Line |
|------|------|----------|------|
| Create Permiso | admin.js | manejarNuevaAusencia | 2186 |
| Approve Ausencia | admin.js | aprobarAusencia | 2399 |
| Apply Tardiness | admin.js | aplicarCorreccionHora | 2434 |
| Load Ausencias | nomina.js | obtenerAusenciasDelPeriodo | 1730 |
| Open Editor | nomina.js | abrirEdicionNomina | 1384 |
| Calculate Nomina | nomina.js | calcularNomina | 770 |

---

## 12. CONCLUSION

**When permiso for Oct 21, 2025 is added:**

1. Created → ausencias collection (estado: aprobada)
2. Visible in nomina? → NO (not until editor opened)
3. Real-time update? → NO (no listeners)
4. Manual steps required? → YES (3 steps minimum)
5. Tardiness corrections? → YES (immediate)

**System Design Philosophy**: Manual verification over automatic updates for payroll accuracy.

