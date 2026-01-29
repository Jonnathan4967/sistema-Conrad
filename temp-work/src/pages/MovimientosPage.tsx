import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ArrowDownCircle, ArrowUpCircle, Settings, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductoInventario, Proveedor, TipoMovimiento } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks';
import { MENSAJES } from '../constants';

interface MovimientosPageProps {
  onBack: () => void;
}

export const MovimientosPage: React.FC<MovimientosPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const { toast, showToast, hideToast } = useToast();

  // Estados del formulario
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>('entrada');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodRes, provRes, movRes] = await Promise.all([
        supabase
          .from('productos_inventario')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('proveedores')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('movimientos_inventario')
          .select(`
            *,
            productos_inventario(nombre, codigo, unidad_medida),
            proveedores(nombre)
          `)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (prodRes.error) throw prodRes.error;
      if (provRes.error) throw provRes.error;
      if (movRes.error) throw movRes.error;

      setProductos(prodRes.data || []);
      setProveedores(provRes.data || []);
      setMovimientos(movRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productoId || !cantidad) {
      showToast('Complete los campos requeridos', 'error');
      return;
    }

    const cantidadNum = parseInt(cantidad);
    if (cantidadNum <= 0) {
      showToast('La cantidad debe ser mayor a 0', 'error');
      return;
    }

    setLoading(true);
    try {
      // Obtener stock actual del producto
      const { data: producto, error: prodError } = await supabase
        .from('productos_inventario')
        .select('stock_actual')
        .eq('id', productoId)
        .single();

      if (prodError) throw prodError;

      const stockAnterior = producto.stock_actual;
      let stockNuevo = stockAnterior;

      // Calcular nuevo stock según tipo de movimiento
      switch (tipoMovimiento) {
        case 'entrada':
          stockNuevo = stockAnterior + cantidadNum;
          break;
        case 'salida':
          if (stockAnterior < cantidadNum) {
            showToast('Stock insuficiente', 'error');
            setLoading(false);
            return;
          }
          stockNuevo = stockAnterior - cantidadNum;
          break;
        case 'ajuste':
          stockNuevo = cantidadNum; // Ajuste absoluto
          break;
        case 'merma':
          if (stockAnterior < cantidadNum) {
            showToast('Stock insuficiente', 'error');
            setLoading(false);
            return;
          }
          stockNuevo = stockAnterior - cantidadNum;
          break;
      }

      // Insertar movimiento
      const movimientoData = {
        producto_id: productoId,
        tipo_movimiento: tipoMovimiento,
        cantidad: cantidadNum,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: motivo || null,
        proveedor_id: proveedorId || null,
        costo_unitario: costoUnitario ? parseFloat(costoUnitario) : null,
        costo_total: costoUnitario ? parseFloat(costoUnitario) * cantidadNum : null,
        numero_factura: numeroFactura || null,
        usuario: 'admin', // TODO: Obtener usuario actual
        fecha: new Date().toISOString().split('T')[0]
      };

      const { error: movError } = await supabase
        .from('movimientos_inventario')
        .insert([movimientoData]);

      if (movError) throw movError;

      showToast('Movimiento registrado exitosamente', 'success');
      limpiarFormulario();
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al registrar movimiento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setProductoId('');
    setCantidad('');
    setMotivo('');
    setProveedorId('');
    setCostoUnitario('');
    setNumeroFactura('');
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return <ArrowDownCircle className="text-green-600" size={20} />;
      case 'salida': return <ArrowUpCircle className="text-red-600" size={20} />;
      case 'ajuste': return <Settings className="text-blue-600" size={20} />;
      case 'merma': return <Trash2 className="text-orange-600" size={20} />;
      default: return null;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'bg-green-100 text-green-800';
      case 'salida': return 'bg-red-100 text-red-800';
      case 'ajuste': return 'bg-blue-100 text-blue-800';
      case 'merma': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && productos.length === 0) {
    return <LoadingSpinner fullScreen text="Cargando movimientos..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver al Inventario
          </button>
          <h1 className="text-2xl font-bold">Movimientos de Inventario</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario de registro */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Registrar Movimiento</h2>

              <form onSubmit={handleRegistrarMovimiento} className="space-y-4">
                {/* Tipo de movimiento */}
                <div>
                  <label className="label">Tipo de Movimiento *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('entrada')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        tipoMovimiento === 'entrada'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      📥 Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('salida')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        tipoMovimiento === 'salida'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-red-300'
                      }`}
                    >
                      📤 Salida
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('ajuste')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        tipoMovimiento === 'ajuste'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      ⚙️ Ajuste
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('merma')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        tipoMovimiento === 'merma'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      ❌ Merma
                    </button>
                  </div>
                </div>

                {/* Producto */}
                <div>
                  <label className="label">Producto *</label>
                  <select
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Seleccione un producto</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.codigo ? `${p.codigo} - ` : ''}{p.nombre} (Stock: {p.stock_actual})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="label">
                    Cantidad * {tipoMovimiento === 'ajuste' && '(Stock final)'}
                  </label>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="input-field"
                    min="1"
                    required
                  />
                </div>

                {/* Motivo */}
                <div>
                  <label className="label">Motivo</label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="input-field"
                    rows={2}
                    placeholder="Ej: Compra mensual, Consumo paciente, etc."
                  />
                </div>

                {/* Campos adicionales para entrada */}
                {tipoMovimiento === 'entrada' && (
                  <>
                    <div>
                      <label className="label">Proveedor</label>
                      <select
                        value={proveedorId}
                        onChange={(e) => setProveedorId(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Seleccione proveedor</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Costo Unitario</label>
                      <input
                        type="number"
                        step="0.01"
                        value={costoUnitario}
                        onChange={(e) => setCostoUnitario(e.target.value)}
                        className="input-field"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="label">No. Factura</label>
                      <input
                        type="text"
                        value={numeroFactura}
                        onChange={(e) => setNumeroFactura(e.target.value)}
                        className="input-field"
                        placeholder="Ej: F-12345"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {loading ? 'Procesando...' : (
                    <>
                      <Plus size={20} />
                      Registrar Movimiento
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Historial de movimientos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Historial de Movimientos</h2>
                <p className="text-sm text-gray-600 mt-1">Últimos 20 movimientos registrados</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movimientos.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {new Date(mov.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium">{mov.productos_inventario?.nombre}</div>
                          <div className="text-gray-500">{mov.productos_inventario?.codigo}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${getTipoColor(mov.tipo_movimiento)}`}>
                            {getTipoIcon(mov.tipo_movimiento)}
                            {mov.tipo_movimiento}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={mov.tipo_movimiento === 'entrada' || mov.tipo_movimiento === 'ajuste' ? 'text-green-600' : 'text-red-600'}>
                            {mov.tipo_movimiento === 'entrada' ? '+' : mov.tipo_movimiento === 'salida' || mov.tipo_movimiento === 'merma' ? '-' : '='}{mov.cantidad}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {mov.stock_anterior} → <span className="font-bold">{mov.stock_nuevo}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {mov.motivo || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {movimientos.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No hay movimientos registrados
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast {...toast} onClose={hideToast} />}
    </div>
  );
};
