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

    const precio = tipoCobro === 'normal' ? subEstudio.precio_normal :
                   tipoCobro === 'social' ? subEstudio.precio_social :
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
      // Insertar nuevos detalles marcados como adicionales
      const detalles = nuevosEstudios.map(e => ({
        consulta_id: consulta.id,
        sub_estudio_id: e.sub_estudio_id,
        precio: e.precio,
        es_adicional: true,
        fecha_agregado: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('detalle_consultas')
        .insert(detalles);

      if (error) throw error;

      alert('Estudios agregados exitosamente');
      
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

    const totalAdicional = nuevosEstudios.reduce((sum, e) => sum + e.precio, 0);

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
      formaPago: consulta.forma_pago || 'efectivo',
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

  const total = nuevosEstudios.reduce((sum, e) => sum + e.precio, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Agregar Estudios</h2>
            <p className="text-sm text-gray-600">Paciente: {consulta.pacientes.nombre}</p>
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
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                tipoCobro === 'normal'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setTipoCobro('social')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                tipoCobro === 'social'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-green-300'
              }`}
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
          </div>
        </div>

        {/* Selector de estudios */}
        <div className="card mb-4">
          <h3 className="text-lg font-semibold mb-3">Seleccionar Estudio</h3>
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
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Costo Adicional:</span>
                <span className="text-xl font-bold text-blue-600">Q {total.toFixed(2)}</span>
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
