# CAMBIOS - CONRAD SISTEMA COMPLETO

## ✅ COMPLETADOS (3 de 8):

### 1. ✅ Espacios en blanco arreglados
- Validación con `.trim()` en todos los campos

### 2. ✅ Selector de edad (días/meses/años)
- Botones para seleccionar: Días (default), Meses, Años
- **SQL:** `agregar-edad-tipo.sql`

### 3. ✅ Número de paciente
- Aparece en recibos: "PACIENTE #1", "PACIENTE #2"
- Se muestra en Gestión de Pacientes
- Secuencial automático
- **SQL:** `agregar-numero-paciente.sql`

---

## ⏳ PENDIENTES (5 de 8):

### 4. Voucher/Baucher después de imprimir
**Archivos:** HomePage.tsx, PacientesPage.tsx, CuadreDiarioPage.tsx

### 5. Filtro búsqueda en Productos
**Archivos:** ProductosPage.tsx

### 6. Gastos del día en Cuadre Diario
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
**Archivos:** CuadreDiarioPage.tsx

### 7. Desglosar estudios en Reportes  
**Archivos:** ReportesPage.tsx

### 8. Tipo de pago al agregar estudios
**Archivos:** AgregarEstudioModal.tsx

---

## 📝 SQL A EJECUTAR:

1. `agregar-edad-tipo.sql` - Para edad en días/meses
2. `agregar-numero-paciente.sql` - Para número secuencial
3. `agregar-medico-recomendado.sql` - Para médico manual (si no lo has ejecutado)

---

## IMPORTANTE:
Los cambios 1, 2 y 3 YA están implementados.
Para los demás (4-8), recomiendo implementar de uno en uno probando cada cambio.
