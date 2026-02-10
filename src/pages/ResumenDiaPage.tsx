import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Package,
  FileText,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  PlusCircle,
  Shield,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GenerarCodigosPanel } from '../components/GenerarCodigosPanel';
import { generarCuadreExcel } from '../utils/cuadre-excel-generator';

interface ResumenDiaPageProps {
  onBack: () => void;
}

interface ResumenDatos {
  // Pacientes
  pacientesNuevos: number;
  consultasRegulares: number;
  consultasMoviles: number;
  totalConsultas: number;
  
  // Financiero
  ingresosConsultas: number;
  ingresosMoviles: number;
  totalIngresos: number;
  gastosDelDia: number;
  ingresoNeto: number;
  
  // Inventario
  productosAgregados: number;
  productosEditados: number;
  productosEliminados: number;
  
  // Actividad
  usuariosActivos: string[];
  accionesConAutorizacion: number;
  
  // Logs recientes
  actividadReciente: any[];
}

export const ResumenDiaPage: React.FC<ResumenDiaPageProps> = ({ onBack }) => {
  const [fecha, setFecha] = useState(() => {
    const ahora = new Date();
    const guatemalaTime = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
    return guatemalaTime.toISOString().split('T')[0];
  });
  
  const [resumen, setResumen] = useState<ResumenDatos>({
    pacientesNuevos: 0,
    consultasRegulares: 0,
    consultasMoviles: 0,
    totalConsultas: 0,
    ingresosConsultas: 0,
    ingresosMoviles: 0,
    totalIngresos: 0,
    gastosDelDia: 0,
    ingresoNeto: 0,
    productosAgregados: 0,
    productosEditados: 0,
    productosEliminados: 0,
    usuariosActivos: [],
    accionesConAutorizacion: 0,
    actividadReciente: []
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarResumen();
  }, [fecha]);

  const cargarResumen = async () => {
    setLoading(true);
    try {
      // Consultas del día
      const { data: consultas } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(id),
          detalle_consultas(precio)
        `)
        .eq('fecha', fecha)
        .or('anulado.is.null,anulado.eq.false');

      const consultasRegulares = consultas?.filter(c => !c.es_servicio_movil) || [];
      const consultasMoviles = consultas?.filter(c => c.es_servicio_movil) || [];

      // Calcular ingresos
      const ingresosConsultas = consultasRegulares.reduce((sum, c) => 
        sum + c.detalle_consultas.reduce((s: number, d: any) => s + d.precio, 0), 0
      );

      const ingresosMoviles = consultasMoviles.reduce((sum, c) => 
        sum + c.detalle_consultas.reduce((s: number, d: any) => s + d.precio, 0), 0
      );

      // Pacientes únicos nuevos del día
      const pacientesIds = new Set(consultas?.map(c => c.paciente_id));

      // Gastos del día
      const { data: gastos } = await supabase
        .from('gastos')
        .select('monto')
        .eq('fecha', fecha);

      const gastosDelDia = gastos?.reduce((sum, g) => sum + g.monto, 0) || 0;

      // Log de actividad
      const { data: logs } = await supabase
        .from('log_actividad')
        .select('*')
        .eq('fecha', fecha)
        .order('created_at', { ascending: false })
        .limit(50);

      // Usuarios activos
      const usuariosActivos = [...new Set(logs?.map(l => l.nombre_usuario) || [])];

      // Acciones con autorización
      const accionesConAutorizacion = logs?.filter(l => l.requirio_autorizacion).length || 0;

      // Actividad de inventario
      const productosAgregados = logs?.filter(l => l.modulo === 'inventario' && l.accion === 'crear').length || 0;
      const productosEditados = logs?.filter(l => l.modulo === 'inventario' && l.accion === 'editar').length || 0;
      const productosEliminados = logs?.filter(l => l.modulo === 'inventario' && l.accion === 'eliminar').length || 0;

      setResumen({
        pacientesNuevos: pacientesIds.size,
        consultasRegulares: consultasRegulares.length,
        consultasMoviles: consultasMoviles.length,
        totalConsultas: consultas?.length || 0,
        ingresosConsultas,
        ingresosMoviles,
        totalIngresos: ingresosConsultas + ingresosMoviles,
        gastosDelDia,
        ingresoNeto: (ingresosConsultas + ingresosMoviles) - gastosDelDia,
        productosAgregados,
        productosEditados,
        productosEliminados,
        usuariosActivos,
        accionesConAutorizacion,
        actividadReciente: logs?.slice(0, 20) || []
      });

    } catch (error) {
      console.error('Error al cargar resumen:', error);
      alert('Error al cargar resumen del día');
    } finally {
      setLoading(false);
    }
  };

  const descargarExcelCuadre = async () => {
    try {
      // Cargar cuadre guardado
      const { data: cuadreGuardado, error } = await supabase
        .from('cuadres_diarios')
        .select('*')
        .eq('fecha', fecha)
        .maybeSingle();

      if (error) {
        alert('❌ Error al cargar cuadre guardado');
        return;
      }

      if (!cuadreGuardado) {
        alert('⚠️ No hay cuadre guardado para esta fecha');
        return;
      }

      // Cargar consultas para obtener cuadres por forma de pago
      const { data: consultas } = await supabase
        .from('consultas')
        .select('*, detalle_consultas(precio)')
        .eq('fecha', fecha)
        .or('anulado.is.null,anulado.eq.false');

      // Calcular cuadres por forma de pago
      const cuadrePorForma: any = {};
      
      const consultasRegulares = consultas?.filter(c => !c.es_servicio_movil) || [];
      const consultasMoviles = consultas?.filter(c => c.es_servicio_movil) || [];

      // Procesar regulares
      consultasRegulares.forEach((c: any) => {
        const total = c.detalle_consultas?.reduce((sum: number, d: any) => sum + d.precio, 0) || 0;
        const forma = c.forma_pago;
        if (!cuadrePorForma[forma]) {
          cuadrePorForma[forma] = { forma_pago: forma, cantidad: 0, total: 0, es_servicio_movil: false };
        }
        cuadrePorForma[forma].cantidad++;
        cuadrePorForma[forma].total += total;
      });

      // Procesar móviles
      consultasMoviles.forEach((c: any) => {
        const total = c.detalle_consultas?.reduce((sum: number, d: any) => sum + d.precio, 0) || 0;
        const forma = c.forma_pago;
        const key = `${forma}_movil`;
        if (!cuadrePorForma[key]) {
          cuadrePorForma[key] = { forma_pago: forma, cantidad: 0, total: 0, es_servicio_movil: true };
        }
        cuadrePorForma[key].cantidad++;
        cuadrePorForma[key].total += total;
      });

      // Calcular totales
      const efectivoTotal = cuadrePorForma['efectivo']?.total || 0;
      const tarjetaTotal = cuadrePorForma['tarjeta']?.total || 0;
      const transferenciaTotal = (cuadrePorForma['efectivo_facturado']?.total || 0) + 
                                  (cuadrePorForma['transferencia']?.total || 0);

      const diferencias = {
        efectivo: cuadreGuardado.efectivo_contado - efectivoTotal,
        tarjeta: cuadreGuardado.tarjeta_contado - tarjetaTotal,
        depositado: cuadreGuardado.transferencia_contado - transferenciaTotal
      };

      const cuadreCorrecto = Math.abs(diferencias.efectivo) < 0.01 &&
                             Math.abs(diferencias.tarjeta) < 0.01 &&
                             Math.abs(diferencias.depositado) < 0.01;

      // Generar Excel
      await generarCuadreExcel({
        fecha: new Date(fecha).toLocaleDateString('es-GT'),
        horaActual: new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
        totalConsultas: consultas?.length || 0,
        totalVentas: resumen.totalIngresos,
        efectivoEsperado: efectivoTotal,
        efectivoContado: parseFloat(cuadreGuardado.efectivo_contado || 0),
        tarjetaEsperada: tarjetaTotal,
        tarjetaContado: parseFloat(cuadreGuardado.tarjeta_contado || 0),
        transferenciaEsperada: transferenciaTotal,
        transferenciaContado: parseFloat(cuadreGuardado.transferencia_contado || 0),
        diferencias,
        cuadreCorrecto,
        observaciones: cuadreGuardado.observaciones,
        cajero: cuadreGuardado.nombre_cajero,
        cuadresPorFormaPago: Object.values(cuadrePorForma).map((c: any) => ({
          forma_pago: getFormaPagoNombre(c.forma_pago),
          cantidad: c.cantidad,
          total: c.total,
          es_servicio_movil: c.es_servicio_movil
        }))
      });

      alert('✅ Excel descargado exitosamente');
    } catch (error) {
      console.error('Error al descargar Excel:', error);
      alert('❌ Error al descargar Excel');
    }
  };

  const getFormaPagoNombre = (forma: string) => {
    const formas: any = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      efectivo_facturado: 'Depósito',
      estado_cuenta: 'Estado de Cuenta'
    };
    return formas[forma] || forma;
  };

  const getIconoAccion = (accion: string) => {
    switch (accion.toLowerCase()) {
      case 'crear': return <PlusCircle className="text-green-600" size={16} />;
      case 'editar': return <Edit className="text-blue-600" size={16} />;
      case 'eliminar': return <Trash2 className="text-red-600" size={16} />;
      default: return <Activity className="text-gray-600" size={16} />;
    }
  };

  const getColorModulo = (modulo: string) => {
    const colores: { [key: string]: string } = {
      'sanatorio': 'bg-blue-100 text-blue-700',
      'inventario': 'bg-green-100 text-green-700',
      'contabilidad': 'bg-purple-100 text-purple-700',
      'personal': 'bg-orange-100 text-orange-700',
      'doctores': 'bg-indigo-100 text-indigo-700',
      'sistema': 'bg-gray-100 text-gray-700'
    };
    return colores[modulo] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button 
            onClick={onBack} 
            className="text-white hover:text-indigo-100 mb-4 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Calendar size={32} />
                Resumen del Día
              </h1>
              <p className="text-indigo-100 mt-1">Vista general de actividades y movimientos</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent text-white font-semibold text-lg border-none outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ✅ NUEVO: Botón descargar Excel */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="text-blue-600" size={24} />
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          
          <button
            onClick={descargarExcelCuadre}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <FileText size={20} />
            📥 Descargar Excel Cuadre
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Panel de Generación de Códigos */}
            <GenerarCodigosPanel />

            {/* Resumen Financiero */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users size={24} className="opacity-80" />
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-sm font-medium opacity-90">Consultas Regulares</h3>
                <p className="text-3xl font-bold mt-2">{resumen.consultasRegulares}</p>
                <p className="text-sm mt-2 opacity-80">Q {resumen.ingresosConsultas.toFixed(2)}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Activity size={24} className="opacity-80" />
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-sm font-medium opacity-90">Servicios Móviles</h3>
                <p className="text-3xl font-bold mt-2">{resumen.consultasMoviles}</p>
                <p className="text-sm mt-2 opacity-80">Q {resumen.ingresosMoviles.toFixed(2)}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign size={24} className="opacity-80" />
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-sm font-medium opacity-90">Ingresos Totales</h3>
                <p className="text-3xl font-bold mt-2">Q {resumen.totalIngresos.toFixed(2)}</p>
                <p className="text-sm mt-2 opacity-80">{resumen.totalConsultas} consultas</p>
              </div>

              <div className={`${resumen.ingresoNeto >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white rounded-lg shadow-lg p-6`}>
                <div className="flex items-center justify-between mb-2">
                  <DollarSign size={24} className="opacity-80" />
                  {resumen.ingresoNeto >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <h3 className="text-sm font-medium opacity-90">Ingreso Neto</h3>
                <p className="text-3xl font-bold mt-2">Q {resumen.ingresoNeto.toFixed(2)}</p>
                <p className="text-sm mt-2 opacity-80">Gastos: Q {resumen.gastosDelDia.toFixed(2)}</p>
              </div>
            </div>

            {/* Actividad General */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="text-indigo-600" size={24} />
                  <h3 className="font-bold text-lg">Pacientes</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Nuevos registrados:</span>
                    <span className="font-bold text-xl text-indigo-600">{resumen.pacientesNuevos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total atendidos:</span>
                    <span className="font-bold text-xl">{resumen.totalConsultas}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="text-green-600" size={24} />
                  <h3 className="font-bold text-lg">Inventario</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <PlusCircle size={16} className="text-green-600" />
                      Agregados:
                    </span>
                    <span className="font-bold">{resumen.productosAgregados}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Edit size={16} className="text-blue-600" />
                      Editados:
                    </span>
                    <span className="font-bold">{resumen.productosEditados}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Trash2 size={16} className="text-red-600" />
                      Eliminados:
                    </span>
                    <span className="font-bold">{resumen.productosEliminados}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="text-orange-600" size={24} />
                  <h3 className="font-bold text-lg">Seguridad</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Usuarios activos:</span>
                    <span className="font-bold text-xl text-orange-600">{resumen.usuariosActivos.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Autorizaciones:</span>
                    <span className="font-bold text-xl">{resumen.accionesConAutorizacion}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Usuarios Activos */}
            {resumen.usuariosActivos.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Usuarios que trabajaron hoy
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resumen.usuariosActivos.map((usuario, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                    >
                      {usuario}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Log de Actividad Reciente */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <FileText size={24} />
                  Actividad Reciente (Últimas 20 acciones)
                </h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {resumen.actividadReciente.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Activity size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay actividad registrada para este día</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {resumen.actividadReciente.map((log, idx) => (
                      <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getIconoAccion(log.accion)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{log.nombre_usuario}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColorModulo(log.modulo)}`}>
                                  {log.modulo}
                                </span>
                                {log.requirio_autorizacion && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium flex items-center gap-1">
                                    <Shield size={12} />
                                    Autorizado
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium capitalize">{log.accion}</span>
                                {' '}{log.tipo_registro}
                                {log.detalles?.descripcion && ` • ${log.detalles.descripcion}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 ml-4">
                            <Clock size={12} />
                            {log.hora}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};