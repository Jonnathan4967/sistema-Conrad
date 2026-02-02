import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Briefcase, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ConfiguracionPageProps {
  onBack: () => void;
}

export const ConfiguracionPage: React.FC<ConfiguracionPageProps> = ({ onBack }) => {
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [tipo, setTipo] = useState<'departamento' | 'puesto'>('departamento');
  const [editando, setEditando] = useState<any>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const [dept, pues] = await Promise.all([
      supabase.from('departamentos').select('*').order('nombre'),
      supabase.from('puestos').select('*').order('nombre')
    ]);
    setDepartamentos(dept.data || []);
    setPuestos(pues.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tabla = tipo === 'departamento' ? 'departamentos' : 'puestos';

    try {
      if (editando) {
        await supabase.from(tabla).update(formData).eq('id', editando.id);
      } else {
        await supabase.from(tabla).insert([formData]);
      }
      
      setShowModal(false);
      resetForm();
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const eliminar = async (id: string, tipo: 'departamento' | 'puesto') => {
    if (!confirm('¿Eliminar este registro?')) return;
    
    const tabla = tipo === 'departamento' ? 'departamentos' : 'puestos';
    await supabase.from(tabla).delete().eq('id', id);
    cargarDatos();
  };

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '' });
    setEditando(null);
  };

  const abrirModal = (tipo: 'departamento' | 'puesto', item?: any) => {
    setTipo(tipo);
    if (item) {
      setEditando(item);
      setFormData({ nombre: item.nombre, descripcion: item.descripcion || '' });
    }
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-purple-100 mb-4 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver a Personal
          </button>
          <h1 className="text-3xl font-bold">⚙️ Configuración de Personal</h1>
          <p className="text-purple-100 mt-2">Gestión de departamentos y puestos</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Departamentos */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center bg-blue-50">
              <div className="flex items-center gap-2">
                <Building className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold">Departamentos</h2>
              </div>
              <button
                onClick={() => abrirModal('departamento')}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Nuevo
              </button>
            </div>
            
            <div className="p-4">
              {departamentos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay departamentos</p>
              ) : (
                <div className="space-y-2">
                  {departamentos.map(d => (
                    <div key={d.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100">
                      <div>
                        <p className="font-semibold">{d.nombre}</p>
                        {d.descripcion && (
                          <p className="text-sm text-gray-600">{d.descripcion}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => abrirModal('departamento', d)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => eliminar(d.id, 'departamento')}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Puestos */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center bg-green-50">
              <div className="flex items-center gap-2">
                <Briefcase className="text-green-600" size={24} />
                <h2 className="text-xl font-bold">Puestos</h2>
              </div>
              <button
                onClick={() => abrirModal('puesto')}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Nuevo
              </button>
            </div>
            
            <div className="p-4">
              {puestos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay puestos</p>
              ) : (
                <div className="space-y-2">
                  {puestos.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100">
                      <div>
                        <p className="font-semibold">{p.nombre}</p>
                        {p.descripcion && (
                          <p className="text-sm text-gray-600">{p.descripcion}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => abrirModal('puesto', p)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => eliminar(p.id, 'puesto')}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editando ? 'Editar' : 'Nuevo'} {tipo === 'departamento' ? 'Departamento' : 'Puesto'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Descripción</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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
                    Guardar
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