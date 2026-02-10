import React, { useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Package, TrendingDown, DollarSign, Users, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  generarReporteStockActual, 
  generarReporteMovimientos,
  generarReporteStockBajo,
  generarReporteValorizacion,
  generarReportePorProveedor,
  generarReporteMermas
} from '../utils/inventario-reportes-excel';

interface InventarioReportesPageProps {
  onBack: () => void;
}

export const InventarioReportesPage: React.FC<InventarioReportesPageProps> = ({ onBack }) => {
  const [generando, setGenerando] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const generarReporte = async (tipo: string, nombreReporte: string, generador: Function) => {
    setGenerando(tipo);
    try {
      let datos;
      
      switch (tipo) {
        case 'stock':
          const { data: productos } = await supabase
            .from('productos_inventario')
            .select('*, categorias_inventario(nombre)')
            .eq('activo', true)
            .order('nombre');
          datos = productos || [];
          break;

        case 'movimientos':
          if (!fechaInicio || !fechaFin) {
            alert('⚠️ Debe seleccionar fechas de inicio y fin');
            setGenerando(null);
            return;
          }
          const { data: movimientos } = await supabase
            .from('movimientos_inventario')
            .select(`
              *,
              productos_inventario(nombre, codigo),
              proveedores(nombre)
            `)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .order('fecha', { ascending: false });
          datos = { movimientos: movimientos || [], fechaInicio, fechaFin };
          break;

        case 'stockbajo':
          const { data: todosProductos } = await supabase
            .from('productos_inventario')
            .select('*, categorias_inventario(nombre)')
            .eq('activo', true);
          datos = todosProductos?.filter(p => p.stock_actual <= p.stock_minimo) || [];
          break;

        case 'valorizacion':
          const { data: productosVal } = await supabase
            .from('productos_inventario')
            .select('*, categorias_inventario(nombre)')
            .eq('activo', true);
          datos = productosVal || [];
          break;

        case 'proveedor':
          const { data: productosProveedor } = await supabase
            .from('productos_inventario')
            .select('*, categorias_inventario(nombre), proveedores(nombre)')
            .eq('activo', true)
            .order('proveedor_id');
          datos = productosProveedor || [];
          break;

        case 'mermas':
          if (!fechaInicio || !fechaFin) {
            alert('⚠️ Debe seleccionar fechas de inicio y fin');
            setGenerando(null);
            return;
          }
          const { data: mermas } = await supabase
            .from('movimientos_inventario')
            .select(`
              *,
              productos_inventario(nombre, codigo, precio_compra)
            `)
            .in('tipo_movimiento', ['merma', 'ajuste'])
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .order('fecha', { ascending: false });
          datos = { mermas: mermas || [], fechaInicio, fechaFin };
          break;
      }

      await generador(datos);
      alert(`✅ Reporte "${nombreReporte}" generado exitosamente`);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('❌ Error al generar el reporte');
    } finally {
      setGenerando(null);
    }
  };

  const reportes = [
    {
      id: 'stock',
      nombre: 'Stock Actual',
      descripcion: 'Inventario completo con cantidades actuales',
      icon: Package,
      color: 'blue',
      requiereFechas: false,
      generador: generarReporteStockActual
    },
    {
      id: 'movimientos',
      nombre: 'Movimientos',
      descripcion: 'Historial de entradas y salidas por período',
      icon: TrendingDown,
      color: 'green',
      requiereFechas: true,
      generador: generarReporteMovimientos
    },
    {
      id: 'stockbajo',
      nombre: 'Stock Bajo',
      descripcion: 'Productos que requieren reabastecimiento',
      icon: AlertTriangle,
      color: 'yellow',
      requiereFechas: false,
      generador: generarReporteStockBajo
    },
    {
      id: 'valorizacion',
      nombre: 'Valorización',
      descripcion: 'Valor económico del inventario',
      icon: DollarSign,
      color: 'purple',
      requiereFechas: false,
      generador: generarReporteValorizacion
    },
    {
      id: 'proveedor',
      nombre: 'Por Proveedor',
      descripcion: 'Productos agrupados por proveedor',
      icon: Users,
      color: 'indigo',
      requiereFechas: false,
      generador: generarReportePorProveedor
    },
    {
      id: 'mermas',
      nombre: 'Mermas y Ajustes',
      descripcion: 'Control de pérdidas y ajustes',
      icon: TrendingDown,
      color: 'red',
      requiereFechas: true,
      generador: generarReporteMermas
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">📊 Reportes de Inventario</h1>
              <p className="text-orange-100">Análisis y exportación de datos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Selector de fechas para reportes que lo requieren */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-orange-600" size={24} />
            <h2 className="text-xl font-bold">Rango de Fechas (para reportes con período)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Grid de reportes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportes.map((reporte) => {
            const Icon = reporte.icon;
            const estaGenerando = generando === reporte.id;
            
            return (
              <div
                key={reporte.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 bg-${reporte.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`text-${reporte.color}-600`} size={24} />
                </div>
                
                <h3 className="font-bold text-lg mb-2">{reporte.nombre}</h3>
                <p className="text-sm text-gray-600 mb-4">{reporte.descripcion}</p>
                
                {reporte.requiereFechas && (
                  <p className="text-xs text-orange-600 mb-3 flex items-center gap-1">
                    <Calendar size={14} />
                    Requiere rango de fechas
                  </p>
                )}
                
                <button
                  onClick={() => generarReporte(reporte.id, reporte.nombre, reporte.generador)}
                  disabled={estaGenerando}
                  className={`w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                    estaGenerando
                      ? 'bg-gray-400 cursor-not-allowed'
                      : `bg-${reporte.color}-600 hover:bg-${reporte.color}-700 text-white`
                  }`}
                >
                  {estaGenerando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet size={18} />
                      Generar Excel
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">💡 Nota sobre los reportes</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los reportes se generan en formato Excel profesional (.xlsx)</li>
            <li>• Incluyen formato de colores, bordes y fórmulas</li>
            <li>• Algunos reportes requieren seleccionar rango de fechas</li>
            <li>• Los archivos se descargan automáticamente al generarse</li>
          </ul>
        </div>
      </div>
    </div>
  );
};