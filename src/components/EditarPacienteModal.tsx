import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Autocomplete } from './Autocomplete';
import { departamentosGuatemala, municipiosGuatemala } from '../data/guatemala';

interface EditarPacienteModalProps {
  paciente: any;
  onClose: () => void;
  onSave: (pacienteData: any) => void;
}

export const EditarPacienteModal: React.FC<EditarPacienteModalProps> = ({
  paciente,
  onClose,
  onSave
}) => {
  const [nombre, setNombre] = useState(paciente.nombre);
  const [edad, setEdad] = useState(paciente.edad.toString());
  const [telefono, setTelefono] = useState(paciente.telefono);
  const [departamento, setDepartamento] = useState(paciente.departamento);
  const [municipio, setMunicipio] = useState(paciente.municipio);

  const handleSubmit = () => {
    if (!nombre.trim() || !edad || !telefono || !departamento || !municipio) {
      alert('Por favor complete todos los campos');
      return;
    }

    onSave({
      nombre: nombre.trim(),
      edad: parseInt(edad),
      telefono,
      departamento,
      municipio
    });
  };

  const municipiosFiltrados = municipiosGuatemala.filter(
    m => m.departamento_id === departamento
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Editar Paciente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Nombre Completo *</label>
            <input
              type="text"
              className="input-field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del paciente"
            />
          </div>

          <div>
            <label className="label">Edad *</label>
            <input
              type="number"
              className="input-field"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              placeholder="Edad"
              min="0"
              max="150"
            />
          </div>

          <div>
            <label className="label">Número de Teléfono *</label>
            <input
              type="tel"
              className="input-field"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
              placeholder="12345678"
              maxLength={8}
            />
          </div>

          <div>
            <Autocomplete
              label="Departamento"
              options={departamentosGuatemala}
              value={departamento}
              onChange={(val) => {
                setDepartamento(val);
                setMunicipio('');
              }}
              placeholder="Seleccione departamento"
              required
            />
          </div>

          <div>
            <Autocomplete
              label="Municipio"
              options={municipiosFiltrados}
              value={municipio}
              onChange={setMunicipio}
              placeholder="Seleccione municipio"
              disabled={!departamento}
              required
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
