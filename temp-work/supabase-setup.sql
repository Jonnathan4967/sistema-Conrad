-- SCRIPT DE BASE DE DATOS PARA SUPABASE
-- Ejecutar este script en el SQL Editor de Supabase

-- Tabla de pacientes
CREATE TABLE pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  edad INTEGER NOT NULL CHECK (edad >= 0 AND edad <= 120),
  telefono TEXT NOT NULL,
  departamento TEXT NOT NULL,
  municipio TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de médicos
CREATE TABLE medicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  departamento TEXT NOT NULL,
  municipio TEXT NOT NULL,
  direccion TEXT NOT NULL,
  es_referente BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de estudios
CREATE TABLE estudios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sub-estudios
CREATE TABLE sub_estudios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estudio_id UUID NOT NULL REFERENCES estudios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  precio_normal DECIMAL(10,2) NOT NULL CHECK (precio_normal >= 0),
  precio_social DECIMAL(10,2) NOT NULL CHECK (precio_social >= 0),
  precio_especial DECIMAL(10,2) NOT NULL CHECK (precio_especial >= 0),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(estudio_id, nombre)
);

-- Tabla de consultas
CREATE TABLE consultas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES medicos(id) ON DELETE SET NULL,
  tipo_cobro TEXT NOT NULL CHECK (tipo_cobro IN ('normal', 'social', 'especial')),
  requiere_factura BOOLEAN DEFAULT FALSE,
  nit TEXT,
  forma_pago TEXT NOT NULL CHECK (forma_pago IN ('efectivo', 'tarjeta', 'efectivo_facturado', 'estado_cuenta')),
  numero_factura TEXT,
  sin_informacion_medico BOOLEAN DEFAULT FALSE,
  fecha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de detalle de consultas
CREATE TABLE detalle_consultas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  sub_estudio_id UUID NOT NULL REFERENCES sub_estudios(id) ON DELETE CASCADE,
  precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_pacientes_nombre ON pacientes(nombre);
CREATE INDEX idx_medicos_nombre ON medicos(nombre);
CREATE INDEX idx_medicos_es_referente ON medicos(es_referente) WHERE activo = TRUE;
CREATE INDEX idx_estudios_activo ON estudios(activo);
CREATE INDEX idx_sub_estudios_estudio ON sub_estudios(estudio_id) WHERE activo = TRUE;
CREATE INDEX idx_consultas_fecha ON consultas(fecha);
CREATE INDEX idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX idx_detalle_consulta ON detalle_consultas(consulta_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_estudios ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_consultas ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (permitir todo por ahora - ajustar según necesidades)
-- NOTA: En producción, deberías configurar políticas más restrictivas

CREATE POLICY "Permitir todo en pacientes" ON pacientes FOR ALL USING (true);
CREATE POLICY "Permitir todo en medicos" ON medicos FOR ALL USING (true);
CREATE POLICY "Permitir todo en estudios" ON estudios FOR ALL USING (true);
CREATE POLICY "Permitir todo en sub_estudios" ON sub_estudios FOR ALL USING (true);
CREATE POLICY "Permitir todo en consultas" ON consultas FOR ALL USING (true);
CREATE POLICY "Permitir todo en detalle_consultas" ON detalle_consultas FOR ALL USING (true);

-- Insertar datos de ejemplo para estudios
INSERT INTO estudios (nombre) VALUES 
  ('Rayos X'),
  ('Ultrasonido'),
  ('Laboratorio Clínico'),
  ('Electrocardiograma'),
  ('Tomografía');

-- Insertar algunos sub-estudios de ejemplo
INSERT INTO sub_estudios (estudio_id, nombre, precio_normal, precio_social, precio_especial) 
SELECT 
  (SELECT id FROM estudios WHERE nombre = 'Rayos X'),
  'Rayos X de Tórax',
  150.00,
  100.00,
  200.00;

INSERT INTO sub_estudios (estudio_id, nombre, precio_normal, precio_social, precio_especial) 
SELECT 
  (SELECT id FROM estudios WHERE nombre = 'Rayos X'),
  'Rayos X de Columna',
  180.00,
  120.00,
  250.00;

INSERT INTO sub_estudios (estudio_id, nombre, precio_normal, precio_social, precio_especial) 
SELECT 
  (SELECT id FROM estudios WHERE nombre = 'Ultrasonido'),
  'Ultrasonido Abdominal',
  250.00,
  180.00,
  350.00;

INSERT INTO sub_estudios (estudio_id, nombre, precio_normal, precio_social, precio_especial) 
SELECT 
  (SELECT id FROM estudios WHERE nombre = 'Laboratorio Clínico'),
  'Hemograma Completo',
  80.00,
  50.00,
  120.00;

INSERT INTO sub_estudios (estudio_id, nombre, precio_normal, precio_social, precio_especial) 
SELECT 
  (SELECT id FROM estudios WHERE nombre = 'Laboratorio Clínico'),
  'Química Sanguínea',
  100.00,
  70.00,
  150.00;

-- Insertar algunos médicos referentes de ejemplo
INSERT INTO medicos (nombre, telefono, departamento, municipio, direccion, es_referente) VALUES
  ('Dr. Juan Pérez', '12345678', '1', '1-1', 'Zona 10, Guatemala', true),
  ('Dra. María López', '87654321', '4', '4-1', 'Centro, Chimaltenango', true),
  ('Dr. Carlos Méndez', '55555555', '16', '16-1', 'Antigua Guatemala', true);

-- Vista para reportes de cuadre diario
CREATE OR REPLACE VIEW cuadre_diario AS
SELECT 
  c.fecha,
  COUNT(DISTINCT c.id) as total_consultas,
  SUM(dc.precio) as sub_total,
  0 as descuento,
  SUM(dc.precio) as monto_gravable,
  0 as impuesto,
  SUM(dc.precio) as total_ventas
FROM consultas c
LEFT JOIN detalle_consultas dc ON c.id = dc.consulta_id
GROUP BY c.fecha
ORDER BY c.fecha DESC;

-- Función para obtener estadísticas
CREATE OR REPLACE FUNCTION obtener_estadisticas(fecha_inicio DATE, fecha_fin DATE)
RETURNS TABLE (
  total_consultas BIGINT,
  total_pacientes BIGINT,
  total_ingresos NUMERIC,
  consultas_por_tipo_cobro JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id)::BIGINT as total_consultas,
    COUNT(DISTINCT c.paciente_id)::BIGINT as total_pacientes,
    COALESCE(SUM(dc.precio), 0) as total_ingresos,
    jsonb_object_agg(c.tipo_cobro, count_by_tipo) as consultas_por_tipo_cobro
  FROM consultas c
  LEFT JOIN detalle_consultas dc ON c.id = dc.consulta_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count_by_tipo
    FROM consultas c2
    WHERE c2.tipo_cobro = c.tipo_cobro
      AND c2.fecha BETWEEN fecha_inicio AND fecha_fin
  ) as tipo_counts ON true
  WHERE c.fecha BETWEEN fecha_inicio AND fecha_fin
  GROUP BY c.tipo_cobro;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE pacientes IS 'Almacena información de los pacientes';
COMMENT ON TABLE medicos IS 'Almacena información de médicos referentes y no referentes';
COMMENT ON TABLE estudios IS 'Catálogo de tipos de estudios médicos';
COMMENT ON TABLE sub_estudios IS 'Catálogo de sub-estudios con precios por tipo de cobro';
COMMENT ON TABLE consultas IS 'Registro de consultas realizadas';
COMMENT ON TABLE detalle_consultas IS 'Detalle de estudios realizados por consulta';
