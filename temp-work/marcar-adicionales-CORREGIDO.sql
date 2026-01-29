-- Agregar campos para identificar estudios adicionales
ALTER TABLE detalle_consultas ADD COLUMN IF NOT EXISTS es_adicional BOOLEAN DEFAULT false;
ALTER TABLE detalle_consultas ADD COLUMN IF NOT EXISTS fecha_agregado TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Comentarios
COMMENT ON COLUMN detalle_consultas.es_adicional IS 'Indica si el estudio fue agregado después de la consulta original';
COMMENT ON COLUMN detalle_consultas.fecha_agregado IS 'Fecha y hora cuando se agregó el estudio';

-- Los estudios existentes no son adicionales (fueron parte de la consulta original)
UPDATE detalle_consultas SET es_adicional = false WHERE es_adicional IS NULL;
UPDATE detalle_consultas SET fecha_agregado = created_at WHERE fecha_agregado IS NULL;

-- VERIFICACIÓN
SELECT 'Columnas agregadas exitosamente' as status;
SELECT COUNT(*) as total_estudios, 
       SUM(CASE WHEN es_adicional THEN 1 ELSE 0 END) as adicionales
FROM detalle_consultas;
