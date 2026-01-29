-- Agregar número secuencial a consultas
-- Ejecutar esto en Supabase SQL Editor

-- Crear secuencia si no existe
CREATE SEQUENCE IF NOT EXISTS consultas_numero_paciente_seq START 1;

-- Agregar columna
ALTER TABLE consultas 
ADD COLUMN IF NOT EXISTS numero_paciente INTEGER;

-- Llenar números existentes
DO $$
DECLARE
  rec RECORD;
  contador INTEGER := 1;
BEGIN
  FOR rec IN 
    SELECT id FROM consultas 
    WHERE numero_paciente IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE consultas 
    SET numero_paciente = contador 
    WHERE id = rec.id;
    contador := contador + 1;
  END LOOP;
END $$;

-- Hacer que se auto-incremente para nuevos registros
ALTER TABLE consultas 
ALTER COLUMN numero_paciente SET DEFAULT nextval('consultas_numero_paciente_seq');
