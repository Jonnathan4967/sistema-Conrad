import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, DollarSign, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface ComisionesPageProps {
  onBack: () => void;
}

interface MedicoComision {
  medico_id: string;
  medico_nombre: string;
  total_pacientes: number;
  comisiones_por_estudio: { [estudioNombre: string]: number }; // Dinámico
  total_comision: number;
  pacientes: any[];
  seleccionado: boolean;
}

interface EstudioConComision {
  id: string;
  nombre: string;
  porcentaje_comision: number;
}

export const ComisionesPage: React.FC<ComisionesPageProps> = ({ onBack }) => {
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [medicos, setMedicos] = useState<MedicoComision[]>([]);
  const [estudiosConComision, setEstudiosConComision] = useState<EstudioConComision[]>([]);
  const [loading, setLoading] = useState(false);
  const [medicoExpandido, setMedicoExpandido] = useState<string | null>(null);

  useEffect(() => {
    cargarEstudiosConComision();
  }, []);

  useEffect(() => {
    if (estudiosConComision.length > 0) {
      calcularComisiones();
    }
  }, [fechaInicio, fechaFin, estudiosConComision]);

  const cargarEstudiosConComision = async () => {
    const { data, error } = await supabase
      .from('estudios')
      .select('id, nombre, porcentaje_comision')
      .gt('porcentaje_comision', 0)
      .eq('activo', true)
      .order('nombre');

    if (error) {
      console.error('Error al cargar estudios:', error);
      return;
    }

    setEstudiosConComision(data || []);
  };

  const calcularComisiones = async () => {
    setLoading(true);
    try {
      const { data: consultas, error } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre, edad),
          medicos(id, nombre),
          detalle_consultas(
            precio,
            sub_estudios(
              nombre,
              estudios(
                id,
                nombre,
                porcentaje_comision
              )
            )
          )
        `)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .not('medico_id', 'is', null)
        .eq('sin_informacion_medico', false)
        .or('anulado.is.null,anulado.eq.false');

      if (error) throw error;

      const medicoMap = new Map<string, MedicoComision>();

      consultas?.forEach(consulta => {
        const medicoId = consulta.medico_id;
        const medicoNombre = consulta.medicos?.nombre || 'Desconocido';

        if (!medicoMap.has(medicoId)) {
          const comisionesIniciales: { [key: string]: number } = {};
          estudiosConComision.forEach(est => {
            comisionesIniciales[est.nombre] = 0;
          });

          medicoMap.set(medicoId, {
            medico_id: medicoId,
            medico_nombre: medicoNombre,
            total_pacientes: 0,
            comisiones_por_estudio: comisionesIniciales,
            total_comision: 0,
            pacientes: [],
            seleccionado: true
          });
        }

        const medico = medicoMap.get(medicoId)!;
        medico.total_pacientes++;

        // ✅ IMPORTANTE: Solo calcular comisión si el tipo de cobro es "normal" o "especial"
        // Social y personalizado NO generan comisión
        const generaComision = consulta.tipo_cobro === 'normal' || consulta.tipo_cobro === 'especial';

        if (generaComision) {
          // Calcular comisión por cada estudio
          consulta.detalle_consultas?.forEach(detalle => {
            const estudioNombre = detalle.sub_estudios?.estudios?.nombre || '';
            const porcentaje = detalle.sub_estudios?.estudios?.porcentaje_comision || 0;
            
            if (porcentaje > 0) {
              const comision = detalle.precio * (porcentaje / 100);
              medico.comisiones_por_estudio[estudioNombre] = 
                (medico.comisiones_por_estudio[estudioNombre] || 0) + comision;
              medico.total_comision += comision;
            }
          });
        }

        medico.pacientes.push({
          nombre: consulta.pacientes?.nombre,
          fecha: consulta.fecha,
          tipo_cobro: consulta.tipo_cobro,
          genera_comision: generaComision,
          estudios: consulta.detalle_consultas
        });
      });

      setMedicos(Array.from(medicoMap.values()).sort((a, b) => 
        b.total_comision - a.total_comision
      ));
    } catch (error) {
      console.error('Error al calcular comisiones:', error);
      alert('Error al calcular comisiones');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeleccion = (medicoId: string) => {
    setMedicos(medicos.map(m => 
      m.medico_id === medicoId ? { ...m, seleccionado: !m.seleccionado } : m
    ));
  };

  const exportarExcel = async () => {
    const medicosSeleccionados = medicos.filter(m => m.seleccionado);

    if (medicosSeleccionados.length === 0) {
      alert('Seleccione al menos un médico');
      return;
    }

    // Usar ExcelJS para estilos profesionales
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Comisiones Médicas');

    // FILA 1: TÍTULO Y FECHA
    worksheet.mergeCells('A1:' + String.fromCharCode(65 + estudiosConComision.length + 1) + '1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'COMISIONES MÉDICAS - CONRAD CENTRAL';
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Agregar fecha en celda aparte
    const lastCol = String.fromCharCode(65 + estudiosConComision.length + 1);
    worksheet.mergeCells(`A2:${lastCol}2`);
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Período: ${format(new Date(fechaInicio), 'dd/MM/yyyy')} - ${format(new Date(fechaFin), 'dd/MM/yyyy')}`;
    dateCell.font = { name: 'Calibri', size: 11, italic: true };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
    worksheet.getRow(2).height = 20;

    // FILA 3: HEADERS
    const headers = ['Nombre del Médico/Establecimiento'];
    estudiosConComision.forEach(est => {
      headers.push(`Comisión ${est.nombre}`);
    });
    headers.push('TOTAL');

    worksheet.getRow(3).values = headers;
    worksheet.getRow(3).height = 25;

    headers.forEach((_, idx) => {
      const cell = worksheet.getCell(3, idx + 1);
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // DATOS
    let filaActual = 4;
    medicosSeleccionados.forEach((medico, idx) => {
      const fila: (string | number)[] = [medico.medico_nombre];
      
      estudiosConComision.forEach(est => {
        fila.push(medico.comisiones_por_estudio[est.nombre] || 0);
      });
      
      fila.push(medico.total_comision);

      worksheet.getRow(filaActual).values = fila;

      // Estilos para cada celda
      fila.forEach((valor, colIdx) => {
        const cell = worksheet.getCell(filaActual, colIdx + 1);
        
        if (colIdx === 0) {
          // Nombre del médico
          cell.font = { name: 'Arial', size: 10, bold: true };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colIdx === fila.length - 1) {
          // Columna TOTAL
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0070C0' } };
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '"Q "#,##0.00';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBE5F1' } };
        } else {
          // Columnas de comisiones
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '"Q "#,##0.00';
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

    // FILA TOTALES
    const filaTotales = filaActual;
    worksheet.getCell(filaTotales, 1).value = 'TOTAL GENERAL';
    worksheet.getCell(filaTotales, 1).font = { name: 'Arial', size: 11, bold: true };
    worksheet.getCell(filaTotales, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    worksheet.getCell(filaTotales, 1).font.color = { argb: 'FFFFFFFF' };
    worksheet.getCell(filaTotales, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    estudiosConComision.forEach((est, idx) => {
      const total = medicosSeleccionados.reduce((sum, m) => sum + (m.comisiones_por_estudio[est.nombre] || 0), 0);
      const cell = worksheet.getCell(filaTotales, idx + 2);
      cell.value = total;
      cell.numFmt = '"Q "#,##0.00';
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    const totalCell = worksheet.getCell(filaTotales, estudiosConComision.length + 2);
    totalCell.value = totalComisionesSeleccionadas;
    totalCell.numFmt = '"Q "#,##0.00';
    totalCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
    totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'medium' }
    };

    // ANCHO DE COLUMNAS
    worksheet.getColumn(1).width = 40; // Nombre
    for (let i = 2; i <= estudiosConComision.length + 1; i++) {
      worksheet.getColumn(i).width = 18; // Comisiones
    }
    worksheet.getColumn(estudiosConComision.length + 2).width = 18; // Total

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comisiones_Medicas_${format(new Date(fechaInicio), 'yyyy-MM')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const totalComisionesSeleccionadas = medicos
    .filter(m => m.seleccionado)
    .reduce((sum, m) => sum + m.total_comision, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button 
            onClick={onBack} 
            className="text-white hover:text-purple-100 mb-4 flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">Comisiones Médicas</h1>
          <p className="text-purple-100 mt-2">Cálculo dinámico de comisiones por referencias</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={calcularComisiones}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Calculando...' : 'Actualizar'}
              </button>
              <button
                onClick={exportarExcel}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={18} />
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        {/* Info sobre estudios con comisión */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📊 Estudios con Comisión Configurada:</h3>
          <div className="flex flex-wrap gap-2">
            {estudiosConComision.map(est => (
              <span key={est.id} className="bg-white px-3 py-1 rounded-full text-sm border border-blue-300">
                {est.nombre}: <strong>{est.porcentaje_comision}%</strong>
              </span>
            ))}
          </div>
          <p className="text-sm text-blue-700 mt-2">
            💡 Configura porcentajes en <strong>Gestión de Productos</strong>
          </p>
        </div>

        {/* Info sobre tipos de cobro */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-900 mb-2">💰 Tipos de Cobro que Generan Comisión:</h3>
          <div className="flex flex-wrap gap-3">
            <span className="bg-green-100 px-4 py-2 rounded-lg text-sm font-medium text-green-800 border border-green-300">
              ✓ NORMAL - Genera comisión
            </span>
            <span className="bg-green-100 px-4 py-2 rounded-lg text-sm font-medium text-green-800 border border-green-300">
              ✓ ESPECIAL - Genera comisión
            </span>
            <span className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300">
              ✗ SOCIAL - NO genera comisión
            </span>
            <span className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300">
              ✗ PERSONALIZADO - NO genera comisión
            </span>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Médicos Seleccionados</p>
                <p className="text-2xl font-bold text-gray-800">
                  {medicos.filter(m => m.seleccionado).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Comisiones</p>
                <p className="text-2xl font-bold text-green-600">
                  Q {totalComisionesSeleccionadas.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pacientes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {medicos.filter(m => m.seleccionado).reduce((sum, m) => sum + m.total_pacientes, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Médicos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-bold text-gray-800">Médicos con Referencias</h2>
            <p className="text-sm text-gray-600">Seleccione los médicos que recibirán comisión</p>
          </div>

          <div className="divide-y">
            {medicos.map(medico => (
              <div key={medico.medico_id} className="p-6">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={medico.seleccionado}
                    onChange={() => toggleSeleccion(medico.medico_id)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">{medico.medico_nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {medico.total_pacientes} pacientes referidos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      Q {medico.total_comision.toFixed(2)}
                    </p>
                    <button
                      onClick={() => setMedicoExpandido(
                        medicoExpandido === medico.medico_id ? null : medico.medico_id
                      )}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      {medicoExpandido === medico.medico_id ? 'Ocultar detalle' : 'Ver detalle'}
                    </button>
                  </div>
                </div>

                {/* Detalle expandido */}
                {medicoExpandido === medico.medico_id && (
                  <div className="mt-4 pl-9 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {estudiosConComision.map(est => {
                        const comision = medico.comisiones_por_estudio[est.nombre] || 0;
                        if (comision === 0) return null;
                        
                        return (
                          <div key={est.id} className="bg-gradient-to-br from-purple-50 to-blue-50 p-3 rounded border border-purple-200">
                            <p className="text-gray-700 font-medium">{est.nombre}</p>
                            <p className="font-bold text-purple-700">Q {comision.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{est.porcentaje_comision}%</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Pacientes:</h4>
                      <div className="bg-gray-50 rounded p-4 max-h-60 overflow-y-auto">
                        {medico.pacientes.map((p, idx) => (
                          <div key={idx} className="text-sm py-2 border-b last:border-0 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{p.nombre}</p>
                              <p className="text-gray-600">{p.fecha}</p>
                            </div>
                            {p.genera_comision ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                                ✓ Con comisión
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-medium">
                                {p.tipo_cobro === 'social' ? 'Social' : 'Personalizado'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {medicos.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-500">
              No se encontraron médicos con referencias en este período
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
