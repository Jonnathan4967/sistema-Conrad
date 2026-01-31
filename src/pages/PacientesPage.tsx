import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2, Calendar, Printer, Plus, FileText, X } from 'lucide-react';
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
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAgregarEstudioModal, setShowAgregarEstudioModal] = useState(false);
  const [showEditVoucherModal, setShowEditVoucherModal] = useState(false);
  const [showEditFormaPagoModal, setShowEditFormaPagoModal] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState<any>(null);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState<any>(null);
  const [voucherEditando, setVoucherEditando] = useState('');
  const [nitEditando, setNitEditando] = useState('');
  const [formaPagoEditando, setFormaPagoEditando] = useState('');
  const [requiereFacturaEditando, setRequiereFacturaEditando] = useState(false);

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
        .order('numero_paciente', { ascending: true }); // Ordenar por número de paciente ascendente

      if (error) throw error;
      setConsultas(data || []);
    } catch (error) {
      console.error('Error al cargar consultas:', error);
      alert('Error al cargar consultas');
    }
    setLoading(false);
  };

  const eliminarConsulta = async (consultaId: string, numeroEliminado: number) => {
    const motivo = prompt('⚠️ ANULAR CONSULTA\n\n¿Por qué se anula?\n(Obligatorio para auditoría)');
    
    if (!motivo || motivo.trim() === '') {
      alert('❌ Debes dar un motivo');
      return;
    }

    if (!confirm(`¿ANULAR esta consulta?\n\nMotivo: ${motivo}\n\nQuedar registrada para auditoría.`)) {
      return;
    }

    try {
      const usuarioActual = localStorage.getItem('nombreUsuarioConrad') || 'Desconocido';
      
      const { error } = await supabase
        .from('consultas')
        .update({
          anulado: true,
          fecha_anulacion: new Date().toISOString(),
          usuario_anulo: usuarioActual,
          motivo_anulacion: motivo
        })
        .eq('id', consultaId);

      if (error) throw error;

      const { data: consultasPosteriores, error: errorConsultar } = await supabase
        .from('consultas')
        .select('id, numero_paciente')
        .eq('fecha', fecha)
        .eq('anulado', false)
        .gt('numero_paciente', numeroEliminado);

      if (errorConsultar) throw errorConsultar;

      if (consultasPosteriores && consultasPosteriores.length > 0) {
        for (const consulta of consultasPosteriores) {
          const { error: errorActualizar } = await supabase
            .from('consultas')
            .update({ numero_paciente: consulta.numero_paciente - 1 })
            .eq('id', consulta.id);
          
          if (errorActualizar) throw errorActualizar;
        }
      }

      alert(`✅ ANULADA\nUsuario: ${usuarioActual}\nMotivo: ${motivo}`);
      cargarConsultas();
    } catch (error) {
      console.error('Error al eliminar consulta:', error);
      alert('Error al eliminar consulta');
    }
  };

  const eliminarEstudio = async (consultaId: string, detalleId: string, precioEstudio: number) => {
    if (!confirm('¿Está seguro de eliminar este estudio?\n\nSe actualizará el total de la consulta automáticamente.')) {
      return;
    }

    try {
      // Verificar cuántos estudios tiene la consulta
      const consulta = consultas.find(c => c.id === consultaId);
      if (!consulta) return;

      if (consulta.detalle_consultas.length === 1) {
        alert('❌ No puedes eliminar el único estudio de la consulta.\n\nSi deseas eliminar toda la consulta, usa el botón de eliminar consulta (🗑️) en la parte superior.');
        return;
      }

      // Eliminar el detalle
      const { error: errorDetalle } = await supabase
        .from('detalle_consultas')
        .delete()
        .eq('id', detalleId);

      if (errorDetalle) throw errorDetalle;

      alert(`✅ Estudio eliminado.\n\nSe ha descontado Q ${precioEstudio.toFixed(2)} del total.`);
      cargarConsultas();
    } catch (error) {
      console.error('Error al eliminar estudio:', error);
      alert('❌ Error al eliminar estudio');
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

  const abrirEditarVoucher = (consulta: any) => {
    setConsultaSeleccionada(consulta);
    setVoucherEditando(consulta.numero_voucher || consulta.numero_factura || consulta.numero_transferencia || '');
    setNitEditando(consulta.nit || '');
    setShowEditVoucherModal(true);
  };

  const guardarVoucher = async () => {
    if (!voucherEditando.trim()) {
      alert('Ingrese el número');
      return;
    }

    try {
      // Determinar qué campo actualizar según forma de pago
      let updateData: any = {};
      if (consultaSeleccionada.forma_pago === 'tarjeta') {
        updateData.numero_voucher = voucherEditando;
      } else if (consultaSeleccionada.forma_pago === 'transferencia') {
        updateData.numero_transferencia = voucherEditando;
      } else if (consultaSeleccionada.forma_pago === 'efectivo_facturado') {
        updateData.numero_factura = voucherEditando;
        updateData.requiere_factura = true;
        // Guardar NIT si se proporcionó, sino usar C/F
        updateData.nit = nitEditando.trim() || 'C/F';
      }

      const { error } = await supabase
        .from('consultas')
        .update(updateData)
        .eq('id', consultaSeleccionada.id);

      if (error) throw error;

      alert('Información actualizada exitosamente');
      setShowEditVoucherModal(false);
      setConsultaSeleccionada(null);
      setVoucherEditando('');
      setNitEditando('');
      cargarConsultas();
    } catch (error) {
      console.error('Error al actualizar:', error);
      alert('Error al actualizar información');
    }
  };

  const abrirEditarFormaPago = (consulta: any) => {
    setConsultaSeleccionada(consulta);
    setFormaPagoEditando(consulta.forma_pago);
    setRequiereFacturaEditando(consulta.requiere_factura || false);
    setShowEditFormaPagoModal(true);
  };

  const guardarFormaPago = async () => {
    if (!formaPagoEditando) {
      alert('Seleccione una forma de pago');
      return;
    }

    try {
      const updateData: any = {
        forma_pago: formaPagoEditando,
        requiere_factura: requiereFacturaEditando
      };

      // Si cambia a una forma de pago que no requiere ciertos campos, limpiarlos
      if (formaPagoEditando !== 'tarjeta') {
        updateData.numero_voucher = null;
      }
      if (formaPagoEditando !== 'transferencia') {
        updateData.numero_transferencia = null;
      }
      if (formaPagoEditando !== 'efectivo_facturado') {
        updateData.numero_factura = null;
        if (!requiereFacturaEditando) {
          updateData.nit = null;
        }
      }

      const { error } = await supabase
        .from('consultas')
        .update(updateData)
        .eq('id', consultaSeleccionada.id);

      if (error) throw error;

      alert('✅ Forma de pago actualizada exitosamente');
      setShowEditFormaPagoModal(false);
      setConsultaSeleccionada(null);
      setFormaPagoEditando('');
      setRequiereFacturaEditando(false);
      cargarConsultas();
    } catch (error) {
      console.error('Error al actualizar forma de pago:', error);
      alert('❌ Error al actualizar forma de pago');
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
      numeroPaciente: consulta.numero_paciente,
      paciente: {
        nombre: consulta.pacientes.nombre,
        edad: consulta.pacientes.edad,
        edad_valor: consulta.pacientes.edad_valor,
        edad_tipo: consulta.pacientes.edad_tipo,
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
      numeroPaciente: consulta.numero_paciente,
      paciente: {
        nombre: consulta.pacientes.nombre,
        edad: consulta.pacientes.edad,
        edad_valor: consulta.pacientes.edad_valor,
        edad_tipo: consulta.pacientes.edad_tipo,
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
      efectivo_facturado: 'Depósito',
      estado_cuenta: 'Estado de Cuenta'
    };
    return formas[forma] || forma;
  };

  const renumerarTodosPacientes = async () => {
    if (!confirm('¿Desea renumerar todos los pacientes del día en orden de llegada?\n\nEsto organizará los números: 1, 2, 3, 4...')) {
      return;
    }

    try {
      setLoading(true);
      
      // Obtener todas las consultas del día ordenadas por created_at (orden de llegada)
      const { data: consultasOrdenadas, error: errorConsultar } = await supabase
        .from('consultas')
        .select('id, created_at')
        .eq('fecha', fecha)
        .order('created_at', { ascending: true });

      if (errorConsultar) throw errorConsultar;

      if (!consultasOrdenadas || consultasOrdenadas.length === 0) {
        alert('No hay consultas para renumerar');
        setLoading(false);
        return;
      }

      // Actualizar cada consulta con su nuevo número
      for (let i = 0; i < consultasOrdenadas.length; i++) {
        const { error: errorActualizar } = await supabase
          .from('consultas')
          .update({ numero_paciente: i + 1 })
          .eq('id', consultasOrdenadas[i].id);
        
        if (errorActualizar) throw errorActualizar;
      }

      alert(`${consultasOrdenadas.length} pacientes renumerados correctamente`);
      await cargarConsultas();
    } catch (error) {
      console.error('Error al renumerar pacientes:', error);
      alert('Error al renumerar pacientes');
    } finally {
      setLoading(false);
    }
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
        {/* Selector de fecha y búsqueda */}
        <div className="card mb-6">
          <div className="flex items-center gap-4 flex-wrap">
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
            <div className="flex-1">
              <label className="label">Buscar por Nombre</label>
              <input
                type="text"
                className="input-field"
                placeholder="Nombre del paciente..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
              />
            </div>
            <div className="ml-auto flex gap-2">
              <button 
                onClick={renumerarTodosPacientes} 
                className="btn-secondary text-sm"
                disabled={loading || consultas.length === 0}
              >
                🔢 Renumerar
              </button>
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
            {consultas.filter(c => 
              c.pacientes.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())
            ).length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-lg text-gray-600">No hay consultas para esta fecha</p>
                <p className="text-sm text-gray-500 mt-2">
                  Selecciona otra fecha o registra una nueva consulta
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {consultas
                  .filter(c => c.pacientes.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()))
                  .map((consulta, index) => {
                  const total = consulta.detalle_consultas.reduce((sum: number, d: any) => sum + d.precio, 0);
                  
                  return (
                    <div key={consulta.id} className={`card hover:shadow-lg transition-shadow ${consulta.anulado ? 'border-4 border-red-500 bg-red-50' : ''}`}>
                      {consulta.anulado && (
                        <div className="bg-red-600 text-white px-4 py-2 mb-4 rounded font-bold flex justify-between">
                          <span>🚫 ANULADA</span>
                          <button
                            onClick={() => alert(`Usuario: ${consulta.usuario_anulo}\nFecha: ${format(new Date(consulta.fecha_anulacion), 'dd/MM/yyyy HH:mm')}\nMotivo: ${consulta.motivo_anulacion}`)}
                            className="text-xs bg-white text-red-600 px-2 py-1 rounded"
                          >
                            Info
                          </button>
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className={`text-lg font-bold ${consulta.anulado ? 'text-red-700 line-through' : 'text-blue-700'}`}>
                            #{consulta.numero_paciente || (index + 1)} - {consulta.pacientes.nombre}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Edad: {consulta.pacientes.edad} años | Tel: {consulta.pacientes.telefono}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Hora: {format(new Date(consulta.created_at), 'HH:mm')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!consulta.anulado && (
                            <>
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
                            onClick={() => eliminarConsulta(consulta.id, consulta.numero_paciente)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Anular consulta"
                          >
                            <Trash2 size={18} />
                          </button>
                            </>
                          )}
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
                          <ul className="text-sm space-y-2">
                            {consulta.detalle_consultas.map((detalle: any) => (
                              <li key={detalle.id} className="flex justify-between items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100">
                                <span className="flex-1">• {detalle.sub_estudios.nombre}</span>
                                <span className="font-medium">Q {detalle.precio.toFixed(2)}</span>
                                <button
                                  onClick={() => eliminarEstudio(consulta.id, detalle.id, detalle.precio)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Eliminar estudio"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="border-t mt-4 pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-sm flex items-center gap-3 flex-wrap">
                            <span className="font-semibold">Forma de Pago:</span> 
                            <span>{getFormaPago(consulta.forma_pago)}</span>
                            <button
                              onClick={() => abrirEditarFormaPago(consulta)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar forma de pago"
                            >
                              <Edit2 size={14} />
                            </button>
                            
                            {/* Solo mostrar NIT si requiere_factura está activado */}
                            {consulta.requiere_factura && (
                              <span>
                                | <strong>NIT:</strong> {consulta.nit || 'C/F'}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-700">Q {total.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Botones para agregar info pendiente */}
                        <div className="flex gap-2 flex-wrap">
                          {/* Voucher tarjeta pendiente */}
                          {consulta.forma_pago === 'tarjeta' && !consulta.numero_voucher && (
                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded px-3 py-2">
                              <span className="text-yellow-700 font-semibold text-sm">
                                ⚠️ Voucher Pendiente
                              </span>
                              <button
                                onClick={() => abrirEditarVoucher(consulta)}
                                className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 font-semibold"
                              >
                                Agregar Voucher
                              </button>
                            </div>
                          )}

                          {/* Número transferencia pendiente */}
                          {consulta.forma_pago === 'transferencia' && !consulta.numero_transferencia && (
                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded px-3 py-2">
                              <span className="text-yellow-700 font-semibold text-sm">
                                ⚠️ No. Transferencia Pendiente
                              </span>
                              <button
                                onClick={() => abrirEditarVoucher(consulta)}
                                className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 font-semibold"
                              >
                                Agregar Número
                              </button>
                            </div>
                          )}

                          {/* Factura pendiente */}
                          {consulta.forma_pago === 'efectivo_facturado' && !consulta.numero_factura && (
                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded px-3 py-2">
                              <span className="text-yellow-700 font-semibold text-sm">
                                ⚠️ No. Factura Pendiente
                              </span>
                              <button
                                onClick={() => abrirEditarVoucher(consulta)}
                                className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 font-semibold"
                              >
                                Agregar Factura
                              </button>
                            </div>
                          )}

                          {/* Voucher agregado */}
                          {consulta.numero_voucher && (
                            <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-300 rounded px-3 py-2">
                              <span><strong>Voucher:</strong> {consulta.numero_voucher}</span>
                              <button
                                onClick={() => abrirEditarVoucher(consulta)}
                                className="p-1 text-green-700 hover:bg-green-200 rounded transition-colors"
                                title="Editar voucher"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          )}

                          {/* Transferencia agregada */}
                          {consulta.numero_transferencia && (
                            <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-300 rounded px-3 py-2">
                              <span><strong>Transferencia:</strong> {consulta.numero_transferencia}</span>
                              <button
                                onClick={() => abrirEditarVoucher(consulta)}
                                className="p-1 text-green-700 hover:bg-green-200 rounded transition-colors"
                                title="Editar número de transferencia"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          )}

                          {/* Número factura */}
                          {consulta.numero_factura && (
                            <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-300 rounded px-3 py-2">
                              <span><strong>No. Factura:</strong> {consulta.numero_factura}</span>
                              <button
                                onClick={() => abrirEditarVoucher(consulta)}
                                className="p-1 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                                title="Editar factura y NIT"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          )}
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

      {/* Modal editar voucher/factura/transferencia */}
      {showEditVoucherModal && consultaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {consultaSeleccionada.forma_pago === 'tarjeta' && 
                  (consultaSeleccionada.numero_voucher ? 'Editar Número de Voucher' : 'Agregar Número de Voucher')}
                {consultaSeleccionada.forma_pago === 'transferencia' && 
                  (consultaSeleccionada.numero_transferencia ? 'Editar Número de Transferencia' : 'Agregar Número de Transferencia')}
                {consultaSeleccionada.forma_pago === 'efectivo_facturado' && 
                  (consultaSeleccionada.numero_factura ? 'Editar Factura y NIT' : 'Agregar Factura')}
              </h2>
              <button
                onClick={() => {
                  setShowEditVoucherModal(false);
                  setConsultaSeleccionada(null);
                  setVoucherEditando('');
                  setNitEditando('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="label">
                {consultaSeleccionada.forma_pago === 'tarjeta' && 'Número de Voucher *'}
                {consultaSeleccionada.forma_pago === 'transferencia' && 'Número de Transferencia *'}
                {consultaSeleccionada.forma_pago === 'efectivo_facturado' && 'Número de Factura *'}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={
                  consultaSeleccionada.forma_pago === 'efectivo_facturado' 
                    ? 'Ej: 1234567' 
                    : 'Ej: 1234567890'
                }
                value={voucherEditando}
                onChange={(e) => setVoucherEditando(e.target.value)}
                autoFocus
              />
            </div>

            {/* Campo NIT solo para efectivo_facturado */}
            {consultaSeleccionada.forma_pago === 'efectivo_facturado' && (
              <div className="mb-4">
                <label className="label">NIT (dejar vacío para C/F)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: 12345678 o dejar vacío"
                  value={nitEditando}
                  onChange={(e) => setNitEditando(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si se deja vacío, se guardará como "C/F"
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditVoucherModal(false);
                  setConsultaSeleccionada(null);
                  setVoucherEditando('');
                  setNitEditando('');
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={guardarVoucher} className="btn-primary">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar forma de pago */}
      {showEditFormaPagoModal && consultaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Editar Forma de Pago</h2>
              <button
                onClick={() => {
                  setShowEditFormaPagoModal(false);
                  setConsultaSeleccionada(null);
                  setFormaPagoEditando('');
                  setRequiereFacturaEditando(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="label">¿Requiere Factura?</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={requiereFacturaEditando}
                    onChange={() => setRequiereFacturaEditando(true)}
                    className="mr-2"
                  />
                  Sí
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!requiereFacturaEditando}
                    onChange={() => setRequiereFacturaEditando(false)}
                    className="mr-2"
                  />
                  No
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Forma de Pago *</label>
              <select
                className="input-field"
                value={formaPagoEditando}
                onChange={(e) => setFormaPagoEditando(e.target.value)}
              >
                <option value="">Seleccione...</option>
                {requiereFacturaEditando ? (
                  <>
                    <option value="efectivo_facturado">Efectivo Facturado (Depósito)</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </>
                ) : (
                  <>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="estado_cuenta">Estado de Cuenta</option>
                  </>
                )}
              </select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-sm">
              <p className="text-yellow-800">
                <strong>Nota:</strong> Al cambiar la forma de pago, se eliminarán los números de voucher/factura/transferencia anteriores si no aplican.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditFormaPagoModal(false);
                  setConsultaSeleccionada(null);
                  setFormaPagoEditando('');
                  setRequiereFacturaEditando(false);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={guardarFormaPago} className="btn-primary">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};