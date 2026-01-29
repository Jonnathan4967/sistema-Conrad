-- Solución: Usar ROW_NUMBER en vez de secuencia
-- Esto calcula el número basado en el orden de created_at

-- 1. Primero, eliminar la secuencia
DROP SEQUENCE IF EXISTS consultas_numero_paciente_seq CASCADE;

-- 2. Eliminar el default
ALTER TABLE consultas 
ALTER COLUMN numero_paciente DROP DEFAULT;

-- 3. La aplicación calculará el número al momento de crear
-- Ya no usamos secuencia automática
