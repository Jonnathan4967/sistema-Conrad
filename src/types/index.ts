// Tipos de datos principales
export interface Paciente {
  id?: string;
  nombre: string;
  edad: number;
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
  forma_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'efectivo_facturado' | 'estado_cuenta';
  numero_factura?: string;
  sin_informacion_medico: boolean;
  fecha: string;
  created_at?: string;
}

export interface DetalleConsulta {
  id?: string;
  consulta_id: string;
  sub_estudio_id: string;
  precio: number;
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

export type TipoCobro = 'normal' | 'social' | 'especial';
export type FormaPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'efectivo_facturado' | 'estado_cuenta';
