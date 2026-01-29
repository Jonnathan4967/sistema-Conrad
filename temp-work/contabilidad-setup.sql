-- MÓDULO DE CONTABILIDAD
-- Ejecutar en Supabase SQL Editor

-- Tabla de cuentas contables
CREATE TABLE cuentas_contables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('activo', 'pasivo', 'capital', 'ingreso', 'gasto')),
  subtipo TEXT, -- efectivo, banco, cuenta_cobrar, etc
  saldo_inicial DECIMAL(12,2) DEFAULT 0,
  saldo_actual DECIMAL(12,2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de gastos operativos
CREATE TABLE gastos_operativos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT NOT NULL CHECK (categoria IN ('servicios', 'salarios', 'insumos', 'mantenimiento', 'impuestos', 'otros')),
  concepto TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  forma_pago TEXT NOT NULL CHECK (forma_pago IN ('efectivo', 'transferencia', 'cheque', 'tarjeta')),
  proveedor TEXT,
  numero_factura TEXT,
  numero_referencia TEXT, -- número de cheque, transferencia, etc
  cuenta_contable_id UUID REFERENCES cuentas_contables(id) ON DELETE SET NULL,
  observaciones TEXT,
  usuario TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cuentas por cobrar
CREATE TABLE cuentas_por_cobrar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  consulta_id UUID REFERENCES consultas(id) ON DELETE SET NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  monto_total DECIMAL(10,2) NOT NULL CHECK (monto_total > 0),
  monto_pagado DECIMAL(10,2) DEFAULT 0 CHECK (monto_pagado >= 0),
  saldo_pendiente DECIMAL(10,2) NOT NULL CHECK (saldo_pendiente >= 0),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagado', 'vencido')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de abonos a cuentas por cobrar
CREATE TABLE abonos_cuentas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cuenta_por_cobrar_id UUID NOT NULL REFERENCES cuentas_por_cobrar(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  forma_pago TEXT NOT NULL CHECK (forma_pago IN ('efectivo', 'transferencia', 'cheque', 'tarjeta')),
  numero_referencia TEXT,
  observaciones TEXT,
  usuario TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asientos contables (para contabilidad formal)
CREATE TABLE asientos_contables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_asiento TEXT UNIQUE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'ajuste')),
  descripcion TEXT NOT NULL,
  total_debe DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_haber DECIMAL(12,2) NOT NULL DEFAULT 0,
  referencia_id UUID, -- puede referenciar consulta, gasto, etc
  referencia_tipo TEXT, -- 'consulta', 'gasto', etc
  usuario TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detalle de asientos contables
CREATE TABLE detalle_asientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asiento_id UUID NOT NULL REFERENCES asientos_contables(id) ON DELETE CASCADE,
  cuenta_contable_id UUID NOT NULL REFERENCES cuentas_contables(id) ON DELETE RESTRICT,
  debe DECIMAL(12,2) DEFAULT 0 CHECK (debe >= 0),
  haber DECIMAL(12,2) DEFAULT 0 CHECK (haber >= 0),
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK ((debe > 0 AND haber = 0) OR (haber > 0 AND debe = 0))
);

-- Índices
CREATE INDEX idx_gastos_operativos_fecha ON gastos_operativos(fecha);
CREATE INDEX idx_gastos_operativos_categoria ON gastos_operativos(categoria);
CREATE INDEX idx_cuentas_por_cobrar_estado ON cuentas_por_cobrar(estado);
CREATE INDEX idx_cuentas_por_cobrar_paciente ON cuentas_por_cobrar(paciente_id);
CREATE INDEX idx_abonos_cuentas_cuenta ON abonos_cuentas(cuenta_por_cobrar_id);
CREATE INDEX idx_asientos_contables_fecha ON asientos_contables(fecha);
CREATE INDEX idx_detalle_asientos_asiento ON detalle_asientos(asiento_id);
CREATE INDEX idx_detalle_asientos_cuenta ON detalle_asientos(cuenta_contable_id);

-- Habilitar RLS
ALTER TABLE cuentas_contables ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_operativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE asientos_contables ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_asientos ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Permitir todo en cuentas_contables" ON cuentas_contables FOR ALL USING (true);
CREATE POLICY "Permitir todo en gastos_operativos" ON gastos_operativos FOR ALL USING (true);
CREATE POLICY "Permitir todo en cuentas_por_cobrar" ON cuentas_por_cobrar FOR ALL USING (true);
CREATE POLICY "Permitir todo en abonos_cuentas" ON abonos_cuentas FOR ALL USING (true);
CREATE POLICY "Permitir todo en asientos_contables" ON asientos_contables FOR ALL USING (true);
CREATE POLICY "Permitir todo en detalle_asientos" ON detalle_asientos FOR ALL USING (true);

