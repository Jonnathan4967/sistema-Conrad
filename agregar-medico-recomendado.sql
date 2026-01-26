-- Agregar columna para guardar nombre del médico manualmente
-- Ejecutar esto en Supabase SQL Editor

ALTER TABLE consultas 
ADD COLUMN IF NOT EXISTS medico_recomendado TEXT;

-- Comentario: Esta columna guarda el nombre del médico cuando 
-- se escribe manualmente (no es de la lista de referentes)
