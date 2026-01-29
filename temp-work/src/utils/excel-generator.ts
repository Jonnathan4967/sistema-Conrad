/**
 * Generador de Reportes Excel - CONRAD CENTRAL
 * Con columnas dinámicas según estudios en la base de datos
 */
import ExcelJS from 'exceljs';
import { supabase } from '../lib/supabase';

interface Consulta {
  fecha: string;
  pacientes: {
    nombre: string;
    edad: number;
  };
  medicos?: {
    nombre: string;
  };
  medico_recomendado?: string;
  sin_informacion_medico?: boolean;
  numero_factura?: string;
  tipo_cobro: string;
  forma_pago: string;
  detalle_consultas: Array<{
    precio: number;
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

export const generarReporteExcel = async (
  mes: number,
  anio: number,
  consultas: Consulta[]
): Promise<void> => {
  // Obtener todos los estudios de la base de datos
  const { data: estudios, error } = await supabase
    .from('estudios')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener estudios:', error);
    throw error;
  }

  const estudiosDisponibles: Estudio[] = estudios || [];

  const workbook = new ExcelJS.Workbook();

  // Agrupar consultas por día
  const consultasPorDia: { [key: number]: Consulta[] } = {};
  consultas.forEach(consulta => {
    const fecha = new Date(consulta.fecha + 'T12:00:00');
    const dia = fecha.getDate();
    if (!consultasPorDia[dia]) consultasPorDia[dia] = [];
    consultasPorDia[dia].push(consulta);
  });

  // Obtener días únicos que tienen consultas
  const diasConConsultas = Object.keys(consultasPorDia).map(Number).sort((a, b) => a - b);

  // Si no hay consultas, usar el rango completo del mes
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
    await crearHojaDiaria(workbook, nombreHoja, dia, mes, anio, consultasDia, estudiosDisponibles);
  }

  // Generar archivo y descargar
  const nombreMes = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'][mes - 1];
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CONRAD_CENTRAL_${nombreMes}_${anio}.xlsx`;
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
  const numColumnasFijas = 7;
  const numColumnasEstudios = estudiosDisponibles.length;
  const numColumnasFinales = 2;
  const totalColumnas = numColumnasFijas + numColumnasEstudios + numColumnasFinales;

  // Configurar anchos de columna
  const columnWidths: any[] = [
    { width: 4 },
    { width: 24 },
    { width: 6 },
    { width: 13 },
    { width: 28 },
    { width: 20 },
    { width: 13 },
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
    'NOMBRE DEL PACIENTE',
    'EDAD',
    'NO. FACTURA',
    'ESTUDIO',
    'MEDICO REFERENTE',
    'PRECIO SOCIAL',
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
    const nombreEstudio = consulta.detalle_consultas[0]?.sub_estudios?.nombre || '';
    const estudioId = consulta.detalle_consultas[0]?.sub_estudios?.estudios?.id || '';
    
    const fechaConsulta = new Date(consulta.fecha + 'T12:00:00');
    const esInhabil = fechaConsulta.getDay() === 0 || fechaConsulta.getDay() === 6;
    const estudioTexto = esInhabil ? `${nombreEstudio.toUpperCase()} INHABIL` : nombreEstudio.toUpperCase();

    const precio = consulta.detalle_consultas.reduce((sum, det) => sum + det.precio, 0);

    // DEBUG
    console.log(`=== CONSULTA ${idx + 1} ===`);
    console.log('sin_informacion_medico:', consulta.sin_informacion_medico);
    console.log('medicos:', consulta.medicos);
    console.log('medico_recomendado:', consulta.medico_recomendado);
    
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
    
    console.log('Nombre médico final:', nombreMedico);
    console.log('===================');

    const valoresFila: any[] = [
      idx + 1,
      consulta.pacientes.nombre.toUpperCase(),
      consulta.pacientes.edad,
      consulta.numero_factura || '',
      estudioTexto,
      nombreMedico.toUpperCase(),
      consulta.tipo_cobro === 'social' ? precio : ''
    ];

    estudiosDisponibles.forEach(estudio => {
      if (estudio.id === estudioId) {
        valoresFila.push(precio);
      } else {
        valoresFila.push('');
      }
    });

    valoresFila.push(consulta.forma_pago === 'estado_cuenta' ? precio : '');
    valoresFila.push('P');

    worksheet.getRow(filaActual).values = valoresFila;

    valoresFila.forEach((valor, colIdx) => {
      const cell = worksheet.getCell(filaActual, colIdx + 1);
      
      if (colIdx === 4 && esInhabil) {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FFFF0000' }, bold: true };
      } else {
        cell.font = { name: 'Arial', size: 10 };
      }

      if (colIdx === 0 || colIdx === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx >= 6 && colIdx < valoresFila.length - 1) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colIdx === valoresFila.length - 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      if (typeof valor === 'number' && colIdx >= 6) {
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
    { label: 'TARJETA', valor: totalTarjeta },
    { label: 'ESTADO DE CUENTA', valor: totalEstadoCuenta },
    { label: 'TOTAL GENERADO', valor: totalGenerado }
  ];

  totales.forEach((total, idx) => {
    const fila = filaTotalesInicio + idx;

    const cellLabel = worksheet.getCell(fila, 6);
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

    const cellValor = worksheet.getCell(fila, 7);
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