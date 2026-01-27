import React, { useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Download, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks';
import { generarReporteExcel } from '../utils/excel-generator';

interface ReportesPageProps {
  onBack: () => void;
}

export const ReportesPage: React.FC<ReportesPageProps> = ({ onBack }) => {
  const [generando, setGenerando] = useState(false);
  const [tipoReporte, setTipoReporte] = useState<'dia' | 'rango' | 'mes'>('mes');
  const [fechaUnica, setFechaUnica] = useState(new Date().toISOString().split('T')[0]);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const { toast, showToast, hideToast } = useToast();

  const meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  const handleGenerarReporte = async () => {
    setGenerando(true);
    try {
      showToast('Obteniendo consultas...', 'info');

      let primerDia: string;
      let ultimoDia: string;
      let mesReporte: number;
      let anioReporte: number;

      // Determinar rango según tipo de reporte
      if (tipoReporte === 'dia') {
        primerDia = fechaUnica;
        ultimoDia = fechaUnica;
        const fecha = new Date(fechaUnica);
        mesReporte = fecha.getMonth() + 1;
        anioReporte = fecha.getFullYear();
      } else if (tipoReporte === 'rango') {
        primerDia = fechaInicio;
        ultimoDia = fechaFin;
        const fecha = new Date(fechaInicio);
        mesReporte = fecha.getMonth() + 1;
        anioReporte = fecha.getFullYear();
      } else {
        // Mes completo
        primerDia = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
        ultimoDia = new Date(anio, mes, 0).toISOString().split('T')[0];
        mesReporte = mes;
        anioReporte = anio;
      }

      const { data: consultas, error } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre, edad),
          medicos(nombre),
          detalle_consultas(
            sub_estudios(
              nombre,
              estudios(id, nombre)
            ),
            precio
          )
        `)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .order('fecha', { ascending: true });

      if (error) throw error;

      if (!consultas || consultas.length === 0) {
        showToast('No hay consultas en este período', 'error');
        setGenerando(false);
        return;
      }

      // ✅ DEBUG: Ver datos de la primera consulta
      console.log('=== DEBUG REPORTE ===');
      console.log('Primera consulta completa:', consultas[0]);
      console.log('medico_recomendado:', consultas[0].medico_recomendado);
      console.log('sin_informacion_medico:', consultas[0].sin_informacion_medico);
      console.log('medicos:', consultas[0].medicos);
      console.log('====================');

      showToast('Generando archivo Excel...', 'info');

      // Generar Excel directamente en el navegador
      await generarReporteExcel(mesReporte, anioReporte, consultas);

      showToast('¡Reporte generado y descargado exitosamente!', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al generar reporte', 'error');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver
          </button>
          <h1 className="text-2xl font-bold">Generar Reportes</h1>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <FileSpreadsheet className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Reporte de Consultas en Excel
            </h2>
            <p className="text-gray-600">
              Genera un archivo Excel profesional con formato CONRAD CENTRAL
            </p>
          </div>

          {/* Características del reporte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="text-blue-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Flexible</h3>
                  <p className="text-sm text-gray-600">
                    Un día, varios días, o mes completo
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="text-purple-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Profesional</h3>
                  <p className="text-sm text-gray-600">
                    Colores, bordes, totales automáticos
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Download className="text-green-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Descarga inmediata</h3>
                  <p className="text-sm text-gray-600">
                    Se genera y descarga al instante
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="text-orange-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Una hoja por día</h3>
                  <p className="text-sm text-gray-600">
                    Cada día tiene su propia pestaña
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tipo de reporte */}
          <div className="border-t pt-6">
            <h3 className="font-bold text-gray-800 mb-4">Selecciona el tipo de reporte</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setTipoReporte('dia')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  tipoReporte === 'dia'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <Calendar className="mx-auto mb-2" size={24} />
                <p className="font-semibold text-sm">Un Día</p>
              </button>

              <button
                onClick={() => setTipoReporte('rango')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  tipoReporte === 'rango'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <Calendar className="mx-auto mb-2" size={24} />
                <p className="font-semibold text-sm">Rango de Días</p>
              </button>

              <button
                onClick={() => setTipoReporte('mes')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  tipoReporte === 'mes'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <Calendar className="mx-auto mb-2" size={24} />
                <p className="font-semibold text-sm">Mes Completo</p>
              </button>
            </div>

            {/* Formulario según tipo */}
            {tipoReporte === 'dia' && (
              <div className="mb-6">
                <label className="label">Fecha</label>
                <input
                  type="date"
                  value={fechaUnica}
                  onChange={(e) => setFechaUnica(e.target.value)}
                  className="input-field"
                />
              </div>
            )}

            {tipoReporte === 'rango' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="label">Fecha Inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Fecha Fin</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            )}

            {tipoReporte === 'mes' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="label">Mes</label>
                  <select
                    value={mes}
                    onChange={(e) => setMes(parseInt(e.target.value))}
                    className="input-field"
                  >
                    {meses.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Año</label>
                  <select
                    value={anio}
                    onChange={(e) => setAnio(parseInt(e.target.value))}
                    className="input-field"
                  >
                    {[2024, 2025, 2026, 2027].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerarReporte}
              disabled={generando}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-lg"
            >
              {generando ? (
                <>
                  <LoadingSpinner />
                  Generando reporte...
                </>
              ) : (
                <>
                  <Download size={24} />
                  Generar y Descargar Reporte
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast {...toast} onClose={hideToast} />}
    </div>
  );
};