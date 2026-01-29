import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Edit, Eye, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductoInventario, CategoriaInventario } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ProductosInventarioPageProps {
  onBack: () => void;
}

export const ProductosInventarioPage: React.FC<ProductosInventarioPageProps> = ({ onBack }) => {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<CategoriaInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from('productos_inventario')
          .select('*, categorias_inventario(nombre)')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('categorias_inventario')
          .select('*')
          .eq('activo', true)
          .order('nombre')
      ]);

      if (prodRes.error) throw prodRes.error;
      if (catRes.error) throw catRes.error;

      setProductos(prodRes.data || []);
      setCategorias(catRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = categoriaFiltro === 'todas' || p.categoria_id === categoriaFiltro;
    return matchSearch && matchCategoria;
  });

  const handleNuevoProducto = () => {
    setProductoSeleccionado(null);
    setShowModal(true);
  };

  const handleEditarProducto = (producto: any) => {
    setProductoSeleccionado(producto);
    setShowModal(true);
  };

  if (loading) return <LoadingSpinner fullScreen text="Cargando productos..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-2">
                <ArrowLeft size={20} />
                Volver al Inventario
              </button>
              <h1 className="text-2xl font-bold">Catálogo de Productos</h1>
            </div>
            <button 
              onClick={handleNuevoProducto}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por categoría */}
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <span>📦 {productosFiltrados.length} productos</span>
            <span>⚠️ {productosFiltrados.filter(p => p.stock_actual <= p.stock_minimo).length} con stock bajo</span>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Compra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productosFiltrados.map((producto) => (
                <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {producto.codigo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500">{producto.descripcion}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producto.categorias_inventario?.nombre || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      producto.stock_actual <= producto.stock_minimo
                        ? 'bg-red-100 text-red-800'
                        : producto.stock_actual <= (producto.stock_minimo * 1.5)
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {producto.stock_actual} {producto.unidad_medida}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Mín: {producto.stock_minimo}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Q {producto.precio_compra.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producto.ubicacion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditarProducto(producto)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit size={18} />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {productosFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron productos
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast {...toast} onClose={hideToast} />}
    </div>
  );
};
