# CAMBIOS PENDIENTES - CONRAD

## ✅ COMPLETADOS:

### 1. Espacios en blanco arreglados
- Se agregó `.trim()` a todas las validaciones
- Ya no fallarán validaciones por espacios extras

### 2. Selector de edad (días/meses/años)
- Botones para seleccionar tipo: Días (default), Meses, Años
- Se guarda en BD como años (convertido)
- Campos nuevos: `edad_valor` y `edad_tipo`
- **SQL a ejecutar:** Ver archivo `agregar-edad-tipo.sql`

## 📋 PENDIENTES DE IMPLEMENTAR:

### 3. Voucher/Baucher después de imprimir
**Requerimiento:** Poder imprimir rápido sin voucher, agregarlo después
**Solución propuesta:**
- Permitir guardar consulta con tarjeta/efectivo sin voucher
- Marcar como "⚠️ Voucher pendiente"
- En Cuadre Diario mostrar columna "Pendiente"
- Permitir editar consulta para agregar voucher después

**Archivos a modificar:**
- `HomePage.tsx` - Quitar validación obligatoria de voucher
- `PacientesPage.tsx` - Agregar botón "Editar voucher"
- `CuadreDiarioPage.tsx` - Columna "Voucher" con estado

### 4. Filtro de búsqueda en Productos/Sub-productos
**Requerimiento:** Buscador para encontrar productos rápido
**Solución propuesta:**
- Input de búsqueda en ProductosPage
- Filtrar por nombre
- Alert si ya existe producto al agregar

**Archivos a modificar:**
- `ProductosPage.tsx` - Agregar input búsqueda
- Filtrar `subEstudios` por texto

### 5. Gastos del día en Cuadre Diario
**Requerimiento:** Registrar gastos (diesel, etc) para que cuadre caja
**Solución propuesta:**
- Nueva tabla `gastos_diarios` en BD
- Botón "Agregar Gasto" en CuadreDiarioPage
- Modal con: Concepto, Monto, Fecha
- Restar de total de efectivo

**SQL necesario:**
```sql
CREATE TABLE gastos_diarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Archivo a modificar:**
- `CuadreDiarioPage.tsx`

### 6. Desglosar estudios en Reportes
**Requerimiento:** Si un paciente tiene 2 estudios, mostrar en filas separadas
**Solución propuesta:**
- Modificar query para JOIN con detalle_consultas
- Crear fila por cada estudio
- Mantener datos del paciente duplicados por fila

**Archivo a modificar:**
- `ReportesPage.tsx` - Cambiar query y mapeo de resultados

### 7. Tipo de pago al agregar estudios adicionales
**Requerimiento:** Poder cambiar tipo de pago al agregar estudios
**Solución propuesta:**
- Agregar selector en AgregarEstudioModal
- Guardar nuevo tipo de pago en consulta

**Archivo a modificar:**
- `AgregarEstudioModal.tsx` - Agregar selector formaPago
- Actualizar consulta con nuevo tipo de pago

---

## PRIORIDAD DE IMPLEMENTACIÓN:

1. **ALTA:** #3 Voucher pendiente (lo más solicitado)
2. **ALTA:** #5 Gastos del día (importante para cuadre)
3. **MEDIA:** #6 Desglosar estudios (mejora reportes)
4. **MEDIA:** #4 Filtro búsqueda (usabilidad)
5. **BAJA:** #7 Tipo pago adicionales (menos frecuente)

---

## NOTA:
Los cambios 1 y 2 YA están implementados en el ZIP adjunto.
Para los demás cambios, se recomienda hacerlos gradualmente probando uno a la vez.
