-- Crear tabla para guardar cuadres diarios
CREATE TABLE IF NOT EXISTS cuadres_diarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  total_consultas INTEGER NOT NULL,
  total_ventas DECIMAL(10, 2) NOT NULL,
  
  -- Montos esperados por forma de pago
  efectivo_esperado DECIMAL(10, 2) DEFAULT 0,
  tarjeta_esperada DECIMAL(10, 2) DEFAULT 0,
  transferencia_esperada DECIMAL(10, 2) DEFAULT 0,
  
  -- Montos contados físicamente
  efectivo_contado DECIMAL(10, 2) NOT NULL,
  tarjeta_contado DECIMAL(10, 2) NOT NULL,
  transferencia_contado DECIMAL(10, 2) NOT NULL,
  
  -- Diferencias
  diferencia_efectivo DECIMAL(10, 2) NOT NULL,
  diferencia_tarjeta DECIMAL(10, 2) NOT NULL,
  diferencia_transferencia DECIMAL(10, 2) NOT NULL,
  
  -- Estado del cuadre
  cuadre_correcto BOOLEAN NOT NULL,
  
  -- Usuario que realizó el cuadre
  realizado_por TEXT,
  
  -- Observaciones
  observaciones TEXT,
  
  -- Número de consultas al momento del cuadre
  consultas_al_cuadrar INTEGER NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índice para búsquedas rápidas por fecha
CREATE INDEX IF NOT EXISTS idx_cuadres_fecha ON cuadres_diarios(fecha DESC);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_cuadres_diarios_updated_at ON cuadres_diarios;
CREATE TRIGGER update_cuadres_diarios_updated_at
    BEFORE UPDATE ON cuadres_diarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE cuadres_diarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajustar según necesidades de seguridad)
CREATE POLICY "Permitir todas las operaciones en cuadres_diarios" ON cuadres_diarios
    FOR ALL USING (true) WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE cuadres_diarios IS 'Registro de cuadres de caja diarios';
COMMENT ON COLUMN cuadres_diarios.fecha IS 'Fecha del cuadre';
COMMENT ON COLUMN cuadres_diarios.cuadre_correcto IS 'Indica si el cuadre fue exacto (diferencias < 0.01)';
COMMENT ON COLUMN cuadres_diarios.consultas_al_cuadrar IS 'Número de consultas que había cuando se realizó el cuadre';
