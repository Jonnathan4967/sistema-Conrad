-- Agregar campo para identificar estudios adicionales
ALTER TABLE detalle_consultas ADD COLUMN IF NOT EXISTS es_adicional BOOLEAN DEFAULT false;
ALTER TABLE detalle_consultas ADD COLUMN IF NOT EXISTS fecha_agregado TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Comentarios
COMMENT ON COLUMN detalle_consultas.es_adicional IS 'Indica si el estudio fue agregado después de la consulta original';
COMMENT ON COLUMN detalle_consultas.fecha_agregado IS 'Fecha y hora cuando se agregó el estudio';

-- Los estudios existentes no son adicionales (fueron parte de la consulta original)
UPDATE detalle_consultas SET es_adicional = false WHERE es_adicional IS NULL;
