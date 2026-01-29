import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Estudio {
  id: string;
  nombre: string;
  activo: boolean;
}

interface SubEstudio {
  id: string;
  estudio_id: string;
  nombre: string;
  precio_normal: number;
  precio_social: number;
  precio_especial: number;
  activo: boolean;
}

interface ProductosPageProps {
  onBack: () => void;
}

export const ProductosPage: React.FC<ProductosPageProps> = ({ onBack }) => {
  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [subEstudios, setSubEstudios] = useState<SubEstudio[]>([]);
  const [estudioSeleccionado, setEstudioSeleccionado] = useState<string>('');
  
  // Modal estados
  const [showModalEstudio, setShowModalEstudio] = useState(false);
  const [showModalSubEstudio, setShowModalSubEstudio] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  
  // Formulario estudio
  const [nombreEstudio, setNombreEstudio] = useState('');
  
  // Formulario sub-estudio
  const [nombreSubEstudio, setNombreSubEstudio] = useState('');
  const [precioNormal, setPrecioNormal] = useState('');
  const [precioSocial, setPrecioSocial] = useState('');
  const [precioEspecial, setPrecioEspecial] = useState('');

  useEffect(() => {
    cargarEstudios();
    cargarSubEstudios();
  }, []);

  const cargarEstudios = async () => {
    const { data } = await supabase.from('estudios').select('*').order('nombre');
    setEstudios(data || []);
  };

  const cargarSubEstudios = async () => {
    const { data } = await supabase.from('sub_estudios').select('*').order('nombre');
    setSubEstudios(data || []);
  };

  const guardarEstudio = async () => {
    if (!nombreEstudio.trim()) return;

    try {
      if (editando) {
        await supabase.from('estudios').update({ nombre: nombreEstudio }).eq('id', editando.id);
      } else {
        await supabase.from('estudios').insert([{ nombre: nombreEstudio }]);
      }
      
      cargarEstudios();
      cerrarModalEstudio();
      alert('Estudio guardado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar estudio');
    }
  };

  const guardarSubEstudio = async () => {
    if (!nombreSubEstudio.trim() || !estudioSeleccionado) return;

    try {
      const data = {
        nombre: nombreSubEstudio,
        estudio_id: estudioSeleccionado,
        precio_normal: parseFloat(precioNormal),
        precio_social: parseFloat(precioSocial),
        precio_especial: parseFloat(precioEspecial),
      };

      if (editando) {
        await supabase.from('sub_estudios').update(data).eq('id', editando.id);
      } else {
        await supabase.from('sub_estudios').insert([data]);
      }
      
      cargarSubEstudios();
      cerrarModalSubEstudio();
      alert('Sub-estudio guardado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar sub-estudio');
    }
  };

  const eliminarEstudio = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este estudio?')) return;
    
    await supabase.from('estudios').update({ activo: false }).eq('id', id);
    cargarEstudios();
  };

  const eliminarSubEstudio = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este sub-estudio?')) return;
    
    await supabase.from('sub_estudios').update({ activo: false }).eq('id', id);
    cargarSubEstudios();
  };

  const abrirModalEstudio = (estudio?: Estudio) => {
    if (estudio) {
      setEditando(estudio);
      setNombreEstudio(estudio.nombre);
    }
    setShowModalEstudio(true);
  };

  const cerrarModalEstudio = () => {
    setShowModalEstudio(false);
    setEditando(null);
    setNombreEstudio('');
  };

  const abrirModalSubEstudio = (subEstudio?: SubEstudio) => {
    if (subEstudio) {
      setEditando(subEstudio);
      setNombreSubEstudio(subEstudio.nombre);
      setEstudioSeleccionado(subEstudio.estudio_id);
      setPrecioNormal(subEstudio.precio_normal.toString());
      setPrecioSocial(subEstudio.precio_social.toString());
      setPrecioEspecial(subEstudio.precio_especial.toString());
    }
    setShowModalSubEstudio(true);
  };

  const cerrarModalSubEstudio = () => {
    setShowModalSubEstudio(false);
    setEditando(null);
    setNombreSubEstudio('');
    setEstudioSeleccionado('');
    setPrecioNormal('');
    setPrecioSocial('');
    setPrecioEspecial('');
  };

  const subEstudiosFiltrados = estudioSeleccionado 
    ? subEstudios.filter(s => s.estudio_id === estudioSeleccionado && s.activo)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center gap-4">
          <button onClick={onBack} className="hover:bg-blue-600 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">Gestión de Productos</h1>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Estudios */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Estudios</h2>
              <button onClick={() => abrirModalEstudio()} className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                Nuevo
              </button>
            </div>
            
            <div className="space-y-2">
              {estudios.filter(e => e.activo).map(estudio => (
                <div key={estudio.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100">
                  <span className="font-medium">{estudio.nombre}</span>
                  <div className="flex gap-2">
                    <button onClick={() => abrirModalEstudio(estudio)} className="text-blue-600 hover:text-blue-800">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => eliminarEstudio(estudio.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-Estudios */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Sub-Estudios</h2>
              <button onClick={() => abrirModalSubEstudio()} className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                Nuevo
              </button>
            </div>

            <div className="mb-4">
              <label className="label">Filtrar por Estudio</label>
              <select 
                className="input-field"
                value={estudioSeleccionado}
                onChange={(e) => setEstudioSeleccionado(e.target.value)}
              >
                <option value="">Todos</option>
                {estudios.filter(e => e.activo).map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {subEstudiosFiltrados.map(sub => (
                <div key={sub.id} className="p-3 bg-gray-50 rounded hover:bg-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{sub.nombre}</span>
                    <div className="flex gap-2">
                      <button onClick={() => abrirModalSubEstudio(sub)} className="text-blue-600 hover:text-blue-800">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => eliminarSubEstudio(sub.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 grid grid-cols-3 gap-2">
                    <div>Normal: Q{sub.precio_normal}</div>
                    <div>Social: Q{sub.precio_social}</div>
                    <div>Especial: Q{sub.precio_especial}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Estudio */}
      {showModalEstudio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editando ? 'Editar' : 'Nuevo'} Estudio</h3>
              <button onClick={cerrarModalEstudio}><X size={24} /></button>
            </div>
            
            <div className="mb-4">
              <label className="label">Nombre del Estudio</label>
              <input
                type="text"
                className="input-field"
                value={nombreEstudio}
                onChange={(e) => setNombreEstudio(e.target.value)}
                placeholder="Ej: Rayos X"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={cerrarModalEstudio} className="btn-secondary">Cancelar</button>
              <button onClick={guardarEstudio} className="btn-primary flex items-center gap-2">
                <Save size={18} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sub-Estudio */}
      {showModalSubEstudio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editando ? 'Editar' : 'Nuevo'} Sub-Estudio</h3>
              <button onClick={cerrarModalSubEstudio}><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Estudio</label>
                <select 
                  className="input-field"
                  value={estudioSeleccionado}
                  onChange={(e) => setEstudioSeleccionado(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {estudios.filter(e => e.activo).map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Nombre del Sub-Estudio</label>
                <input
                  type="text"
                  className="input-field"
                  value={nombreSubEstudio}
                  onChange={(e) => setNombreSubEstudio(e.target.value)}
                  placeholder="Ej: Rayos X de Tórax"
                />
              </div>

              <div>
                <label className="label">Precio Normal (Q)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={precioNormal}
                  onChange={(e) => setPrecioNormal(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Precio Social (Q)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={precioSocial}
                  onChange={(e) => setPrecioSocial(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Precio Especial (Q)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={precioEspecial}
                  onChange={(e) => setPrecioEspecial(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={cerrarModalSubEstudio} className="btn-secondary">Cancelar</button>
              <button onClick={guardarSubEstudio} className="btn-primary flex items-center gap-2">
                <Save size={18} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
