import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Search, Phone, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProveedoresContabilidadPageProps {
  onBack: () => void;
}

interface Proveedor {
  id: string;
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
}

export const ProveedoresContabilidadPage: React.FC<ProveedoresContabilidadPageProps> = ({ onBack }) => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Proveedor | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre');
      setProveedores(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre) {
      alert('El nombre es requerido');
      return;
    }

    try {
      if (editando) {
        const { error } = await supabase
          .from('proveedores')
          .update(formData)
          .eq('id', editando.id);
        if (error) throw error;
        alert('Proveedor actualizado');
      } else {
        const { error } = await supabase
          .from('proveedores')
          .insert([formData]);
        if (error) throw error;
        alert('Proveedor registrado');
      }

      setShowModal(false);
      setEditando(null);
      resetForm();
      cargarProveedores();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar proveedor');
    }
  };

  const eliminarProveedor = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return;

    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      cargarProveedores();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const editarProveedor = (proveedor: Proveedor) => {
    setEditando(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      nit: proveedor.nit || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      nit: '',
      telefono: '',
      email: '',
      direccion: ''
    });
  };

  const proveedoresFiltrados = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nit?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-purple-100 mb-4 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver a Contabilidad
          </button>
          <h1 className="text-3xl font-bold">👥 Catálogo de Proveedores</h1>
          <p className="text-purple-100 mt-2">Gestión de proveedores y contactos</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  className="input-field pl-10 w-full"
                  placeholder="Buscar por nombre o NIT..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => {
                setEditando(null);
                resetForm();
                setShowModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Nuevo Proveedor
            </button>
          </div>
        </div>

        {/* Estadística */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Total de Proveedores Registrados</p>
            <p className="text-4xl font-bold text-purple-600">{proveedoresFiltrados.length}</p>
          </div>
        </div>

        {/* Lista de Proveedores */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : proveedoresFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No hay proveedores registrados</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {proveedoresFiltrados.map((proveedor) => (
              <div key={proveedor.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-purple-700 mb-1">{proveedor.nombre}</h3>
                    {proveedor.nit && (
                      <p className="text-sm text-gray-600">NIT: {proveedor.nit}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editarProveedor(proveedor)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => eliminarProveedor(proveedor.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {proveedor.telefono && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone size={16} className="text-purple-600" />
                      {proveedor.telefono}
                    </div>
                  )}
                  {proveedor.email && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail size={16} className="text-purple-600" />
                      {proveedor.email}
                    </div>
                  )}
                  {proveedor.direccion && (
                    <div className="text-gray-600 mt-2">
                      <p className="font-semibold text-xs text-gray-500 mb-1">Dirección:</p>
                      <p className="text-sm">{proveedor.direccion}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre del proveedor"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">NIT</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.nit}
                      onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                      placeholder="12345678-9"
                    />
                  </div>

                  <div>
                    <label className="label">Teléfono</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="1234-5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="proveedor@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="label">Dirección</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Dirección completa"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditando(null);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    {editando ? 'Actualizar' : 'Guardar'}
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