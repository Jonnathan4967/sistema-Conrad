import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  FileText,
  Users,
  Download,
  Clock,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { GastosPage } from './GastosPage';
import { IngresosPage } from './IngresosPage';
import { ProveedoresContabilidadPage } from './ProveedoresContabilidadPage';
import { ReportesFinancierosPage } from './ReportesFinancierosPage';
import { ComisionesPagarPage } from './ComisionesPagarPage';
import { EstadisticasPage } from './EstadisticasPage';

interface ContabilidadPageProps {
  onBack: () => void;
}

type Vista = 'dashboard' | 'ingresos' | 'gastos' | 'proveedores' | 'reportes' | 'comisiones' | 'estadisticas';

// ✅ INTERFAZ NUEVA para el componente de resumen
interface CuadrePorFormaPago {
  forma_pago: string;
  cantidad: number;
  total: number;
}

export const ContabilidadPage: React.FC<ContabilidadPageProps> = ({ onBack }) => {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  
  const [totales, setTotales] = useState({
    ingresos: 0,
    gastos: 0,
    gastosOperativos: 0,
    comisionesPagadas: 0,
    utilidad: 0,
    ingresosSinGastosOperativos: 0,
    ingresosConsultas: 0,
    ingresosMoviles: 0,
    ingresosAdicionales: 0,
    comisionesPendientes: 0
  });

  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');
  const [desgloseExpandido, setDesgloseExpandido] = useState(false);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [mes, anio]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = `${anio}-${String(mes).padStart(2, '0')}-${new Date(anio, mes, 0).getDate()}`;

      console.log('📅 Cargando datos:', { primerDia, ultimoDia });

      // ✅ 1. Ingresos por consultas REGULARES (sin móviles)
      const { data: consultasRegulares } = await supabase
        .from('consultas')
        .select(`
          fecha,
          detalle_consultas(precio)
        `)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .or('anulado.is.null,anulado.eq.false')
        .or('es_servicio_movil.is.null,es_servicio_movil.eq.false');

      console.log('💰 Consultas regulares:', consultasRegulares?.length);

      const ingresosConsultas = consultasRegulares?.reduce((sum, c: any) => {
        return sum + (c.detalle_consultas?.reduce((s: number, d: any) => s + d.precio, 0) || 0);
      }, 0) || 0;

      // ✅ 2. Ingresos por SERVICIOS MÓVILES (separado)
      const { data: consultasMoviles } = await supabase
        .from('consultas')
        .select(`
          *,
          detalle_consultas(precio)
        `)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .or('anulado.is.null,anulado.eq.false')
        .eq('es_servicio_movil', true);

      console.log('📱 Consultas móviles:', consultasMoviles?.length);

      const ingresosMoviles = consultasMoviles?.reduce((sum, c: any) => {
        const totalRX = c.detalle_consultas?.reduce((s: number, d: any) => s + d.precio, 0) || 0;
        let totalExtras = 0;
        if (c.movil_incluye_placas) totalExtras += c.movil_precio_placas || 0;
        if (c.movil_incluye_informe) totalExtras += c.movil_precio_informe || 0;
        return sum + totalRX + totalExtras;
      }, 0) || 0;

      // 3. Ingresos adicionales
      const { data: ingresosAd } = await supabase
        .from('ingresos_adicionales')
        .select('monto')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia);

      const ingresosAdicionales = ingresosAd?.reduce((sum, i) => sum + i.monto, 0) || 0;

      // 4. Gastos (incluyendo comisiones pagadas)
      const { data: gastosData } = await supabase
        .from('gastos')
        .select('monto, fecha')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia);

      console.log('📉 Gastos encontrados:', gastosData?.length);

      const gastosOperativos = gastosData?.reduce((sum, g) => sum + g.monto, 0) || 0;

      // Comisiones PAGADAS en este período
      const { data: comisionesPagadasData } = await supabase
        .from('comisiones_por_pagar')
        .select('total_comision')
        .gte('fecha_pago', primerDia)
        .lte('fecha_pago', ultimoDia)
        .eq('estado', 'pagado');

      const comisionesPagadas = comisionesPagadasData?.reduce((sum, c) => sum + c.total_comision, 0) || 0;

      const totalGastos = gastosOperativos + comisionesPagadas;

      // 5. Comisiones pendientes
      const { data: comisionesData } = await supabase
        .from('comisiones_por_pagar')
        .select('total_comision')
        .gte('periodo_inicio', primerDia)
        .lte('periodo_fin', ultimoDia)
        .eq('estado', 'pendiente');

      const comisionesPendientes = comisionesData?.reduce((sum, c) => sum + c.total_comision, 0) || 0;

      const totalIngresos = ingresosConsultas + ingresosMoviles + ingresosAdicionales;
      const utilidad = totalIngresos - totalGastos;
      const ingresosSinGastosOperativos = totalIngresos - gastosOperativos;

      console.log('📊 Totales calculados:', {
        ingresosConsultas,
        ingresosMoviles,
        ingresosAdicionales,
        totalIngresos,
        totalGastos,
        gastosOperativos,
        comisionesPendientes,
        utilidad,
        ingresosSinGastosOperativos
      });

      setTotales({
        ingresos: totalIngresos,
        gastos: totalGastos,
        gastosOperativos: gastosOperativos,
        comisionesPagadas: comisionesPagadas,
        utilidad: utilidad,
        ingresosSinGastosOperativos: ingresosSinGastosOperativos,
        ingresosConsultas: ingresosConsultas,
        ingresosMoviles: ingresosMoviles,
        ingresosAdicionales: ingresosAdicionales,
        comisionesPendientes: comisionesPendientes
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

  if (vistaActual === 'comisiones') {
    return <ComisionesPagarPage onBack={() => setVistaActual('dashboard')} />;
  }

  if (vistaActual === 'estadisticas') {
    return <EstadisticasPage onBack={() => setVistaActual('dashboard')} />;
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
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Ingresos - CON DESGLOSE DE MÓVILES */}
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
              <p>Consultas Regulares: Q {totales.ingresosConsultas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p className="text-orange-600 font-semibold">
                📱 Servicios Móviles: Q {totales.ingresosMoviles.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
              <p>Otros Ingresos: Q {totales.ingresosAdicionales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Gastos */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm">Gastos del Mes</p>
                <p className="text-3xl font-bold text-red-600">
                  Q {totales.gastos.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingDown className="text-red-600" size={40} />
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Operativos: Q {totales.gastosOperativos.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p>Comisiones: Q {totales.comisionesPagadas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Comisiones Pendientes */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Comisiones Pendientes</p>
                <p className="text-3xl font-bold text-purple-600">
                  Q {totales.comisionesPendientes.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Clock className="text-purple-600" size={40} />
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

        {/* Resumen de Ventas por Método - DATOS DEL DÍA ACTUAL */}
        <ResumenVentasDelDia mes={mes} anio={anio} />

        {/* DESGLOSE DE INGRESOS - VERSIÓN COLAPSABLE */}
        {totales.ingresosMoviles > 0 && (
          <div className="mb-8">
            {/* Botón principal colapsable */}
            <button
              onClick={() => setDesgloseExpandido(!desgloseExpandido)}
              className="w-full bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-orange-600 text-3xl">📱</div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Desglose de Ingresos</h3>
                    <p className="text-sm text-gray-600">Ver detalle de servicios móviles</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Servicios Móviles</p>
                    <p className="text-xl font-bold text-orange-600">
                      Q {totales.ingresosMoviles.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-orange-500">
                      {totales.ingresos > 0 ? ((totales.ingresosMoviles / totales.ingresos) * 100).toFixed(1) : 0}% del total
                    </p>
                  </div>
                  <div className={`transform transition-transform ${desgloseExpandido ? 'rotate-180' : ''}`}>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>

            {/* Contenido expandible */}
            {desgloseExpandido && (
              <div className="mt-4 bg-orange-50 border border-orange-300 rounded-lg p-4 transition-all duration-300 ease-in-out">
                <div className="grid md:grid-cols-3 gap-3 mb-3">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500">Consultas Regulares</p>
                    <p className="text-lg font-bold text-green-600">
                      Q {totales.ingresosConsultas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {totales.ingresos > 0 ? ((totales.ingresosConsultas / totales.ingresos) * 100).toFixed(1) : 0}%
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border-2 border-orange-400 shadow-sm">
                    <p className="text-xs text-orange-700 font-semibold">📱 Servicios Móviles</p>
                    <p className="text-lg font-bold text-orange-600">
                      Q {totales.ingresosMoviles.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-orange-500 mt-1 font-medium">
                      {totales.ingresos > 0 ? ((totales.ingresosMoviles / totales.ingresos) * 100).toFixed(1) : 0}%
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500">Otros Ingresos</p>
                    <p className="text-lg font-bold text-blue-600">
                      Q {totales.ingresosAdicionales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {totales.ingresos > 0 ? ((totales.ingresosAdicionales / totales.ingresos) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-orange-700 bg-white bg-opacity-50 p-2 rounded">
                  <span className="flex-shrink-0">ℹ️</span>
                  <span>Los servicios móviles SÍ cuentan como ingresos, pero NO generan comisiones para médicos referentes.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accesos Rápidos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-4">
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
            onClick={() => setVistaActual('comisiones')}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <Clock className="text-purple-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Comisiones</h3>
            <p className="text-sm text-gray-600">Cuentas por pagar</p>
          </button>

          <button 
            onClick={() => setVistaActual('estadisticas')}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <BarChart3 className="text-indigo-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Estadísticas</h3>
            <p className="text-sm text-gray-600">Análisis de estudios</p>
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
            <Users className="text-orange-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Proveedores</h3>
            <p className="text-sm text-gray-600">Catálogo</p>
          </button>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los ingresos por consultas regulares y móviles se calculan automáticamente</li>
            <li>• Los servicios móviles se muestran separados para mejor control</li>
            <li>• Puedes registrar ingresos adicionales (alquileres, otros servicios)</li>
            <li>• Todos los gastos deben registrarse manualmente</li>
            <li>• Las comisiones pendientes son obligaciones de pago a médicos referentes</li>
            <li>• Los reportes se generan en formato Excel</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// COMPONENTE: Resumen de Ventas por Método (CON SERVICIOS MÓVILES)
interface ResumenVentasDelDiaProps {
  mes: number;
  anio: number;
}

const ResumenVentasDelDia: React.FC<ResumenVentasDelDiaProps> = ({ mes, anio }) => {
  const [loading, setLoading] = useState(false);
  const [ventasPorMetodo, setVentasPorMetodo] = useState<CuadrePorFormaPago[]>([]);
  const [ventasMovilesPorMetodo, setVentasMovilesPorMetodo] = useState<CuadrePorFormaPago[]>([]);
  const [gastosDelDia, setGastosDelDia] = useState(0);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const ahora = new Date();
    const guatemalaTime = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
    const year = guatemalaTime.getFullYear();
    const month = String(guatemalaTime.getMonth() + 1).padStart(2, '0');
    const day = String(guatemalaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    cargarVentasDelDia();
  }, [fechaSeleccionada]);

  const cargarVentasDelDia = async () => {
    setLoading(true);
    try {
      // 1. Cargar consultas REGULARES del día
      const { data: consultas } = await supabase
        .from('consultas')
        .select(`
          forma_pago,
          detalle_consultas(precio)
        `)
        .eq('fecha', fechaSeleccionada)
        .or('anulado.is.null,anulado.eq.false')
        .or('es_servicio_movil.is.null,es_servicio_movil.eq.false');

      // 2. Cargar SERVICIOS MÓVILES del día
      const { data: consultasMoviles } = await supabase
        .from('consultas')
        .select(`
          forma_pago,
          detalle_consultas(precio)
        `)
        .eq('fecha', fechaSeleccionada)
        .or('anulado.is.null,anulado.eq.false')
        .eq('es_servicio_movil', true);

      // 3. Cargar gastos del día
      const { data: gastos } = await supabase
        .from('gastos')
        .select('monto')
        .eq('fecha', fechaSeleccionada);

      const totalGastos = gastos?.reduce((sum, g) => sum + g.monto, 0) || 0;
      setGastosDelDia(totalGastos);

      // 4. Procesar consultas REGULARES por forma de pago
      const cuadrePorForma: { [key: string]: CuadrePorFormaPago } = {};
      
      consultas?.forEach((consulta: any) => {
        const total = consulta.detalle_consultas?.reduce((sum: number, d: any) => sum + d.precio, 0) || 0;
        const formaPago = consulta.forma_pago;

        if (!cuadrePorForma[formaPago]) {
          cuadrePorForma[formaPago] = {
            forma_pago: formaPago,
            cantidad: 0,
            total: 0
          };
        }

        cuadrePorForma[formaPago].cantidad += 1;
        cuadrePorForma[formaPago].total += total;
      });

      // 5. Procesar SERVICIOS MÓVILES por forma de pago (POR SEPARADO)
      const cuadreMovilesPorForma: { [key: string]: CuadrePorFormaPago } = {};
      
      consultasMoviles?.forEach((consulta: any) => {
        const total = consulta.detalle_consultas?.reduce((sum: number, d: any) => sum + d.precio, 0) || 0;
        const formaPago = consulta.forma_pago || 'efectivo';

        if (!cuadreMovilesPorForma[formaPago]) {
          cuadreMovilesPorForma[formaPago] = {
            forma_pago: formaPago,
            cantidad: 0,
            total: 0
          };
        }

        cuadreMovilesPorForma[formaPago].cantidad += 1;
        cuadreMovilesPorForma[formaPago].total += total;
      });

      setVentasPorMetodo(Object.values(cuadrePorForma));
      setVentasMovilesPorMetodo(Object.values(cuadreMovilesPorForma));

    } catch (error) {
      console.error('Error al cargar ventas:', error);
    }
    setLoading(false);
  };

  const getFormaPagoNombre = (forma: string) => {
    const formas: any = {
      efectivo: 'EFECTIVO',
      tarjeta: 'TARJETA',
      transferencia: 'TRANSFERENCIA',
      efectivo_facturado: 'DEPÓSITO',
      estado_cuenta: 'ESTADO DE CUENTA',
      multiple: 'Múltiple'
    };
    return formas[forma] || forma;
  };

  // Calcular totales generales
  const totalGeneral = ventasPorMetodo.reduce((sum, m) => sum + m.total, 0);
  const totalConsultas = ventasPorMetodo.reduce((sum, m) => sum + m.cantidad, 0);
  const totalMoviles = ventasMovilesPorMetodo.reduce((sum, m) => sum + m.total, 0);
  const totalServiciosMoviles = ventasMovilesPorMetodo.reduce((sum, m) => sum + m.cantidad, 0);
  const totalNeto = totalGeneral + totalMoviles - gastosDelDia;

  return (
    <div className="mb-8">
      <div className="grid md:grid-cols-5 gap-4">
        {/* Tarjeta Principal: Total del Día */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-4 text-white hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <h3 className="font-semibold text-xs">Ventas del Día</h3>
            </div>
            <input
              type="date"
              className="px-2 py-1 border border-indigo-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-white"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
            />
          </div>
          
          {loading ? (
            <div className="text-center py-3">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold mb-1">
                Q {(totalGeneral + totalMoviles).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-indigo-100 text-xs mb-2">
                {totalConsultas + totalServiciosMoviles} servicio{(totalConsultas + totalServiciosMoviles) !== 1 ? 's' : ''} total
              </p>
              
              {totalMoviles > 0 && (
                <div className="border-t border-indigo-400 pt-2 mb-2 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-indigo-200">Consultas regulares</span>
                    <span className="font-semibold">Q {totalGeneral.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-indigo-200">Servicios móviles 📱</span>
                    <span className="font-semibold text-orange-200">Q {totalMoviles.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
              
              {gastosDelDia > 0 && (
                <div className="border-t border-indigo-400 pt-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-200">Gastos del día</span>
                    <span className="text-sm font-semibold text-red-200">
                      - Q {gastosDelDia.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-indigo-400">
                    <span className="text-xs text-indigo-200">Total Neto</span>
                    <span className={`text-lg font-bold ${totalNeto >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      Q {totalNeto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tarjetas de Métodos de Pago */}
        {loading ? (
          <div className="col-span-4 flex items-center justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : ventasPorMetodo.length === 0 && ventasMovilesPorMetodo.length === 0 ? (
          <div className="col-span-4 flex items-center justify-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-sm">No hay ventas registradas en esta fecha</p>
          </div>
        ) : (
          <>
            {/* Consultas Regulares */}
            {ventasPorMetodo.slice(0, 4).map(metodo => (
              <div key={metodo.forma_pago} className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow border-l-4 border-blue-500">
                <p className="text-gray-600 text-xs font-semibold mb-1 uppercase tracking-wide">
                  {getFormaPagoNombre(metodo.forma_pago)}
                </p>
                <p className="text-2xl font-bold text-blue-600 mb-0.5">
                  Q {metodo.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-gray-500 text-xs">
                  {metodo.cantidad} consulta{metodo.cantidad !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
            
            {/* Si hay más de 4 métodos regulares */}
            {ventasPorMetodo.length > 4 && (
              <>
                <div className="md:col-span-1"></div>
                {ventasPorMetodo.slice(4).map(metodo => (
                  <div key={metodo.forma_pago} className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow border-l-4 border-blue-500">
                    <p className="text-gray-600 text-xs font-semibold mb-1 uppercase tracking-wide">
                      {getFormaPagoNombre(metodo.forma_pago)}
                    </p>
                    <p className="text-2xl font-bold text-blue-600 mb-0.5">
                      Q {metodo.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {metodo.cantidad} consulta{metodo.cantidad !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </>
            )}

            {/* Tarjetas de Servicios Móviles */}
            {ventasMovilesPorMetodo.length > 0 && (
              <>
                <div className="col-span-5 mt-4">
                  <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    📱 Servicios Móviles
                  </h3>
                </div>
                <div className="md:col-span-1"></div>
                {ventasMovilesPorMetodo.map(metodo => (
                  <div key={`movil-${metodo.forma_pago}`} className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow border-l-4 border-orange-500">
                    <p className="text-orange-600 text-xs font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                      {getFormaPagoNombre(metodo.forma_pago)} 📱
                    </p>
                    <p className="text-2xl font-bold text-orange-600 mb-0.5">
                      Q {metodo.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {metodo.cantidad} servicio{metodo.cantidad !== 1 ? 's' : ''} móvil{metodo.cantidad !== 1 ? 'es' : ''}
                    </p>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};