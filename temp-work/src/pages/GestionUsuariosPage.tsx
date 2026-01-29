import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, X, Users as UsersIcon } from 'lucide-react';

interface Usuario {
  username: string;
  password: string;
  nombre: string;
}

interface GestionUsuariosPageProps {
  onBack: () => void;
}

export const GestionUsuariosPage: React.FC<GestionUsuariosPageProps> = ({ onBack }) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre: ''
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = () => {
    const stored = localStorage.getItem('conrad_users');
    if (stored) {
      setUsuarios(JSON.parse(stored));
    }
  };

  const guardarUsuarios = (nuevosUsuarios: Usuario[]) => {
    localStorage.setItem('conrad_users', JSON.stringify(nuevosUsuarios));
    setUsuarios(nuevosUsuarios);
  };

  const agregarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que no exista el username
    if (usuarios.some(u => u.username === formData.username)) {
      alert('❌ El nombre de usuario ya existe');
      return;
    }

    const nuevosUsuarios = [...usuarios, formData];
    guardarUsuarios(nuevosUsuarios);
    
    setFormData({ username: '', password: '', nombre: '' });
    setShowModal(false);
    alert('✅ Usuario agregado exitosamente');
  };

  const eliminarUsuario = (username: string) => {
    if (username === 'admin') {
      alert('❌ No puedes eliminar el usuario administrador');
      return;
    }

    if (!confirm(`¿Eliminar usuario "${username}"?`)) return;

    const nuevosUsuarios = usuarios.filter(u => u.username !== username);
    guardarUsuarios(nuevosUsuarios);
    alert('✅ Usuario eliminado');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:text-blue-100 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <div className="flex items-center gap-3">
            <UsersIcon size={32} />
            <div>
              <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
              <p className="text-blue-100 mt-1">Administrar cuentas del sistema</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Usuarios del Sistema</h2>
              <p className="text-sm text-gray-600">Total: {usuarios.length} usuarios</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Agregar Usuario
            </button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contraseña</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.username} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{usuario.username}</span>
                      {usuario.username === 'admin' && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{usuario.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {'•'.repeat(usuario.password.length)}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {usuario.username !== 'admin' && (
                        <button
                          onClick={() => eliminarUsuario(usuario.username)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usuarios.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <UsersIcon size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No hay usuarios registrados</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Agregar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Agregar Usuario</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={agregarUsuario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ej: maria"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Sin espacios ni caracteres especiales</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ej: María González"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña *
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contraseña del usuario"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save size={16} />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
