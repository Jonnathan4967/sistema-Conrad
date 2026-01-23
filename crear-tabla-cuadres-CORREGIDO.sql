-- PASO 1: Eliminar tabla si existe (para empezar limpio)
DROP TABLE IF EXISTS cuadres_diarios CASCADE;

-- PASO 2: Crear tabla para guardar cuadres diarios
CREATE TABLE cuadres_diarios (
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

-- PASO 3: Índice para búsquedas rápidas
CREATE INDEX idx_cuadres_fecha ON cuadres_diarios(fecha DESC);

-- PASO 4: Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- PASO 5: Trigger para actualizar updated_at
CREATE TRIGGER update_cuadres_diarios_updated_at
    BEFORE UPDATE ON cuadres_diarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- PASO 6: DESHABILITAR RLS temporalmente (o configurar correctamente)
-- Opción A: Deshabilitar RLS (más simple para desarrollo)
ALTER TABLE cuadres_diarios DISABLE ROW LEVEL SECURITY;

-- Opción B: Si prefieres mantener RLS habilitado, usa estas políticas:
-- ALTER TABLE cuadres_diarios ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Permitir select a todos" ON cuadres_diarios
--     FOR SELECT USING (true);
-- 
-- CREATE POLICY "Permitir insert a todos" ON cuadres_diarios
--     FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Permitir update a todos" ON cuadres_diarios
--     FOR UPDATE USING (true);
-- 
-- CREATE POLICY "Permitir delete a todos" ON cuadres_diarios
--     FOR DELETE USING (true);

-- PASO 7: Comentarios
COMMENT ON TABLE cuadres_diarios IS 'Registro de cuadres de caja diarios';
COMMENT ON COLUMN cuadres_diarios.fecha IS 'Fecha del cuadre';
COMMENT ON COLUMN cuadres_diarios.cuadre_correcto IS 'Indica si el cuadre fue exacto (diferencias < 0.01)';
COMMENT ON COLUMN cuadres_diarios.consultas_al_cuadrar IS 'Número de consultas que había cuando se realizó el cuadre';

-- VERIFICACIÓN: Consultar si la tabla se creó correctamente
SELECT 'Tabla creada exitosamente' as status;
SELECT * FROM cuadres_diarios LIMIT 1;
