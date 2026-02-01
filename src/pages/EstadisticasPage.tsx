import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface EstadisticasPageProps {
  onBack: () => void;
}

interface EstadisticasDia {
  fecha: string;
  cantidad: number;
  ingresos: number;
}

interface EstadisticasMes {
  mes: string;
  cantidad: number;
  ingresos: number;
}

export const EstadisticasPage: React.FC<EstadisticasPageProps> = ({ onBack }) => {
  const [fechaInicio, setFechaInicio] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  
  // Estadísticas generales
  const [totalConsultas, setTotalConsultas] = useState(0);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [promedioConsulta, setPromedioConsulta] = useState(0);
  
  // Datos para gráficas
  const [datosPorDia, setDatosPorDia] = useState<EstadisticasDia[]>([]);
  const [datosPorMes, setDatosPorMes] = useState<EstadisticasMes[]>([]);
  const [topEstudios, setTopEstudios] = useState<any[]>([]);
  const [porTipoCobro, setPorTipoCobro] = useState<any>({});
  const [porFormaPago, setPorFormaPago] = useState<any>({});

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      // Obtener consultas del período (excluyendo anuladas)
      const { data: consultasRaw, error } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre, edad),
          medicos(nombre),
          detalle_consultas(
            precio,
            sub_estudios(
              nombre,
              estudios(nombre)
            )
          )
        `)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: true });

      if (error) throw error;

      // ✅ Filtrar consultas anuladas
      const consultas = consultasRaw?.filter(c => c.anulado !== true) || [];

      if (!consultas || consultas.length === 0) {
        setLoading(false);
        return;
      }

      // Calcular totales
      const total = consultas.length;
      const pacientesUnicos = new Set(consultas.map(c => c.paciente_id)).size;
      const ingresos = consultas.reduce((sum, c) => {
        return sum + c.detalle_consultas.reduce((s: number, d: any) => s + d.precio, 0);
      }, 0);

      setTotalConsultas(total);
      setTotalPacientes(pacientesUnicos);
      setTotalIngresos(ingresos);
      setPromedioConsulta(total > 0 ? ingresos / total : 0);

      // Agrupar por día
      const porDia: { [key: string]: { cantidad: number; ingresos: number } } = {};
      consultas.forEach(c => {
        const fecha = c.fecha;
        if (!porDia[fecha]) {
          porDia[fecha] = { cantidad: 0, ingresos: 0 };
        }
        porDia[fecha].cantidad++;
        porDia[fecha].ingresos += c.detalle_consultas.reduce((s: number, d: any) => s + d.precio, 0);
      });

      const datosDia = Object.entries(porDia)
        .map(([fecha, datos]) => ({
          fecha: new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' }),
          cantidad: datos.cantidad,
          ingresos: datos.ingresos
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      setDatosPorDia(datosDia);

      // Agrupar por mes (últimos 6 meses)
      const porMes: { [key: string]: { cantidad: number; ingresos: number } } = {};
      consultas.forEach(c => {
        const fecha = new Date(c.fecha);
        const mesKey = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!porMes[mesKey]) {
          porMes[mesKey] = { cantidad: 0, ingresos: 0 };
        }
        porMes[mesKey].cantidad++;
        porMes[mesKey].ingresos += c.detalle_consultas.reduce((s: number, d: any) => s + d.precio, 0);
      });

      const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const datosMes = Object.entries(porMes)
        .map(([mesKey, datos]) => {
          const [anio, mes] = mesKey.split('-');
          return {
            mes: `${nombresMeses[parseInt(mes) - 1]} ${anio}`,
            cantidad: datos.cantidad,
            ingresos: datos.ingresos
          };
        })
        .slice(-6); // Últimos 6 meses

      setDatosPorMes(datosMes);

      // Top 10 estudios
      const todosDetalles = consultas.flatMap(c => c.detalle_consultas);
      const estudiosCount: { [key: string]: number } = {};
      
      todosDetalles.forEach(d => {
        const nombre = d.sub_estudios?.nombre || 'Desconocido';
        estudiosCount[nombre] = (estudiosCount[nombre] || 0) + 1;
      });

      const top10 = Object.entries(estudiosCount)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);

      setTopEstudios(top10);

      // Por tipo de cobro
      const tipoCobro = consultas.reduce((acc: any, c) => {
        acc[c.tipo_cobro] = (acc[c.tipo_cobro] || 0) + 1;
        return acc;
      }, {});
      setPorTipoCobro(tipoCobro);

      // Por forma de pago
      const formaPago = consultas.reduce((acc: any, c) => {
        acc[c.forma_pago] = (acc[c.forma_pago] || 0) + 1;
        return acc;
      }, {});
      setPorFormaPago(formaPago);

    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    const csv = [
      ['Fecha', 'Pacientes', 'Ingresos'],
      ...datosPorDia.map(d => [d.fecha, d.cantidad, d.ingresos])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estadisticas_${fechaInicio}_${fechaFin}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-blue-100 mb-4 flex items-center gap-2 transition-colors">
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">Estadísticas</h1>
          <p className="text-blue-100 mt-2">Análisis de consultas y rendimiento</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="label">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="label">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex gap-2 pt-6">
              <button onClick={cargarEstadisticas} className="btn-primary">
                Generar Reporte
              </button>
              <button onClick={exportarCSV} className="btn-secondary flex items-center gap-2">
                <Download size={18} />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Cards de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Consultas</p>
              <Calendar className="text-blue-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-blue-600">{totalConsultas}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Pacientes</p>
              <Users className="text-green-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-green-600">{totalPacientes}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Ingresos Totales</p>
              <DollarSign className="text-purple-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-purple-600">Q {totalIngresos.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Promedio por Consulta</p>
              <TrendingUp className="text-orange-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-orange-600">Q {promedioConsulta.toFixed(2)}</p>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfica por día */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📊 Consultas por Día</h2>
            <div className="space-y-2">
              {datosPorDia.map((dato, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">{dato.fecha}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${(dato.cantidad / Math.max(...datosPorDia.map(d => d.cantidad))) * 100}%` }}
                    >
                      <span className="text-white text-sm font-bold">{dato.cantidad}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-24 text-right">Q{dato.ingresos.toFixed(0)}</span>
                </div>
              ))}
              {datosPorDia.length === 0 && (
                <p className="text-gray-500 text-center py-8">No hay datos para mostrar</p>
              )}
            </div>
          </div>

          {/* Gráfica por mes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📅 Consultas por Mes</h2>
            <div className="space-y-2">
              {datosPorMes.map((dato, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-24">{dato.mes}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${(dato.cantidad / Math.max(...datosPorMes.map(d => d.cantidad))) * 100}%` }}
                    >
                      <span className="text-white text-sm font-bold">{dato.cantidad}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-24 text-right">Q{dato.ingresos.toFixed(0)}</span>
                </div>
              ))}
              {datosPorMes.length === 0 && (
                <p className="text-gray-500 text-center py-8">No hay datos para mostrar</p>
              )}
            </div>
          </div>
        </div>

        {/* Otras estadísticas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 10 Estudios */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">🏆 Top 10 Estudios Más Realizados</h2>
            <div className="space-y-3">
              {topEstudios.map((estudio, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{estudio.nombre}</p>
                  </div>
                  <span className="text-purple-600 font-bold">{estudio.cantidad} veces</span>
                </div>
              ))}
              {topEstudios.length === 0 && (
                <p className="text-gray-500 text-center py-8">No hay datos</p>
              )}
            </div>
          </div>

          {/* Por tipo de cobro */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">💰 Consultas por Tipo de Cobro</h2>
            <div className="space-y-3">
              {Object.entries(porTipoCobro).map(([tipo, cantidad]: [string, any]) => (
                <div key={tipo} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium capitalize">{tipo}</span>
                  <span className="text-blue-600 font-bold">{cantidad}</span>
                </div>
              ))}
              {Object.keys(porTipoCobro).length === 0 && (
                <p className="text-gray-500 text-center py-8">No hay datos</p>
              )}
            </div>
          </div>

          {/* Por forma de pago */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">💳 Consultas por Forma de Pago</h2>
            <div className="space-y-3">
              {Object.entries(porFormaPago).map(([forma, cantidad]: [string, any]) => (
                <div key={forma} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium capitalize">{forma.replace('_', ' ')}</span>
                  <span className="text-green-600 font-bold">{cantidad}</span>
                </div>
              ))}
              {Object.keys(porFormaPago).length === 0 && (
                <p className="text-gray-500 text-center py-8">No hay datos</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};