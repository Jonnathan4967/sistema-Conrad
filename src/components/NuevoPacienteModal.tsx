import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Autocomplete } from './Autocomplete';
import { Paciente, Medico } from '../types';
import { departamentosGuatemala, municipiosGuatemala } from '../data/guatemala';
import { supabase } from '../lib/supabase';

interface NuevoPacienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ✅ MODIFICADO: Se agrega 5.º parámetro "establecimiento"
  onSave: (paciente: Paciente, medico: Medico | null, sinInfoMedico: boolean, esServicioMovil: boolean, establecimiento: string) => void;
}

export const NuevoPacienteModal: React.FC<NuevoPacienteModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  // Estado del paciente
  const [primerNombre, setPrimerNombre] = useState('');
  const [segundoNombre, setSegundoNombre] = useState('');
  const [primerApellido, setPrimerApellido] = useState('');
  const [segundoApellido, setSegundoApellido] = useState('');
  const [edadPaciente, setEdadPaciente] = useState('');
  const [tipoEdad, setTipoEdad] = useState<'años' | 'meses' | 'días'>('años');
  const [telefonoPaciente, setTelefonoPaciente] = useState('');
  const [departamentoPaciente, setDepartamentoPaciente] = useState('');
  const [municipioPaciente, setMunicipioPaciente] = useState('');

  // Estado del médico
  const [esReferente, setEsReferente] = useState(true);
  const [sinInformacion, setSinInformacion] = useState(false);
  const [esServicioMovil, setEsServicioMovil] = useState(false);
  const [nombreMedico, setNombreMedico] = useState('');
  const [telefonoMedico, setTelefonoMedico] = useState('');
  const [departamentoMedico, setDepartamentoMedico] = useState('');
  const [municipioMedico, setMunicipioMedico] = useState('');
  const [direccionMedico, setDireccionMedico] = useState('');

  // ✅ NUEVO: Estado para el establecimiento del Servicio Móvil
  const [establecimientoMovil, setEstablecimientoMovil] = useState('');

  // Lista de médicos referentes
  const [medicosReferentes, setMedicosReferentes] = useState<Medico[]>([]);
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<Medico | null>(null);

  // Cargar médicos referentes
  useEffect(() => {
    if (isOpen) {
      cargarMedicosReferentes();
    }
  }, [isOpen]);

  const cargarMedicosReferentes = async () => {
    try {
      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .eq('es_referente', true)
        .eq('activo', true);

      if (error) throw error;
      setMedicosReferentes(data || []);
    } catch (error) {
      console.error('Error al cargar médicos referentes:', error);
    }
  };

  // Filtrar municipios según departamento seleccionado
  const municipiosPacienteFiltrados = municipiosGuatemala.filter(
    m => m.departamento_id === departamentoPaciente
  );

  const municipiosMedicoFiltrados = municipiosGuatemala.filter(
    m => m.departamento_id === departamentoMedico
  );

  // Manejar selección de médico referente
  const handleMedicoReferenteChange = (medicoId: string) => {
    const medico = medicosReferentes.find(m => m.id === medicoId);
    if (medico) {
      setMedicoSeleccionado(medico);
      setNombreMedico(medico.id || '');
      setTelefonoMedico(medico.telefono);
      setDepartamentoMedico(medico.departamento);
      setMunicipioMedico(medico.municipio);
      setDireccionMedico(medico.direccion);
    }
  };

  // Manejar cambio de "Sin información"
  const handleSinInformacionChange = (checked: boolean) => {
    setSinInformacion(checked);
    if (checked) {
      setNombreMedico('');
      setTelefonoMedico('');
      setDepartamentoMedico('');
      setMunicipioMedico('');
      setDireccionMedico('');
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setPrimerNombre('');
    setSegundoNombre('');
    setPrimerApellido('');
    setSegundoApellido('');
    setEdadPaciente('');
    setTelefonoPaciente('');
    setDepartamentoPaciente('');
    setMunicipioPaciente('');
    setEsReferente(true);
    setSinInformacion(false);
    setEsServicioMovil(false);
    setNombreMedico('');
    setTelefonoMedico('');
    setDepartamentoMedico('');
    setMunicipioMedico('');
    setDireccionMedico('');
    setMedicoSeleccionado(null);
    setEstablecimientoMovil(''); // ✅ NUEVO: limpiar establecimiento
  };

  // Guardar
  const handleGuardar = () => {
    // Validar datos del paciente
    if (!primerNombre.trim() || !primerApellido.trim() || !edadPaciente || !telefonoPaciente.trim() || !departamentoPaciente || !municipioPaciente) {
      alert('Por favor complete todos los campos obligatorios del paciente:\n- Primer Nombre\n- Primer Apellido\n- Edad\n- Teléfono\n- Departamento\n- Municipio');
      return;
    }

    // ✅ NUEVO: Validar establecimiento si es Servicio Móvil
    if (esServicioMovil && !establecimientoMovil.trim()) {
      alert('El nombre del establecimiento es requerido para Servicios Móviles.');
      return;
    }

    const tieneMedico = nombreMedico.trim() !== '';

    if (tieneMedico && !sinInformacion) {
      if (!telefonoMedico.trim() || !departamentoMedico || !municipioMedico || !direccionMedico.trim()) {
        alert('Por favor complete todos los campos del médico o marque "Sin información"');
        return;
      }
    }

    // Convertir edad a años para BD
    let edadEnAnios = parseInt(edadPaciente);
    if (tipoEdad === 'meses') {
      edadEnAnios = Math.floor(edadEnAnios / 12);
    } else if (tipoEdad === 'días') {
      edadEnAnios = Math.floor(edadEnAnios / 365);
    }

    // Concatenar nombre completo
    const nombreCompleto = [
      primerNombre.trim(),
      segundoNombre.trim(),
      primerApellido.trim(),
      segundoApellido.trim()
    ].filter(Boolean).join(' ');

    const paciente: Paciente = {
      nombre: nombreCompleto,
      primer_nombre: primerNombre.trim(),
      segundo_nombre: segundoNombre.trim() || undefined,
      primer_apellido: primerApellido.trim(),
      segundo_apellido: segundoApellido.trim() || undefined,
      edad: edadEnAnios || 0,
      edad_valor: parseInt(edadPaciente),
      edad_tipo: tipoEdad,
      telefono: telefonoPaciente,
      departamento: departamentoPaciente,
      municipio: municipioPaciente
    };

    let medico: Medico | null = null;

    if (tieneMedico && !sinInformacion) {
      if (esReferente && medicoSeleccionado) {
        medico = medicoSeleccionado;
      } else {
        medico = {
          nombre: nombreMedico,
          telefono: telefonoMedico,
          departamento: departamentoMedico,
          municipio: municipioMedico,
          direccion: direccionMedico,
          es_referente: esReferente
        };
      }
    }

    const sinInfoParaImprimir = !tieneMedico || sinInformacion;

    // ✅ MODIFICADO: Pasar establecimiento como 5.º parámetro
    onSave(paciente, medico, sinInfoParaImprimir, esServicioMovil, establecimientoMovil.trim());
    resetForm();
  };

  // Cancelar
  const handleCancelar = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Nuevo Paciente</h2>
          <button
            onClick={handleCancelar}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Sección Paciente */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-4 text-blue-700">Datos del Paciente</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Primer Nombre <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input-field"
                  value={primerNombre}
                  onChange={(e) => setPrimerNombre(e.target.value)}
                  placeholder="Ej: Juan"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Segundo Nombre (opcional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={segundoNombre}
                  onChange={(e) => setSegundoNombre(e.target.value)}
                  placeholder="Ej: Carlos"
                />
              </div>

              <div>
                <label className="label">Primer Apellido <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input-field"
                  value={primerApellido}
                  onChange={(e) => setPrimerApellido(e.target.value)}
                  placeholder="Ej: Pérez"
                />
              </div>

              <div>
                <label className="label">Segundo Apellido (opcional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={segundoApellido}
                  onChange={(e) => setSegundoApellido(e.target.value)}
                  placeholder="Ej: García"
                />
              </div>

              <div>
                <label className="label">Edad <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setTipoEdad('días')}
                    className={`px-3 py-1 rounded text-sm ${tipoEdad === 'días' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    Días
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEdad('meses')}
                    className={`px-3 py-1 rounded text-sm ${tipoEdad === 'meses' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEdad('años')}
                    className={`px-3 py-1 rounded text-sm ${tipoEdad === 'años' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    Años
                  </button>
                </div>
                <input
                  type="number"
                  className="input-field"
                  value={edadPaciente}
                  onChange={(e) => setEdadPaciente(e.target.value.replace(/\D/g, ''))}
                  placeholder={`Edad en ${tipoEdad}`}
                  min="0"
                  max={tipoEdad === 'años' ? '120' : tipoEdad === 'meses' ? '1440' : '43800'}
                />
              </div>

              <div>
                <label className="label">Número de Teléfono <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  className="input-field"
                  value={telefonoPaciente}
                  onChange={(e) => setTelefonoPaciente(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678"
                  maxLength={8}
                />
              </div>

              <Autocomplete
                label="Departamento"
                options={departamentosGuatemala}
                value={departamentoPaciente}
                onChange={(val) => {
                  setDepartamentoPaciente(val);
                  setMunicipioPaciente('');
                }}
                placeholder="Seleccione departamento"
                required
              />

              <Autocomplete
                label="Municipio"
                options={municipiosPacienteFiltrados}
                value={municipioPaciente}
                onChange={setMunicipioPaciente}
                placeholder="Seleccione municipio"
                disabled={!departamentoPaciente}
                required
              />
            </div>
          </div>

          {/* Sección Médico */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-4 text-green-700">Datos del Médico</h3>

            <div className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={esReferente && !esServicioMovil}
                    onChange={() => {
                      setEsReferente(true);
                      setEsServicioMovil(false);
                      setEstablecimientoMovil('');
                      setNombreMedico('');
                      setTelefonoMedico('');
                      setDepartamentoMedico('');
                      setMunicipioMedico('');
                      setDireccionMedico('');
                    }}
                    className="mr-2"
                    disabled={sinInformacion}
                  />
                  Referente
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!esReferente && !esServicioMovil}
                    onChange={() => {
                      setEsReferente(false);
                      setEsServicioMovil(false);
                      setEstablecimientoMovil('');
                      setMedicoSeleccionado(null);
                      setNombreMedico('');
                      setTelefonoMedico('');
                      setDepartamentoMedico('');
                      setMunicipioMedico('');
                      setDireccionMedico('');
                    }}
                    className="mr-2"
                    disabled={sinInformacion}
                  />
                  No Referente
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={esServicioMovil}
                    onChange={() => {
                      setEsServicioMovil(true);
                      setEsReferente(false);
                      setMedicoSeleccionado(null);
                      setNombreMedico('');
                      setTelefonoMedico('');
                      setDepartamentoMedico('');
                      setMunicipioMedico('');
                      setDireccionMedico('');
                    }}
                    className="mr-2"
                    disabled={sinInformacion}
                  />
                  <span className="text-purple-700 font-medium">📱 Servicio Móvil</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sinInfo"
                  checked={sinInformacion}
                  onChange={(e) => handleSinInformacionChange(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="sinInfo" className="text-sm font-medium text-gray-700">
                  Sin información
                </label>
              </div>

              {/* ✅ SERVICIO MÓVIL: nota + campo establecimiento */}
              {esServicioMovil && (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm text-purple-800">
                      <strong>📱 Servicio Móvil:</strong> Este registro no cuenta como paciente regular ni genera comisión. Solo se registran estudios RX con precio personalizado.
                    </p>
                  </div>

                  {/* ✅ NUEVO: Campo Establecimiento */}
                  <div>
                    <label className="label">
                      🏥 Establecimiento / Lugar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input-field border-orange-300 focus:ring-orange-400 focus:border-orange-400"
                      value={establecimientoMovil}
                      onChange={(e) => setEstablecimientoMovil(e.target.value)}
                      placeholder="Ej: Hospital San Juan de Dios, Clínica Santa María"
                      autoFocus
                    />
                    <p className="text-xs text-orange-600 mt-1">
                      * Nombre del lugar donde se realizará el servicio móvil
                    </p>
                  </div>
                </div>
              )}

              {/* Campos de médico - Solo si NO es servicio móvil */}
              {!esServicioMovil && (
                <>
                  {esReferente && !sinInformacion ? (
                    <Autocomplete
                      label="Nombre del Médico"
                      options={medicosReferentes.map(m => ({ id: m.id || '', nombre: m.nombre }))}
                      value={nombreMedico}
                      onChange={handleMedicoReferenteChange}
                      placeholder="Buscar médico referente"
                      disabled={sinInformacion}
                      required={!sinInformacion}
                    />
                  ) : (
                    <div>
                      <label className="label">
                        Nombre {!sinInformacion && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={nombreMedico}
                        onChange={(e) => setNombreMedico(e.target.value)}
                        placeholder="Nombre del médico"
                        disabled={sinInformacion}
                      />
                    </div>
                  )}

                  <div>
                    <label className="label">
                      Número de Teléfono {!sinInformacion && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      value={telefonoMedico}
                      onChange={(e) => setTelefonoMedico(e.target.value.replace(/\D/g, ''))}
                      placeholder="12345678"
                      disabled={sinInformacion || (esReferente && medicoSeleccionado !== null)}
                      maxLength={8}
                    />
                  </div>

                  <Autocomplete
                    label="Departamento"
                    options={departamentosGuatemala}
                    value={departamentoMedico}
                    onChange={(val) => {
                      setDepartamentoMedico(val);
                      setMunicipioMedico('');
                    }}
                    placeholder="Seleccione departamento"
                    disabled={sinInformacion || (esReferente && medicoSeleccionado !== null)}
                    required={!sinInformacion}
                  />

                  <Autocomplete
                    label="Municipio"
                    options={municipiosMedicoFiltrados}
                    value={municipioMedico}
                    onChange={setMunicipioMedico}
                    placeholder="Seleccione municipio"
                    disabled={sinInformacion || !departamentoMedico || (esReferente && medicoSeleccionado !== null)}
                    required={!sinInformacion}
                  />

                  <div>
                    <label className="label">
                      Dirección {!sinInformacion && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      className="input-field"
                      value={direccionMedico}
                      onChange={(e) => setDireccionMedico(e.target.value)}
                      placeholder="Dirección completa"
                      disabled={sinInformacion || (esReferente && medicoSeleccionado !== null)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button onClick={handleCancelar} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleGuardar} className="btn-primary">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};