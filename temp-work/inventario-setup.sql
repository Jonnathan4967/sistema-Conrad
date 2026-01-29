-- MÓDULO DE INVENTARIO
-- Ejecutar en Supabase SQL Editor

-- Tabla de categorías de productos
CREATE TABLE categorias_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de proveedores
CREATE TABLE proveedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  nit TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos/insumos
CREATE TABLE productos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria_id UUID REFERENCES categorias_inventario(id) ON DELETE SET NULL,
  unidad_medida TEXT NOT NULL, -- unidad, caja, litro, etc
  stock_actual INTEGER DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo INTEGER DEFAULT 0,
  stock_maximo INTEGER,
  precio_compra DECIMAL(10,2) DEFAULT 0,
  precio_venta DECIMAL(10,2),
  ubicacion TEXT, -- estante, bodega, etc
  lote TEXT,
  fecha_vencimiento DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de movimientos de inventario
CREATE TABLE movimientos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID NOT NULL REFERENCES productos_inventario(id) ON DELETE CASCADE,
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'merma')),
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  motivo TEXT,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  costo_unitario DECIMAL(10,2),
  costo_total DECIMAL(10,2),
  numero_factura TEXT,
  usuario TEXT, -- quién hizo el movimiento
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_productos_inventario_categoria ON productos_inventario(categoria_id);
CREATE INDEX idx_productos_inventario_activo ON productos_inventario(activo);
CREATE INDEX idx_productos_inventario_codigo ON productos_inventario(codigo);
CREATE INDEX idx_movimientos_inventario_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_inventario_fecha ON movimientos_inventario(fecha);
CREATE INDEX idx_movimientos_inventario_tipo ON movimientos_inventario(tipo_movimiento);

-- Habilitar Row Level Security
ALTER TABLE categorias_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Políticas (permitir todo por ahora)
CREATE POLICY "Permitir todo en categorias_inventario" ON categorias_inventario FOR ALL USING (true);
CREATE POLICY "Permitir todo en proveedores" ON proveedores FOR ALL USING (true);
CREATE POLICY "Permitir todo en productos_inventario" ON productos_inventario FOR ALL USING (true);
CREATE POLICY "Permitir todo en movimientos_inventario" ON movimientos_inventario FOR ALL USING (true);

-- Función para actualizar stock automáticamente
CREATE OR REPLACE FUNCTION actualizar_stock_inventario()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE productos_inventario
  SET stock_actual = NEW.stock_nuevo,
      updated_at = NOW()
  WHERE id = NEW.producto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stock
CREATE TRIGGER trigger_actualizar_stock
AFTER INSERT ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_inventario();

-- Insertar categorías de ejemplo
INSERT INTO categorias_inventario (nombre, descripcion) VALUES
  ('Reactivos', 'Reactivos químicos para laboratorio'),
  ('Material Médico', 'Material desechable y consumible'),
  ('Radiología', 'Insumos para rayos X y diagnóstico por imagen'),
  ('Papelería', 'Papel, tinta y suministros de oficina'),
  ('Medicamentos', 'Medicamentos básicos de uso común'),
  ('Limpieza', 'Productos de limpieza y desinfección');

-- Insertar productos de ejemplo
INSERT INTO productos_inventario (codigo, nombre, descripcion, categoria_id, unidad_medida, stock_actual, stock_minimo, precio_compra) 
SELECT 
  'REAC-001',
  'Reactivo Hemograma',
  'Reactivo para análisis de hemograma completo',
  (SELECT id FROM categorias_inventario WHERE nombre = 'Reactivos'),
  'unidad',
  50,
  10,
  150.00;

INSERT INTO productos_inventario (codigo, nombre, descripcion, categoria_id, unidad_medida, stock_actual, stock_minimo, precio_compra) 
SELECT 
  'MAT-001',
  'Jeringas 5ml',
  'Jeringas desechables de 5ml',
  (SELECT id FROM categorias_inventario WHERE nombre = 'Material Médico'),
  'caja',
  20,
  5,
  45.00;

INSERT INTO productos_inventario (codigo, nombre, descripcion, categoria_id, unidad_medida, stock_actual, stock_minimo, precio_compra) 
SELECT 
  'RAD-001',
  'Placas Rayos X 14x17',
  'Placas para rayos X tamaño 14x17 pulgadas',
  (SELECT id FROM categorias_inventario WHERE nombre = 'Radiología'),
  'caja',
  15,
  3,
  320.00;

-- Vista para productos con stock bajo
CREATE OR REPLACE VIEW productos_stock_bajo AS
SELECT 
  p.id,
  p.codigo,
  p.nombre,
  c.nombre as categoria,
  p.stock_actual,
  p.stock_minimo,
  p.unidad_medida,
  p.precio_compra,
  (p.stock_minimo - p.stock_actual) as cantidad_recomprar
FROM productos_inventario p
LEFT JOIN categorias_inventario c ON p.categoria_id = c.id
WHERE p.activo = true 
  AND p.stock_actual <= p.stock_minimo
ORDER BY p.stock_actual ASC;

-- Vista para valorización de inventario
CREATE OR REPLACE VIEW valorizacion_inventario AS
SELECT 
  p.id,
  p.codigo,
  p.nombre,
  c.nombre as categoria,
  p.stock_actual,
  p.unidad_medida,
  p.precio_compra,
  (p.stock_actual * p.precio_compra) as valor_total
FROM productos_inventario p
LEFT JOIN categorias_inventario c ON p.categoria_id = c.id
WHERE p.activo = true
ORDER BY valor_total DESC;

COMMENT ON TABLE categorias_inventario IS 'Categorías para organizar productos de inventario';
COMMENT ON TABLE proveedores IS 'Proveedores de insumos médicos y productos';
COMMENT ON TABLE productos_inventario IS 'Catálogo de productos e insumos del inventario';
COMMENT ON TABLE movimientos_inventario IS 'Registro de todos los movimientos de inventario';
