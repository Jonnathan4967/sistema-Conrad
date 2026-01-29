import { VALIDACIONES } from '../constants';

// Sanitización de inputs
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, VALIDACIONES.MAX_INPUT_LENGTH);
};

// Validación de teléfono
export const validarTelefono = (telefono: string): { valido: boolean; mensaje?: string } => {
  const telefonoLimpio = telefono.replace(/\D/g, '');
  
  if (telefonoLimpio.length !== VALIDACIONES.TELEFONO_LENGTH) {
    return { 
      valido: false, 
      mensaje: `El teléfono debe tener ${VALIDACIONES.TELEFONO_LENGTH} dígitos` 
    };
  }
  
  return { valido: true };
};

// Validación de NIT
export const validarNIT = (nit: string): { valido: boolean; mensaje?: string } => {
  const nitLimpio = nit.replace(/[-\s]/g, '').toUpperCase();
  
  if (nitLimpio === 'CF') return { valido: true };
  
  if (!/^\d{7,8}\d$/.test(nitLimpio)) {
    return { 
      valido: false, 
      mensaje: 'NIT inválido. Formato: 1234567-8 o CF' 
    };
  }
  
  return { valido: true };
};

// Formatear NIT
export const formatearNIT = (nit: string): string => {
  const limpio = nit.replace(/[-\s]/g, '').toUpperCase();
  
  if (limpio === 'CF') return 'CF';
  
  if (limpio.length >= 7) {
    return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
  }
  
  return limpio;
};

// Validación de edad
export const validarEdad = (edad: number): { valido: boolean; mensaje?: string } => {
  if (edad < VALIDACIONES.EDAD_MIN || edad > VALIDACIONES.EDAD_MAX) {
    return { 
      valido: false, 
      mensaje: `La edad debe estar entre ${VALIDACIONES.EDAD_MIN} y ${VALIDACIONES.EDAD_MAX} años` 
    };
  }
  
  return { valido: true };
};

// Formatear moneda
export const formatearMoneda = (monto: number): string => {
  return `Q ${monto.toFixed(2)}`;
};

// Formatear fecha
export const formatearFecha = (fecha: Date): string => {
  return fecha.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Formatear hora
export const formatearHora = (fecha: Date): string => {
  return fecha.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
