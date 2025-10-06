# 📅 CÓMO AGREGAR EL 16 DE SEPTIEMBRE COMO FESTIVO

## Paso 1: Configurar Reglas de Firebase (SI NO LO HAS HECHO)

1. Ve a https://console.firebase.google.com/
2. Proyecto: **qr-acceso-cielito-home**
3. Firestore Database → **Reglas**
4. Copia y pega las reglas del archivo `firestore_rules_update.txt`
5. Click **"Publicar"**

## Paso 2: Agregar el Festivo del 16 de Septiembre

### Opción A: Desde la Interfaz Bonita (RECOMENDADO) ✨

1. Abre la página de nómina
2. Calcula cualquier nómina
3. Click en el botón **"Gestionar Festivos"**
4. En el formulario:
   - **Fecha:** 2025-09-16
   - **Nombre:** Día de la Independencia
   - **Tipo:** Federal
5. Click **"Guardar Festivo"**
6. Verifica que aparece en la tabla de abajo
7. Cierra el modal
8. **Recalcula la nómina de septiembre** segunda quincena
9. ✅ ¡Listo! Ya no debe marcar falta el 16

### Opción B: Directamente en Firebase

1. Ve a Firestore Database
2. Click en **"Iniciar colección"**
3. ID de colección: `dias_festivos`
4. Agrega documento con estos campos:

```
fecha: "2025-09-16"
año: 2025
mes: 9
dia: 16
nombre: "Día de la Independencia"
tipo: "federal"
activo: true
```

5. Click **"Guardar"**
6. Recarga la página de nómina
7. Recalcula la nómina
8. ✅ ¡Listo!

## Paso 3: Verificar que Funciona

1. Abre la consola del navegador (F12)
2. Calcula la nómina de **segunda quincena septiembre 2025**
3. Busca en la consola:
   ```
   🎉 1 día(s) festivo(s) excluido(s): ["2025-09-16 - Día de la Independencia"]
   Días laborales del período: [17, 18, 19, 22, 23, 24, 25, 26, 29, 30]
   ```
4. Verifica que:
   - **Días esperados:** 10
   - **Días trabajados:** 10 (si checaste todos)
   - **Faltas:** 0 ✅

## 📋 Festivos Recomendados para 2025

Puedes agregar estos también:

- 2025-01-01 → Año Nuevo
- 2025-02-03 → Día de la Constitución
- 2025-03-17 → Natalicio de Benito Juárez
- 2025-05-01 → Día del Trabajo
- 2025-09-16 → Día de la Independencia ⭐
- 2025-11-17 → Aniversario de la Revolución
- 2025-12-25 → Navidad

## ❌ Si No Funciona

1. Verifica que las reglas de Firebase estén publicadas
2. Verifica que el festivo esté en la colección `dias_festivos`
3. Verifica que el campo `activo` sea `true`
4. Verifica que el campo `año` sea número (no string)
5. Recarga la página con Ctrl+F5
6. Revisa la consola del navegador por errores
