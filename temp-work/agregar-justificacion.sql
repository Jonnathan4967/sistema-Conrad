-- Agregar columna de justificación para cuando se usa tarifa normal fuera de horario
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS justificacion_especial TEXT;

-- Agregar comentario a la columna
COMMENT ON COLUMN consultas.justificacion_especial IS 'Justificación cuando se usa tarifa normal fuera del horario establecido';
