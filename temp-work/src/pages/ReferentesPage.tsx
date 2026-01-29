import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Autocomplete } from '../components/Autocomplete';
import { departamentosGuatemala, municipiosGuatemala } from '../data/guatemala';

interface Medico {
  id: string;
  nombre: string;
  telefono: string;
  departamento: string;
  municipio: string;
  direccion: string;
  es_referente: boolean;
  activo: boolean;
}

interface ReferentesPageProps {
  onBack: () => void;
}

export const ReferentesPage: React.FC<ReferentesPageProps> = ({ onBack }) => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Medico | null>(null);
  
  // Formulario
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [direccion, setDireccion] = useState('');

  useEffect(() => {
    cargarMedicos();
  }, []);

  const cargarMedicos = async () => {
    const { data } = await supabase
      .from('medicos')
      .select('*')
      .eq('es_referente', true)
      .eq('activo', true)
      .order('nombre');
    setMedicos(data || []);
  };

  const guardarMedico = async () => {
    if (!nombre.trim() || !telefono || !departamento || !municipio || !direccion.trim()) {
      alert('Por favor complete todos los campos');
      return;
    }

    try {
      const data = {
        nombre,
        telefono,
        departamento,
        municipio,
        direccion,
        es_referente: true
      };

      if (editando) {
        await supabase.from('medicos').update(data).eq('id', editando.id);
      } else {
        await supabase.from('medicos').insert([data]);
      }
      
      cargarMedicos();
      cerrarModal();
      alert('Médico referente guardado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar médico referente');
    }
  };

  const eliminarMedico = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este médico referente?')) return;
    
    await supabase.from('medicos').update({ activo: false }).eq('id', id);
    cargarMedicos();
  };

  const abrirModal = (medico?: Medico) => {
    if (medico) {
      setEditando(medico);
      setNombre(medico.nombre);
      setTelefono(medico.telefono);
      setDepartamento(medico.departamento);
      setMunicipio(medico.municipio);
      setDireccion(medico.direccion);
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(null);
    setNombre('');
    setTelefono('');
    setDepartamento('');
    setMunicipio('');
    setDireccion('');
  };

  const municipiosFiltrados = municipiosGuatemala.filter(
    m => m.departamento_id === departamento
  );

  const getDepartamentoNombre = (id: string) => {
    return departamentosGuatemala.find(d => d.id === id)?.nombre || id;
  };

  const getMunicipioNombre = (id: string) => {
    return municipiosGuatemala.find(m => m.id === id)?.nombre || id;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center gap-4">
          <button onClick={onBack} className="hover:bg-blue-600 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">Médicos Referentes</h1>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Lista de Médicos Referentes</h2>
            <button onClick={() => abrirModal()} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              Nuevo Médico Referente
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicos.map(medico => (
              <div key={medico.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{medico.nombre}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal(medico)} className="text-blue-600 hover:text-blue-800">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => eliminarMedico(medico.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>Teléfono:</strong> {medico.telefono}</div>
                  <div><strong>Departamento:</strong> {getDepartamentoNombre(medico.departamento)}</div>
                  <div><strong>Municipio:</strong> {getMunicipioNombre(medico.municipio)}</div>
                  <div><strong>Dirección:</strong> {medico.direccion}</div>
                </div>
              </div>
            ))}
          </div>

          {medicos.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No hay médicos referentes registrados</p>
              <p className="text-sm">Haz click en "Nuevo Médico Referente" para agregar uno</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
                {editando ? 'Editar' : 'Nuevo'} Médico Referente
              </h3>
              <button onClick={cerrarModal}><X size={24} /></button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nombre Completo *</label>
                <input
                  type="text"
                  className="input-field"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Dr. Juan Pérez"
                />
              </div>

              <div>
                <label className="label">Número de Teléfono *</label>
                <input
                  type="tel"
                  className="input-field"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678"
                  maxLength={8}
                />
              </div>

              <div>
                <Autocomplete
                  label="Departamento"
                  options={departamentosGuatemala}
                  value={departamento}
                  onChange={(val) => {
                    setDepartamento(val);
                    setMunicipio('');
                  }}
                  placeholder="Seleccione departamento"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Autocomplete
                  label="Municipio"
                  options={municipiosFiltrados}
                  value={municipio}
                  onChange={setMunicipio}
                  placeholder="Seleccione municipio"
                  disabled={!departamento}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Dirección Completa *</label>
                <textarea
                  className="input-field"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Zona 10, Edificio X, Oficina Y"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={cerrarModal} className="btn-secondary">Cancelar</button>
              <button onClick={guardarMedico} className="btn-primary flex items-center gap-2">
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
