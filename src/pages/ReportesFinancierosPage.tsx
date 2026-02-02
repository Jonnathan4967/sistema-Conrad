import React, { useState } from 'react';
import { ArrowLeft, Download, Calendar, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ExcelJS from 'exceljs';

interface ReportesFinancierosPageProps {
  onBack: () => void;
}

export const ReportesFinancierosPage: React.FC<ReportesFinancierosPageProps> = ({ onBack }) => {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [generando, setGenerando] = useState(false);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const generarReporte = async () => {
    setGenerando(true);
    try {
      const primerDia = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(anio, mes, 0).toISOString().split('T')[0];

      // 1. Ingresos por consultas
      const { data: consultas } = await supabase
        .from('consultas')
        .select('detalle_consultas(precio)')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .or('anulado.is.null,anulado.eq.false')
        .or('es_servicio_movil.is.null,es_servicio_movil.eq.false');

      const ingresosConsultas = consultas?.reduce((sum, c: any) => {
        return sum + (c.detalle_consultas?.reduce((s: number, d: any) => s + d.precio, 0) || 0);
      }, 0) || 0;

      // 2. Ingresos adicionales por categoría
      const { data: ingresosAd } = await supabase
        .from('ingresos_adicionales')
        .select('monto, categorias_ingresos(nombre)')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia);

      // 3. Gastos por categoría
      const { data: gastosData } = await supabase
        .from('gastos')
        .select('monto, categorias_gastos(nombre)')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia);

      // Agrupar por categoría
      const ingresosDict: any = { 'Consultas Médicas': ingresosConsultas };
      ingresosAd?.forEach((i: any) => {
        const cat = i.categorias_ingresos?.nombre || 'Sin categoría';
        ingresosDict[cat] = (ingresosDict[cat] || 0) + i.monto;
      });

      const gastosDict: any = {};
      gastosData?.forEach((g: any) => {
        const cat = g.categorias_gastos?.nombre || 'Sin categoría';
        gastosDict[cat] = (gastosDict[cat] || 0) + g.monto;
      });

      // Crear Excel PROFESIONAL
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CONRAD CENTRAL';
      workbook.created = new Date();
      
      const sheet = workbook.addWorksheet('Estado de Resultados', {
        pageSetup: { 
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0
        }
      });

      // ========================================
      // ENCABEZADO PROFESIONAL CON LOGO
      // ========================================
      
      // Fila 1-2: Espacio superior
      sheet.getRow(1).height = 10;
      sheet.getRow(2).height = 30;

      // Logo/Nombre empresa (merge grande)
      sheet.mergeCells('A2:B2');
      const logoCell = sheet.getCell('A2');
      logoCell.value = 'CONRAD CENTRAL';
      logoCell.font = { 
        name: 'Calibri', 
        size: 24, 
        bold: true, 
        color: { argb: 'FF1E40AF' } 
      };
      logoCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Título del reporte
      sheet.mergeCells('C2:E2');
      const titleCell = sheet.getCell('C2');
      titleCell.value = 'ESTADO DE RESULTADOS';
      titleCell.font = { 
        name: 'Calibri', 
        size: 18, 
        bold: true, 
        color: { argb: 'FF1F2937' } 
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'right' };

      // Fila 3: Período
      sheet.getRow(3).height = 25;
      sheet.mergeCells('A3:E3');
      const periodCell = sheet.getCell('A3');
      periodCell.value = `Período: ${meses[mes - 1].toUpperCase()} ${anio}`;
      periodCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF059669' } };
      periodCell.alignment = { vertical: 'middle', horizontal: 'center' };
      periodCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' }
      };
      periodCell.border = {
        top: { style: 'thin', color: { argb: 'FF059669' } },
        bottom: { style: 'thin', color: { argb: 'FF059669' } }
      };

      // Fecha de generación
      sheet.getRow(4).height = 18;
      sheet.mergeCells('A4:E4');
      const dateCell = sheet.getCell('A4');
      dateCell.value = `Generado: ${new Date().toLocaleDateString('es-GT', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      dateCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } };
      dateCell.alignment = { horizontal: 'center' };

      // Espacio
      sheet.getRow(5).height = 5;

      // ========================================
      // SECCIÓN INGRESOS
      // ========================================
      
      let row = 6;
      sheet.getRow(row).height = 30;
      
      // Header INGRESOS
      sheet.mergeCells(`A${row}:D${row}`);
      const ingresosHeader = sheet.getCell(`A${row}`);
      ingresosHeader.value = '💰 INGRESOS';
      ingresosHeader.font = { 
        name: 'Calibri', 
        size: 14, 
        bold: true, 
        color: { argb: 'FFFFFFFF' } 
      };
      ingresosHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }
      };
      ingresosHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      ingresosHeader.border = {
        top: { style: 'medium', color: { argb: 'FF059669' } },
        bottom: { style: 'medium', color: { argb: 'FF059669' } },
        left: { style: 'medium', color: { argb: 'FF059669' } },
        right: { style: 'medium', color: { argb: 'FF059669' } }
      };

      sheet.getCell(`E${row}`).value = 'MONTO';
      sheet.getCell(`E${row}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell(`E${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
      sheet.getCell(`E${row}`).border = {
        top: { style: 'medium', color: { argb: 'FF059669' } },
        bottom: { style: 'medium', color: { argb: 'FF059669' } },
        right: { style: 'medium', color: { argb: 'FF059669' } }
      };

      row++;
      let totalIngresos = 0;
      let isEven = false;

      // Items de ingresos
      Object.entries(ingresosDict).sort((a: any, b: any) => b[1] - a[1]).forEach(([cat, monto]: any) => {
        sheet.getRow(row).height = 22;
        
        sheet.mergeCells(`A${row}:D${row}`);
        const catCell = sheet.getCell(`A${row}`);
        catCell.value = `  • ${cat}`;
        catCell.font = { name: 'Calibri', size: 11 };
        catCell.alignment = { vertical: 'middle', horizontal: 'left' };
        catCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF0FDF4' }
        };
        catCell.border = {
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        const montoCell = sheet.getCell(`E${row}`);
        montoCell.value = monto;
        montoCell.numFmt = '_("Q"* #,##0.00_);_("Q"* (#,##0.00);_("Q"* "-"??_);_(@_)';
        montoCell.font = { name: 'Calibri', size: 11 };
        montoCell.alignment = { vertical: 'middle', horizontal: 'right' };
        montoCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF0FDF4' }
        };
        montoCell.border = {
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        totalIngresos += monto;
        row++;
        isEven = !isEven;
      });

      // Total ingresos
      sheet.getRow(row).height = 25;
      sheet.mergeCells(`A${row}:D${row}`);
      const totalIngCell = sheet.getCell(`A${row}`);
      totalIngCell.value = 'TOTAL INGRESOS';
      totalIngCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF059669' } };
      totalIngCell.alignment = { vertical: 'middle', horizontal: 'right' };
      totalIngCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' }
      };
      totalIngCell.border = {
        top: { style: 'medium', color: { argb: 'FF059669' } },
        bottom: { style: 'medium', color: { argb: 'FF059669' } },
        left: { style: 'medium', color: { argb: 'FF059669' } },
        right: { style: 'thin', color: { argb: 'FF059669' } }
      };

      const totalIngMontoCell = sheet.getCell(`E${row}`);
      totalIngMontoCell.value = totalIngresos;
      totalIngMontoCell.numFmt = '_("Q"* #,##0.00_);_("Q"* (#,##0.00);_("Q"* "-"??_);_(@_)';
      totalIngMontoCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF059669' } };
      totalIngMontoCell.alignment = { vertical: 'middle', horizontal: 'right' };
      totalIngMontoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' }
      };
      totalIngMontoCell.border = {
        top: { style: 'medium', color: { argb: 'FF059669' } },
        bottom: { style: 'medium', color: { argb: 'FF059669' } },
        right: { style: 'medium', color: { argb: 'FF059669' } }
      };

      row += 2;

      // ========================================
      // SECCIÓN GASTOS
      // ========================================
      
      sheet.getRow(row).height = 30;
      
      // Header GASTOS
      sheet.mergeCells(`A${row}:D${row}`);
      const gastosHeader = sheet.getCell(`A${row}`);
      gastosHeader.value = '📉 GASTOS';
      gastosHeader.font = { 
        name: 'Calibri', 
        size: 14, 
        bold: true, 
        color: { argb: 'FFFFFFFF' } 
      };
      gastosHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC2626' }
      };
      gastosHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      gastosHeader.border = {
        top: { style: 'medium', color: { argb: 'FFDC2626' } },
        bottom: { style: 'medium', color: { argb: 'FFDC2626' } },
        left: { style: 'medium', color: { argb: 'FFDC2626' } },
        right: { style: 'medium', color: { argb: 'FFDC2626' } }
      };

      sheet.getCell(`E${row}`).value = 'MONTO';
      sheet.getCell(`E${row}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell(`E${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
      sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
      sheet.getCell(`E${row}`).border = {
        top: { style: 'medium', color: { argb: 'FFDC2626' } },
        bottom: { style: 'medium', color: { argb: 'FFDC2626' } },
        right: { style: 'medium', color: { argb: 'FFDC2626' } }
      };

      row++;
      let totalGastos = 0;
      isEven = false;

      // Items de gastos
      Object.entries(gastosDict).sort((a: any, b: any) => b[1] - a[1]).forEach(([cat, monto]: any) => {
        sheet.getRow(row).height = 22;
        
        sheet.mergeCells(`A${row}:D${row}`);
        const catCell = sheet.getCell(`A${row}`);
        catCell.value = `  • ${cat}`;
        catCell.font = { name: 'Calibri', size: 11 };
        catCell.alignment = { vertical: 'middle', horizontal: 'left' };
        catCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFFEF2F2' }
        };
        catCell.border = {
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        const montoCell = sheet.getCell(`E${row}`);
        montoCell.value = monto;
        montoCell.numFmt = '_("Q"* #,##0.00_);_("Q"* (#,##0.00);_("Q"* "-"??_);_(@_)';
        montoCell.font = { name: 'Calibri', size: 11 };
        montoCell.alignment = { vertical: 'middle', horizontal: 'right' };
        montoCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFFEF2F2' }
        };
        montoCell.border = {
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };

        totalGastos += monto;
        row++;
        isEven = !isEven;
      });

      // Total gastos
      sheet.getRow(row).height = 25;
      sheet.mergeCells(`A${row}:D${row}`);
      const totalGastCell = sheet.getCell(`A${row}`);
      totalGastCell.value = 'TOTAL GASTOS';
      totalGastCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFDC2626' } };
      totalGastCell.alignment = { vertical: 'middle', horizontal: 'right' };
      totalGastCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFECACA' }
      };
      totalGastCell.border = {
        top: { style: 'medium', color: { argb: 'FFDC2626' } },
        bottom: { style: 'medium', color: { argb: 'FFDC2626' } },
        left: { style: 'medium', color: { argb: 'FFDC2626' } },
        right: { style: 'thin', color: { argb: 'FFDC2626' } }
      };

      const totalGastMontoCell = sheet.getCell(`E${row}`);
      totalGastMontoCell.value = totalGastos;
      totalGastMontoCell.numFmt = '_("Q"* #,##0.00_);_("Q"* (#,##0.00);_("Q"* "-"??_);_(@_)';
      totalGastMontoCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFDC2626' } };
      totalGastMontoCell.alignment = { vertical: 'middle', horizontal: 'right' };
      totalGastMontoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFECACA' }
      };
      totalGastMontoCell.border = {
        top: { style: 'medium', color: { argb: 'FFDC2626' } },
        bottom: { style: 'medium', color: { argb: 'FFDC2626' } },
        right: { style: 'medium', color: { argb: 'FFDC2626' } }
      };

      row += 2;

      // ========================================
      // UTILIDAD NETA
      // ========================================
      
      const utilidad = totalIngresos - totalGastos;
      const colorUtilidad = utilidad >= 0 ? 'FF059669' : 'FFDC2626';
      const bgUtilidad = utilidad >= 0 ? 'FFD1FAE5' : 'FFFECACA';

      sheet.getRow(row).height = 35;
      sheet.mergeCells(`A${row}:D${row}`);
      const utilidadCell = sheet.getCell(`A${row}`);
      utilidadCell.value = utilidad >= 0 ? '✅ UTILIDAD NETA' : '⚠️ PÉRDIDA NETA';
      utilidadCell.font = { 
        name: 'Calibri', 
        size: 16, 
        bold: true, 
        color: { argb: colorUtilidad } 
      };
      utilidadCell.alignment = { vertical: 'middle', horizontal: 'right' };
      utilidadCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgUtilidad }
      };
      utilidadCell.border = {
        top: { style: 'double', color: { argb: colorUtilidad } },
        bottom: { style: 'double', color: { argb: colorUtilidad } },
        left: { style: 'double', color: { argb: colorUtilidad } },
        right: { style: 'thin', color: { argb: colorUtilidad } }
      };

      const utilidadMontoCell = sheet.getCell(`E${row}`);
      utilidadMontoCell.value = utilidad;
      utilidadMontoCell.numFmt = '_("Q"* #,##0.00_);_("Q"* (#,##0.00);_("Q"* "-"??_);_(@_)';
      utilidadMontoCell.font = { 
        name: 'Calibri', 
        size: 18, 
        bold: true, 
        color: { argb: colorUtilidad } 
      };
      utilidadMontoCell.alignment = { vertical: 'middle', horizontal: 'right' };
      utilidadMontoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgUtilidad }
      };
      utilidadMontoCell.border = {
        top: { style: 'double', color: { argb: colorUtilidad } },
        bottom: { style: 'double', color: { argb: colorUtilidad } },
        right: { style: 'double', color: { argb: colorUtilidad } }
      };

      row += 2;

      // ========================================
      // INDICADORES FINANCIEROS
      // ========================================

      sheet.getRow(row).height = 25;
      sheet.mergeCells(`A${row}:E${row}`);
      const indicadoresTitle = sheet.getCell(`A${row}`);
      indicadoresTitle.value = '📊 INDICADORES FINANCIEROS';
      indicadoresTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E40AF' } };
      indicadoresTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      indicadoresTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDBEAFE' }
      };
      
      row++;

      // Margen de utilidad
      const margen = totalIngresos > 0 ? ((utilidad / totalIngresos) * 100) : 0;
      sheet.getRow(row).height = 22;
      sheet.mergeCells(`A${row}:D${row}`);
      sheet.getCell(`A${row}`).value = '  Margen de Utilidad';
      sheet.getCell(`A${row}`).font = { name: 'Calibri', size: 11 };
      sheet.getCell(`A${row}`).alignment = { vertical: 'middle' };
      
      sheet.getCell(`E${row}`).value = margen / 100;
      sheet.getCell(`E${row}`).numFmt = '0.00%';
      sheet.getCell(`E${row}`).font = { name: 'Calibri', size: 11, bold: true };
      sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };

      row++;

      // Ratio Ingresos/Gastos
      const ratio = totalGastos > 0 ? (totalIngresos / totalGastos) : 0;
      sheet.getRow(row).height = 22;
      sheet.mergeCells(`A${row}:D${row}`);
      sheet.getCell(`A${row}`).value = '  Ratio Ingresos/Gastos';
      sheet.getCell(`A${row}`).font = { name: 'Calibri', size: 11 };
      sheet.getCell(`A${row}`).alignment = { vertical: 'middle' };
      
      sheet.getCell(`E${row}`).value = ratio;
      sheet.getCell(`E${row}`).numFmt = '0.00';
      sheet.getCell(`E${row}`).font = { name: 'Calibri', size: 11, bold: true };
      sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };

      // ========================================
      // FOOTER
      // ========================================

      row += 3;
      sheet.getRow(row).height = 15;
      sheet.mergeCells(`A${row}:E${row}`);
      const footer = sheet.getCell(`A${row}`);
      footer.value = '© CONRAD CENTRAL - Sistema de Gestión Financiera';
      footer.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF9CA3AF' } };
      footer.alignment = { horizontal: 'center' };

      // ========================================
      // CONFIGURACIÓN DE COLUMNAS
      // ========================================

      sheet.getColumn(1).width = 3;
      sheet.getColumn(2).width = 25;
      sheet.getColumn(3).width = 10;
      sheet.getColumn(4).width = 10;
      sheet.getColumn(5).width = 18;

      // Proteger hoja (opcional)
      // sheet.protect('password', { selectLockedCells: true });

      // ========================================
      // DESCARGAR
      // ========================================

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Estado_Resultados_${meses[mes - 1]}_${anio}_CONRAD.xlsx`;
      a.click();

      alert('✅ Reporte generado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al generar reporte');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-blue-100 mb-4 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver a Contabilidad
          </button>
          <h1 className="text-3xl font-bold">📊 Reportes Financieros</h1>
          <p className="text-blue-100 mt-2">Estados financieros en Excel</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Card de Reporte */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FileText className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Estado de Resultados
            </h2>
            <p className="text-gray-600">
              Reporte detallado de ingresos y gastos en formato Excel
            </p>
          </div>

          {/* Características */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📈 Ingresos</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Consultas médicas</li>
                <li>• Ingresos adicionales</li>
                <li>• Por categoría</li>
              </ul>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📉 Gastos</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Gastos operativos</li>
                <li>• Agrupados por categoría</li>
                <li>• Totales calculados</li>
              </ul>
            </div>
          </div>

          {/* Selector de Período */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Seleccionar Período
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Mes</label>
                <select
                  className="input-field"
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                >
                  {meses.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Año</label>
                <select
                  className="input-field"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botón Generar */}
          <button
            onClick={generarReporte}
            disabled={generando}
            className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg"
          >
            {generando ? (
              <>
                Generando reporte...
              </>
            ) : (
              <>
                <Download size={24} />
                Generar y Descargar Reporte
              </>
            )}
          </button>

          {/* Nota */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>ℹ️ Nota:</strong> El reporte incluye todos los ingresos y gastos registrados 
              en el período seleccionado, calculando automáticamente la utilidad neta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};