-- Función para actualizar saldo de cuenta por cobrar
CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta_cobrar()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cuentas_por_cobrar
  SET 
    monto_pagado = monto_pagado + NEW.monto,
    saldo_pendiente = monto_total - (monto_pagado + NEW.monto),
    estado = CASE 
      WHEN (monto_total - (monto_pagado + NEW.monto)) = 0 THEN 'pagado'
      WHEN (monto_pagado + NEW.monto) > 0 THEN 'parcial'
      ELSE 'pendiente'
    END,
    updated_at = NOW()
  WHERE id = NEW.cuenta_por_cobrar_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_saldo
AFTER INSERT ON abonos_cuentas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_cuenta_cobrar();

-- Insertar catálogo de cuentas básico
INSERT INTO cuentas_contables (codigo, nombre, tipo, subtipo) VALUES
  -- ACTIVOS
  ('1.1.01', 'Caja General', 'activo', 'efectivo'),
  ('1.1.02', 'Banco - Cuenta Corriente', 'activo', 'banco'),
  ('1.2.01', 'Cuentas por Cobrar', 'activo', 'cuenta_cobrar'),
  ('1.3.01', 'Inventario', 'activo', 'inventario'),
  ('1.4.01', 'Equipo Médico', 'activo', 'fijo'),
  ('1.4.02', 'Mobiliario y Equipo', 'activo', 'fijo'),
  
  -- PASIVOS
  ('2.1.01', 'Cuentas por Pagar', 'pasivo', 'cuenta_pagar'),
  ('2.2.01', 'Préstamos Bancarios', 'pasivo', 'deuda'),
  
  -- CAPITAL
  ('3.1.01', 'Capital Social', 'capital', 'capital'),
  ('3.2.01', 'Utilidades Retenidas', 'capital', 'utilidad'),
  
  -- INGRESOS
  ('4.1.01', 'Ingresos por Consultas', 'ingreso', 'servicio'),
  ('4.1.02', 'Ingresos por Estudios', 'ingreso', 'servicio'),
  
  -- GASTOS
  ('5.1.01', 'Salarios', 'gasto', 'personal'),
  ('5.1.02', 'IGSS', 'gasto', 'personal'),
  ('5.2.01', 'Energía Eléctrica', 'gasto', 'servicios'),
  ('5.2.02', 'Agua', 'gasto', 'servicios'),
  ('5.2.03', 'Teléfono e Internet', 'gasto', 'servicios'),
  ('5.3.01', 'Compra de Insumos', 'gasto', 'operativo'),
  ('5.3.02', 'Mantenimiento', 'gasto', 'operativo'),
  ('5.4.01', 'Impuestos', 'gasto', 'impuesto');

-- Vista de estado de resultados
CREATE OR REPLACE VIEW estado_resultados AS
WITH ingresos AS (
  SELECT 
    DATE_TRUNC('month', c.fecha) as mes,
    SUM(dc.precio) as total_ingresos
  FROM consultas c
  LEFT JOIN detalle_consultas dc ON c.id = dc.consulta_id
  GROUP BY DATE_TRUNC('month', c.fecha)
),
gastos AS (
  SELECT 
    DATE_TRUNC('month', fecha) as mes,
    SUM(monto) as total_gastos
  FROM gastos_operativos
  GROUP BY DATE_TRUNC('month', fecha)
)
SELECT 
  COALESCE(i.mes, g.mes) as mes,
  COALESCE(i.total_ingresos, 0) as ingresos,
  COALESCE(g.total_gastos, 0) as gastos,
  (COALESCE(i.total_ingresos, 0) - COALESCE(g.total_gastos, 0)) as utilidad_neta
FROM ingresos i
FULL OUTER JOIN gastos g ON i.mes = g.mes
ORDER BY mes DESC;

-- Vista de cuentas vencidas
CREATE OR REPLACE VIEW cuentas_vencidas AS
SELECT 
  cc.id,
  p.nombre as paciente,
  cc.fecha_emision,
  cc.fecha_vencimiento,
  cc.monto_total,
  cc.monto_pagado,
  cc.saldo_pendiente,
  (CURRENT_DATE - cc.fecha_vencimiento) as dias_vencido
FROM cuentas_por_cobrar cc
LEFT JOIN pacientes p ON cc.paciente_id = p.id
WHERE cc.estado IN ('pendiente', 'parcial', 'vencido')
  AND cc.fecha_vencimiento < CURRENT_DATE
ORDER BY cc.fecha_vencimiento ASC;

COMMENT ON TABLE cuentas_contables IS 'Catálogo de cuentas contables';
COMMENT ON TABLE gastos_operativos IS 'Registro de todos los gastos operativos';
COMMENT ON TABLE cuentas_por_cobrar IS 'Control de cuentas por cobrar a pacientes';
COMMENT ON TABLE abonos_cuentas IS 'Registro de abonos a cuentas por cobrar';
COMMENT ON TABLE asientos_contables IS 'Asientos contables formales';
