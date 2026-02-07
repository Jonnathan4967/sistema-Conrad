import ExcelJS from 'exceljs';
import { supabase } from '../lib/supabase';

interface Consulta {
  fecha: string;
  created_at: string;
  es_servicio_movil?: boolean;
  movil_establecimiento?: string;
  movil_incluye_placas?: boolean;
  movil_precio_placas?: number;
  movil_incluye_informe?: boolean;
  movil_precio_informe?: number;
  pacientes: {
    nombre: string;
    edad: number;
    edad_valor?: number;
    edad_tipo?: 'días' | 'meses' | 'años';
  };
  medicos?: {
    nombre: string;
  };
  medico_recomendado?: string;
  sin_informacion_medico?: boolean;
  numero_factura?: string;
  tipo_cobro: string;
  forma_pago: string;
  detalle_pagos_multiples?: Array<{
    forma_pago: string;
    monto: number;
    numero_referencia?: string;
  }>;
  detalle_consultas: Array<{
    precio: number;
    es_referido_medico?: boolean;
    numero_factura?: string;
    nit?: string;
    numero_voucher?: string;
    numero_transferencia?: string;
    comentarios?: string;
    sub_estudios: {
      nombre: string;
      estudios: {
        id: string;
        nombre: string;
      };
    };
  }>;
}

interface Estudio {
  id: string;
  nombre: string;
}

