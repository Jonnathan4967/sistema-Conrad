-- Crear tabla para gastos del día
CREATE TABLE IF NOT EXISTS gastos_diarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos_diarios(fecha);
