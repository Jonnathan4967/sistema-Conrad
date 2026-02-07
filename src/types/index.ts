// Tipos de datos principales
export interface Paciente {
  id?: string;
  nombre: string; // Nombre completo concatenado
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  edad: number;
  edad_valor?: number; // Valor original (15 días, 3 meses, etc)
  edad_tipo?: 'días' | 'meses' | 'años'; // Tipo de edad
  telefono: string;
  departamento: string;
  municipio: string;
  created_at?: string;
}

export interface Medico {
  id?: string;
  nombre: string;
  telefono: string;
  departamento: string;
  municipio: string;
  direccion: string;
  es_referente: boolean;
  created_at?: string;
}

export interface Estudio {
  id?: string;
  nombre: string;
  activo: boolean;
  created_at?: string;
}

export interface SubEstudio {
  id?: string;
  estudio_id: string;
  nombre: string;
  precio_normal: number;
  precio_social: number;
  precio_especial: number;
  activo: boolean;
  created_at?: string;
}

export interface Consulta {
  id?: string;
  paciente_id: string;
  medico_id: string | null;
  tipo_cobro: 'normal' | 'social' | 'especial';
  requiere_factura: boolean;
  nit?: string;
  forma_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'efectivo_facturado' | 'estado_cuenta' | 'pago_multiple';
  numero_factura?: string;
  sin_informacion_medico: boolean;
  fecha: string;
  detalle_pagos_multiples?: PagoMultiple[]; // Para pagos múltiples
  created_at?: string;
}

// Nueva interfaz para pagos múltiples
export interface PagoMultiple {
  forma_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'efectivo_facturado';
  monto: number;
  numero_referencia?: string;
}

export interface DetalleConsulta {
  id?: string;
  consulta_id: string;
  sub_estudio_id: string;
  precio: number;
  comentarios?: string; // Comentarios adicionales opcionales
  created_at?: string;
}

export interface CuadreDiario {
  fecha: string;
  total_consultas: number;
  sub_total: number;
  descuento: number;
  monto_gravable: number;
  impuesto: number;
  total_ventas: number;
}

export interface Departamento {
  id: string;
  nombre: string;
}

export interface Municipio {
  id: string;
  nombre: string;
  departamento_id: string;
}

export type TipoCobro = 'normal' | 'social' | 'especial' | 'personalizado';
export type FormaPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'efectivo_facturado' | 'estado_cuenta' | 'pago_multiple';

// ===== TIPOS DEL MÓDULO DE INVENTARIO =====

export interface CategoriaInventario {
  id?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at?: string;
}

export interface Proveedor {
  id?: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  nit?: string;
  activo: boolean;
  created_at?: string;
}

export interface ProductoInventario {
  id?: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  categoria_id?: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo?: number;
  precio_compra: number;
  precio_venta?: number;
  ubicacion?: string;
  lote?: string;
  fecha_vencimiento?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MovimientoInventario {
  id?: string;
  producto_id: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste' | 'merma';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo?: string;
  proveedor_id?: string;
  costo_unitario?: number;
  costo_total?: number;
  numero_factura?: string;
  usuario?: string;
  fecha: string;
  created_at?: string;
}

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste' | 'merma';
export type UnidadMedida = 'unidad' | 'caja' | 'litro' | 'kilogramo' | 'paquete';

// ===== TIPOS DEL MÓDULO DE CONTABILIDAD =====

export interface CuentaContable {
  id?: string;
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
  subtipo?: string;
  saldo_inicial: number;
  saldo_actual: number;
  activo: boolean;
  created_at?: string;
}

export interface GastoOperativo {
  id?: string;
  fecha: string;
  categoria: 'servicios' | 'salarios' | 'insumos' | 'mantenimiento' | 'impuestos' | 'otros';
  concepto: string;
  monto: number;
  forma_pago: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta';
  proveedor?: string;
  numero_factura?: string;
  numero_referencia?: string;
  cuenta_contable_id?: string;
  observaciones?: string;
  usuario?: string;
  created_at?: string;
}

export interface CuentaPorCobrar {
  id?: string;
  paciente_id: string;
  consulta_id?: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado: 'pendiente' | 'parcial' | 'pagado' | 'vencido';
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AbonoCuenta {
  id?: string;
  cuenta_por_cobrar_id: string;
  fecha: string;
  monto: number;
  forma_pago: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta';
  numero_referencia?: string;
  observaciones?: string;
  usuario?: string;
  created_at?: string;
}

export interface AsientoContable {
  id?: string;
  numero_asiento?: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso' | 'ajuste';
  descripcion: string;
  total_debe: number;
  total_haber: number;
  referencia_id?: string;
  referencia_tipo?: string;
  usuario?: string;
  created_at?: string;
}

export interface DetalleAsiento {
  id?: string;
  asiento_id: string;
  cuenta_contable_id: string;
  debe: number;
  haber: number;
  descripcion?: string;
  created_at?: string;
}

export type TipoCuenta = 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
export type CategoriaGasto = 'servicios' | 'salarios' | 'insumos' | 'mantenimiento' | 'impuestos' | 'otros';
export type EstadoCuenta = 'pendiente' | 'parcial' | 'pagado' | 'vencido';