import ExcelJS from 'exceljs';

// ===== REPORTE 1: STOCK ACTUAL =====
export const generarReporteStockActual = async (productos: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock Actual');

  // Configurar columnas
  worksheet.columns = [
    { width: 8 },   // A - #
    { width: 15 },  // B - Código
    { width: 30 },  // C - Producto
    { width: 20 },  // D - Categoría
    { width: 12 },  // E - Stock
    { width: 12 },  // F - Mín
    { width: 12 },  // G - Máx
    { width: 15 },  // H - Precio
    { width: 15 },  // I - Valor Total
    { width: 15 }   // J - Estado
  ];

  let row = 1;

  // TÍTULO
  worksheet.mergeCells(`A${row}:J${row}`);
  const cellTitulo = worksheet.getCell(`A${row}`);
  cellTitulo.value = 'REPORTE DE STOCK ACTUAL - CONRAD';
  cellTitulo.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(row).height = 25;
  row++;

  // Fecha
  row++;
  worksheet.getCell(`B${row}`).value = 'Fecha de Reporte:';
  worksheet.getCell(`B${row}`).font = { bold: true };
  worksheet.getCell(`C${row}`).value = new Date().toLocaleDateString();
  row += 2;

  // HEADERS
  const headers = ['#', 'Código', 'Producto', 'Categoría', 'Stock', 'Mín', 'Máx', 'Precio', 'Valor Total', 'Estado'];
  headers.forEach((header, idx) => {
    const cell = worksheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  row++;

  // DATOS
  let totalValor = 0;
  productos.forEach((prod, index) => {
    const valorTotal = prod.stock_actual * prod.precio_compra;
    totalValor += valorTotal;
    
    let estado = 'OK';
    let colorEstado = 'FFC6EFCE'; // Verde
    
    if (prod.stock_actual <= prod.stock_minimo) {
      estado = 'BAJO';
      colorEstado = 'FFFFC7CE'; // Rojo
    } else if (prod.stock_actual >= prod.stock_maximo) {
      estado = 'ALTO';
      colorEstado = 'FFFFEB9C'; // Amarillo
    }

    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = prod.codigo;
    worksheet.getCell(row, 3).value = prod.nombre;
    worksheet.getCell(row, 4).value = prod.categorias_inventario?.nombre || 'Sin categoría';
    worksheet.getCell(row, 5).value = prod.stock_actual;
    worksheet.getCell(row, 6).value = prod.stock_minimo;
    worksheet.getCell(row, 7).value = prod.stock_maximo;
    worksheet.getCell(row, 8).value = prod.precio_compra;
    worksheet.getCell(row, 9).value = valorTotal;
    worksheet.getCell(row, 10).value = estado;

    // Formato
    worksheet.getCell(row, 5).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 6).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 7).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 8).numFmt = '#,##0.00';
    worksheet.getCell(row, 9).numFmt = '#,##0.00';
    worksheet.getCell(row, 10).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorEstado } };
    worksheet.getCell(row, 10).font = { bold: true };

    for (let col = 1; col <= 10; col++) {
      worksheet.getCell(row, col).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    row++;
  });

  // TOTAL
  worksheet.getCell(row, 8).value = 'TOTAL:';
  worksheet.getCell(row, 8).font = { bold: true };
  worksheet.getCell(row, 8).alignment = { horizontal: 'right' };
  worksheet.getCell(row, 9).value = totalValor;
  worksheet.getCell(row, 9).numFmt = '#,##0.00';
  worksheet.getCell(row, 9).font = { bold: true };
  worksheet.getCell(row, 9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

  // Descargar
  await descargarExcel(workbook, `Stock_Actual_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ===== REPORTE 2: MOVIMIENTOS =====
export const generarReporteMovimientos = async (datos: any) => {
  const { movimientos, fechaInicio, fechaFin } = datos;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Movimientos');

  worksheet.columns = [
    { width: 8 },   // #
    { width: 12 },  // Fecha
    { width: 15 },  // Código
    { width: 30 },  // Producto
    { width: 15 },  // Tipo
    { width: 12 },  // Cantidad
    { width: 30 },  // Motivo
    { width: 20 }   // Proveedor
  ];

  let row = 1;

  // TÍTULO
  worksheet.mergeCells(`A${row}:H${row}`);
  const cellTitulo = worksheet.getCell(`A${row}`);
  cellTitulo.value = 'REPORTE DE MOVIMIENTOS - CONRAD';
  cellTitulo.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(row).height = 25;
  row++;

  // Período
  row++;
  worksheet.getCell(`B${row}`).value = 'Período:';
  worksheet.getCell(`B${row}`).font = { bold: true };
  worksheet.getCell(`C${row}`).value = `${fechaInicio} al ${fechaFin}`;
  row += 2;

  // HEADERS
  const headers = ['#', 'Fecha', 'Código', 'Producto', 'Tipo', 'Cantidad', 'Motivo', 'Proveedor'];
  headers.forEach((header, idx) => {
    const cell = worksheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  row++;

  // DATOS
  let totalEntradas = 0;
  let totalSalidas = 0;

  movimientos.forEach((mov: any, index: number) => {
    const tipoTexto = mov.tipo_movimiento === 'entrada' ? '📥 ENTRADA' :
                      mov.tipo_movimiento === 'salida' ? '📤 SALIDA' :
                      mov.tipo_movimiento === 'ajuste' ? '⚙️ AJUSTE' : '❌ MERMA';
    
    if (mov.tipo_movimiento === 'entrada') totalEntradas += mov.cantidad;
    else totalSalidas += mov.cantidad;

    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = new Date(mov.fecha).toLocaleDateString();
    worksheet.getCell(row, 3).value = mov.productos_inventario?.codigo;
    worksheet.getCell(row, 4).value = mov.productos_inventario?.nombre;
    worksheet.getCell(row, 5).value = tipoTexto;
    worksheet.getCell(row, 6).value = mov.cantidad;
    worksheet.getCell(row, 7).value = mov.motivo || '';
    worksheet.getCell(row, 8).value = mov.proveedores?.nombre || '';

    worksheet.getCell(row, 6).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 6).font = { 
      bold: true, 
      color: { argb: mov.tipo_movimiento === 'entrada' ? 'FF70AD47' : 'FFFF0000' } 
    };

    for (let col = 1; col <= 8; col++) {
      worksheet.getCell(row, col).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    row++;
  });

  // RESUMEN
  row++;
  worksheet.getCell(row, 5).value = 'Total Entradas:';
  worksheet.getCell(row, 5).font = { bold: true };
  worksheet.getCell(row, 6).value = totalEntradas;
  worksheet.getCell(row, 6).font = { bold: true, color: { argb: 'FF70AD47' } };
  
  row++;
  worksheet.getCell(row, 5).value = 'Total Salidas:';
  worksheet.getCell(row, 5).font = { bold: true };
  worksheet.getCell(row, 6).value = totalSalidas;
  worksheet.getCell(row, 6).font = { bold: true, color: { argb: 'FFFF0000' } };

  await descargarExcel(workbook, `Movimientos_${fechaInicio}_${fechaFin}.xlsx`);
};

// ===== REPORTE 3: STOCK BAJO =====
export const generarReporteStockBajo = async (productos: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock Bajo');

  worksheet.columns = [
    { width: 8 },   // #
    { width: 15 },  // Código
    { width: 30 },  // Producto
    { width: 20 },  // Categoría
    { width: 12 },  // Stock
    { width: 12 },  // Mín
    { width: 15 },  // Faltante
    { width: 15 }   // Prioridad
  ];

  let row = 1;

  // TÍTULO
  worksheet.mergeCells(`A${row}:H${row}`);
  const cellTitulo = worksheet.getCell(`A${row}`);
  cellTitulo.value = '⚠️ REPORTE DE STOCK BAJO - CONRAD';
  cellTitulo.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(row).height = 25;
  row++;

  row++;
  worksheet.getCell(`B${row}`).value = 'Fecha:';
  worksheet.getCell(`B${row}`).font = { bold: true };
  worksheet.getCell(`C${row}`).value = new Date().toLocaleDateString();
  row++;
  worksheet.getCell(`B${row}`).value = 'Productos en alerta:';
  worksheet.getCell(`B${row}`).font = { bold: true };
  worksheet.getCell(`C${row}`).value = productos.length;
  worksheet.getCell(`C${row}`).font = { bold: true, color: { argb: 'FFFF0000' } };
  row += 2;

  // HEADERS
  const headers = ['#', 'Código', 'Producto', 'Categoría', 'Stock', 'Mín', 'Faltante', 'Prioridad'];
  headers.forEach((header, idx) => {
    const cell = worksheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  row++;

  // DATOS
  productos.forEach((prod, index) => {
    const faltante = prod.stock_minimo - prod.stock_actual;
    const prioridad = prod.stock_actual === 0 ? 'CRÍTICA' : 
                     prod.stock_actual <= prod.stock_minimo * 0.5 ? 'ALTA' : 'MEDIA';
    const colorPrioridad = prioridad === 'CRÍTICA' ? 'FFFF0000' :
                          prioridad === 'ALTA' ? 'FFFF6B6B' : 'FFFFEB9C';

    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = prod.codigo;
    worksheet.getCell(row, 3).value = prod.nombre;
    worksheet.getCell(row, 4).value = prod.categorias_inventario?.nombre || 'Sin categoría';
    worksheet.getCell(row, 5).value = prod.stock_actual;
    worksheet.getCell(row, 6).value = prod.stock_minimo;
    worksheet.getCell(row, 7).value = faltante;
    worksheet.getCell(row, 8).value = prioridad;

    worksheet.getCell(row, 5).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 5).font = { bold: true, color: { argb: 'FFFF0000' } };
    worksheet.getCell(row, 6).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 7).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 7).font = { bold: true };
    worksheet.getCell(row, 8).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPrioridad } };
    worksheet.getCell(row, 8).font = { bold: true };

    for (let col = 1; col <= 8; col++) {
      worksheet.getCell(row, col).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    row++;
  });

  await descargarExcel(workbook, `Stock_Bajo_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ===== REPORTE 4: VALORIZACIÓN =====
export const generarReporteValorizacion = async (productos: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Valorización');

  worksheet.columns = [
    { width: 8 },   // #
    { width: 15 },  // Código
    { width: 30 },  // Producto
    { width: 20 },  // Categoría
    { width: 12 },  // Stock
    { width: 15 },  // Precio Compra
    { width: 15 },  // Precio Venta
    { width: 15 },  // Valor Compra
    { width: 15 },  // Valor Venta
    { width: 15 }   // Utilidad Pot.
  ];

  let row = 1;

  // TÍTULO
  worksheet.mergeCells(`A${row}:J${row}`);
  const cellTitulo = worksheet.getCell(`A${row}`);
  cellTitulo.value = 'REPORTE DE VALORIZACIÓN DE INVENTARIO - CONRAD';
  cellTitulo.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7030A0' } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(row).height = 25;
  row++;

  row++;
  worksheet.getCell(`B${row}`).value = 'Fecha:';
  worksheet.getCell(`B${row}`).font = { bold: true };
  worksheet.getCell(`C${row}`).value = new Date().toLocaleDateString();
  row += 2;

  // HEADERS
  const headers = ['#', 'Código', 'Producto', 'Categoría', 'Stock', 'P. Compra', 'P. Venta', 'Valor Compra', 'Valor Venta', 'Utilidad Pot.'];
  headers.forEach((header, idx) => {
    const cell = worksheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9966FF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  row++;

  // DATOS
  let totalValorCompra = 0;
  let totalValorVenta = 0;
  let totalUtilidad = 0;

  productos.forEach((prod, index) => {
    const valorCompra = prod.stock_actual * prod.precio_compra;
    const valorVenta = prod.stock_actual * (prod.precio_venta || prod.precio_compra);
    const utilidad = valorVenta - valorCompra;

    totalValorCompra += valorCompra;
    totalValorVenta += valorVenta;
    totalUtilidad += utilidad;

    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = prod.codigo;
    worksheet.getCell(row, 3).value = prod.nombre;
    worksheet.getCell(row, 4).value = prod.categorias_inventario?.nombre || 'Sin categoría';
    worksheet.getCell(row, 5).value = prod.stock_actual;
    worksheet.getCell(row, 6).value = prod.precio_compra;
    worksheet.getCell(row, 7).value = prod.precio_venta || prod.precio_compra;
    worksheet.getCell(row, 8).value = valorCompra;
    worksheet.getCell(row, 9).value = valorVenta;
    worksheet.getCell(row, 10).value = utilidad;

    worksheet.getCell(row, 5).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 6).numFmt = '#,##0.00';
    worksheet.getCell(row, 7).numFmt = '#,##0.00';
    worksheet.getCell(row, 8).numFmt = '#,##0.00';
    worksheet.getCell(row, 9).numFmt = '#,##0.00';
    worksheet.getCell(row, 10).numFmt = '#,##0.00';
    worksheet.getCell(row, 10).font = { 
      bold: true, 
      color: { argb: utilidad >= 0 ? 'FF70AD47' : 'FFFF0000' } 
    };

    for (let col = 1; col <= 10; col++) {
      worksheet.getCell(row, col).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    row++;
  });

  // TOTALES
  worksheet.getCell(row, 7).value = 'TOTALES:';
  worksheet.getCell(row, 7).font = { bold: true };
  worksheet.getCell(row, 7).alignment = { horizontal: 'right' };
  
  worksheet.getCell(row, 8).value = totalValorCompra;
  worksheet.getCell(row, 8).numFmt = '#,##0.00';
  worksheet.getCell(row, 8).font = { bold: true };
  worksheet.getCell(row, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  
  worksheet.getCell(row, 9).value = totalValorVenta;
  worksheet.getCell(row, 9).numFmt = '#,##0.00';
  worksheet.getCell(row, 9).font = { bold: true };
  worksheet.getCell(row, 9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  
  worksheet.getCell(row, 10).value = totalUtilidad;
  worksheet.getCell(row, 10).numFmt = '#,##0.00';
  worksheet.getCell(row, 10).font = { bold: true, color: { argb: 'FF70AD47' } };
  worksheet.getCell(row, 10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };

  await descargarExcel(workbook, `Valorizacion_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ===== REPORTE 5: POR PROVEEDOR =====
export const generarReportePorProveedor = async (productos: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Por Proveedor');

  worksheet.columns = [
    { width: 8 },   // #
    { width: 25 },  // Proveedor
    { width: 15 },  // Código
    { width: 30 },  // Producto
    { width: 12 },  // Stock
    { width: 15 },  // Precio
    { width: 15 }   // Valor Total
  ];

  let row = 1;

  // TÍTULO
  worksheet.mergeCells(`A${row}:G${row}`);
  const cellTitulo = worksheet.getCell(`A${row}`);
  cellTitulo.value = 'REPORTE POR PROVEEDOR - CONRAD';
  cellTitulo.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B0082' } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(row).height = 25;
  row++;

  row++;
  worksheet.getCell(`B${row}`).value = 'Fecha:';
  worksheet.getCell(`B${row}`).font = { bold: true };
  worksheet.getCell(`C${row}`).value = new Date().toLocaleDateString();
  row += 2;

  // Agrupar por proveedor
  const porProveedor: { [key: string]: any[] } = {};
  productos.forEach(prod => {
    const proveedor = prod.proveedores?.nombre || 'Sin Proveedor';
    if (!porProveedor[proveedor]) porProveedor[proveedor] = [];
    porProveedor[proveedor].push(prod);
  });

  // Por cada proveedor
  Object.keys(porProveedor).sort().forEach(proveedor => {
    // Header proveedor
    worksheet.mergeCells(`A${row}:G${row}`);
    const cellProv = worksheet.getCell(`A${row}`);
    cellProv.value = `🏢 ${proveedor}`;
    cellProv.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cellProv.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6A0DAD' } };
    cellProv.alignment = { horizontal: 'left', vertical: 'middle' };
    row++;

    // Headers tabla
    const headers = ['#', 'Proveedor', 'Código', 'Producto', 'Stock', 'Precio', 'Valor'];
    headers.forEach((header, idx) => {
      const cell = worksheet.getCell(row, idx + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    row++;

    // Productos del proveedor
    let subtotal = 0;
    porProveedor[proveedor].forEach((prod, idx) => {
      const valor = prod.stock_actual * prod.precio_compra;
      subtotal += valor;

      worksheet.getCell(row, 1).value = idx + 1;
      worksheet.getCell(row, 2).value = proveedor;
      worksheet.getCell(row, 3).value = prod.codigo;
      worksheet.getCell(row, 4).value = prod.nombre;
      worksheet.getCell(row, 5).value = prod.stock_actual;
      worksheet.getCell(row, 6).value = prod.precio_compra;
      worksheet.getCell(row, 7).value = valor;

      worksheet.getCell(row, 5).alignment = { horizontal: 'center' };
      worksheet.getCell(row, 6).numFmt = '#,##0.00';
      worksheet.getCell(row, 7).numFmt = '#,##0.00';

      for (let col = 1; col <= 7; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
      
      row++;
    });

    // Subtotal
    worksheet.getCell(row, 6).value = 'Subtotal:';
    worksheet.getCell(row, 6).font = { bold: true };
    worksheet.getCell(row, 6).alignment = { horizontal: 'right' };
    worksheet.getCell(row, 7).value = subtotal;
    worksheet.getCell(row, 7).numFmt = '#,##0.00';
    worksheet.getCell(row, 7).font = { bold: true };
    worksheet.getCell(row, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
    row += 2;
  });

  await descargarExcel(workbook, `Por_Proveedor_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ===== REPORTE 6: MERMAS Y AJUSTES =====
export const generarReporteMermas = async (datos: any) => {
  const { mermas, fechaInicio, fechaFin } = datos;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Mermas y Ajustes');

  worksheet.columns = [
    { width: 8 },   // #
    { width: 12 },  // Fecha
    { width: 15 },  // Código
    { width: 30 },  // Producto
    { width: 15 },  // Tipo
    { width: 12 },  // Cantidad
    { width: 15 },  // Precio
    { width: 15 },  // Pérdida
    { width: 30 }   // Motivo
  ];

  let row = 1;

  // TÍTULO
  worksheet.mergeCells(`A${row}:I${row}`);
  const cellTitulo = worksheet.getCell(`A${row}`);
  cellTitulo.value = 'REPORTE DE MERMAS Y AJUSTES - CONRAD';
  cellTitulo.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(row).height = 25;
  row++;

  row++;
  worksheet.getCell(`B${row}`).value = 'Período:';
  worksheet.getCell(`B${row}`).font = { bold: true };
  worksheet.getCell(`C${row}`).value = `${fechaInicio} al ${fechaFin}`;
  row += 2;

  // HEADERS
  const headers = ['#', 'Fecha', 'Código', 'Producto', 'Tipo', 'Cantidad', 'Precio Unit.', 'Pérdida Q', 'Motivo'];
  headers.forEach((header, idx) => {
    const cell = worksheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  row++;

  // DATOS
  let totalPerdida = 0;
  let totalCantidad = 0;

  mermas.forEach((merma: any, index: number) => {
    const perdida = merma.cantidad * (merma.productos_inventario?.precio_compra || 0);
    totalPerdida += perdida;
    totalCantidad += merma.cantidad;

    const tipoTexto = merma.tipo_movimiento === 'merma' ? '❌ MERMA' : '⚙️ AJUSTE';

    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = new Date(merma.fecha).toLocaleDateString();
    worksheet.getCell(row, 3).value = merma.productos_inventario?.codigo;
    worksheet.getCell(row, 4).value = merma.productos_inventario?.nombre;
    worksheet.getCell(row, 5).value = tipoTexto;
    worksheet.getCell(row, 6).value = merma.cantidad;
    worksheet.getCell(row, 7).value = merma.productos_inventario?.precio_compra || 0;
    worksheet.getCell(row, 8).value = perdida;
    worksheet.getCell(row, 9).value = merma.motivo || '';

    worksheet.getCell(row, 6).alignment = { horizontal: 'center' };
    worksheet.getCell(row, 7).numFmt = '#,##0.00';
    worksheet.getCell(row, 8).numFmt = '#,##0.00';
    worksheet.getCell(row, 8).font = { bold: true, color: { argb: 'FFFF0000' } };

    for (let col = 1; col <= 9; col++) {
      worksheet.getCell(row, col).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    row++;
  });

  // TOTALES
  row++;
  worksheet.getCell(row, 5).value = 'TOTAL CANTIDAD:';
  worksheet.getCell(row, 5).font = { bold: true };
  worksheet.getCell(row, 5).alignment = { horizontal: 'right' };
  worksheet.getCell(row, 6).value = totalCantidad;
  worksheet.getCell(row, 6).font = { bold: true };
  worksheet.getCell(row, 6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };

  row++;
  worksheet.getCell(row, 7).value = 'TOTAL PÉRDIDA:';
  worksheet.getCell(row, 7).font = { bold: true };
  worksheet.getCell(row, 7).alignment = { horizontal: 'right' };
  worksheet.getCell(row, 8).value = totalPerdida;
  worksheet.getCell(row, 8).numFmt = '#,##0.00';
  worksheet.getCell(row, 8).font = { bold: true, color: { argb: 'FFFF0000' } };
  worksheet.getCell(row, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };

  await descargarExcel(workbook, `Mermas_${fechaInicio}_${fechaFin}.xlsx`);
};

// ===== FUNCIÓN AUXILIAR =====
const descargarExcel = async (workbook: ExcelJS.Workbook, nombreArchivo: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};