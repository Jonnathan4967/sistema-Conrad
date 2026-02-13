import React, { useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Download, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks';
import { generarReporteExcel, generarReporteMoviles, generarReporteMensualUnificado } from '../utils/excel-generator';

interface ReportesPageProps {
  onBack: () => void;
}

export const ReportesPage: React.FC<ReportesPageProps> = ({ onBack }) => {
  // ✅ CORREGIDO: Obtener fecha/mes/año en zona horaria de Guatemala (GMT-6)
  const getGuatemalaDate = () => {
    const ahora = new Date();
    const guatemalaTime = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
    return guatemalaTime;
  };

  const getFechaGuatemala = () => {
    const gt = getGuatemalaDate();
    const yyyy = gt.getFullYear();
    const mm = String(gt.getMonth() + 1).padStart(2, '0');
    const dd = String(gt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [generando, setGenerando] = useState(false);
  const [tipoReporte, setTipoReporte] = useState<'dia' | 'mes'>('dia');

  // ✅ CORREGIDO: Inicializar con fecha de Guatemala
  const [fechaUnica, setFechaUnica] = useState(getFechaGuatemala());
  const [mes, setMes] = useState(getGuatemalaDate().getMonth() + 1);
  const [anio, setAnio] = useState(getGuatemalaDate().getFullYear());

  const { toast, showToast, hideToast } = useToast();

  const meses = [
    { value: 1,  label: 'Enero' },
    { value: 2,  label: 'Febrero' },
    { value: 3,  label: 'Marzo' },
    { value: 4,  label: 'Abril' },
    { value: 5,  label: 'Mayo' },
    { value: 6,  label: 'Junio' },
    { value: 7,  label: 'Julio' },
    { value: 8,  label: 'Agosto' },
    { value: 9,  label: 'Septiembre' },
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

      if (tipoReporte === 'dia') {
        primerDia = fechaUnica;
        ultimoDia = fechaUnica;
        // ✅ Parsear la fecha seleccionada sin conversión UTC
        const [yyyy, mm] = fechaUnica.split('-').map(Number);
        mesReporte = mm;
        anioReporte = yyyy;
      } else {
        primerDia = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
        ultimoDia = new Date(anio, mes, 0).toISOString().split('T')[0];
        mesReporte = mes;
        anioReporte = anio;
      }

      const { data: consultasRaw, error } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre, edad, edad_valor, edad_tipo),
          medicos(nombre),
          detalle_consultas(
            sub_estudios(
              nombre,
              estudios(id, nombre)
            ),
            precio,
            numero_factura,
            nit,
            numero_voucher,
            numero_transferencia,
            comentarios
          )
        `)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const consultas = consultasRaw?.filter(c => {
        return c.anulado !== true && c.es_servicio_movil !== true;
      }) || [];

      if (!consultas || consultas.length === 0) {
        showToast('No hay consultas regulares en este período', 'error');
        setGenerando(false);
        return;
      }

      showToast('Generando archivo Excel...', 'info');

      if (tipoReporte === 'mes') {
        await generarReporteMensualUnificado(mesReporte, anioReporte, consultas);
      } else {
        await generarReporteExcel(mesReporte, anioReporte, consultas);
      }

      showToast('¡Reporte generado y descargado exitosamente!', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al generar reporte', 'error');
    } finally {
      setGenerando(false);
    }
  };

  const handleGenerarReporteMoviles = async () => {
    setGenerando(true);
    try {
      showToast('Obteniendo servicios móviles...', 'info');

      let primerDia: string;
      let ultimoDia: string;
      let mesReporte: number;
      let anioReporte: number;

      if (tipoReporte === 'dia') {
        primerDia = fechaUnica;
        ultimoDia = fechaUnica;
        // ✅ Parsear la fecha seleccionada sin conversión UTC
        const [yyyy, mm] = fechaUnica.split('-').map(Number);
        mesReporte = mm;
        anioReporte = yyyy;
      } else {
        primerDia = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
        ultimoDia = new Date(anio, mes, 0).toISOString().split('T')[0];
        mesReporte = mes;
        anioReporte = anio;
      }

      const { data: consultasRaw, error } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre, edad, edad_valor, edad_tipo),
          medicos(nombre),
          detalle_consultas(
            sub_estudios(
              nombre,
              estudios(id, nombre)
            ),
            precio,
            numero_factura,
            nit,
            numero_voucher,
            numero_transferencia,
            comentarios
          )
        `)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .eq('es_servicio_movil', true)
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const consultas = consultasRaw?.filter(c => c.anulado !== true) || [];

      if (!consultas || consultas.length === 0) {
        showToast('No hay servicios móviles en este período', 'info');
        setGenerando(false);
        return;
      }

      showToast('Generando reporte de móviles...', 'info');
      await generarReporteMoviles(mesReporte, anioReporte, consultas);
      showToast('¡Reporte de móviles generado exitosamente!', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al generar reporte de móviles', 'error');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-green-100 mb-4 flex items-center gap-2 transition-colors">
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">Generar Reportes</h1>
          <p className="text-green-100 mt-2">Exportación de datos a Excel</p>
        </div>
      </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="text-blue-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Flexible</h3>
                  <p className="text-sm text-gray-600">Un día, varios días, o mes completo</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="text-purple-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Profesional</h3>
                  <p className="text-sm text-gray-600">Colores, bordes, totales automáticos</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Download className="text-green-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Descarga inmediata</h3>
                  <p className="text-sm text-gray-600">Se genera y descarga al instante</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="text-orange-600 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Una hoja por día</h3>
                  <p className="text-sm text-gray-600">Cada día tiene su propia pestaña</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-bold text-gray-800 mb-4">Selecciona el tipo de reporte</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
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
                onClick={() => setTipoReporte('mes')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  tipoReporte === 'mes'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <Calendar className="mx-auto mb-2" size={24} />
                <p className="font-semibold text-sm">Mes Completo Unificado</p>
              </button>
            </div>

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

            <div className="space-y-3">
              <button
                onClick={handleGenerarReporte}
                disabled={generando}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-lg"
              >
                {generando ? (
                  <><LoadingSpinner />Generando reporte...</>
                ) : (
                  <><Download size={24} />📋 Generar Reporte Regular</>
                )}
              </button>

              <button
                onClick={handleGenerarReporteMoviles}
                disabled={generando}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 py-3 text-lg transition-colors disabled:bg-gray-400"
              >
                {generando ? (
                  <><LoadingSpinner />Generando móviles...</>
                ) : (
                  <><Download size={24} />📱 Generar Reporte Servicios Móviles</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={hideToast} />}
    </div>
  );
};