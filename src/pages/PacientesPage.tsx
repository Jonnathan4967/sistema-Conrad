import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2, Calendar, Printer, Plus, FileText, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { EditarPacienteModal } from '../components/EditarPacienteModal';
import { AgregarEstudioModal } from '../components/AgregarEstudioModal';
import { AutorizacionModal } from '../components/AutorizacionModal'; // ✅ NUEVO
import { generarReciboCompleto, generarReciboMedico, abrirRecibo } from '../lib/recibos';

interface PacientesPageProps {
  onBack: () => void;
}

export const PacientesPage: React.FC<PacientesPageProps> = ({ onBack }) => {
  // ✅ FUNCIÓN HELPER - Obtener fecha en zona horaria de Guatemala (GMT-6)
  const getFechaGuatemala = () => {
    const ahora = new Date();
    const guatemalaTime = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
    return format(guatemalaTime, 'yyyy-MM-dd');
  };

  const [fecha, setFecha] = useState(getFechaGuatemala()); // ✅ CORREGIDO
  const [consultas, setConsultas] = useState<any[]>([]);
  const [consultasAnuladas, setConsultasAnuladas] = useState<any[]>([]);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [pestanaActiva, setPestanaActiva] = useState<'todos' | 'regulares' | 'moviles' | 'anuladas'>('regulares');
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
  const [showModalTipoRecibo, setShowModalTipoRecibo] = useState(false);
  const [datosReciboTemp, setDatosReciboTemp] = useState<any>(null);

  // ✅ NUEVO: Estados para autorización
  const [mostrarAutorizacion, setMostrarAutorizacion] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<{
    tipo: 'eliminar_consulta' | 'editar_paciente' | 'eliminar_estudio';
    datos: any;
  } | null>(null);

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
        .order('numero_paciente', { ascending: true });

      if (error) throw error;
      
      const activas = (data || []).filter(c => !c.anulado);
      const anuladas = (data || []).filter(c => c.anulado);
      
      setConsultas(activas);
      setConsultasAnuladas(anuladas);
    } catch (error) {
      console.error('Error al cargar consultas:', error);
      alert('Error al cargar consultas');
    }
    setLoading(false);
  };

  // ✅ NUEVO: Solicitar autorización para eliminar consulta
  const solicitarEliminarConsulta = (consultaId: string, numeroEliminado: number | null, nombrePaciente: string) => {
    setAccionPendiente({
      tipo: 'eliminar_consulta',
      datos: { consultaId, numeroEliminado, nombrePaciente }
    });
    setMostrarAutorizacion(true);
  };

  // ✅ MODIFICADO: Eliminar consulta (ejecuta después de autorización)
  const eliminarConsulta = async () => {
    if (!accionPendiente || accionPendiente.tipo !== 'eliminar_consulta') return;

    const { consultaId, numeroEliminado, nombrePaciente } = accionPendiente.datos;

    const motivo = prompt('⚠️ ANULAR CONSULTA\n\n¿Por qué se anula?\n(Obligatorio para auditoría)');
    
    if (!motivo || motivo.trim() === '') {
      alert('❌ Debes dar un motivo');
      setMostrarAutorizacion(false);
      setAccionPendiente(null);
      return;
    }

    const mensajeConfirmacion = numeroEliminado 
      ? `¿ANULAR esta consulta?\n\nMotivo: ${motivo}\n\nLos pacientes posteriores se renumerarán automáticamente.`
      : `¿ANULAR este servicio móvil?\n\nMotivo: ${motivo}`;

    if (!confirm(mensajeConfirmacion)) {
      setMostrarAutorizacion(false);
      setAccionPendiente(null);
      return;
    }

    try {
      const usuarioActual = sessionStorage.getItem('nombreUsuarioConrad') || 'Desconocido';
      
      const { error } = await supabase
        .from('consultas')
        .update({
          anulado: true,
          numero_paciente: null,
          fecha_anulacion: new Date().toISOString(),
          usuario_anulo: usuarioActual,
          motivo_anulacion: motivo
        })
        .eq('id', consultaId);

      if (error) throw error;

      let consultasPosteriores: any[] = [];
      
      if (numeroEliminado !== null && numeroEliminado !== undefined) {
        const { data, error: errorConsultar } = await supabase
          .from('consultas')
          .select('id, numero_paciente')
          .eq('fecha', fecha)
          .or('anulado.is.null,anulado.eq.false')
          .gt('numero_paciente', numeroEliminado)
          .order('numero_paciente', { ascending: true });

        if (errorConsultar) throw errorConsultar;
        consultasPosteriores = data || [];

        if (consultasPosteriores.length > 0) {
          for (const consulta of consultasPosteriores) {
            const { error: errorActualizar } = await supabase
              .from('consultas')
              .update({ numero_paciente: consulta.numero_paciente - 1 })
              .eq('id', consulta.id);
            
            if (errorActualizar) throw errorActualizar;
          }
        }
      }

      // ✅ Registrar en log
      const usuario = sessionStorage.getItem('usernameConrad') || '';
      const nombreUsuario = sessionStorage.getItem('nombreUsuarioConrad') || '';
      const rol = sessionStorage.getItem('rolUsuarioConrad') || '';

      await supabase.rpc('registrar_actividad', {
        p_usuario: usuario,
        p_nombre_usuario: nombreUsuario,
        p_rol: rol,
        p_modulo: 'sanatorio',
        p_accion: 'anular',
        p_tipo_registro: 'consulta',
        p_registro_id: consultaId,
        p_detalles: {
          paciente: nombrePaciente,
          motivo: motivo,
          numero_paciente: numeroEliminado
        },
        p_requirio_autorizacion: true
      });

      const mensajeExito = numeroEliminado
        ? `✅ CONSULTA ANULADA\n\nUsuario: ${usuarioActual}\nMotivo: ${motivo}\n\n${consultasPosteriores.length} pacientes renumerados.`
        : `✅ SERVICIO MÓVIL ANULADO\n\nUsuario: ${usuarioActual}\nMotivo: ${motivo}`;

      alert(mensajeExito);
      cargarConsultas();
      setMostrarAutorizacion(false);
      setAccionPendiente(null);
    } catch (error) {
      console.error('Error al eliminar consulta:', error);
      alert('Error al eliminar consulta');
    }
  };

  // ✅ NUEVO: Solicitar autorización para eliminar estudio
  const solicitarEliminarEstudio = (consultaId: string, detalleId: string, precioEstudio: number, nombreEstudio: string, nombrePaciente: string) => {
    setAccionPendiente({
      tipo: 'eliminar_estudio',
      datos: { consultaId, detalleId, precioEstudio, nombreEstudio, nombrePaciente }
    });
    setMostrarAutorizacion(true);
  };

  // ✅ MODIFICADO: Eliminar estudio (ejecuta después de autorización)
  const eliminarEstudio = async () => {
    if (!accionPendiente || accionPendiente.tipo !== 'eliminar_estudio') return;

    const { consultaId, detalleId, precioEstudio } = accionPendiente.datos;

    try {
      const consulta = consultas.find(c => c.id === consultaId);
      if (!consulta) return;

      if (consulta.detalle_consultas.length === 1) {
        alert('❌ No puedes eliminar el único estudio de la consulta.\n\nSi deseas eliminar toda la consulta, usa el botón de eliminar consulta (🗑️) en la parte superior.');
        setMostrarAutorizacion(false);
        setAccionPendiente(null);
        return;
      }

      const { error: errorDetalle } = await supabase
        .from('detalle_consultas')
        .delete()
        .eq('id', detalleId);

      if (errorDetalle) throw errorDetalle;

      // ✅ Registrar en log
      const usuario = sessionStorage.getItem('usernameConrad') || '';
      const nombreUsuario = sessionStorage.getItem('nombreUsuarioConrad') || '';
      const rol = sessionStorage.getItem('rolUsuarioConrad') || '';

      await supabase.rpc('registrar_actividad', {
        p_usuario: usuario,
        p_nombre_usuario: nombreUsuario,
        p_rol: rol,
        p_modulo: 'sanatorio',
        p_accion: 'eliminar',
        p_tipo_registro: 'estudio',
        p_registro_id: detalleId,
        p_detalles: {
          paciente: accionPendiente.datos.nombrePaciente,
          estudio: accionPendiente.datos.nombreEstudio,
          precio: precioEstudio
        },
        p_requirio_autorizacion: true
      });

      alert(`✅ Estudio eliminado.\n\nSe ha descontado Q ${precioEstudio.toFixed(2)} del total.`);
      cargarConsultas();
      setMostrarAutorizacion(false);
      setAccionPendiente(null);
    } catch (error) {
      console.error('Error al eliminar estudio:', error);
      alert('❌ Error al eliminar estudio');
    }
  };

  // ✅ NUEVO: Solicitar autorización para editar paciente
  const solicitarEditarPaciente = (consulta: any) => {
    setAccionPendiente({
      tipo: 'editar_paciente',
      datos: { consulta }
    });
    setMostrarAutorizacion(true);
  };

  // ✅ MODIFICADO: Abrir modal editar (ejecuta después de autorización)
  const abrirEditarPaciente = () => {
    if (!accionPendiente || accionPendiente.tipo !== 'editar_paciente') return;

    const { consulta } = accionPendiente.datos;
    setPacienteEditando(consulta.pacientes);
    setConsultaSeleccionada(consulta);
    setShowEditModal(true);
    setMostrarAutorizacion(false);
    setAccionPendiente(null);
  };

  const abrirAgregarEstudio = (consulta: any) => {
    // ✅ NO REQUIERE AUTORIZACIÓN
    setConsultaSeleccionada(consulta);
    setShowAgregarEstudioModal(true);
  };

  const handleGuardarPaciente = async (pacienteData: any, medicoId: string | null, medicoNombre: string | null) => {
    try {
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

      const { error: errorConsulta } = await supabase
        .from('consultas')
        .update({
          medico_id: medicoId,
          medico_recomendado: medicoNombre,
          sin_informacion_medico: !(medicoId || medicoNombre)
        })
        .eq('id', consultaSeleccionada.id);

      if (errorConsulta) throw errorConsulta;

      // ✅ Registrar en log
      const usuario = sessionStorage.getItem('usernameConrad') || '';
      const nombreUsuario = sessionStorage.getItem('nombreUsuarioConrad') || '';
      const rol = sessionStorage.getItem('rolUsuarioConrad') || '';

      await supabase.rpc('registrar_actividad', {
        p_usuario: usuario,
        p_nombre_usuario: nombreUsuario,
        p_rol: rol,
        p_modulo: 'sanatorio',
        p_accion: 'editar',
        p_tipo_registro: 'paciente',
        p_registro_id: pacienteEditando.id,
        p_detalles: {
          nombre: pacienteData.nombre,
          edad: pacienteData.edad,
          medico: medicoNombre || 'Sin médico'
        },
        p_requirio_autorizacion: true
      });

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
      let updateData: any = {};
      if (consultaSeleccionada.forma_pago === 'tarjeta') {
        updateData.numero_voucher = voucherEditando;
      } else if (consultaSeleccionada.forma_pago === 'transferencia') {
        updateData.numero_transferencia = voucherEditando;
      } else if (consultaSeleccionada.forma_pago === 'efectivo_facturado') {
        updateData.numero_factura = voucherEditando;
        updateData.requiere_factura = true;
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
    const tieneMedico = consulta.medicos || consulta.medico_recomendado;
    const esReferente = tieneMedico && !consulta.sin_informacion_medico;
    
    const estudiosRecibo = consulta.detalle_consultas.map((d: any) => ({
      nombre: d.sub_estudios.nombre,
      precio: d.precio,
      comentarios: d.comentarios || undefined
    }));

    const total = estudiosRecibo.reduce((sum: number, e: any) => sum + e.precio, 0);
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

    setDatosReciboTemp(datosRecibo);
    setShowModalTipoRecibo(true);
  };

  const reimprimirSoloAdicionales = (consulta: any) => {
    const estudiosAdicionales = consulta.detalle_consultas.filter((d: any) => d.es_adicional);

    if (estudiosAdicionales.length === 0) {
      alert('Esta consulta no tiene estudios adicionales');
      return;
    }

    const tieneMedico = consulta.medicos || consulta.medico_recomendado;
    const esReferente = tieneMedico && !consulta.sin_informacion_medico;
    
    const estudiosRecibo = estudiosAdicionales.map((d: any) => ({
      nombre: d.sub_estudios.nombre,
      precio: d.precio
    }));

    const total = estudiosRecibo.reduce((sum: number, e: any) => sum + e.precio, 0);
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

    setDatosReciboTemp(datosRecibo);
    setShowModalTipoRecibo(true);
  };

  const imprimirReciboSeleccionado = (tipoRecibo: 'completo' | 'medico') => {
    if (!datosReciboTemp) return;

    if (tipoRecibo === 'completo') {
      const htmlCompleto = generarReciboCompleto(datosReciboTemp);
      abrirRecibo(htmlCompleto, 'Recibo Completo');
    } else {
      const htmlMedico = generarReciboMedico(datosReciboTemp);
      abrirRecibo(htmlMedico, 'Orden Médico');
    }

    setShowModalTipoRecibo(false);
    setDatosReciboTemp(null);
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
      
      const { data: consultasOrdenadas, error: errorConsultar } = await supabase
        .from('consultas')
        .select('id, created_at')
        .eq('fecha', fecha)
        .or('anulado.is.null,anulado.eq.false')
        .order('created_at', { ascending: true });

      if (errorConsultar) throw errorConsultar;

      if (!consultasOrdenadas || consultasOrdenadas.length === 0) {
        alert('No hay consultas para renumerar');
        setLoading(false);
        return;
      }

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

  // ✅ NUEVO: Ejecutar acción autorizada
  const ejecutarAccionAutorizada = () => {
    if (!accionPendiente) return;

    switch (accionPendiente.tipo) {
      case 'eliminar_consulta':
        eliminarConsulta();
        break;
      case 'editar_paciente':
        abrirEditarPaciente();
        break;
      case 'eliminar_estudio':
        eliminarEstudio();
        break;
    }
  };

  // ✅ NUEVO: Obtener descripción para modal
  const getDescripcionAccion = () => {
    if (!accionPendiente) return '';

    switch (accionPendiente.tipo) {
      case 'eliminar_consulta':
        return `${accionPendiente.datos.nombrePaciente}${accionPendiente.datos.numeroEliminado ? ` - #${accionPendiente.datos.numeroEliminado}` : ' - Servicio Móvil'}`;
      case 'editar_paciente':
        return `${accionPendiente.datos.consulta.pacientes.nombre} - ${accionPendiente.datos.consulta.pacientes.edad} años`;
      case 'eliminar_estudio':
        return `${accionPendiente.datos.nombreEstudio} - Paciente: ${accionPendiente.datos.nombrePaciente}`;
      default:
        return '';
    }
  };

  const getNombreAccion = () => {
    if (!accionPendiente) return '';
    
    switch (accionPendiente.tipo) {
      case 'eliminar_consulta':
        return 'Anular Consulta';
      case 'editar_paciente':
        return 'Editar Paciente';
      case 'eliminar_estudio':
        return 'Eliminar Estudio';
      default:
        return '';
    }
  };

  const renderConsulta = (consulta: any, index: number) => {
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
              Ver Información
            </button>
          </div>
        )}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`text-lg font-bold ${consulta.anulado ? 'text-red-700 line-through' : consulta.es_servicio_movil ? 'text-purple-700' : 'text-blue-700'}`}>
                {consulta.anulado 
                  ? '#ANULADO' 
                  : consulta.es_servicio_movil 
                    ? '📱 MÓVIL'
                    : `#${consulta.numero_paciente || (index + 1)}`
                } - {consulta.pacientes.nombre}
              </h3>
              {consulta.es_servicio_movil && (
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full border border-purple-300">
                  Sin número
                </span>
              )}
            </div>
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
                {/* ✅ MODIFICADO: Solicitar autorización para editar */}
                <button
                  onClick={() => solicitarEditarPaciente(consulta)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Editar paciente"
                >
                  <Edit2 size={18} />
                </button>
                {/* ✅ MODIFICADO: Solicitar autorización para eliminar */}
                <button
                  onClick={() => solicitarEliminarConsulta(consulta.id, consulta.numero_paciente, consulta.pacientes.nombre)}
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
                <li key={detalle.id} className="p-2 bg-gray-50 rounded hover:bg-gray-100">
                  <div className="flex justify-between items-center gap-2">
                    <span className="flex-1">• {detalle.sub_estudios.nombre}</span>
                    <span className="font-medium">Q {detalle.precio.toFixed(2)}</span>
                    {/* ✅ MODIFICADO: Solicitar autorización para eliminar estudio */}
                    {!consulta.anulado && (
                      <button
                        onClick={() => solicitarEliminarEstudio(
                          consulta.id, 
                          detalle.id, 
                          detalle.precio, 
                          detalle.sub_estudios.nombre,
                          consulta.pacientes.nombre
                        )}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar estudio"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {detalle.comentarios && detalle.comentarios.trim() !== '' && (
                    <div className="text-xs text-gray-600 mt-1 ml-4 p-2 bg-blue-50 rounded">
                      <strong>📝 Comentarios:</strong> {detalle.comentarios}
                    </div>
                  )}
                  {detalle.numero_factura && (
                    <div className="text-xs text-gray-600 mt-1 ml-4">
                      <span className="bg-blue-100 px-2 py-1 rounded">
                        Factura: {detalle.numero_factura} {detalle.nit && `| NIT: ${detalle.nit}`}
                      </span>
                    </div>
                  )}
                  {detalle.numero_voucher && (
                    <div className="text-xs text-gray-600 mt-1 ml-4">
                      <span className="bg-green-100 px-2 py-1 rounded">
                        Voucher: {detalle.numero_voucher}
                      </span>
                    </div>
                  )}
                  {detalle.numero_transferencia && (
                    <div className="text-xs text-gray-600 mt-1 ml-4">
                      <span className="bg-purple-100 px-2 py-1 rounded">
                        Transferencia: {detalle.numero_transferencia}
                      </span>
                    </div>
                  )}
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
              {!consulta.anulado && (
                <button
                  onClick={() => abrirEditarFormaPago(consulta)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Editar forma de pago"
                >
                  <Edit2 size={14} />
                </button>
              )}
              
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

          {!consulta.anulado && (
            <div className="flex gap-2 flex-wrap">
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
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <button onClick={onBack} className="flex items-center gap-2 text-white hover:text-blue-100 mb-4 transition-colors">
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">Gestión de Pacientes</h1>
          <p className="text-blue-100 mt-2">Consultas y seguimiento del día</p>
        </div>
      </header>

      <div className="container mx-auto p-4">
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

        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setPestanaActiva('regulares')}
            className={`px-6 py-3 font-medium transition-colors ${
              pestanaActiva === 'regulares'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            👥 Pacientes Regulares
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {consultas.filter(c => !c.es_servicio_movil).length}
            </span>
          </button>
          <button
            onClick={() => setPestanaActiva('moviles')}
            className={`px-6 py-3 font-medium transition-colors ${
              pestanaActiva === 'moviles'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            📱 Servicios Móviles
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              {consultas.filter(c => c.es_servicio_movil).length}
            </span>
          </button>
          <button
            onClick={() => setPestanaActiva('todos')}
            className={`px-6 py-3 font-medium transition-colors ${
              pestanaActiva === 'todos'
                ? 'border-b-2 border-gray-600 text-gray-600'
                : 'text-gray-500 hover:text-gray-600'
            }`}
          >
            📋 Todos
            <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {consultas.length}
            </span>
          </button>
          <button
            onClick={() => setPestanaActiva('anuladas')}
            className={`px-6 py-3 font-medium transition-colors ${
              pestanaActiva === 'anuladas'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-500 hover:text-red-600'
            }`}
          >
            🚫 Anuladas
            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
              {consultasAnuladas.length}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Cargando...</p>
          </div>
        ) : (
          <>
            {pestanaActiva !== 'anuladas' && (
              <>
                {consultas
                  .filter(c => {
                    if (pestanaActiva === 'regulares' && c.es_servicio_movil === true) return false;
                    if (pestanaActiva === 'moviles' && c.es_servicio_movil !== true) return false;
                    return c.pacientes.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase());
                  })
                  .length === 0 ? (
                  <div className="card text-center py-12">
                    <p className="text-lg text-gray-600">No hay consultas para esta fecha</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Selecciona otra fecha o registra una nueva consulta
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultas
                      .filter(c => {
                        if (pestanaActiva === 'regulares' && c.es_servicio_movil === true) return false;
                        if (pestanaActiva === 'moviles' && c.es_servicio_movil !== true) return false;
                        return c.pacientes.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase());
                      })
                      .map((consulta, index) => renderConsulta(consulta, index))
                    }
                  </div>
                )}
              </>
            )}

            {pestanaActiva === 'anuladas' && (
              <>
                {consultasAnuladas.length === 0 ? (
                  <div className="card text-center py-12 bg-green-50 border-2 border-green-200">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-lg font-semibold text-green-700">No hay consultas anuladas</p>
                    <p className="text-sm text-green-600 mt-2">
                      ¡Excelente! Todas las consultas del día están activas
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="card bg-red-50 border-2 border-red-200 mb-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="text-red-600" size={24} />
                        <div>
                          <h3 className="font-bold text-red-700">Consultas Anuladas</h3>
                          <p className="text-sm text-red-600">
                            Total: {consultasAnuladas.length} consulta{consultasAnuladas.length !== 1 ? 's' : ''} anulada{consultasAnuladas.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {consultasAnuladas
                        .filter(c => c.pacientes.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()))
                        .map((consulta, index) => renderConsulta(consulta, index))
                      }
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

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

      {showModalTipoRecibo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              ¿Qué recibo desea imprimir?
            </h2>
            
            <p className="text-gray-600 text-sm mb-6 text-center">
              Seleccione el tipo de recibo que desea generar
            </p>

            <div className="space-y-3">
              <button
                onClick={() => imprimirReciboSeleccionado('completo')}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-between"
              >
                <span>📄 Recibo Completo</span>
                <span className="text-sm opacity-90">(con precios)</span>
              </button>

              <button
                onClick={() => imprimirReciboSeleccionado('medico')}
                className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-between"
              >
                <span>🩺 Orden para Médico</span>
                <span className="text-sm opacity-90">(sin precios)</span>
              </button>

              <button
                onClick={() => {
                  setShowModalTipoRecibo(false);
                  setDatosReciboTemp(null);
                }}
                className="w-full py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Modal de Autorización */}
      {mostrarAutorizacion && accionPendiente && (
        <AutorizacionModal
          accion={getNombreAccion()}
          detalles={getDescripcionAccion()}
          onAutorizado={ejecutarAccionAutorizada}
          onCancelar={() => {
            setMostrarAutorizacion(false);
            setAccionPendiente(null);
          }}
        />
      )}
    </div>
  );
};