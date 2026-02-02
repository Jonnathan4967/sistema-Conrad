import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Plus, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface AsistenciaPageProps {
  onBack: () => void;
}

interface Asistencia {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  horas_trabajadas: number;
  empleados?: {
    nombres: string;
    apellidos: string;
    codigo_empleado: string;
  };
}

export const AsistenciaPage: React.FC<AsistenciaPageProps> = ({ onBack }) => {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [formData, setFormData] = useState({
    empleado_id: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora_entrada: '',
    hora_salida: '',
    observaciones: ''
  });

  useEffect(() => {
    cargarEmpleados();
    cargarAsistencias();
  }, [fecha]);

  const cargarEmpleados = async () => {
    const { data } = await supabase
      .from('empleados')
      .select('id, codigo_empleado, nombres, apellidos')
      .eq('estado', 'activo')
      .order('nombres');
    setEmpleados(data || []);
  };

  const cargarAsistencias = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('asistencias')
        .select(`
          *,
          empleados(nombres, apellidos, codigo_empleado)
        `)
        .eq('fecha', fecha)
        .order('hora_entrada', { ascending: false });

      setAsistencias(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularHoras = (entrada: string, salida: string): number => {
    if (!entrada || !salida) return 0;
    const [hE, mE] = entrada.split(':').map(Number);
    const [hS, mS] = salida.split(':').map(Number);
    const minutosEntrada = hE * 60 + mE;
    const minutosSalida = hS * 60 + mS;
    return (minutosSalida - minutosEntrada) / 60;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.empleado_id || !formData.hora_entrada) {
      alert('Complete los campos requeridos');
      return;
    }

    const horas = calcularHoras(formData.hora_entrada, formData.hora_salida);

    try {
      const { error } = await supabase
        .from('asistencias')
        .insert([{
          ...formData,
          horas_trabajadas: horas
        }]);

      if (error) throw error;

      alert('Asistencia registrada');
      setShowModal(false);
      resetForm();
      cargarAsistencias();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar asistencia');
    }
  };

  const marcarSalida = async (id: string, horaEntrada: string) => {
    const horaSalida = format(new Date(), 'HH:mm');
    const horas = calcularHoras(horaEntrada, horaSalida);

    try {
      const { error } = await supabase
        .from('asistencias')
        .update({ 
          hora_salida: horaSalida,
          horas_trabajadas: horas
        })
        .eq('id', id);

      if (error) throw error;
      cargarAsistencias();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      empleado_id: '',
      fecha: format(new Date(), 'yyyy-MM-dd'),
      hora_entrada: '',
      hora_salida: '',
      observaciones: ''
    });
  };

  const totalHoras = asistencias.reduce((sum, a) => sum + (a.horas_trabajadas || 0), 0);
  const empleadosPresentes = new Set(asistencias.map(a => a.empleado_id)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-green-100 mb-4 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver a Personal
          </button>
          <h1 className="text-3xl font-bold">⏰ Control de Asistencia</h1>
          <p className="text-green-100 mt-2">Registro de entradas y salidas</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="text-green-600" size={20} />
              <input
                type="date"
                className="input-field"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 ml-auto"
            >
              <Plus size={20} />
              Marcar Asistencia
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-2">Empleados Presentes</p>
            <p className="text-4xl font-bold text-green-600">{empleadosPresentes}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-2">Total Marcajes</p>
            <p className="text-4xl font-bold text-blue-600">{asistencias.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-2">Horas Trabajadas</p>
            <p className="text-4xl font-bold text-indigo-600">
              {totalHoras.toFixed(1)}h
            </p>
          </div>
        </div>

        {/* Lista de Asistencias */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : asistencias.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No hay asistencias registradas para esta fecha</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left">Empleado</th>
                  <th className="px-6 py-3 text-left">Código</th>
                  <th className="px-6 py-3 text-center">Entrada</th>
                  <th className="px-6 py-3 text-center">Salida</th>
                  <th className="px-6 py-3 text-center">Horas</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {asistencias.map((asistencia) => (
                  <tr key={asistencia.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {asistencia.empleados?.nombres} {asistencia.empleados?.apellidos}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {asistencia.empleados?.codigo_empleado}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {asistencia.hora_entrada}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {asistencia.hora_salida ? (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                          {asistencia.hora_salida}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin marcar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      {asistencia.horas_trabajadas ? 
                        `${asistencia.horas_trabajadas.toFixed(1)}h` : 
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!asistencia.hora_salida && (
                        <button
                          onClick={() => marcarSalida(asistencia.id, asistencia.hora_entrada)}
                          className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Marcar Salida
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Marcar Asistencia</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Empleado *</label>
                  <select
                    className="input-field"
                    value={formData.empleado_id}
                    onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccione...</option>
                    {empleados.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.codigo_empleado} - {e.nombres} {e.apellidos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Fecha *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Hora Entrada *</label>
                    <input
                      type="time"
                      className="input-field"
                      value={formData.hora_entrada}
                      onChange={(e) => setFormData({ ...formData, hora_entrada: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Hora Salida</label>
                    <input
                      type="time"
                      className="input-field"
                      value={formData.hora_salida}
                      onChange={(e) => setFormData({ ...formData, hora_salida: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Observaciones</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Notas adicionales"
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
                    Registrar
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