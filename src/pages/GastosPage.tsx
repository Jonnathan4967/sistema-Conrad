import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Search, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface GastosPageProps {
  onBack: () => void;
}

interface Gasto {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  proveedor: string;
  forma_pago: string;
  numero_factura: string;
  categoria_id: string;
  categorias_gastos?: {
    nombre: string;
  };
}

export const GastosPage: React.FC<GastosPageProps> = ({ onBack }) => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  // Form state
  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    categoria_id: '',
    concepto: '',
    monto: '',
    proveedor: '',
    forma_pago: 'efectivo',
    numero_factura: '',
    observaciones: ''
  });

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    cargarCategorias();
    cargarGastos();
  }, [mes, anio]);

  const cargarCategorias = async () => {
    const { data } = await supabase
      .from('categorias_gastos')
      .select('*')
      .order('nombre');
    setCategorias(data || []);
  };

  const cargarGastos = async () => {
    setLoading(true);
    try {
      const primerDia = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(anio, mes, 0).toISOString().split('T')[0];

      const { data } = await supabase
        .from('gastos')
        .select(`
          *,
          categorias_gastos(nombre)
        `)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .order('fecha', { ascending: false });

      setGastos(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoria_id || !formData.concepto || !formData.monto) {
      alert('Complete los campos requeridos');
      return;
    }

    try {
      const { error } = await supabase
        .from('gastos')
        .insert([{
          ...formData,
          monto: parseFloat(formData.monto),
          usuario_registro: 'Admin' // Cambiar por usuario actual
        }]);

      if (error) throw error;

      alert('Gasto registrado exitosamente');
      setShowModal(false);
      resetForm();
      cargarGastos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar gasto');
    }
  };

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;

    try {
      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      cargarGastos();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      categoria_id: '',
      concepto: '',
      monto: '',
      proveedor: '',
      forma_pago: 'efectivo',
      numero_factura: '',
      observaciones: ''
    });
  };

  const gastosFiltrados = gastos.filter(g =>
    g.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
    g.proveedor?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalGastos = gastosFiltrados.reduce((sum, g) => sum + g.monto, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-red-100 mb-4 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver a Contabilidad
          </button>
          <h1 className="text-3xl font-bold">📉 Gestión de Gastos</h1>
          <p className="text-red-100 mt-2">Registro y control de gastos operativos</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
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
            <div className="flex-1">
              <label className="label">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Buscar por concepto o proveedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 mt-auto"
            >
              <Plus size={20} />
              Nuevo Gasto
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Total Gastos del Período</p>
            <p className="text-4xl font-bold text-red-600">
              Q {totalGastos.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Lista de Gastos */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No hay gastos registrados en este período</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gastosFiltrados.map((gasto) => (
              <div key={gasto.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{gasto.concepto}</h3>
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                        {gasto.categorias_gastos?.nombre}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-semibold">Fecha</p>
                        <p>{format(new Date(gasto.fecha), 'dd/MM/yyyy')}</p>
                      </div>
                      {gasto.proveedor && (
                        <div>
                          <p className="font-semibold">Proveedor</p>
                          <p>{gasto.proveedor}</p>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">Forma de Pago</p>
                        <p className="capitalize">{gasto.forma_pago}</p>
                      </div>
                      {gasto.numero_factura && (
                        <div>
                          <p className="font-semibold">Factura</p>
                          <p>{gasto.numero_factura}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">
                        Q {gasto.monto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button
                      onClick={() => eliminarGasto(gasto.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nuevo Gasto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Registrar Nuevo Gasto</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Fecha *</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.fecha}
                      onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Categoría *</label>
                    <select
                      className="input-field"
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                      required
                    >
                      <option value="">Seleccione...</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Concepto *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.concepto}
                    onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                    placeholder="Descripción del gasto"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Monto (Q) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={formData.monto}
                      onChange={(e) => setFormData({...formData, monto: e.target.value})}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Forma de Pago</label>
                    <select
                      className="input-field"
                      value={formData.forma_pago}
                      onChange={(e) => setFormData({...formData, forma_pago: e.target.value})}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Proveedor</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.proveedor}
                      onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                      placeholder="Nombre del proveedor"
                    />
                  </div>

                  <div>
                    <label className="label">Número de Factura</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.numero_factura}
                      onChange={(e) => setFormData({...formData, numero_factura: e.target.value})}
                      placeholder="Ej: F-12345"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Observaciones</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={formData.observaciones}
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    placeholder="Notas adicionales (opcional)"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Guardar Gasto
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};