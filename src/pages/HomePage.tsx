import React, { useState, useEffect } from 'react';
import { Plus, FileText, Users, BarChart3, Trash2 } from 'lucide-react';
import { NuevoPacienteModal } from '../components/NuevoPacienteModal';
import { Autocomplete } from '../components/Autocomplete';
import { Paciente, Medico, SubEstudio, TipoCobro, FormaPago, DetalleConsulta } from '../types';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [pacienteActual, setPacienteActual] = useState<(Paciente & { id: string }) | null>(null);
  const [medicoActual, setMedicoActual] = useState<Medico | null>(null);
  const [sinInfoMedico, setSinInfoMedico] = useState(false);
  const [consultasHoy, setConsultasHoy] = useState<any[]>([]);

  // Estados del formulario principal
  const [tipoCobro, setTipoCobro] = useState<TipoCobro>('normal');
  const [estudios, setEstudios] = useState<any[]>([]);
  const [subEstudios, setSubEstudios] = useState<SubEstudio[]>([]);
  const [estudioSeleccionado, setEstudioSeleccionado] = useState('');
  const [subEstudioSeleccionado, setSubEstudioSeleccionado] = useState('');
  const [descripcion, setDescripcion] = useState<DetalleConsulta[]>([]);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [nit, setNit] = useState('');
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo');
  const [numeroFactura, setNumeroFactura] = useState('');

  // Cargar estudios y sub-estudios
  useEffect(() => {
    cargarEstudios();
    cargarSubEstudios();
    cargarConsultasHoy();
  }, []);

  const cargarConsultasHoy = async () => {
    try {
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre),
          medicos(nombre)
        `)
        .eq('fecha', hoy)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setConsultasHoy(data || []);
    } catch (error) {
      console.error('Error al cargar consultas:', error);
    }
  };

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

  // Agregar sub-estudio a descripción
  const agregarSubEstudio = () => {
    if (!subEstudioSeleccionado) return;

    const subEstudio = subEstudios.find(se => se.id === subEstudioSeleccionado);
    if (!subEstudio) return;

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
  const handleGuardarPaciente = async (paciente: Paciente, medico: Medico | null, sinInfo: boolean) => {
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
      setShowNuevoModal(false);
      alert('Paciente guardado exitosamente');
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

    const totales = calcularTotales();

    try {
      // Crear consulta
      const { data: consultaData, error: consultaError } = await supabase
        .from('consultas')
        .insert([{
          paciente_id: pacienteActual.id,
          medico_id: medicoActual?.id || null,
          tipo_cobro: tipoCobro,
          requiere_factura: requiereFactura,
          nit: requiereFactura ? nit : null,
          forma_pago: formaPago,
          numero_factura: numeroFactura || null,
          sin_informacion_medico: sinInfoMedico,
          fecha: format(new Date(), 'yyyy-MM-dd')
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

      // Generar recibo tipo ticket
      const ventanaImpresion = window.open('', '', 'height=600,width=400');
      if (ventanaImpresion) {
        const fechaHora = new Date();
        const esReferente = medicoActual && !sinInfoMedico;
        
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Recibo</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 11pt;
                line-height: 1.4;
                padding: 10mm;
                width: 80mm;
                background: white;
                color: black;
              }
              .recibo {
                border: 2px solid black;
                padding: 5mm;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid black;
                padding-bottom: 3mm;
                margin-bottom: 3mm;
              }
              .fecha-hora {
                text-align: right;
                font-size: 10pt;
                margin-bottom: 3mm;
              }
              .row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2mm;
                font-size: 11pt;
              }
              .label {
                font-weight: bold;
              }
              .section {
                border-top: 1px solid black;
                padding-top: 2mm;
                margin-top: 2mm;
              }
              .estudios {
                margin: 3mm 0;
              }
              .estudio-item {
                margin-bottom: 2mm;
                padding-left: 2mm;
              }
              .total {
                border-top: 2px solid black;
                border-bottom: 2px solid black;
                padding: 2mm 0;
                margin-top: 3mm;
                font-weight: bold;
                font-size: 12pt;
              }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="recibo">
              <div class="header">
                <div style="font-weight: bold; font-size: 12pt;">CONRAD</div>
                <div style="font-size: 10pt;">Centro de Diagnóstico</div>
                <div style="font-size: 9pt;">Recibo de Consulta</div>
              </div>

              <div class="fecha-hora">
                FECHA: ${format(fechaHora, 'dd/MM/yyyy')}<br>
                HORA: ${format(fechaHora, 'HH:mm')}
              </div>

              <div class="row">
                <span class="label">NOMBRE:</span>
                <span>${pacienteActual.nombre}</span>
              </div>

              <div class="row">
                <span class="label">EDAD:</span>
                <span>${pacienteActual.edad} años</span>
              </div>

              <div class="row">
                <span class="label">TELÉFONO:</span>
                <span>${pacienteActual.telefono}</span>
              </div>

              <div class="row">
                <span class="label">REFERENTE:</span>
                <span>${esReferente ? 'SÍ' : 'NO'}</span>
              </div>

              ${esReferente ? `
              <div class="row">
                <span class="label">DR/DRA:</span>
                <span>${medicoActual?.nombre}</span>
              </div>
              ` : ''}

              <div class="section estudios">
                <div class="label" style="margin-bottom: 2mm;">ESTUDIOS:</div>
                ${descripcion.map(d => {
                  const subEstudio = subEstudios.find(se => se.id === d.sub_estudio_id);
                  return `
                    <div class="estudio-item">
                      <div>${subEstudio?.nombre || 'Estudio'}</div>
                      <div class="row" style="margin-top: 1mm;">
                        <span>Precio:</span>
                        <span>Q ${d.precio.toFixed(2)}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="total">
                <div class="row">
                  <span>TOTAL:</span>
                  <span>Q ${totales.total.toFixed(2)}</span>
                </div>
              </div>

              <div class="section" style="text-align: center; font-size: 9pt; margin-top: 5mm;">
                Gracias por su preferencia
              </div>
            </div>

            <div style="text-align: center; margin-top: 10mm;">
              <button onclick="window.print()" style="padding: 8px 16px; background: black; color: white; border: none; cursor: pointer; font-size: 11pt; margin-right: 5px;">
                IMPRIMIR
              </button>
              <button onclick="window.close()" style="padding: 8px 16px; background: #666; color: white; border: none; cursor: pointer; font-size: 11pt;">
                CERRAR
              </button>
            </div>
          </body>
          </html>
        `;

        ventanaImpresion.document.write(html);
        ventanaImpresion.document.close();
      }

      alert('Consulta guardada exitosamente');
      
      // Recargar consultas del día
      cargarConsultasHoy();
      
      // Limpiar formulario
      setTimeout(() => {
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
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">CONRAD - Centro de Diagnóstico</h1>
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
            onClick={() => onNavigate('cuadre')}
            className="btn-secondary flex items-center gap-2"
          >
            <BarChart3 size={20} />
            Cuadre Diario
          </button>
          <button 
            onClick={() => onNavigate('estadisticas')}
            className="btn-secondary flex items-center gap-2"
          >
            <BarChart3 size={20} />
            Estadísticas
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

            {/* Consultas del día */}
            {!pacienteActual && consultasHoy.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">📋 Consultas de Hoy</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {consultasHoy.slice(0, 10).map((consulta, index) => (
                    <div key={consulta.id} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                      <div>
                        <div className="font-medium">#{index + 1} - {consulta.pacientes?.nombre}</div>
                        <div className="text-sm text-gray-600">
                          {consulta.sin_informacion_medico ? 'Sin médico' : (consulta.medicos?.nombre || 'N/A')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {consulta.created_at ? format(new Date(consulta.created_at), 'HH:mm') : 'N/A'}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          consulta.tipo_cobro === 'normal' ? 'bg-blue-100 text-blue-700' :
                          consulta.tipo_cobro === 'social' ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {consulta.tipo_cobro.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {consultasHoy.length > 10 && (
                  <p className="text-center text-sm text-gray-500 mt-3">
                    Y {consultasHoy.length - 10} consultas más... 
                    <button 
                      onClick={() => onNavigate('cuadre')}
                      className="text-blue-600 hover:underline ml-2"
                    >
                      Ver todas
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Tipo de cobro */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Tipo de Cobro</h3>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={tipoCobro === 'social'}
                    onChange={() => setTipoCobro('social')}
                    className="mr-2"
                  />
                  Social
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={tipoCobro === 'normal'}
                    onChange={() => setTipoCobro('normal')}
                    disabled={!horarioNormal}
                    className="mr-2"
                  />
                  Normal {!horarioNormal && '(Fuera de horario)'}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={tipoCobro === 'especial'}
                    onChange={() => setTipoCobro('especial')}
                    disabled={horarioNormal}
                    className="mr-2"
                  />
                  Especial {horarioNormal && '(Solo fuera de horario)'}
                </label>
              </div>
            </div>

            {/* Estudios */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Estudios</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Autocomplete
                  label="Estudio"
                  options={estudios.map(e => ({ id: e.id, nombre: e.nombre }))}
                  value={estudioSeleccionado}
                  onChange={(val) => {
                    setEstudioSeleccionado(val);
                    setSubEstudioSeleccionado('');
                  }}
                  placeholder="Seleccione estudio"
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
                        <div>
                          <div className="font-medium">{subEstudio?.nombre}</div>
                          <div className="text-sm text-gray-600">Q {item.precio.toFixed(2)}</div>
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
                    onChange={(e) => setFormaPago(e.target.value as FormaPago)}
                  >
                    {requiereFactura ? (
                      <>
                        <option value="efectivo_facturado">Efectivo Facturado (Depósito)</option>
                        <option value="tarjeta">Tarjeta Facturado</option>
                      </>
                    ) : (
                      <>
                        <option value="efectivo">Efectivo</option>
                        <option value="estado_cuenta">Estado de Cuenta</option>
                      </>
                    )}
                  </select>
                </div>

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
