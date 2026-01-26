import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2, Calendar, Printer, Plus, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { EditarPacienteModal } from '../components/EditarPacienteModal';
import { AgregarEstudioModal } from '../components/AgregarEstudioModal';
import { generarReciboCompleto, generarReciboMedico, abrirRecibo } from '../lib/recibos';

interface PacientesPageProps {
  onBack: () => void;
}

export const PacientesPage: React.FC<PacientesPageProps> = ({ onBack }) => {
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [consultas, setConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAgregarEstudioModal, setShowAgregarEstudioModal] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState<any>(null);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState<any>(null);

  useEffect(() => {
    cargarConsultas();
  }, [fecha]);

  const cargarConsultas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(*),
          medicos(nombre),
          detalle_consultas(*, sub_estudios(nombre))
        `)
        .eq('fecha', fecha)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsultas(data || []);
    } catch (error) {
      console.error('Error al cargar consultas:', error);
      alert('Error al cargar consultas');
    }
    setLoading(false);
  };

  const eliminarConsulta = async (consultaId: string) => {
    if (!confirm('¿Está seguro de eliminar esta consulta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Primero eliminar los detalles
      const { error: errorDetalles } = await supabase
        .from('detalle_consultas')
        .delete()
        .eq('consulta_id', consultaId);

      if (errorDetalles) throw errorDetalles;

      // Luego eliminar la consulta
      const { error: errorConsulta } = await supabase
        .from('consultas')
        .delete()
        .eq('id', consultaId);

      if (errorConsulta) throw errorConsulta;

      alert('Consulta eliminada exitosamente');
      cargarConsultas();
    } catch (error) {
      console.error('Error al eliminar consulta:', error);
      alert('Error al eliminar consulta');
    }
  };

  const abrirEditarPaciente = (consulta: any) => {
    setPacienteEditando(consulta.pacientes);
    setConsultaSeleccionada(consulta);
    setShowEditModal(true);
  };

  const abrirAgregarEstudio = (consulta: any) => {
    setConsultaSeleccionada(consulta);
    setShowAgregarEstudioModal(true);
  };

  const handleGuardarPaciente = async (pacienteData: any, medicoId: string | null, medicoNombre: string | null) => {
    try {
      // Actualizar paciente
      const { error: errorPaciente } = await supabase
        .from('pacientes')
        .update({
          nombre: pacienteData.nombre,
          edad: pacienteData.edad,
          telefono: pacienteData.telefono,
          departamento: pacienteData.departamento,
          municipio: pacienteData.municipio
        })
        .eq('id', pacienteEditando.id);

      if (errorPaciente) throw errorPaciente;

      // Actualizar consulta con info del médico
      const { error: errorConsulta } = await supabase
  .from('consultas')
  .update({
    medico_id: medicoId,
    medico_recomendado: medicoNombre,
    sin_informacion_medico: !(medicoId || medicoNombre) // ✅ Si no tiene médico, marcar como sin info
  })
  .eq('id', consultaSeleccionada.id);

      if (errorConsulta) throw errorConsulta;

      alert('Paciente y médico actualizados exitosamente');
      setShowEditModal(false);
      setPacienteEditando(null);
      setConsultaSeleccionada(null);
      cargarConsultas();
    } catch (error) {
      console.error('Error al actualizar paciente:', error);
      alert('Error al actualizar paciente');
    }
  };

  const reimprimirRecibo = (consulta: any) => {
    // Si tiene médico (nombre o ID) y NO marcó "sin información", mostrar
    const tieneMedico = consulta.medicos || consulta.medico_recomendado;
    const esReferente = tieneMedico && !consulta.sin_informacion_medico;
    
    const estudiosRecibo = consulta.detalle_consultas.map((d: any) => ({
      nombre: d.sub_estudios.nombre,
      precio: d.precio
    }));

    const total = estudiosRecibo.reduce((sum: number, e: any) => sum + e.precio, 0);

    // Usar nombre del médico guardado o el médico recomendado manual
    const nombreMedico = consulta.medicos?.nombre || consulta.medico_recomendado;

    const datosRecibo = {
      paciente: {
        nombre: consulta.pacientes.nombre,
        edad: consulta.pacientes.edad,
        telefono: consulta.pacientes.telefono
      },
      medico: nombreMedico ? { nombre: nombreMedico } : undefined,
      esReferente,
      estudios: estudiosRecibo,
      total,
      formaPago: consulta.forma_pago,
      fecha: new Date(consulta.created_at),
      sinInfoMedico: consulta.sin_informacion_medico
    };

    // Preguntar qué tipo de recibo imprimir
    const tipoRecibo = confirm(
      '¿Qué recibo desea imprimir?\n\n' +
      'Aceptar (OK) = Recibo Completo (con precios)\n' +
      'Cancelar = Orden para Médico (sin precios)'
    );

    if (tipoRecibo) {
      const htmlCompleto = generarReciboCompleto(datosRecibo);
      abrirRecibo(htmlCompleto, 'Recibo Completo');
    } else {
      const htmlMedico = generarReciboMedico(datosRecibo);
      abrirRecibo(htmlMedico, 'Orden Médico');
    }
  };

  const reimprimirSoloAdicionales = (consulta: any) => {
    // Filtrar solo los estudios marcados como adicionales
    const estudiosAdicionales = consulta.detalle_consultas.filter((d: any) => d.es_adicional);

    if (estudiosAdicionales.length === 0) {
      alert('Esta consulta no tiene estudios adicionales');
      return;
    }

    // Si tiene médico (nombre o ID) y NO marcó "sin información", mostrar
    const tieneMedico = consulta.medicos || consulta.medico_recomendado;
    const esReferente = tieneMedico && !consulta.sin_informacion_medico;
    
    const estudiosRecibo = estudiosAdicionales.map((d: any) => ({
      nombre: d.sub_estudios.nombre,
      precio: d.precio
    }));

    const total = estudiosRecibo.reduce((sum: number, e: any) => sum + e.precio, 0);

    // Usar nombre del médico guardado o el médico recomendado manual
    const nombreMedico = consulta.medicos?.nombre || consulta.medico_recomendado;

    const datosRecibo = {
      paciente: {
        nombre: consulta.pacientes.nombre,
        edad: consulta.pacientes.edad,
        telefono: consulta.pacientes.telefono
      },
      medico: nombreMedico ? { nombre: nombreMedico } : undefined,
      esReferente,
      estudios: estudiosRecibo,
      total,
      formaPago: consulta.forma_pago,
      fecha: new Date(),
      sinInfoMedico: consulta.sin_informacion_medico
    };

    // Preguntar qué tipo de recibo imprimir
    const tipoRecibo = confirm(
      '¿Qué recibo desea imprimir?\n\n' +
      'Aceptar (OK) = Recibo SOLO Adicionales (con precios)\n' +
      'Cancelar = Orden para Médico SOLO Adicionales (sin precios)'
    );

    if (tipoRecibo) {
      const htmlCompleto = generarReciboCompleto(datosRecibo);
      abrirRecibo(htmlCompleto, 'Recibo Estudios Adicionales');
    } else {
      const htmlMedico = generarReciboMedico(datosRecibo);
      abrirRecibo(htmlMedico, 'Orden Médico - Adicionales');
    }
  };

  const getTipoCobro = (tipo: string) => {
    const tipos: any = { normal: 'Normal', social: 'Social', especial: 'Especial' };
    return tipos[tipo] || tipo;
  };

  const getFormaPago = (forma: string) => {
    const formas: any = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      efectivo_facturado: 'Efectivo Facturado',
      estado_cuenta: 'Estado de Cuenta'
    };
    return formas[forma] || forma;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center gap-4">
          <button onClick={onBack} className="hover:bg-blue-600 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">Gestión de Pacientes</h1>
        </div>
      </header>

      <div className="container mx-auto p-4">
        {/* Selector de fecha */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="text-blue-600" size={24} />
            <div>
              <label className="label">Seleccionar Fecha</label>
              <input
                type="date"
                className="input-field"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="ml-auto">
              <button onClick={cargarConsultas} className="btn-primary">
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de consultas */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Cargando...</p>
          </div>
        ) : (
          <>
            {consultas.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-lg text-gray-600">No hay consultas para esta fecha</p>
                <p className="text-sm text-gray-500 mt-2">
                  Selecciona otra fecha o registra una nueva consulta
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {consultas.map((consulta, index) => {
                  const total = consulta.detalle_consultas.reduce((sum: number, d: any) => sum + d.precio, 0);
                  
                  return (
                    <div key={consulta.id} className="card hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-blue-700">
                            #{index + 1} - {consulta.pacientes.nombre}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Edad: {consulta.pacientes.edad} años | Tel: {consulta.pacientes.telefono}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Hora: {format(new Date(consulta.created_at), 'HH:mm')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => abrirAgregarEstudio(consulta)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Agregar estudios"
                          >
                            <Plus size={18} />
                          </button>
                          {/* Botón para imprimir SOLO adicionales */}
                          {consulta.detalle_consultas.some((d: any) => d.es_adicional) && (
                            <button
                              onClick={() => reimprimirSoloAdicionales(consulta)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Imprimir solo adicionales"
                            >
                              <FileText size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => reimprimirRecibo(consulta)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Reimprimir recibo completo"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => abrirEditarPaciente(consulta)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar paciente"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => eliminarConsulta(consulta.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar consulta"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Información Médica</p>
                          <p className="text-sm">
                            <strong>Médico:</strong>{' '}
                            {consulta.sin_informacion_medico ? 'Sin información' : (consulta.medicos?.nombre || 'N/A')}
                          </p>
                          <p className="text-sm">
                            <strong>Tipo de Cobro:</strong>{' '}
                            <span className={`inline-block px-2 py-1 rounded text-xs ${
                              consulta.tipo_cobro === 'normal' ? 'bg-blue-100 text-blue-700' :
                              consulta.tipo_cobro === 'social' ? 'bg-green-100 text-green-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {getTipoCobro(consulta.tipo_cobro)}
                            </span>
                          </p>
                          {consulta.justificacion_especial && (
                            <p className="text-xs text-gray-600 mt-2 bg-yellow-50 p-2 rounded">
                              <strong>Justificación:</strong> {consulta.justificacion_especial}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Estudios Realizados</p>
                          <ul className="text-sm space-y-1">
                            {consulta.detalle_consultas.map((detalle: any) => (
                              <li key={detalle.id} className="flex justify-between">
                                <span>• {detalle.sub_estudios.nombre}</span>
                                <span className="font-medium">Q {detalle.precio.toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="border-t mt-4 pt-4 flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-semibold">Forma de Pago:</span> {getFormaPago(consulta.forma_pago)}
                          {consulta.requiere_factura && (
                            <span className="ml-3">
                              | <strong>NIT:</strong> {consulta.nit || 'N/A'}
                            </span>
                          )}
                          {consulta.numero_factura && (
                            <span className="ml-3">
                              | <strong>No. Factura:</strong> {consulta.numero_factura}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-700">Q {total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de edición */}
      {showEditModal && pacienteEditando && consultaSeleccionada && (
        <EditarPacienteModal
          paciente={pacienteEditando}
          consulta={consultaSeleccionada}
          onClose={() => {
            setShowEditModal(false);
            setPacienteEditando(null);
            setConsultaSeleccionada(null);
          }}
          onSave={handleGuardarPaciente}
        />
      )}

      {/* Modal de agregar estudios */}
      {showAgregarEstudioModal && consultaSeleccionada && (
        <AgregarEstudioModal
          consulta={consultaSeleccionada}
          onClose={() => {
            setShowAgregarEstudioModal(false);
            setConsultaSeleccionada(null);
          }}
          onSave={cargarConsultas}
        />
      )}
    </div>
  );
};
