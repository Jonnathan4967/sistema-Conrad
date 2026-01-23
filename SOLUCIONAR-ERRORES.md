# 🚨 SOLUCIÓN A ERRORES - PASOS URGENTES

## Error Actual:
```
Failed to load resource: the server responded with a status of 404
Error al verificar días sin cuadrar
```

## Causa:
La tabla `cuadres_diarios` NO existe en Supabase.

---

## ✅ SOLUCIÓN PASO A PASO:

### Paso 1: Ir a Supabase
1. Abrir https://supabase.com
2. Ir a tu proyecto
3. Click en "SQL Editor" (icono de base de datos en el menú izquierdo)

### Paso 2: Ejecutar el SQL
1. Click en "New Query" (botón verde)
2. Copiar TODO el contenido del archivo `crear-tabla-cuadres.sql`
3. Pegar en el editor
4. Click en "Run" (botón verde en la esquina inferior derecha)
5. Esperar el mensaje: "Success. No rows returned"

### Paso 3: Verificar
1. En el menú izquierdo, click en "Table Editor"
2. Deberías ver la nueva tabla `cuadres_diarios`
3. Click en ella para ver su estructura

### Paso 4: Actualizar campos de consultas (si no lo hiciste)
Ejecutar también estos SQLs en orden:

**agregar-justificacion.sql:**
```sql
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS justificacion_especial TEXT;
COMMENT ON COLUMN consultas.justificacion_especial IS 'Justificación cuando se usa tarifa normal fuera del horario establecido';
```

**agregar-campos-pago.sql:**
```sql
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS numero_transferencia TEXT;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS numero_voucher TEXT;

COMMENT ON COLUMN consultas.numero_transferencia IS 'Número de referencia de la transferencia bancaria';
COMMENT ON COLUMN consultas.numero_voucher IS 'Número de voucher/baucher del pago con tarjeta';
```

---

## 🎯 Después de Ejecutar:

1. Refresca la página del sistema (F5)
2. Los errores 404 desaparecerán
3. El botón "Guardar Cuadre" aparecerá cuando llenes los montos
4. Las alertas de días sin cuadrar funcionarán

---

## ⚠️ IMPORTANTE:

**Si ves el botón "Guardar Cuadre" SOLO haz click cuando:**
- Ya ingresaste los 3 montos (efectivo, tarjeta, transferencia)
- Ya revisaste las diferencias
- Ya escribiste observaciones (si hay diferencias)

**El cuadre se guarda PERMANENTEMENTE**, así que asegúrate de que los montos sean correctos.

---

## 📝 Verificación Rápida:

Después de crear la tabla, deberías poder:
- ✅ Ver el formulario completo de cuadre
- ✅ Ver el botón "Guardar Cuadre"
- ✅ Guardar cuadres sin errores
- ✅ Ver alertas de días sin cuadrar
- ✅ No más errores 404 en consola
