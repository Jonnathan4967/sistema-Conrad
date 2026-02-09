import React, { useState, useEffect } from 'react';
import { Plus, FileText, Users, BarChart3, Trash2, FileSpreadsheet, Settings, Calendar, DollarSign } from 'lucide-react';
import { NuevoPacienteModal } from '../components/NuevoPacienteModal';
import { Autocomplete } from '../components/Autocomplete';
import { Paciente, Medico, SubEstudio, TipoCobro, FormaPago, DetalleConsulta } from '../types';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { generarReciboCompleto, generarReciboMedico, abrirRecibo } from '../lib/recibos';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

// ✅ NUEVO: Interface para pagos múltiples
interface PagoMultiple {
  forma_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'depositado';
  monto: number;
  numero_referencia?: string;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [pacienteActual, setPacienteActual] = useState<(Paciente & { id: string }) | null>(null);
  const [medicoActual, setMedicoActual] = useState<Medico | null>(null);
  const [sinInfoMedico, setSinInfoMedico] = useState(false);
  const [esServicioMovil, setEsServicioMovil] = useState(false);
  
  const [incluyePlacas, setIncluyePlacas] = useState(false);
  const [precioPlacas, setPrecioPlacas] = useState(0);
  const [incluyeInforme, setIncluyeInforme] = useState(false);
  const [precioInforme, setPrecioInforme] = useState(0);
  const [establecimientoMovil, setEstablecimientoMovil] = useState('');

  const [consultaGuardada, setConsultaGuardada] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [numeroPacienteGuardado, setNumeroPacienteGuardado] = useState<number | null>(null);

  const [tipoCobro, setTipoCobro] = useState<TipoCobro>('normal');
  const [justificacionEspecial, setJustificacionEspecial] = useState('');
  const [showJustificacion, setShowJustificacion] = useState(false);
  const [estudios, setEstudios] = useState<any[]>([]);
  const [subEstudios, setSubEstudios] = useState<SubEstudio[]>([]);
  const [estudioSeleccionado, setEstudioSeleccionado] = useState('');
  const [subEstudioSeleccionado, setSubEstudioSeleccionado] = useState('');
  
  // ✅ NUEVO: Estado con campos es_referido y comentarios
  const [descripcion, setDescripcion] = useState<(DetalleConsulta & { es_referido: boolean; comentarios?: string })[]>([]);
  
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [nit, setNit] = useState('');
  const [formaPago, setFormaPago] = useState<FormaPago | 'multiple'>('efectivo');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [numeroTransferencia, setNumeroTransferencia] = useState('');
  const [numeroVoucher, setNumeroVoucher] = useState('');

  // ✅ NUEVO: Estados para pagos múltiples
  const [showModalPagosMultiples, setShowModalPagosMultiples] = useState(false);
  const [pagosMultiples, setPagosMultiples] = useState<PagoMultiple[]>([
    { forma_pago: 'efectivo', monto: 0 }
  ]);

  // ✅ NUEVO: Estado para modal de selección de recibo
  const [showModalTipoRecibo, setShowModalTipoRecibo] = useState(false);
  const [datosReciboTemp, setDatosReciboTemp] = useState<any>(null);

  const esHorarioNormal = () => {
    const now = new Date();
    const dia = now.getDay();
    const hora = now.getHours();
    
    if (dia >= 1 && dia <= 5) {
      return hora >= 7 && hora < 16;
    }
    if (dia === 6) {
      return hora >= 7 && hora < 11;
    }
    return false;
  };

  useEffect(() => {
    const horarioNormal = esHorarioNormal();
    setTipoCobro(horarioNormal ? 'normal' : 'especial');
  }, []);

  useEffect(() => {
    cargarEstudios();
    cargarSubEstudios();
  }, []);

  useEffect(() => {
    if (descripcion.length > 0 && tipoCobro !== 'personalizado') {
      const nuevaDescripcion = descripcion.map(item => {
        const subEstudio = subEstudios.find(se => se.id === item.sub_estudio_id);
        if (!subEstudio) return item;

        const nuevoPrecio = tipoCobro === 'normal' 
          ? subEstudio.precio_normal 
          : tipoCobro === 'social' 
          ? subEstudio.precio_social 
          : subEstudio.precio_especial;

        return { ...item, precio: nuevoPrecio };
      });
      setDescripcion(nuevaDescripcion);
    }
  }, [tipoCobro]);