// ✅ FUNCIÓN PARA GENERAR REPORTE GENERAL (COMPLETA)
export const generarReporteExcel = async (
  mes: number,
  anio: number,
  consultas: Consulta[]
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();

  // Obtener todos los estudios disponibles
  const { data: estudiosDisponibles, error: errorEstudios } = await supabase
    .from('estudios')
    .select('id, nombre')
    .order('nombre');

  if (errorEstudios) throw errorEstudios;

  // Agrupar consultas por día
  const consultasPorDia: { [key: number]: Consulta[] } = {};
  consultas.forEach(consulta => {
    const fecha = new Date(consulta.fecha + 'T12:00:00');
    const dia = fecha.getDate();
    if (!consultasPorDia[dia]) consultasPorDia[dia] = [];
    consultasPorDia[dia].push(consulta);
  });

  const diasConConsultas = Object.keys(consultasPorDia).map(Number).sort((a, b) => a - b);

  let diasAGenerar: number[];
  if (diasConConsultas.length === 0) {
    const diasDelMes = new Date(anio, mes, 0).getDate();
    diasAGenerar = Array.from({ length: diasDelMes }, (_, i) => i + 1);
  } else {
    diasAGenerar = diasConConsultas;
  }

  // Crear hoja por cada día
  for (const dia of diasAGenerar) {
    const consultasDia = consultasPorDia[dia] || [];
    const nombreHoja = `${dia.toString().padStart(2, '0')}${mes.toString().padStart(2, '0')}${anio.toString().slice(-2)}`;
    await crearHojaDiaria(workbook, nombreHoja, dia, mes, anio, consultasDia, estudiosDisponibles || []);
  }

  // Generar archivo y descargar
  const nombreMes = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'][mes - 1];
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `REPORTE_${nombreMes}_${anio}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

async function crearHojaDiaria(
  workbook: ExcelJS.Workbook,
  nombreHoja: string,
  dia: number,
  mes: number,
  anio: number,
  consultas: Consulta[],
  estudiosDisponibles: Estudio[]
): Promise<void> {
  const worksheet = workbook.addWorksheet(nombreHoja);
  const fecha = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${anio}`;

  // Calcular número total de columnas
  const numColumnasFijas = 9; // ✅ Cambiado de 8 a 9 (agregamos HORA)
  const numColumnasEstudios = estudiosDisponibles.length;
  const numColumnasFinales = 2;
  const totalColumnas = numColumnasFijas + numColumnasEstudios + numColumnasFinales;

  // Configurar anchos de columna
  const columnWidths: any[] = [
    { width: 4 },   // No.
    { width: 8 },   // ✅ NUEVA: HORA
    { width: 24 },  // Nombre
    { width: 6 },   // Edad
    { width: 13 },  // No. Factura
    { width: 28 },  // Estudio
    { width: 20 },  // Médico
    { width: 13 },  // Precio Social
    { width: 13 },  // Forma de Pago
  ];

  estudiosDisponibles.forEach(() => {
    columnWidths.push({ width: 11 });
  });

  columnWidths.push({ width: 11 });
  columnWidths.push({ width: 6 });

  worksheet.columns = columnWidths;

  // FILA 1: TÍTULO
  worksheet.mergeCells(`B1:F1`);
  
  const getColumnLetter = (colNumber: number): string => {
    let letter = '';
    while (colNumber > 0) {
      const remainder = (colNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      colNumber = Math.floor((colNumber - 1) / 26);
    }
    return letter;
  };
  
  const ultimaColumna = getColumnLetter(totalColumnas);
  worksheet.mergeCells(`G1:${ultimaColumna}1`);
  
  const cellFecha = worksheet.getCell('B1');
  cellFecha.value = `FECHA: ${fecha}`;
  cellFecha.font = { name: 'Calibri', size: 11, bold: true };
  cellFecha.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' }
  };
  cellFecha.alignment = { horizontal: 'left', vertical: 'middle' };
  cellFecha.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  const cellConrad = worksheet.getCell('G1');
  cellConrad.value = 'CONRAD CENTRAL';
  cellConrad.font = { name: 'Calibri', size: 14, bold: true };
  cellConrad.alignment = { horizontal: 'center', vertical: 'middle' };
  cellConrad.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // FILA 2: HEADERS
  const headers = [
    '',
    'HORA', // ✅ NUEVA COLUMNA
    'NOMBRE DEL PACIENTE',
    'EDAD',
    'NO. FACTURA',
    'ESTUDIO',
    'MEDICO REFERENTE',
    'PRECIO SOCIAL',
    'FORMA DE PAGO',
    ...estudiosDisponibles.map(e => e.nombre.toUpperCase()),
    'CUENTA',
    'TIPO'
  ];
  
  worksheet.getRow(2).values = headers;
  worksheet.getRow(2).height = 25;
  
  headers.forEach((header, idx) => {
    if (idx === 0) return;
    const cell = worksheet.getCell(2, idx + 1);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // FILAS 3+: DATOS
  let filaActual = 3;

  consultas.forEach((consulta, idx) => {
    // Agrupar TODOS los estudios en una sola línea
    const nombresEstudios = consulta.detalle_consultas
      .map(d => {
        const nombre = d.sub_estudios?.nombre || '';
        const comentario = d.comentarios ? ` (${d.comentarios})` : '';
        return nombre + comentario;
      })
      .join(', ');
    
    // Calcular si es horario inhábil
    const fechaConsulta = new Date(consulta.created_at);
    const diaSemana = fechaConsulta.getDay();
    const hora = fechaConsulta.getHours();
    
    let esInhabil = false;
    
    if (diaSemana === 0) {
      esInhabil = true;
    } else if (diaSemana === 6) {
      esInhabil = hora < 7 || hora >= 11;
    } else {
      esInhabil = hora < 7 || hora >= 16;
    }
    
    const estudioTexto = esInhabil ? `${nombresEstudios.toUpperCase()} INHABIL` : nombresEstudios.toUpperCase();

    // Sumar TODOS los precios
    const precioTotal = consulta.detalle_consultas.reduce((sum, det) => sum + det.precio, 0);
      
    let nombreMedico: string;
    
    if (consulta.sin_informacion_medico) {
      nombreMedico = 'SIN INFORMACIÓN';
    } else if (consulta.medicos?.nombre) {
      nombreMedico = consulta.medicos.nombre;
    } else if (consulta.medico_recomendado) {
      nombreMedico = consulta.medico_recomendado;
    } else {
      nombreMedico = 'TRATANTE';
    }

    // Formatear edad correctamente
    const edadFormateada = consulta.pacientes.edad_valor && consulta.pacientes.edad_tipo
      ? `${consulta.pacientes.edad_valor} ${consulta.pacientes.edad_tipo}`
      : `${consulta.pacientes.edad} años`;

    // Mapear forma de pago a texto legible
    const formaPagoTexto = (() => {
      switch (consulta.forma_pago) {
        case 'efectivo':
          return 'EFECTIVO';
        case 'efectivo_facturado':
          return 'DEPOSITADO';
        case 'transferencia':
          return 'TRANSFERENCIA'; // ✅ Cambio: ahora muestra TRANSFERENCIA
        case 'tarjeta':
          return 'TARJETA';
        case 'estado_cuenta':
          return 'ESTADO DE CUENTA';
        default:
          return consulta.forma_pago.toUpperCase();
      }
    })();

    // Mapear tipo de cobro a código
    const tipoCobroTexto = (() => {
      switch (consulta.tipo_cobro) {
        case 'normal':
          return 'P';
        case 'social':
          return 'H';
        case 'especial':
          return 'PE';
        case 'personalizado':
          return 'PP';
        default:
          return 'P';
      }
    })();

    // Recolectar TODAS las facturas
    const facturas: string[] = [];
    
    if (consulta.numero_factura) {
      facturas.push(consulta.numero_factura);
    }
    
    consulta.detalle_consultas.forEach(det => {
      if (det.numero_factura) {
        facturas.push(det.numero_factura);
      }
    });
    
    const todasLasFacturas = facturas.length > 0 ? facturas.join(', ') : '';

    // ✅ NUEVO: Extraer hora de created_at
    const horaConsulta = new Date(consulta.created_at).toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const valoresFila: any[] = [
      idx + 1,
      horaConsulta, // ✅ NUEVA: Columna de hora
      consulta.pacientes.nombre.toUpperCase(),
      edadFormateada,
      todasLasFacturas,
      estudioTexto,
      nombreMedico.toUpperCase(),
      consulta.tipo_cobro === 'social' ? precioTotal : '',
      formaPagoTexto
    ];

    // Distribuir precios en las columnas de estudios
    estudiosDisponibles.forEach(estudio => {
      const tieneEstudio = consulta.detalle_consultas.some(
        det => det.sub_estudios?.estudios?.id === estudio.id
      );
      
      if (tieneEstudio) {
        const precioEstudio = consulta.detalle_consultas
          .filter(det => det.sub_estudios?.estudios?.id === estudio.id)
          .reduce((sum, det) => sum + det.precio, 0);
        valoresFila.push(precioEstudio);
      } else {
        valoresFila.push('');
      }
    });

    valoresFila.push(consulta.forma_pago === 'estado_cuenta' ? precioTotal : '');
    valoresFila.push(tipoCobroTexto);

    worksheet.getRow(filaActual).values = valoresFila;

    valoresFila.forEach((valor, colIdx) => {
      const cell = worksheet.getCell(filaActual, colIdx + 1);
      
      // ✅ Actualizado: colIdx 5 es ESTUDIO (antes era 4)
      if (colIdx === 5 && esInhabil) {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FFFF0000' }, bold: true };
      } else {
        cell.font = { name: 'Arial', size: 10 };
      }

      // Alineación de columnas
      // colIdx 0 = No. (centro)
      // colIdx 1 = HORA (centro) ✅ NUEVO
      // colIdx 3 = EDAD (centro)
      // colIdx >= 8 = Columnas numéricas (derecha)
      // último = TIPO (centro)
      if (colIdx === 0 || colIdx === 1 || colIdx === 3) { // ✅ Agregado colIdx 1 (HORA)
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx >= 8 && colIdx < valoresFila.length - 1) { // ✅ Cambiado de 7 a 8
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colIdx === valoresFila.length - 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      if (typeof valor === 'number' && colIdx >= 8) { // ✅ Cambiado de 7 a 8
        cell.numFmt = '#,##0.00';
      }

      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    filaActual++;
  });

  // TOTALES
  const filaTotalesInicio = Math.max(filaActual + 2, 8);

  const totalEfectivo = consultas
    .filter(c => c.forma_pago === 'efectivo')
    .reduce((sum, c) => sum + c.detalle_consultas.reduce((s, d) => s + d.precio, 0), 0);
  
  const totalDepositado = consultas
    .filter(c => c.forma_pago === 'efectivo_facturado')
    .reduce((sum, c) => sum + c.detalle_consultas.reduce((s, d) => s + d.precio, 0), 0);
  
  // ✅ NUEVO: Transferencia separada
  const totalTransferencia = consultas
    .filter(c => c.forma_pago === 'transferencia')
    .reduce((sum, c) => sum + c.detalle_consultas.reduce((s, d) => s + d.precio, 0), 0);
  
  const totalTarjeta = consultas
    .filter(c => c.forma_pago === 'tarjeta')
    .reduce((sum, c) => sum + c.detalle_consultas.reduce((s, d) => s + d.precio, 0), 0);
  
  const totalEstadoCuenta = consultas
    .filter(c => c.forma_pago === 'estado_cuenta')
    .reduce((sum, c) => sum + c.detalle_consultas.reduce((s, d) => s + d.precio, 0), 0);
  
  const totalGenerado = consultas
    .reduce((sum, c) => sum + c.detalle_consultas.reduce((s, d) => s + d.precio, 0), 0);

  const totales = [
    { label: 'EFECTIVO', valor: totalEfectivo },
    { label: 'DEPOSITADO', valor: totalDepositado },
    { label: 'TRANSFERENCIA', valor: totalTransferencia }, // ✅ NUEVO
    { label: 'TARJETA', valor: totalTarjeta },
    { label: 'ESTADO DE CUENTA', valor: totalEstadoCuenta },
    { label: 'TOTAL GENERADO', valor: totalGenerado }
  ];

  totales.forEach((total, idx) => {
    const fila = filaTotalesInicio + idx;

    const cellLabel = worksheet.getCell(fila, 8); // ✅ Cambiado de 7 a 8
    cellLabel.value = total.label;
    cellLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cellLabel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cellLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    cellLabel.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };

    const cellValor = worksheet.getCell(fila, 9); // ✅ Cambiado de 8 a 9
    cellValor.value = total.valor;
    cellValor.numFmt = '#,##0.00';
    cellValor.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cellValor.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cellValor.alignment = { horizontal: 'right', vertical: 'middle' };
    cellValor.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
}

// ✅ FUNCIÓN PARA GENERAR REPORTE DE MÓVILES CON TOTALES
export const generarReporteMoviles = async (
  mes: number,
  anio: number,
  consultas: Consulta[]
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();

  // Agrupar consultas por día
  const consultasPorDia: { [key: number]: Consulta[] } = {};
  consultas.forEach(consulta => {
    const fecha = new Date(consulta.fecha + 'T12:00:00');
    const dia = fecha.getDate();
    if (!consultasPorDia[dia]) consultasPorDia[dia] = [];
    consultasPorDia[dia].push(consulta);
  });

  const diasConConsultas = Object.keys(consultasPorDia).map(Number).sort((a, b) => a - b);

  let diasAGenerar: number[];
  if (diasConConsultas.length === 0) {
    const diasDelMes = new Date(anio, mes, 0).getDate();
    diasAGenerar = Array.from({ length: diasDelMes }, (_, i) => i + 1);
  } else {
    diasAGenerar = diasConConsultas;
  }

  // Crear hoja por cada día
  for (const dia of diasAGenerar) {
    const consultasDia = consultasPorDia[dia] || [];
    const nombreHoja = `${dia.toString().padStart(2, '0')}${mes.toString().padStart(2, '0')}${anio.toString().slice(-2)}`;
    await crearHojaMoviles(workbook, nombreHoja, dia, mes, anio, consultasDia);
  }

  // Generar archivo y descargar
  const nombreMes = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'][mes - 1];
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SERVICIOS_MOVILES_${nombreMes}_${anio}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

async function crearHojaMoviles(
  workbook: ExcelJS.Workbook,
  nombreHoja: string,
  dia: number,
  mes: number,
  anio: number,
  consultas: Consulta[]
): Promise<void> {
  const worksheet = workbook.addWorksheet(nombreHoja);
  const fecha = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${anio}`;

  // Configurar anchos de columna
  worksheet.columns = [
    { width: 4 },   // No.
    { width: 30 },  // Establecimiento
    { width: 25 },  // Paciente
    { width: 10 },  // Edad
    { width: 35 },  // Estudios RX
    { width: 12 },  // Precio
    { width: 20 },  // Extras
    { width: 12 },  // Total
    { width: 15 },  // Forma de Pago
  ];

  // FILA 1: TÍTULO
  worksheet.mergeCells('B1:D1');
  worksheet.mergeCells('E1:I1');
  
  const cellFecha = worksheet.getCell('B1');
  cellFecha.value = `📱 SERVICIOS MÓVILES - FECHA: ${fecha}`;
  cellFecha.font = { name: 'Calibri', size: 11, bold: true };
  cellFecha.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFA500' } // Naranja
  };
  cellFecha.alignment = { horizontal: 'left', vertical: 'middle' };
  cellFecha.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  const cellConrad = worksheet.getCell('E1');
  cellConrad.value = 'CONRAD CENTRAL';
  cellConrad.font = { name: 'Calibri', size: 14, bold: true };
  cellConrad.alignment = { horizontal: 'center', vertical: 'middle' };
  cellConrad.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // FILA 2: HEADERS
  const headers = [
    '',
    'ESTABLECIMIENTO',
    'PACIENTE',
    'EDAD',
    'ESTUDIOS RX',
    'PRECIO',
    'EXTRAS',
    'TOTAL',
    'FORMA DE PAGO'
  ];
  
  worksheet.getRow(2).values = headers;
  worksheet.getRow(2).height = 25;
  
  headers.forEach((header, idx) => {
    if (idx === 0) return;
    const cell = worksheet.getCell(2, idx + 1);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF8C00' } // Naranja oscuro
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // FILAS 3+: DATOS
  let filaActual = 3;
  let numeroFila = 1;

  consultas.forEach((consulta) => {
    const estudiosRX = consulta.detalle_consultas
      .filter(d => d.sub_estudios?.estudios?.nombre?.toUpperCase() === 'RX')
      .map(d => {
        const nombre = d.sub_estudios?.nombre || '';
        const comentario = d.comentarios ? ` (${d.comentarios})` : '';
        return nombre + comentario;
      })
      .join(', ');
    
    const precioRX = consulta.detalle_consultas
      .filter(d => d.sub_estudios?.estudios?.nombre?.toUpperCase() === 'RX')
      .reduce((sum, det) => sum + det.precio, 0);

    let extras = 0;
    let extrasTexto = '';
    const extrasArray: string[] = [];
    
    if (consulta.movil_incluye_placas && consulta.movil_precio_placas) {
      extras += consulta.movil_precio_placas;
      extrasArray.push(`Placas: Q${consulta.movil_precio_placas.toFixed(2)}`);
    }
    
    if (consulta.movil_incluye_informe && consulta.movil_precio_informe) {
      extras += consulta.movil_precio_informe;
      extrasArray.push(`Informe: Q${consulta.movil_precio_informe.toFixed(2)}`);
    }
    
    extrasTexto = extrasArray.length > 0 ? extrasArray.join(' + ') : '-';

    const totalFinal = precioRX + extras;

    const edadFormateada = consulta.pacientes.edad_valor && consulta.pacientes.edad_tipo
      ? `${consulta.pacientes.edad_valor} ${consulta.pacientes.edad_tipo}`
      : `${consulta.pacientes.edad} años`;

    const establecimiento = consulta.movil_establecimiento?.toUpperCase() || 'SIN ESPECIFICAR';
    const nombrePaciente = consulta.pacientes?.nombre?.toUpperCase() || 'SIN NOMBRE';

    const formaPagoTexto = (() => {
      switch (consulta.forma_pago) {
        case 'efectivo':
          return 'EFECTIVO';
        case 'efectivo_facturado':
          return 'DEPOSITADO';
        case 'transferencia':
          return 'TRANSFERENCIA'; // ✅ Cambio
        case 'tarjeta':
          return 'TARJETA';
        case 'estado_cuenta':
          return 'ESTADO DE CUENTA';
        default:
          return consulta.forma_pago?.toUpperCase() || 'SIN ESPECIFICAR';
      }
    })();

    const valoresFila: any[] = [
      numeroFila,
      establecimiento,
      nombrePaciente,
      edadFormateada,
      estudiosRX.toUpperCase() || 'SIN ESTUDIOS',
      precioRX,
      extrasTexto,
      totalFinal,
      formaPagoTexto
    ];

    worksheet.getRow(filaActual).values = valoresFila;

    valoresFila.forEach((valor, colIdx) => {
      const cell = worksheet.getCell(filaActual, colIdx + 1);
      
      cell.font = { name: 'Arial', size: 10 };

      if (colIdx === 0 || colIdx === 3) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx === 5 || colIdx === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }

      if (typeof valor === 'number' && (colIdx === 5 || colIdx === 7)) {
        cell.numFmt = '#,##0.00';
      }

      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    filaActual++;
    numeroFila++;
  });

  // CUADRO DE TOTALES DESGLOSADO POR FORMA DE PAGO
  const filaTotalesInicio = Math.max(filaActual + 2, 8);

  // Calcular totales por forma de pago
  const totalesPorFormaPago: { [key: string]: number } = {};
  
  consultas.forEach(c => {
    const precioRX = c.detalle_consultas
      .filter(d => d.sub_estudios?.estudios?.nombre?.toUpperCase() === 'RX')
      .reduce((s, d) => s + d.precio, 0);
    
    const extras = (c.movil_incluye_placas ? (c.movil_precio_placas || 0) : 0) +
                   (c.movil_incluye_informe ? (c.movil_precio_informe || 0) : 0);
    
    const total = precioRX + extras;
    
    // Normalizar forma de pago
    let formaPago = c.forma_pago;
    if (formaPago === 'efectivo_facturado' || formaPago === 'transferencia') {
      formaPago = 'depositado';
    }
    
    if (!totalesPorFormaPago[formaPago]) {
      totalesPorFormaPago[formaPago] = 0;
    }
    totalesPorFormaPago[formaPago] += total;
  });

  // Calcular total general
  const totalGeneral = Object.values(totalesPorFormaPago).reduce((sum, val) => sum + val, 0);

  // Mapeo de nombres de forma de pago
  const nombresFormaPago: { [key: string]: string } = {
    'efectivo': 'EFECTIVO',
    'depositado': 'DEPOSITADO',
    'tarjeta': 'TARJETA',
    'estado_cuenta': 'ESTADO DE CUENTA'
  };

  // Crear filas de totales
  let filaTotal = filaTotalesInicio;
  
  // Título del cuadro
  const cellTituloTotales = worksheet.getCell(filaTotal, 7);
  cellTituloTotales.value = '💰 TOTALES POR FORMA DE PAGO';
  cellTituloTotales.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cellTituloTotales.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6600' }
  };
  cellTituloTotales.alignment = { horizontal: 'center', vertical: 'middle' };
  cellTituloTotales.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells(filaTotal, 7, filaTotal, 8);
  filaTotal++;

  // Mostrar cada forma de pago
  Object.entries(totalesPorFormaPago).forEach(([forma, monto]) => {
    const cellLabel = worksheet.getCell(filaTotal, 7);
    cellLabel.value = nombresFormaPago[forma] || forma.toUpperCase();
    cellLabel.font = { name: 'Calibri', size: 10, bold: true };
    cellLabel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };
    cellLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    cellLabel.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };

    const cellValor = worksheet.getCell(filaTotal, 8);
    cellValor.value = monto;
    cellValor.numFmt = '#,##0.00';
    cellValor.font = { name: 'Calibri', size: 10, bold: true };
    cellValor.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };
    cellValor.alignment = { horizontal: 'right', vertical: 'middle' };
    cellValor.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };

    filaTotal++;
  });

  // Total general
  const cellLabelTotal = worksheet.getCell(filaTotal, 7);
  cellLabelTotal.value = 'TOTAL GENERADO:';
  cellLabelTotal.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cellLabelTotal.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF8C00' }
  };
  cellLabelTotal.alignment = { horizontal: 'right', vertical: 'middle' };
  cellLabelTotal.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  const cellValorTotal = worksheet.getCell(filaTotal, 8);
  cellValorTotal.value = totalGeneral;
  cellValorTotal.numFmt = '#,##0.00';
  cellValorTotal.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cellValorTotal.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF8C00' }
  };
  cellValorTotal.alignment = { horizontal: 'right', vertical: 'middle' };
  cellValorTotal.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
}
// ✅ NUEVA FUNCIÓN: Reporte Mensual Unificado (una sola hoja)
export const generarReporteMensualUnificado = async (
  mes: number,
  anio: number,
  consultas: Consulta[]
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('REPORTE MENSUAL');

  // Obtener todos los estudios disponibles para columnas dinámicas
  const { data: estudiosDisponibles, error: errorEstudios } = await supabase
    .from('estudios')
    .select('id, nombre')
    .order('nombre');

  if (errorEstudios) throw errorEstudios;

  const estudios = estudiosDisponibles || [];
  const numColumnasFijas = 8; // No., Fecha, Paciente, Edad, No. Factura, Estudio, Médico, Precio Social
  const numColumnasEstudios = estudios.length;
  const numColumnasFinales = 3; // Forma Pago, Cuenta, Tipo
  const totalColumnas = numColumnasFijas + numColumnasEstudios + numColumnasFinales;

  // Configurar anchos de columna
  const columnWidths: any[] = [
    { width: 4 },   // No.
    { width: 10 },  // Fecha
    { width: 24 },  // Paciente
    { width: 6 },   // Edad
    { width: 13 },  // No. Factura
    { width: 28 },  // Estudio
    { width: 20 },  // Médico
    { width: 13 },  // Precio Social
  ];

  estudios.forEach(() => {
    columnWidths.push({ width: 11 }); // Columnas de estudios
  });

  columnWidths.push({ width: 13 }); // Forma de pago
  columnWidths.push({ width: 11 }); // Cuenta
  columnWidths.push({ width: 6 });  // Tipo

  worksheet.columns = columnWidths;

  // FILA 1: TÍTULO
  const getColumnLetter = (colNumber: number): string => {
    let letter = '';
    while (colNumber > 0) {
      const remainder = (colNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      colNumber = Math.floor((colNumber - 1) / 26);
    }
    return letter;
  };

  const nombreMes = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'][mes - 1];

  worksheet.mergeCells('A1:E1');
  const cellTitulo = worksheet.getCell('A1');
  cellTitulo.value = `REPORTE MENSUAL - ${nombreMes} ${anio}`;
  cellTitulo.font = { name: 'Calibri', size: 14, bold: true };
  cellTitulo.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' }
  };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  cellTitulo.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  const ultimaColumna = getColumnLetter(totalColumnas);
  worksheet.mergeCells(`F1:${ultimaColumna}1`);
  const cellConrad = worksheet.getCell('F1');
  cellConrad.value = 'CONRAD CENTRAL';
  cellConrad.font = { name: 'Calibri', size: 14, bold: true };
  cellConrad.alignment = { horizontal: 'center', vertical: 'middle' };
  cellConrad.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // FILA 2: HEADERS
  const headers = [
    'No.',
    'FECHA',
    'NOMBRE DEL PACIENTE',
    'EDAD',
    'NO. FACTURA',
    'ESTUDIO',
    'MEDICO REFERENTE',
    'PRECIO SOCIAL',
    ...estudios.map(e => e.nombre.toUpperCase()),
    'FORMA DE PAGO',
    'CUENTA',
    'TIPO'
  ];

  worksheet.getRow(2).values = headers;
  worksheet.getRow(2).height = 25;

  headers.forEach((header, idx) => {
    const cell = worksheet.getCell(2, idx + 1);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // FILAS 3+: DATOS
  let filaActual = 3;
  let numeroConsecutivo = 1;

  consultas.forEach((consulta) => {
    const nombresEstudios = consulta.detalle_consultas
      .map(d => {
        const nombre = d.sub_estudios?.nombre || '';
        const comentario = d.comentarios ? ` (${d.comentarios})` : '';
        return nombre + comentario;
      })
      .join(', ');

    const fechaConsulta = new Date(consulta.created_at);
    const diaSemana = fechaConsulta.getDay();
    const hora = fechaConsulta.getHours();

    let esInhabil = false;
    if (diaSemana === 0) {
      esInhabil = true;
    } else if (diaSemana === 6) {
      esInhabil = hora < 7 || hora >= 11;
    } else {
      esInhabil = hora < 7 || hora >= 16;
    }

    const estudioTexto = esInhabil ? `${nombresEstudios.toUpperCase()} INHABIL` : nombresEstudios.toUpperCase();

    const medicoNombre = consulta.sin_informacion_medico 
      ? 'SIN INFORMACIÓN'
      : (consulta.medicos?.nombre || consulta.medico_recomendado || 'N/A');

    const precioSocial = consulta.detalle_consultas.reduce((sum, d) => sum + d.precio, 0);

    const edadFormateada = consulta.pacientes.edad_valor && consulta.pacientes.edad_tipo
      ? `${consulta.pacientes.edad_valor} ${consulta.pacientes.edad_tipo}`
      : `${consulta.pacientes.edad} años`;

    const fechaFormateada = new Date(consulta.fecha).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Mapear forma de pago
    const formaPagoTexto = (() => {
      if (consulta.forma_pago === 'pago_multiple') return 'MÚLTIPLE';
      switch (consulta.forma_pago) {
        case 'efectivo': return 'EFECTIVO';
        case 'efectivo_facturado': return 'DEPOSITADO';
        case 'transferencia': return 'TRANSFERENCIA'; // ✅ Cambio
        case 'tarjeta': return 'TARJETA';
        case 'estado_cuenta': return 'ESTADO DE CUENTA';
        default: return consulta.forma_pago?.toUpperCase() || '';
      }
    })();

    // Valores de la fila base
    const valoresFila: any[] = [
      numeroConsecutivo++,
      fechaFormateada,
      consulta.pacientes?.nombre?.toUpperCase() || 'SIN NOMBRE',
      edadFormateada,
      consulta.numero_factura || '',
      estudioTexto,
      medicoNombre.toUpperCase(),
      precioSocial
    ];

    // Agregar columnas de estudios (marcar con precio si aplica)
    estudios.forEach(estudio => {
      const tieneEstudio = consulta.detalle_consultas.some(
        d => d.sub_estudios?.estudios?.id === estudio.id
      );
      if (tieneEstudio) {
        const precioEstudio = consulta.detalle_consultas
          .filter(d => d.sub_estudios?.estudios?.id === estudio.id)
          .reduce((sum, d) => sum + d.precio, 0);
        valoresFila.push(precioEstudio);
      } else {
        valoresFila.push('');
      }
    });

    // Agregar columnas finales
    valoresFila.push(formaPagoTexto);
    valoresFila.push(precioSocial); // Cuenta (total)
    valoresFila.push(consulta.tipo_cobro?.toUpperCase() || 'NORMAL');

    worksheet.getRow(filaActual).values = valoresFila;

    // Aplicar estilos
    valoresFila.forEach((valor, colIdx) => {
      const cell = worksheet.getCell(filaActual, colIdx + 1);
      cell.font = { name: 'Arial', size: 10 };

      if (colIdx === 0 || colIdx === 3) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx >= numColumnasFijas - 1) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (typeof valor === 'number') {
          cell.numFmt = '#,##0.00';
        }
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    filaActual++;
  });

  // TABLA DE TOTALES AL FINAL
  filaActual += 2; // Espacio

  // Calcular totales por forma de pago
  const totales: { [key: string]: number } = {
    efectivo: 0,
    depositado: 0,
    transferencia: 0, // ✅ NUEVO: Transferencia separada
    tarjeta: 0,
    estado_cuenta: 0
  };

  consultas.forEach(consulta => {
    const total = consulta.detalle_consultas.reduce((sum, d) => sum + d.precio, 0);
    
    if (consulta.forma_pago === 'pago_multiple' && consulta.detalle_pagos_multiples) {
      // ✅ Desglosa por pagos múltiples
      consulta.detalle_pagos_multiples.forEach((pago: any) => {
        if (pago.forma_pago === 'efectivo') {
          totales.efectivo += pago.monto;
        } else if (pago.forma_pago === 'efectivo_facturado') {
          totales.depositado += pago.monto;
        } else if (pago.forma_pago === 'transferencia') {
          totales.transferencia += pago.monto; // ✅ NUEVO: Separado
        } else if (pago.forma_pago === 'tarjeta') {
          totales.tarjeta += pago.monto;
        }
      });
    } else {
      // Pago simple
      if (consulta.forma_pago === 'efectivo') {
        totales.efectivo += total;
      } else if (consulta.forma_pago === 'efectivo_facturado') {
        totales.depositado += total;
      } else if (consulta.forma_pago === 'transferencia') {
        totales.transferencia += total; // ✅ NUEVO: Separado
      } else if (consulta.forma_pago === 'tarjeta') {
        totales.tarjeta += total;
      } else if (consulta.forma_pago === 'estado_cuenta') {
        totales.estado_cuenta += total;
      }
    }
  });

  const totalGeneral = totales.efectivo + totales.depositado + totales.transferencia + totales.tarjeta + totales.estado_cuenta;

  // Renderizar tabla de totales
  const tablaInicio = filaActual;

  const tiposPago = [
    { label: 'EFECTIVO', valor: totales.efectivo, color: 'FF4472C4' },
    { label: 'DEPOSITADO', valor: totales.depositado, color: 'FF70AD47' },
    { label: 'TRANSFERENCIA', valor: totales.transferencia, color: 'FF9370DB' }, // ✅ NUEVO: Color morado
    { label: 'TARJETA', valor: totales.tarjeta, color: 'FFFFC000' },
    { label: 'ESTADO DE CUENTA', valor: totales.estado_cuenta, color: 'FF5B9BD5' },
    { label: 'TOTAL GENERADO', valor: totalGeneral, color: 'FFFF8C00' }
  ];

  tiposPago.forEach((tipo, idx) => {
    const fila = tablaInicio + idx;
    
    const cellLabel = worksheet.getCell(fila, 7);
    cellLabel.value = tipo.label;
    cellLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cellLabel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: tipo.color }
    };
    cellLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    cellLabel.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };

    const cellValor = worksheet.getCell(fila, 8);
    cellValor.value = tipo.valor;
    cellValor.numFmt = '#,##0.00';
    cellValor.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cellValor.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: tipo.color }
    };
    cellValor.alignment = { horizontal: 'right', vertical: 'middle' };
    cellValor.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Generar archivo y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `REPORTE_${nombreMes}_${anio}_UNIFICADO.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};