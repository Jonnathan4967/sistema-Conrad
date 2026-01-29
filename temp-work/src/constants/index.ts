// Constantes centralizadas del sistema
export const HORARIOS = {
  NORMAL: {
    SEMANA: { INICIO: 7, FIN: 16 },
    SABADO: { INICIO: 7, FIN: 11 }
  }
} as const;

export const FORMAS_PAGO = {
  EFECTIVO: 'efectivo',
  TARJETA: 'tarjeta',
  TRANSFERENCIA: 'transferencia',
  EFECTIVO_FACTURADO: 'efectivo_facturado',
  ESTADO_CUENTA: 'estado_cuenta'
} as const;

export const TIPOS_COBRO = {
  NORMAL: 'normal',
  SOCIAL: 'social',
  ESPECIAL: 'especial'
} as const;

export const VALIDACIONES = {
  TELEFONO_LENGTH: 8,
  NIT_LENGTH: 9,
  EDAD_MIN: 0,
  EDAD_MAX: 120,
  MAX_INPUT_LENGTH: 200
} as const;

export const MENSAJES = {
  ERROR: {
    PACIENTE_REQUERIDO: 'Debe crear un paciente primero usando el botón "Nuevo"',
    ESTUDIOS_REQUERIDOS: 'Debe agregar al menos un estudio',
    TELEFONO_INVALIDO: 'El teléfono debe tener 8 dígitos',
    NIT_INVALIDO: 'NIT inválido. Formato: 1234567-8 o CF',
    TRANSFERENCIA_REQUERIDA: 'Debe ingresar el número de transferencia',
    VOUCHER_REQUERIDO: 'Debe ingresar el número de voucher/baucher',
    JUSTIFICACION_REQUERIDA: 'Debe proporcionar una justificación para usar tarifa normal fuera del horario establecido',
    CAMPOS_REQUERIDOS: 'Debe completar todos los campos requeridos',
    EDAD_INVALIDA: 'La edad debe estar entre 0 y 120 años'
  },
  EXITO: {
    PACIENTE_GUARDADO: 'Paciente guardado exitosamente',
    CONSULTA_GUARDADA: 'Consulta guardada correctamente',
    OPERACION_EXITOSA: 'Operación completada exitosamente'
  },
  CONFIRMACION: {
    LIMPIAR: '¿Está seguro de que desea limpiar toda la información?',
    ELIMINAR: '¿Está seguro de que desea eliminar este elemento?',
    TIPO_RECIBO: '¿Qué recibo desea imprimir?\n\nAceptar (OK) = Recibo Completo (con precios)\nCancelar = Orden para Médico (sin precios)'
  }
} as const;

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
export const TIMEOUT_INACTIVIDAD = 30 * 60 * 1000; // 30 minutos
export const TOAST_DURATION = 3000; // 3 segundos
export const DEBOUNCE_DELAY = 300; // 300ms
export const ITEMS_POR_PAGINA = 50;
