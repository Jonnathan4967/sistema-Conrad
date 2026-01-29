import React, { useState, useEffect } from 'react';
import { supabaseVisitadoras } from '../../lib/supabaseVisitadoras';
import { Users, Eye, Plus, Trash2, X, Save, Stethoscope, DollarSign, Download } from 'lucide-react';

interface Visitadora {
  id: string;
  nombre: string;
  email: string;
  zona: string;
  totalVisitas?: number;
  visitasHoy?: number;
  activo: boolean;
}

interface AdminVisitadorasViewProps {
  adminUsuario: string | null;
}

export const AdminVisitadorasView: React.FC<AdminVisitadorasViewProps> = ({ adminUsuario }) => {
  const [activeTab, setActiveTab] = useState('visitadoras');
  const [visitadoras, setVisitadoras] = useState<Visitadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitadoraSeleccionada, setVisitadoraSeleccionada] = useState<string | null>(null);
  
  // Estados para agregar visitadora
  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    zona: ''
  });

  useEffect(() => {
    if (activeTab === 'visitadoras') {
      loadVisitadoras();
    }
  }, [activeTab]);

  const loadVisitadoras = async () => {
    setLoading(true);
    const { data } = await supabaseVisitadoras
      .from('profiles')
      .select('*')
      .eq('role', 'visitadora')
      .eq('activo', true)
      .order('nombre');

    if (data) {
      // Cargar estadísticas para cada visitadora
      const visitadorasConStats = await Promise.all(
        data.map(async (v: any) => {
          const { count: totalVisitas } = await supabaseVisitadoras
            .from('visitas')
            .select('*', { count: 'exact', head: true })
            .eq('visitadora_id', v.id);

          const hoy = new Date().toISOString().split('T')[0];
          const { count: visitasHoy } = await supabaseVisitadoras
            .from('visitas')
            .select('*', { count: 'exact', head: true })
            .eq('visitadora_id', v.id)
            .gte('created_at', `${hoy}T00:00:00`)
            .lte('created_at', `${hoy}T23:59:59`);

          return {
            ...v,
            totalVisitas: totalVisitas || 0,
            visitasHoy: visitasHoy || 0
          };
        })
      );
      setVisitadoras(visitadorasConStats);
    }
    setLoading(false);
  };

  const handleVerDetalle = (visitadoraId: string) => {
    setVisitadoraSeleccionada(visitadoraId);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAgregarVisitadora = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabaseVisitadoras.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            role: 'visitadora'
          }
        }
      });

      if (authError) throw authError;

      // 2. Actualizar perfil con información adicional
      const { error: profileError } = await supabaseVisitadoras
        .from('profiles')
        .update({
          nombre: formData.nombre,
          zona: formData.zona,
          role: 'visitadora'
        })
        .eq('id', authData.user?.id);

      if (profileError) throw profileError;

      alert('✅ Visitadora agregada exitosamente por ' + adminUsuario);
      setShowAgregarModal(false);
      resetForm();
      loadVisitadoras();
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarVisitadora = async (visitadoraId: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?\n\nEsta acción deshabilitará el acceso de la visitadora.`)) {
      return;
    }

    try {
      const { error } = await supabaseVisitadoras
        .from('profiles')
        .update({ activo: false })
        .eq('id', visitadoraId);

      if (error) throw error;

      alert('✅ Visitadora eliminada exitosamente por ' + adminUsuario);
      loadVisitadoras();
    } catch (error: any) {
      alert('❌ Error al eliminar: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      nombre: '',
      zona: ''
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b">
          <button
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'visitadoras'
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('visitadoras')}
          >
            <Users size={18} />
            Visitadoras
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'medicos'
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('medicos')}
          >
            <Stethoscope size={18} />
            Médicos
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'comisiones'
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('comisiones')}
          >
            <DollarSign size={18} />
            Comisiones
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'reportes'
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('reportes')}
          >
            <Download size={18} />
            Reportes
          </button>
        </div>
      </div>

      {/* Contenido */}
      {activeTab === 'visitadoras' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Visitadoras Médicas</h3>
              <p className="text-sm text-gray-600">Gestión y seguimiento de visitadoras</p>
            </div>
            <button 
              onClick={() => setShowAgregarModal(true)}
              className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
            >
              <Plus size={18} />
              Agregar Visitadora
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando...</p>
            </div>
          ) : visitadoras.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No hay visitadoras registradas</h3>
              <p>Agrega la primera visitadora para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zona</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Visitas Hoy</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Visitas</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visitadoras.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{v.nombre || 'Sin nombre'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{v.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{v.zona || 'No asignada'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {v.visitasHoy}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {v.totalVisitas}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver detalles"
                            onClick={() => handleVerDetalle(v.id)}
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                            onClick={() => handleEliminarVisitadora(v.id, v.nombre)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'medicos' && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Stethoscope size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Módulo de Médicos</h3>
          <p className="text-gray-600">En desarrollo - Próximamente</p>
        </div>
      )}

      {activeTab === 'comisiones' && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <DollarSign size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Módulo de Comisiones</h3>
          <p className="text-gray-600">En desarrollo - Próximamente</p>
        </div>
      )}

      {activeTab === 'reportes' && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Download size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Módulo de Reportes</h3>
          <p className="text-gray-600">En desarrollo - Próximamente</p>
        </div>
      )}

      {/* Modal Agregar Visitadora */}
      {showAgregarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Agregar Nueva Visitadora</h2>
              <button onClick={() => setShowAgregarModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAgregarVisitadora} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Ej: María González"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zona (opcional)</label>
                <input
                  type="text"
                  name="zona"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Ej: Zona Norte, Chimaltenango"
                  value={formData.zona}
                  onChange={handleChange}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAgregarModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  disabled={guardando}
                >
                  <Save size={16} />
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle - Placeholder */}
      {visitadoraSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Detalle de Visitadora</h2>
              <button onClick={() => setVisitadoraSeleccionada(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="text-center py-12">
              <p className="text-gray-600">Funcionalidad en desarrollo</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
