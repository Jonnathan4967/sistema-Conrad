import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Autocomplete } from './Autocomplete';
import { supabase } from '../lib/supabase';
import { SubEstudio, TipoCobro } from '../types';
import { generarReciboCompleto, generarReciboMedico, abrirRecibo } from '../lib/recibos';

interface AgregarEstudioModalProps {
  consulta: any;
  onClose: () => void;
  onSave: () => void;
}

export const AgregarEstudioModal: React.FC<AgregarEstudioModalProps> = ({
  consulta,
  onClose,
  onSave
}) => {
  const [estudios, setEstudios] = useState<any[]>([]);
  const [subEstudios, setSubEstudios] = useState<SubEstudio[]>([]);
  const [estudioSeleccionado, setEstudioSeleccionado] = useState('');
  const [subEstudioSeleccionado, setSubEstudioSeleccionado] = useState('');
  const [nuevosEstudios, setNuevosEstudios] = useState<any[]>([]);
  const [tipoCobro, setTipoCobro] = useState<TipoCobro>(consulta.tipo_cobro);
  const [formaPago, setFormaPago] = useState<string>(consulta.forma_pago);
  const [requiereFactura, setRequiereFactura] = useState<boolean>(consulta.requiere_factura || false);
  
  // ✅ NUEVO: Estados para servicios móviles
  const [incluyePlacas, setIncluyePlacas] = useState(false);
  const [precioPlacas, setPrecioPlacas] = useState(0);
  const [incluyeInforme, setIncluyeInforme] = useState(false);
  const [precioInforme, setPrecioInforme] = useState(0);

  const esServicioMovil = consulta.es_servicio_movil === true;

  useEffect(() => {
    cargarEstudios();
    cargarSubEstudios();
  }, []);

  const cargarEstudios = async () => {
    try {
      const { data, error } = await supabase
        .from('estudios')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      
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
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      setSubEstudios(data || []);
    } catch (error) {
      console.error('Error al cargar sub-estudios:', error);
    }
  };

  // ✅ NUEVO: Filtrar estudios según si es servicio móvil
  const estudiosDisponibles = esServicioMovil
    ? estudios.filter(e => e.nombre.toUpperCase() === 'RX')
    : estudios;

  const subEstudiosFiltrados = subEstudios.filter(
    se => se.estudio_id === estudioSeleccionado
  );

  const agregarEstudio = () => {
    if (!estudioSeleccionado || !subEstudioSeleccionado) {
      alert('Seleccione un estudio y sub-estudio');
      return;
    }

    const subEstudio = subEstudios.find(se => se.id === subEstudioSeleccionado);
    if (!subEstudio) return;

    // ✅ NUEVO: Validar que solo sea RX para móviles
    if (esServicioMovil) {
      const estudio = estudios.find(e => e.id === subEstudio.estudio_id);
      if (estudio && estudio.nombre.toUpperCase() !== 'RX') {
        alert('⚠️ Servicios Móviles: Solo se permiten estudios de RX');
        return;
      }
    }

    const precio = tipoCobro === 'normal' ? subEstudio.precio_normal :
                   tipoCobro === 'social' ? subEstudio.precio_social :
                   tipoCobro === 'personalizado' ? subEstudio.precio_especial :
                   subEstudio.precio_especial;

    setNuevosEstudios([...nuevosEstudios, {
      sub_estudio_id: subEstudio.id,
      nombre: subEstudio.nombre,
      precio
    }]);

    setEstudioSeleccionado('');
    setSubEstudioSeleccionado('');
  };

  const eliminarEstudio = (index: number) => {
    setNuevosEstudios(nuevosEstudios.filter((_, i) => i !== index));
  };

  const handleGuardar = async () => {
    if (nuevosEstudios.length === 0) {
      alert('Agregue al menos un estudio');
      return;
    }

    try {
      // Capturar datos según forma de pago y factura
      let numeroFactura = null;
      let nit = null;
      let numeroVoucher = null;
      let numeroTransferencia = null;

      // Si requiere factura, pedir número de factura y NIT
      if (requiereFactura) {
        const facturaInput = prompt('Ingrese el número de factura:');
        if (facturaInput && facturaInput.trim() !== '') {
          numeroFactura = facturaInput.trim();
        }

        const nitInput = prompt('Ingrese el NIT (o C/F si es consumidor final):');
        if (nitInput && nitInput.trim() !== '') {
          nit = nitInput.trim();
        }
      }

      // Si es tarjeta, pedir número de voucher
      if (formaPago === 'tarjeta') {
        const voucherInput = prompt('Ingrese el número de voucher de tarjeta:');
        if (voucherInput && voucherInput.trim() !== '') {
          numeroVoucher = voucherInput.trim();
        }
      }

      // Si es transferencia, pedir número de transferencia
      if (formaPago === 'transferencia') {
        const transferenciaInput = prompt('Ingrese el número de transferencia:');
        if (transferenciaInput && transferenciaInput.trim() !== '') {
          numeroTransferencia = transferenciaInput.trim();
        }
      }

      // ✅ NUEVO: Preparar datos de actualización para móviles
      const updateConsultaData: any = { 
        forma_pago: formaPago,
        requiere_factura: requiereFactura
      };

      // ✅ NUEVO: Si es servicio móvil, actualizar opciones de placas/informe
      if (esServicioMovil) {
        if (incluyePlacas) {
          updateConsultaData.movil_incluye_placas = true;
          updateConsultaData.movil_precio_placas = precioPlacas;
        }
        
        if (incluyeInforme) {
          updateConsultaData.movil_incluye_informe = true;
          updateConsultaData.movil_precio_informe = precioInforme;
        }
      }

      // Actualizar forma de pago, requiere_factura y opciones de móviles
      const { error: errorConsulta } = await supabase
        .from('consultas')
        .update(updateConsultaData)
        .eq('id', consulta.id);

      if (errorConsulta) throw errorConsulta;

      // Insertar nuevos detalles con sus datos individuales
      const detalles = nuevosEstudios.map(e => ({
        consulta_id: consulta.id,
        sub_estudio_id: e.sub_estudio_id,
        precio: e.precio,
        es_adicional: true,
        fecha_agregado: new Date().toISOString(),
        // Guardar datos individuales en cada detalle
        numero_factura: numeroFactura,
        nit: nit,
        numero_voucher: numeroVoucher,
        numero_transferencia: numeroTransferencia
      }));

      const { error } = await supabase
        .from('detalle_consultas')
        .insert(detalles);

      if (error) throw error;

      alert('Estudios agregados y forma de pago actualizada');
      
      // Preguntar si desea imprimir los estudios adicionales
      const deseaImprimir = confirm('¿Desea imprimir los estudios adicionales?');
      
      if (deseaImprimir) {
        imprimirEstudiosAdicionales();
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error al agregar estudios:', error);
      alert('Error al agregar estudios');
    }
  };

  const imprimirEstudiosAdicionales = () => {
    // Verificar si tiene médico referente
    const tieneMedico = !consulta.sin_informacion_medico && consulta.medicos;
    const esReferente = tieneMedico;
    
    const estudiosRecibo = nuevosEstudios.map(e => ({
      nombre: e.nombre,
      precio: e.precio
    }));

    // ✅ NUEVO: Agregar placas e informe al recibo si es servicio móvil
    if (esServicioMovil) {
      if (incluyePlacas) {
        estudiosRecibo.push({
          nombre: '📋 Placas (Extra)',
          precio: precioPlacas
        });
      }
      if (incluyeInforme) {
        estudiosRecibo.push({
          nombre: '📄 Informe (Extra)',
          precio: precioInforme
        });
      }
    }

    const totalAdicional = estudiosRecibo.reduce((sum, e) => sum + e.precio, 0);

    const datosRecibo = {
      paciente: {
        nombre: consulta.pacientes?.nombre || 'Paciente',
        edad: consulta.pacientes?.edad || 0,
        telefono: consulta.pacientes?.telefono || ''
      },
      medico: tieneMedico ? { nombre: consulta.medicos.nombre } : undefined,
      esReferente,
      estudios: estudiosRecibo,
      total: totalAdicional,
      formaPago: formaPago,
      fecha: new Date(),
      sinInfoMedico: consulta.sin_informacion_medico || false
    };

    // Preguntar qué tipo de recibo imprimir
    const tipoRecibo = confirm(
      '¿Qué recibo desea imprimir?\n\n' +
      'Aceptar (OK) = Recibo Completo (con precios)\n' +
      'Cancelar = Orden para Médico (sin precios)'
    );

    if (tipoRecibo) {
      const htmlCompleto = generarReciboCompleto(datosRecibo);
      abrirRecibo(htmlCompleto, 'Recibo Estudios Adicionales');
    } else {
      const htmlMedico = generarReciboMedico(datosRecibo);
      abrirRecibo(htmlMedico, 'Orden Médico - Estudios Adicionales');
    }
  };

  // ✅ NUEVO: Calcular total incluyendo extras de móviles
  const totalEstudios = nuevosEstudios.reduce((sum, e) => sum + e.precio, 0);
  const totalExtras = (incluyePlacas ? precioPlacas : 0) + (incluyeInforme ? precioInforme : 0);
  const totalGeneral = totalEstudios + totalExtras;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {esServicioMovil ? '📱 Agregar Estudios Móviles' : 'Agregar Estudios'}
            </h2>
            <p className="text-sm text-gray-600">Paciente: {consulta.pacientes.nombre}</p>
            {esServicioMovil && (
              <p className="text-xs text-orange-600 font-semibold mt-1">
                ⚠️ Solo estudios de RX disponibles para servicios móviles
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Selector de tipo de cobro */}
        <div className="card mb-4">
          <h3 className="text-sm font-semibold mb-3">Tipo de Cobro</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setTipoCobro('normal')}
              disabled={esServicioMovil}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                tipoCobro === 'normal'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-blue-300'
              } ${esServicioMovil ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Normal
            </button>
            <button
              onClick={() => setTipoCobro('social')}
              disabled={esServicioMovil}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                tipoCobro === 'social'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-green-300'
              } ${esServicioMovil ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Social
            </button>
            <button
              onClick={() => setTipoCobro('especial')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                tipoCobro === 'especial'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 hover:border-purple-300'
              }`}
            >
              Especial
            </button>
            <button
              onClick={() => setTipoCobro('personalizado')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                tipoCobro === 'personalizado'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-300 hover:border-orange-300'
              }`}
            >
              Personalizado
            </button>
          </div>
          {esServicioMovil && (
            <p className="text-xs text-orange-600 mt-2">
              Para móviles use: Especial (precio sistema) o Personalizado (editar manualmente)
            </p>
          )}
        </div>

        {/* Selector de forma de pago */}
        <div className="card mb-4">
          <h3 className="text-sm font-semibold mb-3">Forma de Pago</h3>
          <select
            className="input-field"
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
          >
            {requiereFactura ? (
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

        {/* Opción de factura */}
        <div className="card mb-4">
          <h3 className="text-sm font-semibold mb-3">¿Requiere Factura?</h3>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setRequiereFactura(true);
                if (formaPago === 'efectivo') {
                  setFormaPago('efectivo_facturado');
                }
              }}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                requiereFactura
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
            >
              Sí
            </button>
            <button
              onClick={() => {
                setRequiereFactura(false);
                if (formaPago === 'efectivo_facturado') {
                  setFormaPago('efectivo');
                }
              }}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                !requiereFactura
                  ? 'border-gray-500 bg-gray-50 text-gray-700'
                  : 'border-gray-300 hover:border-gray-300'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Selector de estudios */}
        <div className="card mb-4">
          <h3 className="text-lg font-semibold mb-3">Seleccionar Estudio</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Autocomplete
              label={esServicioMovil ? "Estudio (Solo RX)" : "Estudio"}
              options={estudiosDisponibles.map(e => ({ id: e.id, nombre: e.nombre }))}
              value={estudioSeleccionado}
              onChange={(val) => {
                setEstudioSeleccionado(val);
                setSubEstudioSeleccionado('');
              }}
              placeholder={esServicioMovil ? "Solo RX disponible" : "Seleccione estudio"}
            />
            <Autocomplete
              label="Sub-Estudio"
              options={subEstudiosFiltrados.map(se => ({ id: se.id, nombre: se.nombre }))}
              value={subEstudioSeleccionado}
              onChange={setSubEstudioSeleccionado}
              placeholder="Seleccione sub-estudio"
              disabled={!estudioSeleccionado}
            />
          </div>
          <button
            onClick={agregarEstudio}
            className="btn-primary mt-4 flex items-center gap-2"
            disabled={!estudioSeleccionado || !subEstudioSeleccionado}
          >
            <Plus size={20} />
            Agregar
          </button>
        </div>

        {/* ✅ NUEVO: Opciones extras para servicios móviles */}
        {esServicioMovil && (
          <div className="card mb-4 bg-orange-50 border-2 border-orange-300">
            <h3 className="text-lg font-semibold mb-3 text-orange-800">
              📋 Opciones Extras (Opcional)
            </h3>
            
            <div className="space-y-3">
              {/* Placas */}
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
                    />
                  </div>
                )}
              </div>

              {/* Informe */}
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
                    />
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-orange-700 mt-3 italic">
              💡 Estos extras se sumarán al total del servicio móvil
            </p>
          </div>
        )}

        {/* Lista de estudios agregados */}
        {nuevosEstudios.length > 0 && (
          <div className="card mb-4">
            <h3 className="text-lg font-semibold mb-3">Estudios a Agregar</h3>
            <div className="space-y-2">
              {nuevosEstudios.map((estudio, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{estudio.nombre}</div>
                    <div className="text-sm text-gray-600">Q {estudio.precio.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => eliminarEstudio(index)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
            
            {/* ✅ NUEVO: Resumen con extras de móviles */}
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Subtotal Estudios:</span>
                <span className="font-semibold">Q {totalEstudios.toFixed(2)}</span>
              </div>
              
              {esServicioMovil && totalExtras > 0 && (
                <>
                  {incluyePlacas && (
                    <div className="flex justify-between items-center text-orange-700">
                      <span>+ Placas:</span>
                      <span className="font-semibold">Q {precioPlacas.toFixed(2)}</span>
                    </div>
                  )}
                  {incluyeInforme && (
                    <div className="flex justify-between items-center text-orange-700">
                      <span>+ Informe:</span>
                      <span className="font-semibold">Q {precioInforme.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-bold text-lg">Costo Adicional Total:</span>
                <span className="text-2xl font-bold text-blue-600">Q {totalGeneral.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="btn-primary"
            disabled={nuevosEstudios.length === 0}
          >
            Guardar Estudios
          </button>
        </div>
      </div>
    </div>
  );
};