/**
 * Generador de Cuadre Diario en Excel - CONRAD CENTRAL
 * Con formato profesional usando ExcelJS
 */
import ExcelJS from 'exceljs';

interface CuadreDatos {
  fecha: string;
  horaActual: string;
  totalConsultas: number;
  totalVentas: number;
  efectivoEsperado: number;
  efectivoContado: number;
  tarjetaEsperada: number;
  tarjetaContado: number;
  transferenciaEsperada: number;
  transferenciaContado: number;
  diferencias: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
  cuadreCorrecto: boolean;
  observaciones?: string;
  cuadresPorFormaPago: Array<{
    forma_pago: string;
    cantidad: number;
    total: number;
  }>;
}

export const generarCuadreExcel = async (datos: CuadreDatos): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cuadre Diario');

  // Configurar anchos de columna
  worksheet.columns = [
    { width: 5 },   // A
    { width: 25 },  // B
    { width: 15 },  // C
    { width: 15 },  // D
    { width: 15 },  // E
    { width: 15 }   // F
  ];

  let filaActual = 1;

  // ===== TÍTULO =====
  worksheet.mergeCells(`A${filaActual}:F${filaActual}`);
  const cellTitulo = worksheet.getCell(`A${filaActual}`);
  cellTitulo.value = 'CUADRE DE CAJA DIARIO - CONRAD';
  cellTitulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  cellTitulo.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  cellTitulo.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  worksheet.getRow(filaActual).height = 25;
  filaActual++;

  // ===== FECHA Y HORA =====
  filaActual++;
  worksheet.getCell(`B${filaActual}`).value = 'Fecha';
  worksheet.getCell(`B${filaActual}`).font = { bold: true };
  worksheet.getCell(`C${filaActual}`).value = datos.fecha;
  
  filaActual++;
  worksheet.getCell(`B${filaActual}`).value = 'Hora de Cuadre';
  worksheet.getCell(`B${filaActual}`).font = { bold: true };
  worksheet.getCell(`C${filaActual}`).value = datos.horaActual;
  
  filaActual += 2;

  // ===== RESUMEN =====
  worksheet.mergeCells(`A${filaActual}:F${filaActual}`);
  const cellResumen = worksheet.getCell(`A${filaActual}`);
  cellResumen.value = 'RESUMEN';
  cellResumen.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  cellResumen.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  cellResumen.alignment = { horizontal: 'center', vertical: 'middle' };
  cellResumen.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  filaActual++;

  worksheet.getCell(`B${filaActual}`).value = 'Total Consultas';
  worksheet.getCell(`B${filaActual}`).font = { bold: true };
  worksheet.getCell(`C${filaActual}`).value = datos.totalConsultas;
  worksheet.getCell(`C${filaActual}`).alignment = { horizontal: 'center' };
  filaActual++;

  worksheet.getCell(`B${filaActual}`).value = 'Total Ventas';
  worksheet.getCell(`B${filaActual}`).font = { bold: true };
  worksheet.getCell(`C${filaActual}`).value = datos.totalVentas;
  worksheet.getCell(`C${filaActual}`).numFmt = '#,##0.00';
  worksheet.getCell(`C${filaActual}`).alignment = { horizontal: 'center' };
  filaActual += 2;

  // ===== CUADRE POR FORMA DE PAGO =====
  worksheet.mergeCells(`A${filaActual}:F${filaActual}`);
  const cellCuadre = worksheet.getCell(`A${filaActual}`);
  cellCuadre.value = 'CUADRE POR FORMA DE PAGO';
  cellCuadre.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  cellCuadre.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  cellCuadre.alignment = { horizontal: 'center', vertical: 'middle' };
  cellCuadre.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  filaActual++;

  // Headers de tabla
  const headers = ['Forma de Pago', 'Esperado', 'Contado', 'Diferencia', 'Estado'];
  headers.forEach((header, idx) => {
    const cell = worksheet.getCell(filaActual, idx + 2); // Columna B en adelante
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF5B9BD5' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  filaActual++;

  // Datos de cuadre
  const datosTabla = [
    ['Efectivo', datos.efectivoEsperado, datos.efectivoContado, datos.diferencias.efectivo],
    ['Tarjeta', datos.tarjetaEsperada, datos.tarjetaContado, datos.diferencias.tarjeta],
    ['Transferencia', datos.transferenciaEsperada, datos.transferenciaContado, datos.diferencias.transferencia]
  ];

  datosTabla.forEach(fila => {
    const [formaPago, esperado, contado, diferencia] = fila;
    const estado = Math.abs(diferencia as number) < 0.01 ? 'OK' : 'DIFERENCIA';
    
    worksheet.getCell(filaActual, 2).value = formaPago;
    worksheet.getCell(filaActual, 2).alignment = { horizontal: 'left' };
    
    worksheet.getCell(filaActual, 3).value = esperado;
    worksheet.getCell(filaActual, 3).numFmt = '#,##0.00';
    worksheet.getCell(filaActual, 3).alignment = { horizontal: 'right' };
    
    worksheet.getCell(filaActual, 4).value = contado;
    worksheet.getCell(filaActual, 4).numFmt = '#,##0.00';
    worksheet.getCell(filaActual, 4).alignment = { horizontal: 'right' };
    
    worksheet.getCell(filaActual, 5).value = diferencia;
    worksheet.getCell(filaActual, 5).numFmt = '#,##0.00';
    worksheet.getCell(filaActual, 5).alignment = { horizontal: 'right' };
    worksheet.getCell(filaActual, 5).font = { 
      color: { argb: Math.abs(diferencia as number) < 0.01 ? 'FF008000' : 'FFFF0000' },
      bold: true
    };
    
    worksheet.getCell(filaActual, 6).value = estado;
    worksheet.getCell(filaActual, 6).alignment = { horizontal: 'center' };
    worksheet.getCell(filaActual, 6).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: estado === 'OK' ? 'FFC6EFCE' : 'FFFFC7CE' }
    };
    worksheet.getCell(filaActual, 6).font = { bold: true };

    // Bordes
    for (let col = 2; col <= 6; col++) {
      worksheet.getCell(filaActual, col).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    filaActual++;
  });

  filaActual++;

  // ===== RESULTADO =====
  worksheet.mergeCells(`B${filaActual}:E${filaActual}`);
  const cellResultado = worksheet.getCell(`B${filaActual}`);
  cellResultado.value = datos.cuadreCorrecto ? '✓ CUADRE CORRECTO' : '⚠ CUADRE CON DIFERENCIAS';
  cellResultado.font = { 
    name: 'Calibri', 
    size: 14, 
    bold: true, 
    color: { argb: 'FFFFFFFF' } 
  };
  cellResultado.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: datos.cuadreCorrecto ? 'FF70AD47' : 'FFFF0000' }
  };
  cellResultado.alignment = { horizontal: 'center', vertical: 'middle' };
  cellResultado.border = {
    top: { style: 'medium' },
    bottom: { style: 'medium' },
    left: { style: 'medium' },
    right: { style: 'medium' }
  };
  worksheet.getRow(filaActual).height = 25;
  filaActual += 2;

  // ===== OBSERVACIONES =====
  if (datos.observaciones) {
    worksheet.mergeCells(`A${filaActual}:F${filaActual}`);
    const cellObsHeader = worksheet.getCell(`A${filaActual}`);
    cellObsHeader.value = 'OBSERVACIONES';
    cellObsHeader.font = { bold: true };
    cellObsHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    filaActual++;

    worksheet.mergeCells(`B${filaActual}:F${filaActual}`);
    const cellObs = worksheet.getCell(`B${filaActual}`);
    cellObs.value = datos.observaciones;
    cellObs.alignment = { wrapText: true, vertical: 'top' };
    filaActual += 2;
  }

  // ===== DETALLE POR FORMA DE PAGO =====
  worksheet.mergeCells(`A${filaActual}:F${filaActual}`);
  const cellDetalle = worksheet.getCell(`A${filaActual}`);
  cellDetalle.value = 'DETALLE POR FORMA DE PAGO';
  cellDetalle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  cellDetalle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  cellDetalle.alignment = { horizontal: 'center', vertical: 'middle' };
  cellDetalle.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  filaActual++;

  // Headers detalle
  worksheet.getCell(filaActual, 2).value = 'Forma de Pago';
  worksheet.getCell(filaActual, 3).value = 'Cantidad';
  worksheet.getCell(filaActual, 4).value = 'Total';
  
  for (let col = 2; col <= 4; col++) {
    const cell = worksheet.getCell(filaActual, col);
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
  filaActual++;

  // Datos detalle
  datos.cuadresPorFormaPago.forEach(cuadre => {
    worksheet.getCell(filaActual, 2).value = cuadre.forma_pago;
    worksheet.getCell(filaActual, 3).value = cuadre.cantidad;
    worksheet.getCell(filaActual, 3).alignment = { horizontal: 'center' };
    worksheet.getCell(filaActual, 4).value = cuadre.total;
    worksheet.getCell(filaActual, 4).numFmt = '#,##0.00';
    worksheet.getCell(filaActual, 4).alignment = { horizontal: 'right' };
    
    for (let col = 2; col <= 4; col++) {
      worksheet.getCell(filaActual, col).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    filaActual++;
  });

  // Generar y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cuadre_${datos.fecha.replace(/\//g, '')}_${datos.horaActual.replace(':', '')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
