-- Agregar columnas para guardar edad en diferentes unidades
-- Ejecutar esto en Supabase SQL Editor

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS edad_valor INTEGER,
ADD COLUMN IF NOT EXISTS edad_tipo TEXT DEFAULT 'años';

-- Actualizar registros existentes
UPDATE pacientes 
SET edad_valor = edad, edad_tipo = 'años' 
WHERE edad_valor IS NULL;

COMMENT ON COLUMN pacientes.edad_valor IS 'Valor original de la edad (ej: 15 días, 3 meses, 2 años)';
COMMENT ON COLUMN pacientes.edad_tipo IS 'Tipo de unidad: días, meses, o años';
