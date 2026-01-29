import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Proveedor } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { sanitizeInput, validarNIT, formatearNIT } from '../utils/validation';

interface ProveedoresPageProps {
  onBack: () => void;
}

export const ProveedoresPage: React.FC<ProveedoresPageProps> = ({ onBack }) => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [proveedorAEliminar, setProveedorAEliminar] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [nit, setNit] = useState('');

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setProveedores(data || []);
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al cargar proveedores', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoProveedor = () => {
    limpiarFormulario();
    setProveedorSeleccionado(null);
    setShowModal(true);
  };

  const handleEditarProveedor = (proveedor: Proveedor) => {
    setNombre(proveedor.nombre);
    setContacto(proveedor.contacto || '');
    setTelefono(proveedor.telefono || '');
    setEmail(proveedor.email || '');
    setDireccion(proveedor.direccion || '');
    setNit(proveedor.nit || '');
    setProveedorSeleccionado(proveedor);
    setShowModal(true);
  };

  const handleGuardarProveedor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    // Validar NIT si se proporcionó
    if (nit.trim()) {
      const validacion = validarNIT(nit);
      if (!validacion.valido) {
        showToast(validacion.mensaje || 'NIT inválido', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const proveedorData = {
        nombre: sanitizeInput(nombre),
        contacto: contacto.trim() || null,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        direccion: sanitizeInput(direccion) || null,
        nit: nit.trim() ? formatearNIT(nit) : null,
        activo: true
      };

      if (proveedorSeleccionado) {
        // Actualizar
        const { error } = await supabase
          .from('proveedores')
          .update(proveedorData)
          .eq('id', proveedorSeleccionado.id);

        if (error) throw error;
        showToast('Proveedor actualizado exitosamente', 'success');
      } else {
        // Insertar
        const { error } = await supabase
          .from('proveedores')
          .insert([proveedorData]);

        if (error) throw error;
        showToast('Proveedor agregado exitosamente', 'success');
      }

      setShowModal(false);
      limpiarFormulario();
      cargarProveedores();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al guardar proveedor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarProveedor = async () => {
    if (!proveedorAEliminar) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('proveedores')
        .update({ activo: false })
        .eq('id', proveedorAEliminar);

      if (error) throw error;

      showToast('Proveedor eliminado exitosamente', 'success');
      setShowConfirmDelete(false);
      setProveedorAEliminar(null);
      cargarProveedores();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al eliminar proveedor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setNombre('');
    setContacto('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setNit('');
    setProveedorSeleccionado(null);
  };

  if (loading && proveedores.length === 0) {
    return <LoadingSpinner fullScreen text="Cargando proveedores..." />;
  }

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
              <h1 className="text-2xl font-bold">Proveedores</h1>
            </div>
            <button
              onClick={handleNuevoProveedor}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Nuevo Proveedor
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {proveedores.map((proveedor) => (
                <tr key={proveedor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{proveedor.nombre}</div>
                    {proveedor.direccion && (
                      <div className="text-sm text-gray-500">{proveedor.direccion}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {proveedor.contacto || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {proveedor.telefono || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {proveedor.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {proveedor.nit || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditarProveedor(proveedor)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setProveedorAEliminar(proveedor.id!);
                        setShowConfirmDelete(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {proveedores.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay proveedores registrados
            </div>
          )}
        </div>
      </div>

      {/* Modal de formulario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {proveedorSeleccionado ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>

            <form onSubmit={handleGuardarProveedor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Nombre *</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">Persona de Contacto</label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Teléfono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="input-field"
                    placeholder="12345678"
                  />
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="label">NIT</label>
                  <input
                    type="text"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    className="input-field"
                    placeholder="1234567-8"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Dirección</label>
                  <textarea
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="input-field"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    limpiarFormulario();
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmDelete && (
        <ConfirmDialog
          title="Eliminar Proveedor"
          message="¿Está seguro de que desea eliminar este proveedor? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          onConfirm={handleEliminarProveedor}
          onCancel={() => {
            setShowConfirmDelete(false);
            setProveedorAEliminar(null);
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast {...toast} onClose={hideToast} />}
    </div>
  );
};
