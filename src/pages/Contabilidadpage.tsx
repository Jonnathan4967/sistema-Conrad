import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  FileText,
  Users,
  Download 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { GastosPage } from './GastosPage';
import { IngresosPage } from './IngresosPage';
import { ProveedoresContabilidadPage } from './ProveedoresContabilidadPage';
import { ReportesFinancierosPage } from './ReportesFinancierosPage';

interface ContabilidadPageProps {
  onBack: () => void;
}

type Vista = 'dashboard' | 'ingresos' | 'gastos' | 'proveedores' | 'reportes';

export const ContabilidadPage: React.FC<ContabilidadPageProps> = ({ onBack }) => {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  
  const [totales, setTotales] = useState({
    ingresos: 0,
    gastos: 0,
    utilidad: 0,
    ingresosConsultas: 0,
    ingresosAdicionales: 0
  });

  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    cargarDatos();
  }, [mes, anio]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Calcular primer y último día del mes
      const primerDia = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(anio, mes, 0).toISOString().split('T')[0];

      // 1. Ingresos por consultas
      const { data: consultas } = await supabase
        .from('consultas')
        .select(`
          detalle_consultas(precio)
        `)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .or('anulado.is.null,anulado.eq.false')
        .or('es_servicio_movil.is.null,es_servicio_movil.eq.false');

      const ingresosConsultas = consultas?.reduce((sum, c: any) => {
        return sum + (c.detalle_consultas?.reduce((s: number, d: any) => s + d.precio, 0) || 0);
      }, 0) || 0;

      // 2. Ingresos adicionales
      const { data: ingresosAd } = await supabase
        .from('ingresos_adicionales')
        .select('monto')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia);

      const ingresosAdicionales = ingresosAd?.reduce((sum, i) => sum + i.monto, 0) || 0;

      // 3. Gastos
      const { data: gastosData } = await supabase
        .from('gastos')
        .select('monto')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia);

      const totalGastos = gastosData?.reduce((sum, g) => sum + g.monto, 0) || 0;

      const totalIngresos = ingresosConsultas + ingresosAdicionales;
      const utilidad = totalIngresos - totalGastos;

      setTotales({
        ingresos: totalIngresos,
        gastos: totalGastos,
        utilidad: utilidad,
        ingresosConsultas: ingresosConsultas,
        ingresosAdicionales: ingresosAdicionales
      });

    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (vistaActual === 'gastos') {
    return <GastosPage onBack={() => setVistaActual('dashboard')} />;
  }

  if (vistaActual === 'ingresos') {
    return <IngresosPage onBack={() => setVistaActual('dashboard')} />;
  }

  if (vistaActual === 'proveedores') {
    return <ProveedoresContabilidadPage onBack={() => setVistaActual('dashboard')} />;
  }

  if (vistaActual === 'reportes') {
    return <ReportesFinancierosPage onBack={() => setVistaActual('dashboard')} />;
  }

  // Vista Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button 
            onClick={onBack} 
            className="text-white hover:text-green-100 mb-4 flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">💰 Contabilidad</h1>
          <p className="text-green-100 mt-2">Gestión financiera y reportes</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Selector de Período */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar className="text-green-600" size={24} />
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
            <button 
              onClick={cargarDatos}
              className="btn-primary ml-auto"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Ingresos */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm">Ingresos del Mes</p>
                <p className="text-3xl font-bold text-green-600">
                  Q {totales.ingresos.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="text-green-600" size={40} />
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Consultas: Q {totales.ingresosConsultas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p>Adicionales: Q {totales.ingresosAdicionales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Gastos */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Gastos del Mes</p>
                <p className="text-3xl font-bold text-red-600">
                  Q {totales.gastos.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingDown className="text-red-600" size={40} />
            </div>
          </div>

          {/* Utilidad */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Utilidad del Mes</p>
                <p className={`text-3xl font-bold ${totales.utilidad >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  Q {totales.utilidad.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className={totales.utilidad >= 0 ? 'text-blue-600' : 'text-red-600'} size={40} />
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-500">
                Margen: {totales.ingresos > 0 ? ((totales.utilidad / totales.ingresos) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Accesos Rápidos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => setVistaActual('ingresos')}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <TrendingUp className="text-green-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Registrar Ingreso</h3>
            <p className="text-sm text-gray-600">Ingresos adicionales</p>
          </button>

          <button 
            onClick={() => setVistaActual('gastos')}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <TrendingDown className="text-red-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Registrar Gasto</h3>
            <p className="text-sm text-gray-600">Gastos operativos</p>
          </button>

          <button 
            onClick={() => setVistaActual('reportes')}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <FileText className="text-blue-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Reportes</h3>
            <p className="text-sm text-gray-600">Estados financieros</p>
          </button>

          <button 
            onClick={() => setVistaActual('proveedores')}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <Users className="text-purple-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Proveedores</h3>
            <p className="text-sm text-gray-600">Catálogo</p>
          </button>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los ingresos por consultas se calculan automáticamente del sistema</li>
            <li>• Puedes registrar ingresos adicionales (alquileres, otros servicios)</li>
            <li>• Todos los gastos deben registrarse manualmente</li>
            <li>• Los reportes se generan en formato Excel</li>
          </ul>
        </div>
      </div>
    </div>
  );
};