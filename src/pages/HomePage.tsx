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

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [pacienteActual, setPacienteActual] = useState<(Paciente & { id: string }) | null>(null);
  const [medicoActual, setMedicoActual] = useState<Medico | null>(null);
  const [sinInfoMedico, setSinInfoMedico] = useState(false);
  const [esServicioMovil, setEsServicioMovil] = useState(false);

  // Estados del formulario principal
  const [tipoCobro, setTipoCobro] = useState<TipoCobro>('normal');
  const [justificacionEspecial, setJustificacionEspecial] = useState('');
  const [showJustificacion, setShowJustificacion] = useState(false);
  const [estudios, setEstudios] = useState<any[]>([]);
  const [subEstudios, setSubEstudios] = useState<SubEstudio[]>([]);
  const [estudioSeleccionado, setEstudioSeleccionado] = useState('');
  const [subEstudioSeleccionado, setSubEstudioSeleccionado] = useState('');
  const [descripcion, setDescripcion] = useState<DetalleConsulta[]>([]);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [nit, setNit] = useState('');
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [numeroTransferencia, setNumeroTransferencia] = useState('');
  const [numeroVoucher, setNumeroVoucher] = useState('');

  // Función para determinar si es horario normal
  const esHorarioNormal = () => {
    const now = new Date();
    const dia = now.getDay(); // 0 = Domingo, 6 = Sábado
    const hora = now.getHours();
    
    // Lunes a Viernes 7am-4pm
    if (dia >= 1 && dia <= 5) {
      return hora >= 7 && hora < 16;
    }
    // Sábado 7am-11am
    if (dia === 6) {
      return hora >= 7 && hora < 11;
    }
    return false;
  };

  // Auto-seleccionar tipo de cobro según horario
  useEffect(() => {
    const horarioNormal = esHorarioNormal();
    setTipoCobro(horarioNormal ? 'normal' : 'especial');
  }, []);

  // Cargar estudios y sub-estudios
  useEffect(() => {
    cargarEstudios();
    cargarSubEstudios();
  }, []);

  // Actualizar precios cuando cambie el tipo de cobro
  useEffect(() => {
    if (descripcion.length > 0) {
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

  // Actualizar forma de pago cuando cambie el tipo de factura
  useEffect(() => {
    if (requiereFactura) {
      // Si activa factura y tiene "efectivo", cambiar a "efectivo_facturado"
      if (formaPago === 'efectivo') {
        setFormaPago('efectivo_facturado');
      }
    } else {
      // Si desactiva factura y tiene "efectivo_facturado", cambiar a "efectivo"
      if (formaPago === 'efectivo_facturado') {
        setFormaPago('efectivo');
      }
    }
  }, [requiereFactura]);

  // Combinación de teclas secreta: Ctrl + Shift + U para Gestión de Usuarios
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
      console.log('Estudios cargados:', data);
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
      console.log('Sub-estudios cargados:', data);
      setSubEstudios(data || []);
    } catch (error) {
      console.error('Error al cargar sub-estudios:', error);
    }
  };

  // Filtrar sub-estudios por estudio
  const subEstudiosFiltrados = subEstudios.filter(
    se => se.estudio_id === estudioSeleccionado
  );

  // Verificar si estamos en horario normal
  // Agregar sub-estudio a descripción
  const agregarSubEstudio = () => {
    if (!subEstudioSeleccionado) return;

    const subEstudio = subEstudios.find(se => se.id === subEstudioSeleccionado);
    if (!subEstudio) return;

    // ✅ VALIDACIÓN: Solo RX para servicios móviles
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

    const nuevoDetalle: DetalleConsulta = {
      sub_estudio_id: subEstudio.id!,
      precio,
      consulta_id: '' // Se asignará al guardar
    };

    setDescripcion([...descripcion, nuevoDetalle]);
    setEstudioSeleccionado('');
    setSubEstudioSeleccionado('');
  };

  // Eliminar item de descripción
  const eliminarDeDescripcion = (index: number) => {
    const nuevaDescripcion = descripcion.filter((_, i) => i !== index);
    setDescripcion(nuevaDescripcion);
  };

  // Calcular totales
  const calcularTotales = () => {
    const subTotal = descripcion.reduce((sum, item) => sum + item.precio, 0);
    const descuento = 0; // Implementar lógica de descuento si es necesario
    const montoGravable = subTotal - descuento;
    const impuesto = 0; // Implementar lógica de impuesto si es necesario
    const total = montoGravable + impuesto;

    return { subTotal, descuento, montoGravable, impuesto, total };
  };

  // Guardar nuevo paciente
  const handleGuardarPaciente = async (paciente: Paciente, medico: Medico | null, sinInfo: boolean, esServicioMovil: boolean = false) => {
    try {
      // Insertar paciente
      const { data: pacienteData, error: pacienteError } = await supabase
        .from('pacientes')
        .insert([paciente])
        .select()
        .single();

      if (pacienteError) throw pacienteError;

      // Insertar o buscar médico si existe
      if (medico && !sinInfo) {
        if (medico.id) {
          // Médico referente existente - ya está en medico.id
        } else {
          // Nuevo médico no referente
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
      
      // Forzar tipo especial para servicios móviles (precio personalizado)
      if (esServicioMovil) {
        setTipoCobro('especial');
      }
      
      setShowNuevoModal(false);
      
      if (esServicioMovil) {
        alert('📱 Servicio Móvil registrado. Recuerda: Solo estudios RX con precio personalizado.');
      } else {
        alert('Paciente guardado exitosamente');
      }
    } catch (error) {
      console.error('Error al guardar paciente:', error);
      alert('Error al guardar paciente');
    }
  };

  // Limpiar todo
  const handleLimpiar = () => {
    if (confirm('¿Está seguro de que desea limpiar toda la información?')) {
      setPacienteActual(null);
      setMedicoActual(null);
      setSinInfoMedico(false);
      setTipoCobro('normal');
      setEstudioSeleccionado('');
      setSubEstudioSeleccionado('');
      setDescripcion([]);
      setRequiereFactura(false);
      setNit('');
      setFormaPago('efectivo');
      setNumeroFactura('');
      setNumeroTransferencia('');
      setNumeroVoucher('');
    }
  };

  // Imprimir
  const handleImprimir = async () => {
    if (!pacienteActual) {
      alert('Debe crear un paciente primero usando el botón "Nuevo"');
      return;
    }

    if (descripcion.length === 0) {
      alert('Debe agregar al menos un estudio');
      return;
    }

    // Validar justificación si se usa tarifa normal fuera de horario
    if (tipoCobro === 'normal' && !horarioNormal && !justificacionEspecial.trim()) {
      alert('Debe proporcionar una justificación para usar tarifa normal fuera del horario establecido');
      return;
    }

    // Validar número de transferencia
    if (formaPago === 'transferencia' && !numeroTransferencia.trim()) {
      alert('Debe ingresar el número de transferencia');
      return;
    }

    // NOTA: Ya no validamos voucher - se puede agregar después

    const totales = calcularTotales();

    try {
      // Calcular el próximo número de paciente del día (solo para pacientes regulares)
      let siguienteNumero = null;
      
      if (!esServicioMovil) {
        const fechaHoy = format(new Date(), 'yyyy-MM-dd');
        
        const { data: ultimaConsulta } = await supabase
          .from('consultas')
          .select('numero_paciente')
          .eq('fecha', fechaHoy)
          .or('anulado.is.null,anulado.eq.false') // Solo contar las activas
          .or('es_servicio_movil.is.null,es_servicio_movil.eq.false') // No contar móviles
          .order('numero_paciente', { ascending: false })
          .limit(1)
          .single();
        
        siguienteNumero = (ultimaConsulta?.numero_paciente || 0) + 1;
      }

      // Crear consulta
      const { data: consultaData, error: consultaError } = await supabase
  .from('consultas')
  .insert([{
    numero_paciente: siguienteNumero, // null para servicios móviles
    paciente_id: pacienteActual.id,
    medico_id: medicoActual?.id || null,
    medico_recomendado: medicoActual?.nombre || null, // ✅ Guardar nombre del médico
    tipo_cobro: esServicioMovil ? 'especial' : tipoCobro, // Servicios móviles con precio especial (personalizado)
    requiere_factura: requiereFactura,
    nit: requiereFactura ? nit : null,
    forma_pago: formaPago,
    numero_factura: numeroFactura || null,
    numero_transferencia: formaPago === 'transferencia' ? numeroTransferencia : null,
    numero_voucher: formaPago === 'tarjeta' ? numeroVoucher : null,
    sin_informacion_medico: sinInfoMedico,
    justificacion_especial: tipoCobro === 'normal' && !horarioNormal ? justificacionEspecial : null,
    fecha: format(new Date(), 'yyyy-MM-dd'),
    es_servicio_movil: esServicioMovil
  }])
  .select()
  .single();

      if (consultaError) throw consultaError;

      // Insertar detalles
      const detalles = descripcion.map(d => ({
        consulta_id: consultaData.id,
        sub_estudio_id: d.sub_estudio_id,
        precio: d.precio
      }));

      const { error: detallesError } = await supabase
        .from('detalle_consultas')
        .insert(detalles);

      if (detallesError) throw detallesError;

      // Preparar datos para el recibo
      const fechaHora = new Date();
      // Si tiene médico (aunque no sea referente marcado), mostrar en impresión
      const tieneMedico = medicoActual !== null;
      const esReferente = tieneMedico && !sinInfoMedico;
      
      const estudiosRecibo = descripcion.map(d => {
        const subEstudio = subEstudios.find(se => se.id === d.sub_estudio_id);
        return {
          nombre: subEstudio?.nombre || 'Estudio',
          precio: d.precio
        };
      });

      const datosRecibo = {
        numeroPaciente: consultaData.numero_paciente,
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

      // Preguntar qué tipo de recibo imprimir
      const tipoRecibo = confirm(
        '¿Qué recibo desea imprimir?\n\n' +
        'Aceptar (OK) = Recibo Completo (con precios)\n' +
        'Cancelar = Orden para Médico (sin precios)'
      );

      if (tipoRecibo) {
        // Recibo completo
        const htmlCompleto = generarReciboCompleto(datosRecibo);
        abrirRecibo(htmlCompleto, 'Recibo Completo');
      } else {
        // Recibo para médico
        const htmlMedico = generarReciboMedico(datosRecibo);
        abrirRecibo(htmlMedico, 'Orden Médico');
      }
      
      // Limpiar formulario después de imprimir
      setTimeout(() => {
        alert('Consulta guardada exitosamente');
        setPacienteActual(null);
        setMedicoActual(null);
        setSinInfoMedico(false);
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
      }, 1000);
      
    } catch (error) {
      console.error('Error al guardar consulta:', error);
      alert('Error al guardar consulta: ' + (error as any).message);
    }
  };

  const totales = calcularTotales();
  const horarioNormal = esHorarioNormal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">CONRAD - Centro de Diagnóstico</h1>
          <p className="text-blue-100 mt-2">Sistema de Gestión de Consultas</p>
        </div>
      </header>


      {/* Barra de botones principales */}
      <div className="container mx-auto py-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowNuevoModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo
          </button>
          <button 
            onClick={() => onNavigate('productos')}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText size={20} />
            Productos
          </button>
          <button 
            onClick={() => onNavigate('referentes')}
            className="btn-secondary flex items-center gap-2"
          >
            <Users size={20} />
            Referentes
          </button>
          <button 
            onClick={() => onNavigate('pacientes')}
            className="btn-secondary flex items-center gap-2"
          >
            <Users size={20} />
            Pacientes
          </button>
          <button 
            onClick={() => onNavigate('cuadre')}
            className="btn-secondary flex items-center gap-2"
          >
            <BarChart3 size={20} />
            Cuadre Diario
          </button>
          <button 
            onClick={() => onNavigate('cuadre-quincenal')}
            className="btn-secondary flex items-center gap-2"
          >
            <Calendar size={20} />
            Cuadre Quincenal
          </button>
          <button 
            onClick={() => onNavigate('estadisticas')}
            className="btn-secondary flex items-center gap-2"
          >
            <BarChart3 size={20} />
            Estadísticas
          </button>
          <button 
            onClick={() => onNavigate('reportes')}
            className="btn-secondary flex items-center gap-2"
          >
            <FileSpreadsheet size={20} />
            Reportes
          </button>
          <button 
            onClick={() => onNavigate('comisiones')}
            className="btn-secondary flex items-center gap-2"
          >
            <DollarSign size={20} />
            Comisiones
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Información del paciente */}
          <div className="lg:col-span-2 space-y-6">
            {pacienteActual && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-3">Información del Paciente</h3>
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
                  <h3 className="text-xl font-bold text-blue-900 mb-2">Bienvenido a CONRAD</h3>
                  <p className="text-blue-700 mb-4">Centro de Diagnóstico - Para comenzar, registra un nuevo paciente</p>
                  <button
                    onClick={() => setShowNuevoModal(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
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
                    className="mr-2"
                  />
                  Social
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
                    className="mr-2"
                  />
                  Normal {!horarioNormal && '(Requiere justificación)'}
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
                    disabled={horarioNormal}
                    className="mr-2"
                  />
                  Especial {horarioNormal && '(Solo fuera de horario)'}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={tipoCobro === 'personalizado'}
                    onChange={() => {
                      setTipoCobro('personalizado');
                      setShowJustificacion(true);
                    }}
                    className="mr-2"
                  />
                  <span className="text-purple-600 font-medium">Personalizado</span>
                </label>
              </div>

              {/* Modal de justificación */}
              {showJustificacion && (tipoCobro === 'normal' && !horarioNormal || tipoCobro === 'personalizado') && (
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
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    * Esta justificación quedará registrada en el sistema
                  </p>
                </div>
              )}
            </div>

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
                />
                
                <Autocomplete
                  label="Sub-Estudio"
                  options={subEstudiosFiltrados.map(se => ({ id: se.id || '', nombre: se.nombre }))}
                  value={subEstudioSeleccionado}
                  onChange={setSubEstudioSeleccionado}
                  placeholder="Seleccione sub-estudio"
                  disabled={!estudioSeleccionado}
                />
              </div>

              <button
                onClick={agregarSubEstudio}
                className="btn-primary mt-4"
                disabled={!subEstudioSeleccionado}
              >
                Agregar a Descripción
              </button>
            </div>

            {/* Descripción */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Descripción</h3>
              {descripcion.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay estudios agregados</p>
              ) : (
                <div className="space-y-2">
                  {descripcion.map((item, index) => {
                    const subEstudio = subEstudios.find(se => se.id === item.sub_estudio_id);
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{subEstudio?.nombre}</div>
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
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">Q {item.precio.toFixed(2)}</div>
                          )}
                        </div>
                        <button
                          onClick={() => eliminarDeDescripcion(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
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
                    disabled={!requiereFactura}
                  />
                </div>

                <div>
                  <label className="label">Forma de Pago</label>
                  <select
                    className="input-field"
                    value={formaPago}
                    onChange={(e) => {
                      setFormaPago(e.target.value as FormaPago);
                      setNumeroTransferencia('');
                      setNumeroVoucher('');
                    }}
                  >
                    {requiereFactura ? (
                      <>
                        <option value="efectivo_facturado">Efectivo Facturado (Depósito)</option>
                        <option value="tarjeta">Tarjeta Facturado</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                      </>
                    ) : (
                      <>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="estado_cuenta">Estado de Cuenta</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Campo para número de transferencia */}
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
                    />
                  </div>
                )}

                {/* Campo para número de voucher */}
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
                  />
                </div>
              </div>
            </div>

            {/* Totales */}
            <div className="card bg-blue-50">
              <h3 className="text-lg font-semibold mb-3">Totales</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sub-Total:</span>
                  <span className="font-semibold">Q {totales.subTotal.toFixed(2)}</span>
                </div>
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
                <div className="flex justify-between text-lg border-t pt-2 mt-2">
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
                Limpiar
              </button>
              <button
                onClick={handleImprimir}
                className="btn-primary w-full"
                disabled={!pacienteActual || descripcion.length === 0}
              >
                Imprimir
              </button>
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
    </div>
  );
};