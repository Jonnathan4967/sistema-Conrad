import React, { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, Download, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ExcelJS from 'exceljs';

interface NominaPageProps {
  onBack: () => void;
}

interface Nomina {
  id: string;
  empleado_id: string;
  periodo_mes: number;
  periodo_anio: number;
  salario_base: number;
  bonificacion: number;
  horas_extra: number;
  otros_ingresos: number;
  total_ingresos: number;
  igss: number;
  isr: number;
  prestamos: number;
  otras_deducciones: number;
  total_deducciones: number;
  salario_neto: number;
  estado: string;
  fecha_pago: string;
  empleados?: {
    codigo_empleado: string;
    nombres: string;
    apellidos: string;
  };
}

export const NominaPage: React.FC<NominaPageProps> = ({ onBack }) => {
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    cargarNominas();
  }, [mes, anio]);

  const cargarNominas = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('nomina')
        .select(`
          *,
          empleados(codigo_empleado, nombres, apellidos)
        `)
        .eq('periodo_mes', mes)
        .eq('periodo_anio', anio)
        .order('created_at', { ascending: false });

      setNominas(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularIGSS = (salario: number): number => {
    return 0; // No se calcula automáticamente
  };

  const calcularISR = (salario: number): number => {
    return 0; // No se calcula automáticamente
  };

  const generarNomina = async () => {
    if (!confirm(`¿Generar nómina para ${meses[mes - 1]} ${anio}?`)) return;

    setGenerando(true);
    try {
      // Obtener empleados activos
      const { data: empleados } = await supabase
        .from('empleados')
        .select('*')
        .eq('estado', 'activo');

      if (!empleados || empleados.length === 0) {
        alert('No hay empleados activos');
        return;
      }

      // Generar nómina para cada empleado (solo salario base)
      const nominasData = empleados.map(emp => {
        const salarioBase = emp.salario_mensual;
        const totalIngresos = salarioBase;
        const totalDeducciones = 0;
        const salarioNeto = totalIngresos;

        return {
          empleado_id: emp.id,
          periodo_mes: mes,
          periodo_anio: anio,
          salario_base: salarioBase,
          bonificacion: 0,
          horas_extra: 0,
          otros_ingresos: 0,
          total_ingresos: totalIngresos,
          igss: 0,
          isr: 0,
          prestamos: 0,
          otras_deducciones: 0,
          total_deducciones: totalDeducciones,
          salario_neto: salarioNeto,
          estado: 'pendiente'
        };
      });

      const { error } = await supabase
        .from('nomina')
        .insert(nominasData);

      if (error) throw error;

      alert('✅ Nómina generada exitosamente');
      cargarNominas();
    } catch (error: any) {
      console.error('Error:', error);
      if (error.code === '23505') {
        alert('⚠️ La nómina ya fue generada para este período');
      } else {
        alert('Error al generar nómina');
      }
    } finally {
      setGenerando(false);
    }
  };

  const exportarExcel = async () => {
    if (nominas.length === 0) {
      alert('No hay nóminas para exportar');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nómina');

    // Headers
    sheet.columns = [
      { header: 'Código', key: 'codigo', width: 12 },
      { header: 'Empleado', key: 'nombre', width: 30 },
      { header: 'Salario Base', key: 'salario', width: 15 },
      { header: 'Bonificación', key: 'bonificacion', width: 15 },
      { header: 'Total Ingresos', key: 'ingresos', width: 15 },
      { header: 'IGSS', key: 'igss', width: 12 },
      { header: 'ISR', key: 'isr', width: 12 },
      { header: 'Total Deducciones', key: 'deducciones', width: 15 },
      { header: 'Salario Neto', key: 'neto', width: 15 },
    ];

    // Estilo del header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Datos
    nominas.forEach(n => {
      sheet.addRow({
        codigo: n.empleados?.codigo_empleado,
        nombre: `${n.empleados?.nombres} ${n.empleados?.apellidos}`,
        salario: n.salario_base,
        bonificacion: n.bonificacion,
        ingresos: n.total_ingresos,
        igss: n.igss,
        isr: n.isr,
        deducciones: n.total_deducciones,
        neto: n.salario_neto
      });
    });

    // Formato moneda
    ['C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
      sheet.getColumn(col).numFmt = '"Q"#,##0.00';
    });

    // Total
    const lastRow = sheet.lastRow.number + 2;
    sheet.getCell(`H${lastRow}`).value = 'TOTAL NETO:';
    sheet.getCell(`H${lastRow}`).font = { bold: true };
    sheet.getCell(`I${lastRow}`).value = nominas.reduce((sum, n) => sum + n.salario_neto, 0);
    sheet.getCell(`I${lastRow}`).font = { bold: true };
    sheet.getCell(`I${lastRow}`).numFmt = '"Q"#,##0.00';

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nomina_${meses[mes - 1]}_${anio}.xlsx`;
    a.click();
  };

  const totalNomina = nominas.reduce((sum, n) => sum + n.salario_neto, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-blue-100 mb-4 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver a Personal
          </button>
          <h1 className="text-3xl font-bold">💰 Gestión de Nómina</h1>
          <p className="text-blue-100 mt-2">Cálculo y pago de salarios</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
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

            <div className="ml-auto flex gap-2">
              {nominas.length === 0 ? (
                <button
                  onClick={generarNomina}
                  disabled={generando}
                  className="btn-primary flex items-center gap-2"
                >
                  <DollarSign size={20} />
                  {generando ? 'Generando...' : 'Generar Nómina'}
                </button>
              ) : (
                <button
                  onClick={exportarExcel}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download size={20} />
                  Exportar Excel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resumen */}
        {nominas.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-8 mb-6">
            <div className="text-center">
              <p className="text-blue-100 text-lg mb-2">Total Nómina {meses[mes - 1]} {anio}</p>
              <p className="text-5xl font-bold">
                Q {totalNomina.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-blue-100 mt-4">{nominas.length} empleados</p>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : nominas.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <DollarSign className="mx-auto text-gray-400 mb-4" size={64} />
            <p className="text-gray-600 text-lg mb-4">No hay nómina generada para este período</p>
            <button
              onClick={generarNomina}
              disabled={generando}
              className="btn-primary inline-flex items-center gap-2"
            >
              <DollarSign size={20} />
              {generando ? 'Generando...' : 'Generar Nómina'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Empleado</th>
                  <th className="px-4 py-3 text-right">Salario Base</th>
                  <th className="px-4 py-3 text-right">Bonificación</th>
                  <th className="px-4 py-3 text-right">Ingresos</th>
                  <th className="px-4 py-3 text-right">IGSS</th>
                  <th className="px-4 py-3 text-right">ISR</th>
                  <th className="px-4 py-3 text-right">Deducciones</th>
                  <th className="px-4 py-3 text-right font-bold">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {nominas.map((nomina) => (
                  <tr key={nomina.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold">
                          {nomina.empleados?.nombres} {nomina.empleados?.apellidos}
                        </p>
                        <p className="text-sm text-gray-500">{nomina.empleados?.codigo_empleado}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      Q {nomina.salario_base.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      +Q {nomina.bonificacion.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      Q {nomina.total_ingresos.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      -Q {nomina.igss.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      -Q {nomina.isr.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      Q {nomina.total_deducciones.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600 text-lg">
                      Q {nomina.salario_neto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Información */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información del Cálculo</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Salario Base:</strong> Según contrato de cada empleado</li>
            <li>• <strong>Deducciones:</strong> Se pueden agregar manualmente según sea necesario</li>
            <li>• <strong>Nómina Flexible:</strong> Ajustable a las necesidades de la empresa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};