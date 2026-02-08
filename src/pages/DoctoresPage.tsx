import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Upload,
  Search,
  Filter,
  Calendar,
  User,
  Stethoscope,
  CheckCircle,
  Edit
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { InformeMedicoModal } from '../components/InformeMedicoModal';
import { ArchivosModal } from '../components/ArchivosModal';

interface DoctoresPageProps {
  onBack: () => void;
}

interface Paciente {
  id: string;
  consulta_id: string;
  nombre: string;
  edad: string;
  telefono: string;
  fecha: string;
  hora: string;
  estudios: string[];
  medico_referente: string;
  numero_paciente: number;
  tiene_informe: boolean;
  tiene_archivos: boolean;
}

type FiltroEstudio = 'TODOS' | 'RX' | 'USG' | 'TAC' | 'EKG' | 'MAMO' | 'PAP' | 'LAB';

export const DoctoresPage: React.FC<DoctoresPageProps> = ({ onBack }) => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacientesFiltrados, setPacientesFiltrados] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstudio, setFiltroEstudio] = useState<FiltroEstudio>('TODOS');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [mostrarModalInforme, setMostrarModalInforme] = useState(false);
  const [mostrarModalArchivos, setMostrarModalArchivos] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const ahora = new Date();
    const guatemalaTime = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
    const year = guatemalaTime.getFullYear();
    const month = String(guatemalaTime.getMonth() + 1).padStart(2, '0');
    const day = String(guatemalaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    cargarPacientes();
  }, [fechaSeleccionada]);

  useEffect(() => {
    filtrarPacientes();
  }, [pacientes, busqueda, filtroEstudio]);

  const cargarPacientes = async () => {
    setLoading(true);
    try {
      const { data: consultas, error } = await supabase
        .from('consultas')
        .select(`
          id,
          numero_paciente,
          fecha,
          created_at,
          medico_recomendado,
          sin_informacion_medico,
          pacientes (
            id,
            nombre,
            edad,
            edad_valor,
            edad_tipo,
            telefono
          ),
          medicos (
            nombre
          ),
          detalle_consultas (
            sub_estudios (
              nombre,
              estudios (
                nombre
              )
            )
          )
        `)
        .eq('fecha', fechaSeleccionada)
        .or('anulado.is.null,anulado.eq.false')
        .or('es_servicio_movil.is.null,es_servicio_movil.eq.false')
        .order('numero_paciente', { ascending: true });

      if (error) throw error;

      const consultasConInfo = await Promise.all(
        (consultas || []).map(async (consulta: any) => {
          const { data: informes } = await supabase
            .from('informes_medicos')
            .select('id')
            .eq('consulta_id', consulta.id)
            .limit(1);

          const { data: archivos } = await supabase
            .from('archivos_estudios')
            .select('id')
            .eq('consulta_id', consulta.id)
            .limit(1);

          return {
            consulta_id: consulta.id,
            id: consulta.pacientes.id,
            nombre: consulta.pacientes.nombre,
            edad: consulta.pacientes.edad_valor && consulta.pacientes.edad_tipo
              ? `${consulta.pacientes.edad_valor} ${consulta.pacientes.edad_tipo}`
              : `${consulta.pacientes.edad} años`,
            telefono: consulta.pacientes.telefono || '',
            fecha: consulta.fecha,
            hora: new Date(consulta.created_at).toLocaleTimeString('es-GT', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            }),
            estudios: consulta.detalle_consultas.map((d: any) => d.sub_estudios.nombre),
            medico_referente: consulta.sin_informacion_medico
              ? 'SIN INFORMACIÓN'
              : (consulta.medicos?.nombre || consulta.medico_recomendado || 'N/A'),
            numero_paciente: consulta.numero_paciente || 0,
            tiene_informe: (informes?.length || 0) > 0,
            tiene_archivos: (archivos?.length || 0) > 0
          };
        })
      );

      setPacientes(consultasConInfo);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
      alert('Error al cargar la lista de pacientes');
    } finally {
      setLoading(false);
    }
  };

  const filtrarPacientes = () => {
    let filtrados = [...pacientes];

    if (busqueda) {
      filtrados = filtrados.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.numero_paciente.toString().includes(busqueda)
      );
    }

    if (filtroEstudio !== 'TODOS') {
      filtrados = filtrados.filter(p =>
        p.estudios.some(e => e.toUpperCase().includes(filtroEstudio))
      );
    }

    setPacientesFiltrados(filtrados);
  };

  const estadisticas = {
    total: pacientesFiltrados.length,
    conInforme: pacientesFiltrados.filter(p => p.tiene_informe).length,
    conArchivos: pacientesFiltrados.filter(p => p.tiene_archivos).length,
    pendientes: pacientesFiltrados.filter(p => !p.tiene_informe).length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button 
            onClick={onBack} 
            className="text-white hover:text-blue-100 mb-4 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <div className="flex items-center gap-3">
            <Stethoscope size={32} />
            <div>
              <h1 className="text-3xl font-bold">Módulo de Doctores</h1>
              <p className="text-blue-100 mt-1">Informes médicos y gestión de estudios</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Pacientes</p>
            <p className="text-2xl font-bold text-blue-600">{estadisticas.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Con Informe</p>
            <p className="text-2xl font-bold text-green-600">{estadisticas.conInforme}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Con Archivos</p>
            <p className="text-2xl font-bold text-purple-600">{estadisticas.conArchivos}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-2xl font-bold text-orange-600">{estadisticas.pendientes}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Fecha
              </label>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline mr-2" size={16} />
                Buscar Paciente
              </label>
              <input
                type="text"
                placeholder="Nombre o número..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline mr-2" size={16} />
                Tipo de Estudio
              </label>
              <select
                value={filtroEstudio}
                onChange={(e) => setFiltroEstudio(e.target.value as FiltroEstudio)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos los estudios</option>
                <option value="RX">RX (Rayos X)</option>
                <option value="USG">USG (Ultrasonido)</option>
                <option value="TAC">TAC (Tomografía)</option>
                <option value="EKG">EKG (Electrocardiograma)</option>
                <option value="MAMO">MAMO (Mamografía)</option>
                <option value="PAP">PAP (Papanicolaou)</option>
                <option value="LAB">LAB (Laboratorio)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Pacientes */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-800">
              Pacientes del Día ({pacientesFiltrados.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : pacientesFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay pacientes para mostrar</p>
            </div>
          ) : (
            <div className="divide-y">
              {pacientesFiltrados.map((paciente) => (
                <div 
                  key={paciente.consulta_id} 
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          #{paciente.numero_paciente}
                        </span>
                        <h3 className="text-lg font-bold text-gray-800">
                          {paciente.nombre}
                        </h3>
                        <span className="text-sm text-gray-600">
                          {paciente.hora}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Edad:</span>{' '}
                          <span className="font-medium">{paciente.edad}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Teléfono:</span>{' '}
                          <span className="font-medium">{paciente.telefono || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Dr/Dra:</span>{' '}
                          <span className="font-medium">{paciente.medico_referente}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <span className="text-sm text-gray-600">Estudios:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {paciente.estudios.map((estudio, idx) => (
                            <span 
                              key={idx}
                              className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium"
                            >
                              {estudio}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {paciente.tiene_informe && (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-medium flex items-center gap-1">
                            <CheckCircle size={14} />
                            Con Informe
                          </span>
                        )}
                        {paciente.tiene_archivos && (
                          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-medium flex items-center gap-1">
                            <FileText size={14} />
                            Con Archivos
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => {
                          setPacienteSeleccionado(paciente);
                          setMostrarModalInforme(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Edit size={16} />
                        {paciente.tiene_informe ? 'Ver Informe' : 'Crear Informe'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setPacienteSeleccionado(paciente);
                          setMostrarModalArchivos(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Upload size={16} />
                        {paciente.tiene_archivos ? 'Ver Archivos' : 'Subir PDF'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {mostrarModalInforme && pacienteSeleccionado && (
        <InformeMedicoModal
          paciente={pacienteSeleccionado}
          onClose={() => {
            setMostrarModalInforme(false);
            setPacienteSeleccionado(null);
          }}
          onSaved={() => {
            setMostrarModalInforme(false);
            setPacienteSeleccionado(null);
            cargarPacientes();
          }}
        />
      )}

      {mostrarModalArchivos && pacienteSeleccionado && (
        <ArchivosModal
          paciente={pacienteSeleccionado}
          onClose={() => {
            setMostrarModalArchivos(false);
            setPacienteSeleccionado(null);
          }}
          onUploaded={() => {
            setMostrarModalArchivos(false);
            setPacienteSeleccionado(null);
            cargarPacientes();
          }}
        />
      )}
    </div>
  );
};