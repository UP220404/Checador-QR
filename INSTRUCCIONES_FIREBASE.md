# 🔥 Instrucciones para Configurar Firebase

## 📋 Resumen de Problemas
1. ✅ **Permisos insuficientes** - Ya corregido en `firestore.rules`
2. ⏳ **Índice compuesto faltante** - Debes crearlo manualmente

---

## 🔧 Paso 1: Desplegar las Nuevas Reglas de Firestore

### Opción A: Desde la Consola de Firebase (Recomendado)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **qr-acceso-cielito-home**
3. En el menú lateral, ve a **Firestore Database**
4. Haz clic en la pestaña **Reglas** (Rules)
5. Copia y pega el contenido completo del archivo `firestore.rules` de este proyecto
6. Haz clic en **Publicar** (Publish)

### Opción B: Desde Firebase CLI

```bash
# Si tienes Firebase CLI instalado
firebase deploy --only firestore:rules
```

---

## 📊 Paso 2: Crear el Índice Compuesto

Firebase necesita un índice compuesto para la query que busca retardos por email, tipoEvento y timestamp.

### Método 1: Usar el Link del Error (MÁS FÁCIL)

1. **Copia el link que apareció en el error de consola**, debería verse así:
   ```
   https://console.firebase.google.com/v1/r/project/qr-acceso-cielito-home/firestore/indexes?create_composite=...
   ```

2. **Ábrelo en tu navegador** - Firebase creará automáticamente el índice con los parámetros correctos

3. **Espera 2-5 minutos** mientras Firebase construye el índice

4. **Verifica el estado**: El índice debe aparecer en estado "Habilitado" (Enabled)

---

### Método 2: Crear Manualmente desde la Consola

Si no copiaste el link, sigue estos pasos:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona **qr-acceso-cielito-home**
3. Ve a **Firestore Database** → **Índices** (Indexes)
4. Haz clic en **"Agregar índice"** o **"Create Index"**

5. Configura el índice con estos valores exactos:

   **Colección:** `registros`

   **Campos indexados (en este orden):**

   | Campo       | Orden          |
   |-------------|----------------|
   | `email`     | Ascendente ↑   |
   | `tipoEvento`| Ascendente ↑   |
   | `timestamp` | Descendente ↓  |

   **Alcance de la consulta:** Colección

   **ID de índice:** (Se genera automáticamente)

6. Haz clic en **Crear** (Create)

7. **Espera** mientras Firebase construye el índice (2-5 minutos)

8. El índice estará listo cuando su estado cambie a **"Habilitado"** (Enabled)

---

## ✅ Paso 3: Verificar que Todo Funcione

Una vez que el índice esté habilitado:

1. **Recarga** la página de admin (`admin.html`)
2. **Limpia la caché** del navegador (Ctrl + Shift + R o Cmd + Shift + R)
3. Intenta **justificar un retardo** nuevamente:
   - Abre el modal de "Nueva Ausencia"
   - Selecciona un empleado
   - Selecciona tipo "⏰ Retardo Justificado"
   - Deberías ver la lista de retardos cargarse correctamente

---

## 🎯 Resumen de Cambios en `firestore.rules`

### Cambio 1: Queries en Registros
```javascript
match /registros/{docId} {
  allow read: if isSignedIn();
  allow list: if isAdmin(); // ✅ NUEVO: Permite queries a admins
  allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
  allow update, delete: if isAdmin();
}
```

### Cambio 2: QR Tokens (Corregido)
```javascript
match /qr_tokens/{document} {
  allow read: if true;
  allow write: if true; // ✅ Restaurado para generación automática
}
```

### Cambio 3: QR Stats (Corregido)
```javascript
match /qr_stats/{document} {
  allow read: if true;
  allow create, update: if true; // ✅ Restaurado para contadores automáticos
  allow delete: if isAdmin();
}
```

---

## 🚨 Solución de Problemas

### Error: "Missing or insufficient permissions"
- **Causa:** Las reglas no se han desplegado correctamente
- **Solución:** Repite el Paso 1 y asegúrate de hacer clic en "Publicar"

### Error: "The query requires an index"
- **Causa:** El índice compuesto aún no se ha creado o no está habilitado
- **Solución:** Completa el Paso 2 y espera a que el índice esté "Habilitado"

### La lista de retardos no carga
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Si ves "index building", espera 2-5 minutos más
4. Si ves otro error, copia el mensaje completo

---

## 📝 Notas Importantes

- **Tiempo de construcción:** Los índices pueden tardar entre 2-5 minutos en construirse
- **Caché del navegador:** Siempre limpia la caché después de cambios en Firebase
- **Límites de Firebase:** El plan gratuito permite hasta 200 índices compuestos
- **Queries sin índice:** Firebase rechazará queries que no tengan un índice apropiado

---

## 🆘 Si Necesitas Ayuda

Si después de seguir estos pasos sigues teniendo problemas:

1. Copia el error completo de la consola del navegador
2. Toma una captura de la sección de Índices en Firebase Console
3. Verifica que tu email esté en la lista de admins en `firestore.rules` línea 15-22

---

**¡Listo!** Una vez completados estos pasos, la funcionalidad de justificar retardos debería funcionar perfectamente. 🎉
