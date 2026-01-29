# 🚨 SOLUCIÓN INMEDIATA - ERRORES 406

## ❌ Problema Actual:
```
Failed to load resource: status 406
```
**Causa:** Tabla existe pero RLS (seguridad) bloquea acceso

---

## ✅ SOLUCIÓN EN 3 PASOS:

### 📍 PASO 1: Ir a Supabase SQL Editor

1. Abre: https://supabase.com
2. Selecciona tu proyecto
3. En el menú izquierdo, busca el ícono **</> SQL Editor**
4. Click en **"+ New query"** (botón verde)

---

### 📍 PASO 2: Ejecutar SQL (COPIAR Y PEGAR)

**Copia TODO este código y pégalo en el editor:**

```sql
-- SOLUCIÓN RÁPIDA: Deshabilitar RLS en cuadres_diarios
ALTER TABLE cuadres_diarios DISABLE ROW LEVEL SECURITY;

-- Verificar que funcionó
SELECT 'RLS deshabilitado correctamente' as status;
```

**Presiona "Run" (botón verde abajo a la derecha)**

Deberías ver: ✅ `Success. No rows returned`

---

### 📍 PASO 3: Si el Paso 2 da error, ejecuta esto:

Si dice "table does not exist", entonces ejecuta este SQL completo:

```sql
-- Crear tabla desde cero
DROP TABLE IF EXISTS cuadres_diarios CASCADE;

CREATE TABLE cuadres_diarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  total_consultas INTEGER NOT NULL,
  total_ventas DECIMAL(10, 2) NOT NULL,
  efectivo_esperado DECIMAL(10, 2) DEFAULT 0,
  tarjeta_esperada DECIMAL(10, 2) DEFAULT 0,
  transferencia_esperada DECIMAL(10, 2) DEFAULT 0,
  efectivo_contado DECIMAL(10, 2) NOT NULL,
  tarjeta_contado DECIMAL(10, 2) NOT NULL,
  transferencia_contado DECIMAL(10, 2) NOT NULL,
  diferencia_efectivo DECIMAL(10, 2) NOT NULL,
  diferencia_tarjeta DECIMAL(10, 2) NOT NULL,
  diferencia_transferencia DECIMAL(10, 2) NOT NULL,
  cuadre_correcto BOOLEAN NOT NULL,
  realizado_por TEXT,
  observaciones TEXT,
  consultas_al_cuadrar INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- SIN RLS (sin restricciones de seguridad)
ALTER TABLE cuadres_diarios DISABLE ROW LEVEL SECURITY;

SELECT 'Tabla creada exitosamente' as status;
```

---

### 📍 PASO 4: Actualizar campos de adicionales

Ejecuta este SQL también:

```sql
ALTER TABLE detalle_consultas ADD COLUMN IF NOT EXISTS es_adicional BOOLEAN DEFAULT false;
ALTER TABLE detalle_consultas ADD COLUMN IF NOT EXISTS fecha_agregado TIMESTAMP WITH TIME ZONE;

UPDATE detalle_consultas SET es_adicional = false WHERE es_adicional IS NULL;

SELECT 'Columnas agregadas' as status;
```

---

### 📍 PASO 5: Actualizar campos de pago (si no lo hiciste)

```sql
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS numero_transferencia TEXT;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS numero_voucher TEXT;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS justificacion_especial TEXT;

SELECT 'Columnas de pago agregadas' as status;
```

---

## 🎯 VERIFICAR QUE FUNCIONÓ:

1. **Refrescar la página** del sistema (F5)
2. Ir a "Cuadre Diario"
3. Click en "Ocultar/Cuadrar Caja"
4. Llenar los 3 campos (efectivo, tarjeta, transferencia)
5. **El botón "Guardar Cuadre" DEBE aparecer** ✅

---

## ❓ Si Sigue Sin Aparecer el Botón:

Abre la consola del navegador (F12) y busca:
- ❌ Si hay errores rojos → Copia el mensaje
- ✅ Si no hay errores → Verifica que los 3 campos tengan números

El botón aparece SOLO cuando:
1. Ya presionaste "Cuadrar Caja"
2. Los 3 campos tienen valores
3. No hay errores en consola

---

## 📸 Captura de Referencia:

**Así debe verse DESPUÉS de ejecutar los SQLs:**

```
Cuadre de Caja
━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Efectivo Contado
Esperado: Q 2950.00
[2950] ← Tu input
Diferencia: Q 0.00 ✅

💳 Tarjeta Contado  
Esperado: Q 0.00
[0] ← Tu input
Diferencia: Q 0.00 ✅

🏦 Transferencia Contado
Esperado: Q 0.00
[0] ← Tu input
Diferencia: Q 0.00 ✅

Observaciones:
[todo bien]

┌─────────────────────────┐
│ ✅ ¡Cuadre Correcto!    │
└─────────────────────────┘

┌─────────────────────────┐
│  💾 GUARDAR CUADRE     │  ← ESTE BOTÓN DEBE APARECER
└─────────────────────────┘
```

---

## 🆘 Si Nada Funciona:

Envíame screenshot de:
1. La consola (F12) con los errores
2. El resultado del SQL en Supabase
3. La página de Cuadre Diario

---

## ✅ Checklist Final:

- [ ] Ejecuté el SQL en Supabase
- [ ] Vi mensaje "Success"
- [ ] Refresqué la página (F5)
- [ ] No hay errores 406 en consola
- [ ] Presioné "Cuadrar Caja"
- [ ] Llené los 3 campos
- [ ] **BOTÓN "GUARDAR CUADRE" APARECE** ✅
