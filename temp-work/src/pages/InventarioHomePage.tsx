import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertTriangle, Activity, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface InventarioHomePageProps {
  onNavigate: (page: string) => void;
}

export const InventarioHomePage: React.FC<InventarioHomePageProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProductos: 0,
    productosBajos: 0,
    valorTotal: 0,
    movimientosHoy: 0
  });
  const [productosStockBajo, setProductosStockBajo] = useState<any[]>([]);
  const [movimientosRecientes, setMovimientosRecientes] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Total productos activos
      const { count: totalProductos } = await supabase
        .from('productos_inventario')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      // Productos con stock bajo (comparar stock_actual con stock_minimo)
      const { data: todosProductos } = await supabase
        .from('productos_inventario')
        .select('*, categorias_inventario(nombre)')
        .eq('activo', true);

      // Filtrar en JavaScript los que tienen stock bajo
      const stockBajo = todosProductos
        ?.filter(p => p.stock_actual <= p.stock_minimo)
        .sort((a, b) => a.stock_actual - b.stock_actual)
        .slice(0, 5) || [];

      // Valor total del inventario
      const { data: productos } = await supabase
        .from('productos_inventario')
        .select('stock_actual, precio_compra')
        .eq('activo', true);

      const valorTotal = productos?.reduce((sum, p) => sum + (p.stock_actual * p.precio_compra), 0) || 0;

      // Movimientos de hoy
      const hoy = new Date().toISOString().split('T')[0];
      const { count: movimientosHoy } = await supabase
        .from('movimientos_inventario')
        .select('*', { count: 'exact', head: true })
        .eq('fecha', hoy);

      // Últimos movimientos
      const { data: movimientos } = await supabase
        .from('movimientos_inventario')
        .select(`
          *,
          productos_inventario(nombre, codigo)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalProductos: totalProductos || 0,
        productosBajos: stockBajo?.length || 0,
        valorTotal,
        movimientosHoy: movimientosHoy || 0
      });

      setProductosStockBajo(stockBajo || []);
      setMovimientosRecientes(movimientos || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen text="Cargando inventario..." />;

  const menuItems = [
    { id: 'productos', name: 'Productos', icon: Package, color: 'blue', description: 'Catálogo completo' },
    { id: 'movimientos', name: 'Movimientos', icon: Activity, color: 'green', description: 'Entradas y salidas' },
    { id: 'proveedores', name: 'Proveedores', icon: TrendingUp, color: 'purple', description: 'Gestión de proveedores' },
    { id: 'reportes', name: 'Reportes', icon: AlertTriangle, color: 'orange', description: 'Análisis y estadísticas' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => window.location.reload()} 
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Módulo de Inventario</h1>
              <p className="text-green-100">Control de productos y suministros</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Productos</p>
                  <p className="text-3xl font-bold">{stats.totalProductos}</p>
                </div>
                <Package className="text-white/50" size={40} />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Stock Bajo</p>
                  <p className="text-3xl font-bold text-yellow-300">{stats.productosBajos}</p>
                </div>
                <AlertTriangle className="text-yellow-300/50" size={40} />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Valor Total</p>
                  <p className="text-3xl font-bold">Q {stats.valorTotal.toFixed(2)}</p>
                </div>
                <TrendingUp className="text-white/50" size={40} />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Movimientos Hoy</p>
                  <p className="text-3xl font-bold">{stats.movimientosHoy}</p>
                </div>
                <Activity className="text-white/50" size={40} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Menú de navegación */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105"
              >
                <div className={`w-12 h-12 bg-${item.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`text-${item.color}-600`} size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Productos con stock bajo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">⚠️ Stock Bajo</h2>
              <button 
                onClick={() => onNavigate('productos')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Ver todos →
              </button>
            </div>
            
            {productosStockBajo.length > 0 ? (
              <div className="space-y-3">
                {productosStockBajo.map((producto) => (
                  <div key={producto.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{producto.nombre}</p>
                      <p className="text-sm text-gray-600">{producto.codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{producto.stock_actual}</p>
                      <p className="text-xs text-gray-500">Min: {producto.stock_minimo}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">✅ Todos los productos tienen stock adecuado</p>
            )}
          </div>

          {/* Movimientos recientes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">📋 Movimientos Recientes</h2>
              <button 
                onClick={() => onNavigate('movimientos')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Ver historial →
              </button>
            </div>

            {movimientosRecientes.length > 0 ? (
              <div className="space-y-3">
                {movimientosRecientes.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{mov.productos_inventario?.nombre}</p>
                      <p className="text-sm text-gray-600">
                        {mov.tipo_movimiento === 'entrada' ? '📥 Entrada' : 
                         mov.tipo_movimiento === 'salida' ? '📤 Salida' : 
                         mov.tipo_movimiento === 'ajuste' ? '⚙️ Ajuste' : '❌ Merma'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${mov.tipo_movimiento === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.tipo_movimiento === 'entrada' ? '+' : '-'}{mov.cantidad}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(mov.fecha).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay movimientos registrados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