  useEffect(() => {
    if (requiereFactura) {
      if (formaPago === 'efectivo') {
        setFormaPago('efectivo_facturado');
      }
    } else {
      if (formaPago === 'efectivo_facturado') {
        setFormaPago('efectivo');
      }
    }
  }, [requiereFactura]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'U') {
        e.preventDefault();
        onNavigate('usuarios');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  const cargarEstudios = async () => {
    try {
      const { data, error } = await supabase
        .from('estudios')
        .select('*')
        .eq('activo', true);
      
      if (error) throw error;
      setEstudios(data || []);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
    }
  };

  const cargarSubEstudios = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_estudios')
        .select('*')
        .eq('activo', true);
      
      if (error) throw error;
      setSubEstudios(data || []);
    } catch (error) {
      console.error('Error al cargar sub-estudios:', error);
    }
  };

  const subEstudiosFiltrados = subEstudios.filter(
    se => se.estudio_id === estudioSeleccionado
  );

  const agregarSubEstudio = () => {
    if (!subEstudioSeleccionado) return;

    const subEstudio = subEstudios.find(se => se.id === subEstudioSeleccionado);
    if (!subEstudio) return;

    if (esServicioMovil) {
      const estudio = estudios.find(e => e.id === subEstudio.estudio_id);
      if (estudio && estudio.nombre.toUpperCase() !== 'RX') {
        alert('⚠️ Servicios Móviles: Solo se permiten estudios de RX');
        return;
      }
    }

    const precio = tipoCobro === 'normal' 
      ? subEstudio.precio_normal 
      : tipoCobro === 'social' 
      ? subEstudio.precio_social 
      : subEstudio.precio_especial;

    // ✅ NUEVO: Agregar con campos es_referido y comentarios
    const nuevoDetalle = {
      sub_estudio_id: subEstudio.id!,
      precio,
      consulta_id: '',
      es_referido: true, // Por defecto, sí genera comisión
      comentarios: '' // Campo vacío por defecto
    };

    setDescripcion([...descripcion, nuevoDetalle]);
    setSubEstudioSeleccionado('');
  };

  const eliminarDeDescripcion = (index: number) => {
    const nuevaDescripcion = descripcion.filter((_, i) => i !== index);
    setDescripcion(nuevaDescripcion);
  };

  // ✅ NUEVO: Toggle para marcar/desmarcar referido
  const toggleReferido = (index: number) => {
    const nuevaDescripcion = [...descripcion];
    nuevaDescripcion[index].es_referido = !nuevaDescripcion[index].es_referido;
    setDescripcion(nuevaDescripcion);
  };

  // ✅ NUEVO: Actualizar comentarios de un estudio
  const actualizarComentarios = (index: number, comentarios: string) => {
    const nuevaDescripcion = [...descripcion];
    nuevaDescripcion[index].comentarios = comentarios;
    setDescripcion(nuevaDescripcion);
  };

  const calcularTotales = () => {
    const subTotal = descripcion.reduce((sum, item) => sum + item.precio, 0);
    const descuento = 0;
    
    let extrasMovil = 0;
    if (esServicioMovil) {
      if (incluyePlacas) extrasMovil += precioPlacas;
      if (incluyeInforme) extrasMovil += precioInforme;
    }
    
    const montoGravable = subTotal + extrasMovil - descuento;
    const impuesto = 0;
    const total = montoGravable + impuesto;

    return { subTotal, descuento, montoGravable, impuesto, total, extrasMovil };
  };

  const handleGuardarPaciente = async (paciente: Paciente, medico: Medico | null, sinInfo: boolean, esServicioMovil: boolean = false) => {
    try {
      const { data: pacienteData, error: pacienteError } = await supabase
        .from('pacientes')
        .insert([paciente])
        .select()
        .single();

      if (pacienteError) throw pacienteError;

      if (medico && !sinInfo) {
        if (medico.id) {
          // Médico referente existente
        } else {
          const { data: medicoData, error: medicoError } = await supabase
            .from('medicos')
            .insert([medico])
            .select()
            .single();

          if (medicoError) throw medicoError;
          setMedicoActual(medicoData);
        }
      }

      setPacienteActual(pacienteData);
      setMedicoActual(medico);
      setSinInfoMedico(sinInfo);
      setEsServicioMovil(esServicioMovil);
      
      if (esServicioMovil) {
        setTipoCobro('especial');
      }
      
      setShowNuevoModal(false);
      
      if (esServicioMovil) {
        alert('📱 Servicio Móvil registrado.\n\nPuedes usar:\n• Especial: Precio del sistema\n• Personalizado: Editar precio manualmente');
      } else {
        alert('Paciente guardado exitosamente');
      }
    } catch (error) {
      console.error('Error al guardar paciente:', error);
      alert('Error al guardar paciente');
    }
  };

  const handleLimpiar = () => {
    if (confirm('¿Está seguro de que desea limpiar toda la información?')) {
      setPacienteActual(null);
      setMedicoActual(null);
      setSinInfoMedico(false);
      setEsServicioMovil(false);
      setIncluyePlacas(false);
      setPrecioPlacas(0);
      setIncluyeInforme(false);
      setPrecioInforme(0);
      setEstablecimientoMovil('');
      setTipoCobro('normal');
      setJustificacionEspecial('');
      setShowJustificacion(false);
      setEstudioSeleccionado('');
      setSubEstudioSeleccionado('');
      setDescripcion([]);
      setRequiereFactura(false);
      setNit('');
      setFormaPago('efectivo');
      setNumeroFactura('');
      setNumeroTransferencia('');
      setNumeroVoucher('');
      setConsultaGuardada(null);
      setGuardando(false);
      setNumeroPacienteGuardado(null);
      setPagosMultiples([{ forma_pago: 'efectivo', monto: 0 }]);
    }
  };

  // ✅ NUEVO: Validar pagos múltiples
  const validarPagosMultiples = (): boolean => {
    const totalPagos = pagosMultiples.reduce((sum, p) => sum + p.monto, 0);
    const totalEsperado = calcularTotales().total;
    
    if (Math.abs(totalPagos - totalEsperado) > 0.01) {
      alert(`❌ La suma de pagos (Q${totalPagos.toFixed(2)}) no coincide con el total (Q${totalEsperado.toFixed(2)})`);
      return false;
    }

    // Validar referencias si hay transferencia
    for (const pago of pagosMultiples) {
      if (pago.forma_pago === 'transferencia' && !pago.numero_referencia) {
        alert('❌ Debe ingresar el número de referencia para la transferencia');
        return false;
      }
    }

    return true;
  };

  const handleGuardar = async () => {
    if (!pacienteActual) {
      alert('Debe crear un paciente primero usando el botón "Nuevo"');
      return;
    }

    if (descripcion.length === 0) {
      alert('Debe agregar al menos un estudio');
      return;
    }

    if (esServicioMovil && !establecimientoMovil.trim()) {
      alert('Debe ingresar el nombre del establecimiento para servicios móviles');
      return;
    }

    const horarioNormal = esHorarioNormal();
    if (tipoCobro === 'normal' && !horarioNormal && !justificacionEspecial.trim()) {
      alert('Debe proporcionar una justificación para usar tarifa normal fuera del horario establecido');
      return;
    }

    if (tipoCobro === 'personalizado' && !esServicioMovil && !justificacionEspecial.trim()) {
      alert('Debe proporcionar una justificación para usar precio personalizado');
      return;
    }

    // ✅ NUEVO: Validar pagos múltiples
    if (formaPago === 'multiple' && !validarPagosMultiples()) {
      return;
    }

    if (formaPago === 'transferencia' && !numeroTransferencia.trim()) {
      alert('Debe ingresar el número de transferencia');
      return;
    }

    if (guardando) {
      alert('⏳ Ya se está guardando, por favor espere...');
      return;
    }

    if (consultaGuardada) {
      const reimprimir = confirm('✅ Esta consulta ya fue guardada.\n\n¿Desea reimprimir el recibo?');
      if (reimprimir) {
        handleImprimir();
      }
      return;
    }

    setGuardando(true);

    try {
      let siguienteNumero = null;
      
      if (!esServicioMovil) {
        const fechaHoy = format(new Date(), 'yyyy-MM-dd');
        
        const { data: ultimaConsulta } = await supabase
          .from('consultas')
          .select('numero_paciente')
          .eq('fecha', fechaHoy)
          .or('anulado.is.null,anulado.eq.false')
          .or('es_servicio_movil.is.null,es_servicio_movil.eq.false')
          .order('numero_paciente', { ascending: false })
          .limit(1)
          .single();
        
        siguienteNumero = (ultimaConsulta?.numero_paciente || 0) + 1;
      }

      // ✅ NUEVO: Preparar JSON de pagos múltiples
      const detallePagosMultiples = formaPago === 'multiple' ? pagosMultiples : null;

      const { data: consultaData, error: consultaError } = await supabase
        .from('consultas')
        .insert([{
          numero_paciente: siguienteNumero,
          paciente_id: pacienteActual.id,
          medico_id: medicoActual?.id || null,
          medico_recomendado: medicoActual?.nombre || null,
          tipo_cobro: tipoCobro,
          requiere_factura: requiereFactura,
          nit: requiereFactura ? nit : null,
          forma_pago: formaPago === 'multiple' ? 'pago_multiple' : formaPago, // ✅ CORREGIDO
          numero_factura: numeroFactura || null,
          numero_transferencia: formaPago === 'transferencia' ? numeroTransferencia : null,
          numero_voucher: formaPago === 'tarjeta' ? numeroVoucher : null,
          sin_informacion_medico: sinInfoMedico,
          justificacion_especial: ((tipoCobro === 'normal' && !horarioNormal) || (tipoCobro === 'personalizado' && !esServicioMovil)) ? justificacionEspecial : null,
          fecha: format(new Date(), 'yyyy-MM-dd'),
          es_servicio_movil: esServicioMovil,
          movil_incluye_placas: esServicioMovil ? incluyePlacas : null,
          movil_precio_placas: esServicioMovil && incluyePlacas ? precioPlacas : null,
          movil_incluye_informe: esServicioMovil ? incluyeInforme : null,
          movil_precio_informe: esServicioMovil && incluyeInforme ? precioInforme : null,
          movil_establecimiento: esServicioMovil ? establecimientoMovil : null,
          detalle_pagos_multiples: detallePagosMultiples // ✅ CORREGIDO: usar el nombre correcto del campo
        }])
        .select()
        .single();

      if (consultaError) throw consultaError;

      // ✅ NUEVO: Insertar detalles con campos es_referido y comentarios
      const detalles = descripcion.map(d => ({
        consulta_id: consultaData.id,
        sub_estudio_id: d.sub_estudio_id,
        precio: d.precio,
        es_referido: d.es_referido, // ✅ NUEVO
        comentarios: d.comentarios || null // ✅ NUEVO: guardar solo si tiene valor
      }));

      const { error: detallesError } = await supabase
        .from('detalle_consultas')
        .insert(detalles);

      if (detallesError) throw detallesError;

      setConsultaGuardada(consultaData.id);
      setNumeroPacienteGuardado(consultaData.numero_paciente);
      
      alert('✅ Consulta guardada exitosamente.\n\nAhora puede imprimir el recibo usando el botón "Imprimir".');
      
    } catch (error) {
      console.error('Error al guardar consulta:', error);
      alert('❌ Error al guardar consulta: ' + (error as any).message);
    } finally {
      setGuardando(false);
    }
  };

  const handleImprimir = async () => {
    if (!consultaGuardada) {
      alert('⚠️ Debe guardar la consulta primero usando el botón "Guardar"');
      return;
    }

    if (!pacienteActual) {
      alert('❌ Error: No se encontró información del paciente');
      return;
    }

    try {
      const fechaHora = new Date();
      const tieneMedico = medicoActual !== null;
      const esReferente = tieneMedico && !sinInfoMedico;
      
      const estudiosRecibo = descripcion.map(d => {
        const subEstudio = subEstudios.find(se => se.id === d.sub_estudio_id);
        return {
          nombre: subEstudio?.nombre || 'Estudio',
          precio: d.precio,
          comentarios: d.comentarios || undefined // ✅ NUEVO: Incluir comentarios
        };
      });

      if (esServicioMovil) {
        if (incluyePlacas) {
          estudiosRecibo.push({
            nombre: '📋 Placas (Extra)',
            precio: precioPlacas,
            comentarios: undefined // ✅ Agregar para coincidir con tipo
          });
        }
        if (incluyeInforme) {
          estudiosRecibo.push({
            nombre: '📄 Informe (Extra)',
            precio: precioInforme,
            comentarios: undefined // ✅ Agregar para coincidir con tipo
          });
        }
      }

      const totales = calcularTotales();

      const datosRecibo = {
        numeroPaciente: numeroPacienteGuardado,
        paciente: {
          nombre: pacienteActual.nombre,
          edad: pacienteActual.edad,
          edad_valor: pacienteActual.edad_valor,
          edad_tipo: pacienteActual.edad_tipo,
          telefono: pacienteActual.telefono
        },
        medico: medicoActual ? { nombre: medicoActual.nombre } : undefined,
        esReferente,
        estudios: estudiosRecibo,
        total: totales.total,
        formaPago,
        fecha: fechaHora,
        sinInfoMedico
      };

      // ✅ NUEVO: Guardar datos y mostrar modal en lugar de confirm
      setDatosReciboTemp(datosRecibo);
      setShowModalTipoRecibo(true);
      
    } catch (error) {
      console.error('Error al imprimir:', error);
      alert('❌ Error al imprimir el recibo: ' + (error as any).message);
    }
  };

  // ✅ NUEVA FUNCIÓN: Imprimir recibo seleccionado
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

    setTimeout(() => {
      const nuevaConsulta = confirm('✅ Recibo impreso.\n\n¿Desea crear una nueva consulta?');
      if (nuevaConsulta) {
        handleLimpiar();
      }
    }, 500);
  };

  // ✅ NUEVO: Agregar pago al modal
  const agregarPago = () => {
    setPagosMultiples([...pagosMultiples, { forma_pago: 'efectivo', monto: 0 }]);
  };

  // ✅ NUEVO: Eliminar pago
  const eliminarPago = (index: number) => {
    if (pagosMultiples.length === 1) {
      alert('Debe haber al menos un pago');
      return;
    }
    setPagosMultiples(pagosMultiples.filter((_, i) => i !== index));
  };

  // ✅ NUEVO: Actualizar pago
  const actualizarPago = (index: number, campo: 'forma_pago' | 'monto' | 'numero_referencia', valor: any) => {
    const nuevosPagos = [...pagosMultiples];
    nuevosPagos[index] = { ...nuevosPagos[index], [campo]: valor };
    setPagosMultiples(nuevosPagos);
  };

  const totales = calcularTotales();
  const horarioNormal = esHorarioNormal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ HEADER MEJORADO */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Centro de Diagnóstico</h1>
              <p className="text-blue-100 mt-2">Sistema de Gestión de Consultas</p>
            </div>
            <div className="text-right text-sm text-blue-100">
              <p>{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
              <p>{format(new Date(), 'HH:mm')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Barra de botones principales */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowNuevoModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={20} />
              Nuevo
            </button>
            <button onClick={() => onNavigate('productos')} className="btn-secondary flex items-center gap-2">
              <FileText size={20} />
              Productos
            </button>
            <button onClick={() => onNavigate('referentes')} className="btn-secondary flex items-center gap-2">
              <Users size={20} />
              Referentes
            </button>
            <button onClick={() => onNavigate('pacientes')} className="btn-secondary flex items-center gap-2">
              <Users size={20} />
              Pacientes
            </button>
            <button onClick={() => onNavigate('cuadre')} className="btn-secondary flex items-center gap-2">
              <BarChart3 size={20} />
              Cuadre Diario
            </button>
            <button onClick={() => onNavigate('cuadre-quincenal')} className="btn-secondary flex items-center gap-2">
              <Calendar size={20} />
              Cuadre Quincenal
            </button>
            <button onClick={() => onNavigate('reportes')} className="btn-secondary flex items-center gap-2">
              <FileSpreadsheet size={20} />
              Reportes
            </button>
            <button onClick={() => onNavigate('comisiones')} className="btn-secondary flex items-center gap-2">
              <DollarSign size={20} />
              Comisiones
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 pb-8 pt-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Información del paciente */}
          <div className="lg:col-span-2 space-y-6">
            {pacienteActual && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  Información del Paciente
                  {esServicioMovil && (
                    <span className="text-sm bg-orange-500 text-white px-3 py-1 rounded-full">
                      📱 SERVICIO MÓVIL
                    </span>
                  )}
                  {consultaGuardada && (
                    <span className="text-sm bg-green-500 text-white px-3 py-1 rounded-full">
                      ✅ GUARDADO
                    </span>
                  )}
                </h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div><strong>Nombre:</strong> {pacienteActual.nombre}</div>
                  <div><strong>Edad:</strong> {pacienteActual.edad} años</div>
                  <div><strong>Teléfono:</strong> {pacienteActual.telefono}</div>
                  <div><strong>Departamento:</strong> {pacienteActual.departamento}</div>
                  <div><strong>Municipio:</strong> {pacienteActual.municipio}</div>
                </div>
                {medicoActual && !sinInfoMedico && (
                  <>
                    <h4 className="text-md font-semibold mt-4 mb-2">Médico</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div><strong>Nombre:</strong> {medicoActual.nombre}</div>
                      <div><strong>Teléfono:</strong> {medicoActual.telefono}</div>
                      <div><strong>Departamento:</strong> {medicoActual.departamento}</div>
                      <div><strong>Municipio:</strong> {medicoActual.municipio}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!pacienteActual && (
              <div className="card bg-blue-50 border-2 border-blue-200">
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🏥</div>
                  <h3 className="text-xl font-bold text-blue-900 mb-2">Bienvenido al Centro de Diagnóstico</h3>
                  <p className="text-blue-700 mb-4">Para comenzar, registra un nuevo paciente</p>
                  <button onClick={() => setShowNuevoModal(true)} className="btn-primary inline-flex items-center gap-2">
                    <Plus size={20} />
                    Crear Nuevo Paciente
                  </button>
                </div>
              </div>
            )}

            {/* Tipo de cobro */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Tipo de Cobro</h3>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={tipoCobro === 'social'}
                    onChange={() => {
                      setTipoCobro('social');
                      setShowJustificacion(false);
                      setJustificacionEspecial('');
                    }}
                    disabled={esServicioMovil || !!consultaGuardada}
                    className="mr-2"
                  />
                  Social {esServicioMovil && <span className="text-gray-400 text-xs ml-1">(No disponible para móviles)</span>}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={tipoCobro === 'normal'}
                    onChange={() => {
                      if (!horarioNormal) {
                        setShowJustificacion(true);
                      }
                      setTipoCobro('normal');
                    }}
                    disabled={esServicioMovil || !!consultaGuardada}
                    className="mr-2"
                  />
                  Normal {!horarioNormal && '(Requiere justificación)'} {esServicioMovil && <span className="text-gray-400 text-xs ml-1">(No disponible para móviles)</span>}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={tipoCobro === 'especial'}
                    onChange={() => {
                      setTipoCobro('especial');
                      setShowJustificacion(false);
                      setJustificacionEspecial('');
                    }}
                    disabled={(horarioNormal && !esServicioMovil) || !!consultaGuardada}
                    className="mr-2"
                  />
                  Especial {horarioNormal && !esServicioMovil && '(Solo fuera de horario)'}
                  {esServicioMovil && <span className="text-orange-600 font-medium ml-1">(Precio del sistema)</span>}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={tipoCobro === 'personalizado'}
                    onChange={() => {
                      setTipoCobro('personalizado');
                      setShowJustificacion(!esServicioMovil);
                    }}
                    disabled={!!consultaGuardada}
                    className="mr-2"
                  />
                  <span className="text-purple-600 font-medium">Personalizado</span>
                  {esServicioMovil && <span className="text-orange-600 text-xs ml-1">(Editar precios manualmente)</span>}
                </label>
              </div>

              {showJustificacion && (tipoCobro === 'normal' && !horarioNormal || (tipoCobro === 'personalizado' && !esServicioMovil)) && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <label className="label">
                    {tipoCobro === 'personalizado' 
                      ? 'Justificación y precio personalizado:' 
                      : 'Justificación para tarifa normal fuera de horario:'}
                  </label>
                  <textarea
                    className="input-field mt-2"
                    value={justificacionEspecial}
                    onChange={(e) => setJustificacionEspecial(e.target.value)}
                    placeholder={tipoCobro === 'personalizado' 
                      ? "Ej: Por orden del Dr. García, precio especial Q150" 
                      : "Ej: Médico referente solicitó tarifa normal"}
                    rows={2}
                    required
                    disabled={!!consultaGuardada}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    * Esta justificación quedará registrada en el sistema
                  </p>
                </div>
              )}
              
              {esServicioMovil && (
                <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded">
                  <p className="text-sm text-orange-800">
                    <strong>📱 Servicio Móvil:</strong>
                    {tipoCobro === 'especial' && ' Usando precios especiales del sistema'}
                    {tipoCobro === 'personalizado' && ' Puedes editar el precio de cada estudio manualmente en la sección de Descripción'}
                  </p>
                </div>
              )}
            </div>

            {esServicioMovil && (
              <div className="card bg-orange-50 border-2 border-orange-300">
                <h3 className="text-lg font-semibold mb-3 text-orange-800">
                  📱 Opciones Extras - Servicio Móvil
                </h3>
                
                <div className="mb-4">
                  <label className="label text-orange-900">
                    🏥 Establecimiento / Lugar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={establecimientoMovil}
                    onChange={(e) => setEstablecimientoMovil(e.target.value)}
                    placeholder="Ej: Hospital San Juan de Dios, Clínica Santa María"
                    required
                    disabled={!!consultaGuardada}
                  />
                  <p className="text-xs text-orange-700 mt-1">
                    * Nombre del lugar donde se realizó el servicio móvil
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-white rounded border border-orange-200">
                    <label className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={incluyePlacas}
                        onChange={(e) => {
                          setIncluyePlacas(e.target.checked);
                          if (!e.target.checked) setPrecioPlacas(0);
                        }}
                        className="w-5 h-5"
                        disabled={!!consultaGuardada}
                      />
                      <span className="font-medium">📋 Incluir Placas</span>
                    </label>
                    {incluyePlacas && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Precio:</span>
                        <span className="text-lg">Q</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={precioPlacas}
                          onChange={(e) => setPrecioPlacas(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                          placeholder="0.00"
                          disabled={!!consultaGuardada}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-white rounded border border-orange-200">
                    <label className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={incluyeInforme}
                        onChange={(e) => {
                          setIncluyeInforme(e.target.checked);
                          if (!e.target.checked) setPrecioInforme(0);
                        }}
                        className="w-5 h-5"
                        disabled={!!consultaGuardada}
                      />
                      <span className="font-medium">📄 Incluir Informe</span>
                    </label>
                    {incluyeInforme && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Precio:</span>
                        <span className="text-lg">Q</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={precioInforme}
                          onChange={(e) => setPrecioInforme(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                          placeholder="0.00"
                          disabled={!!consultaGuardada}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-orange-700 mt-3 italic">
                  💡 Los precios de estas opciones se sumarán al total del servicio
                </p>
              </div>
            )}

            {/* Estudios */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Estudios</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Autocomplete
                  label="Estudio"
                  options={estudios
                    .filter(e => !esServicioMovil || e.nombre.toUpperCase() === 'RX')
                    .map(e => ({ id: e.id, nombre: e.nombre }))}
                  value={estudioSeleccionado}
                  onChange={(val) => {
                    setEstudioSeleccionado(val);
                    setSubEstudioSeleccionado('');
                  }}
                  placeholder={esServicioMovil ? "Solo estudios RX disponibles" : "Seleccione estudio"}
                  disabled={!!consultaGuardada}
                />
                
                <Autocomplete
                  label="Sub-Estudio"
                  options={subEstudiosFiltrados.map(se => ({ id: se.id || '', nombre: se.nombre }))}
                  value={subEstudioSeleccionado}
                  onChange={setSubEstudioSeleccionado}
                  placeholder="Seleccione sub-estudio"
                  disabled={!estudioSeleccionado || !!consultaGuardada}
                />
              </div>

              <button
                onClick={agregarSubEstudio}
                className="btn-primary mt-4 flex items-center gap-2 justify-center w-full"
                disabled={!subEstudioSeleccionado || !!consultaGuardada}
              >
                <Plus size={18} />
                Agregar {estudioSeleccionado && descripcion.length > 0 ? 'Otro' : 'a Descripción'}
              </button>

              {estudioSeleccionado && descripcion.length > 0 && !consultaGuardada && (
                <p className="text-sm text-green-600 mt-2 text-center">
                  ✓ Puedes seguir agregando más estudios del mismo tipo
                </p>
              )}

              {consultaGuardada && (
                <p className="text-sm text-yellow-600 mt-2 text-center">
                  ⚠️ Consulta guardada - No se pueden agregar más estudios
                </p>
              )}
            </div>

            {/* ✅ NUEVO: Descripción con toggle de referido */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Descripción</h3>
              {descripcion.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay estudios agregados</p>
              ) : (
                <div className="space-y-2">
                  {descripcion.map((item, index) => {
                    const subEstudio = subEstudios.find(se => se.id === item.sub_estudio_id);
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded border-l-4" 
                        style={{ borderLeftColor: item.es_referido ? '#10b981' : '#94a3b8' }}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {subEstudio?.nombre}
                              {/* ✅ NUEVO: Badge de referido */}
                              {item.es_referido ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  ✓ Genera comisión
                                </span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  Sin comisión
                                </span>
                              )}
                            </div>
                            {tipoCobro === 'personalizado' ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-600">Q</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.precio}
                                  onChange={(e) => {
                                    const nuevaDescripcion = [...descripcion];
                                    nuevaDescripcion[index].precio = parseFloat(e.target.value) || 0;
                                    setDescripcion(nuevaDescripcion);
                                  }}
                                  className="w-24 px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                                  disabled={!!consultaGuardada}
                                />
                              </div>
                            ) : (
                              <div className="text-sm text-gray-600">Q {item.precio.toFixed(2)}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* ✅ NUEVO: Toggle de referido */}
                            {!consultaGuardada && medicoActual && !sinInfoMedico && (
                              <button
                                onClick={() => toggleReferido(index)}
                                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                                  item.es_referido 
                                    ? 'bg-green-500 text-white hover:bg-green-600' 
                                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                }`}
                                title={item.es_referido ? 'Click para no generar comisión' : 'Click para generar comisión'}
                              >
                                {item.es_referido ? '✓ Referido' : 'No referido'}
                              </button>
                            )}
                            <button
                              onClick={() => eliminarDeDescripcion(index)}
                              className="text-red-600 hover:text-red-800 p-1"
                              disabled={!!consultaGuardada}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        
                        {/* ✅ NUEVO: Campo de comentarios opcional */}
                        {!consultaGuardada && (
                          <div className="mt-2 border-t pt-2">
                            <label className="flex items-center text-xs text-gray-600 mb-1">
                              <input
                                type="checkbox"
                                checked={!!item.comentarios && item.comentarios.trim() !== ''}
                                onChange={(e) => {
                                  if (!e.target.checked) {
                                    actualizarComentarios(index, '');
                                  }
                                }}
                                className="mr-2"
                              />
                              Agregar comentarios opcionales
                            </label>
                            {(item.comentarios !== undefined && item.comentarios !== '' ) || item.comentarios === '' ? (
                              <textarea
                                value={item.comentarios || ''}
                                onChange={(e) => actualizarComentarios(index, e.target.value)}
                                placeholder="Comentarios adicionales sobre este estudio..."
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={2}
                                maxLength={500}
                              />
                            ) : null}
                          </div>
                        )}
                        
                        {/* Mostrar comentarios si ya está guardada */}
                        {consultaGuardada && item.comentarios && item.comentarios.trim() !== '' && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <strong className="text-blue-700">Comentarios:</strong>
                            <p className="text-gray-700 mt-1">{item.comentarios}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {medicoActual && !sinInfoMedico && descripcion.length > 0 && !consultaGuardada && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="text-blue-800">
                    <strong>💡 Control de comisiones:</strong> Usa el botón "Referido" para controlar qué estudios generan comisión al médico.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha - Facturación y totales */}
          <div className="space-y-6">
            {/* Factura */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Facturación</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="font-medium">Factura:</label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="factura"
                      checked={requiereFactura}
                      onChange={() => setRequiereFactura(true)}
                      className="mr-1"
                      disabled={!!consultaGuardada}
                    />
                    Sí
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="factura"
                      checked={!requiereFactura}
                      onChange={() => {
                        setRequiereFactura(false);
                        setNit('');
                      }}
                      className="mr-1"
                      disabled={!!consultaGuardada}
                    />
                    No
                  </label>
                </div>

                <div>
                  <label className="label">NIT</label>
                  <input
                    type="text"
                    className="input-field"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    placeholder="NIT (si aplica)"
                    disabled={!requiereFactura || !!consultaGuardada}
                  />
                </div>

                {/* ✅ NUEVO: Opción de pago múltiple */}
                <div>
                  <label className="label">Forma de Pago</label>
                  <select
                    className="input-field"
                    value={formaPago}
                    onChange={(e) => {
                      const valor = e.target.value as FormaPago | 'multiple';
                      setFormaPago(valor);
                      setNumeroTransferencia('');
                      setNumeroVoucher('');
                      if (valor === 'multiple') {
                        setShowModalPagosMultiples(true);
                      }
                    }}
                    disabled={!!consultaGuardada}
                  >
                    {requiereFactura ? (
                      <>
                        <option value="efectivo_facturado">Efectivo Facturado (Depósito)</option>
                        <option value="tarjeta">Tarjeta Facturado</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="multiple">💳 Pago Múltiple (Dividir)</option>
                      </>
                    ) : (
                      <>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="estado_cuenta">Estado de Cuenta</option>
                        <option value="multiple">💳 Pago Múltiple (Dividir)</option>
                      </>
                    )}
                  </select>
                </div>

                {formaPago === 'transferencia' && (
                  <div>
                    <label className="label">Número de Transferencia *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={numeroTransferencia}
                      onChange={(e) => setNumeroTransferencia(e.target.value)}
                      placeholder="Número de referencia"
                      required
                      disabled={!!consultaGuardada}
                    />
                  </div>
                )}

                {formaPago === 'tarjeta' && (
                  <div>
                    <label className="label">
                      Número de Voucher/Baucher 
                      <span className="text-yellow-600 ml-2">(Opcional - se puede agregar después)</span>
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={numeroVoucher}
                      onChange={(e) => setNumeroVoucher(e.target.value)}
                      placeholder="Número de voucher"
                      disabled={!!consultaGuardada}
                    />
                    {!numeroVoucher && (
                      <p className="text-xs text-yellow-600 mt-1">⚠️ Sin voucher - pendiente de agregar</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="label">Número de Factura</label>
                  <input
                    type="text"
                    className="input-field"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    placeholder="Número de factura"
                    disabled={!!consultaGuardada}
                  />
                </div>

                {/* ✅ NUEVO: Vista previa de pagos múltiples */}
                {formaPago === 'multiple' && pagosMultiples.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-purple-800">💳 Pagos Configurados</h4>
                      <button
                        onClick={() => setShowModalPagosMultiples(true)}
                        className="text-xs text-purple-600 hover:text-purple-800"
                        disabled={!!consultaGuardada}
                      >
                        Editar
                      </button>
                    </div>
                    <div className="space-y-1 text-sm">
                      {pagosMultiples.map((pago, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="capitalize">{pago.forma_pago.replace('_', ' ')}:</span>
                          <span className="font-medium">Q {pago.monto.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-1 font-bold">
                        <span>Total:</span>
                        <span>Q {pagosMultiples.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Totales */}
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">💰 Totales</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sub-Total Estudios:</span>
                  <span className="font-semibold">Q {totales.subTotal.toFixed(2)}</span>
                </div>
                
                {esServicioMovil && totales.extrasMovil > 0 && (
                  <div className="flex justify-between text-orange-700">
                    <span>Extras Móvil:</span>
                    <span className="font-semibold">Q {totales.extrasMovil.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Descuento:</span>
                  <span className="font-semibold">Q {totales.descuento.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monto Gravable:</span>
                  <span className="font-semibold">Q {totales.montoGravable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impuesto:</span>
                  <span className="font-semibold">Q {totales.impuesto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg border-t-2 border-blue-400 pt-2 mt-2">
                  <span className="font-bold">Total Ventas:</span>
                  <span className="font-bold text-blue-700">Q {totales.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-3">
              <button
                onClick={handleLimpiar}
                className="btn-secondary w-full"
              >
                🗑️ Limpiar
              </button>
              
              <button
                onClick={handleGuardar}
                className={`w-full font-semibold py-3 px-4 rounded-lg transition-all ${
                  guardando 
                    ? 'bg-yellow-500 text-white cursor-wait' 
                    : consultaGuardada 
                    ? 'bg-green-600 text-white cursor-default' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                }`}
                disabled={!pacienteActual || descripcion.length === 0 || guardando || !!consultaGuardada}
              >
                {guardando ? '⏳ Guardando...' : consultaGuardada ? '✅ Consulta Guardada' : '💾 Guardar Consulta'}
              </button>
              
              <button
                onClick={handleImprimir}
                className={`w-full font-semibold py-3 px-4 rounded-lg transition-all ${
                  consultaGuardada
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!consultaGuardada}
              >
                🖨️ Imprimir Recibo
              </button>
              
              {!consultaGuardada && pacienteActual && descripcion.length > 0 && (
                <p className="text-xs text-blue-600 text-center font-medium">
                  ℹ️ Primero debe guardar la consulta
                </p>
              )}
              
              {consultaGuardada && (
                <p className="text-xs text-green-600 text-center font-medium">
                  ✅ Consulta guardada correctamente. Puede imprimir ahora.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de nuevo paciente */}
      <NuevoPacienteModal
        isOpen={showNuevoModal}
        onClose={() => setShowNuevoModal(false)}
        onSave={handleGuardarPaciente}
      />

      {/* ✅ NUEVO: Modal de pagos múltiples */}
      {showModalPagosMultiples && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">💳 Configurar Pagos Múltiples</h2>
              <button
                onClick={() => setShowModalPagosMultiples(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Total a pagar:</strong> Q {totales.total.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                La suma de todos los pagos debe coincidir con el total
              </p>
            </div>

            <div className="space-y-4">
              {pagosMultiples.map((pago, index) => (
                <div key={index} className="border-2 border-gray-200 rounded p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold">Pago #{index + 1}</h4>
                    {pagosMultiples.length > 1 && (
                      <button
                        onClick={() => eliminarPago(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Forma de Pago</label>
                      <select
                        className="input-field"
                        value={pago.forma_pago}
                        onChange={(e) => actualizarPago(index, 'forma_pago', e.target.value)}
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="depositado">Depositado</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Monto (Q)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field"
                        value={pago.monto}
                        onChange={(e) => actualizarPago(index, 'monto', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {pago.forma_pago === 'transferencia' && (
                    <div className="mt-3">
                      <label className="label">Número de Referencia *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={pago.numero_referencia || ''}
                        onChange={(e) => actualizarPago(index, 'numero_referencia', e.target.value)}
                        placeholder="Número de transferencia"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={agregarPago}
              className="mt-4 w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Agregar Otro Pago
            </button>

            <div className="mt-4 p-3 bg-gray-100 rounded">
              <div className="flex justify-between font-semibold">
                <span>Total configurado:</span>
                <span className={
                  Math.abs(pagosMultiples.reduce((sum, p) => sum + p.monto, 0) - totales.total) < 0.01
                    ? 'text-green-600'
                    : 'text-red-600'
                }>
                  Q {pagosMultiples.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowModalPagosMultiples(false);
                  setFormaPago('efectivo');
                  setPagosMultiples([{ forma_pago: 'efectivo', monto: 0 }]);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (validarPagosMultiples()) {
                    setShowModalPagosMultiples(false);
                  }
                }}
                className="btn-primary"
              >
                Confirmar Pagos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Modal de selección de tipo de recibo */}
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
    </div>
  );
};