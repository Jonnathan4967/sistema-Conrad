import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Autocomplete } from '../components/Autocomplete';
import { departamentosGuatemala, municipiosGuatemala } from '../data/guatemala';

interface Medico {
  id: string;
  nombre: string;
  telefono: string;
  departamento: string;
  municipio: string;
  direccion: string;
  es_referente: boolean;
  activo: boolean;
}

interface ReferentesPageProps {
  onBack: () => void;
}

export const ReferentesPage: React.FC<ReferentesPageProps> = ({ onBack }) => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Medico | null>(null);
  
  // Filtros de búsqueda
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  
  // Formulario
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [direccion, setDireccion] = useState('');

  useEffect(() => {
    cargarMedicos();
  }, []);

  const cargarMedicos = async () => {
    const { data } = await supabase
      .from('medicos')
      .select('*')
      .eq('es_referente', true)
      .eq('activo', true)
      .order('nombre');
    setMedicos(data || []);
  };

  const guardarMedico = async () => {
    if (!nombre.trim() || !telefono || !departamento || !municipio || !direccion.trim()) {
      alert('Por favor complete todos los campos');
      return;
    }

    try {
      const data = {
        nombre,
        telefono,
        departamento,
        municipio,
        direccion,
        es_referente: true
      };

      if (editando) {
        await supabase.from('medicos').update(data).eq('id', editando.id);
      } else {
        await supabase.from('medicos').insert([data]);
      }
      
      cargarMedicos();
      cerrarModal();
      alert('Médico referente guardado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar médico referente');
    }
  };

  const eliminarMedico = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este médico referente?')) return;
    
    await supabase.from('medicos').update({ activo: false }).eq('id', id);
    cargarMedicos();
  };

  const abrirModal = (medico?: Medico) => {
    if (medico) {
      setEditando(medico);
      setNombre(medico.nombre);
      setTelefono(medico.telefono);
      setDepartamento(medico.departamento);
      setMunicipio(medico.municipio);
      setDireccion(medico.direccion);
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(null);
    setNombre('');
    setTelefono('');
    setDepartamento('');
    setMunicipio('');
    setDireccion('');
  };

  const getDepartamentoNombre = (id: string) => {
    return departamentosGuatemala.find(d => d.id === id)?.nombre || id;
  };

  const getMunicipioNombre = (id: string) => {
    return municipiosGuatemala.find(m => m.id === id)?.nombre || id;
  };

  // Filtrar médicos según los criterios de búsqueda
  const medicosFiltrados = medicos.filter(medico => {
    const nombreMatch = medico.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    const departamentoMatch = filtroDepartamento === '' || medico.departamento === filtroDepartamento;
    const municipioMatch = filtroMunicipio === '' || medico.municipio === filtroMunicipio;
    return nombreMatch && departamentoMatch && municipioMatch;
  });

  // Obtener municipios según el contexto (filtro o formulario)
  const municipiosFiltradosFiltro = filtroDepartamento 
    ? municipiosGuatemala.filter(m => m.departamento_id === filtroDepartamento)
    : municipiosGuatemala;

  const municipiosFiltradosFormulario = municipiosGuatemala.filter(
    m => m.departamento_id === departamento
  );

  // Función para exportar a Excel
  const exportarExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet('Médicos Referentes');

      // Configurar anchos de columna
      worksheet.columns = [
        { width: 5 },   // #
        { width: 35 },  // Nombre
        { width: 15 },  // Teléfono
        { width: 20 },  // Departamento
        { width: 20 },  // Municipio
        { width: 40 }   // Dirección
      ];

      // Título
      worksheet.mergeCells('A1:F1');
      const cellTitulo = worksheet.getCell('A1');
      cellTitulo.value = 'MÉDICOS REFERENTES - CONRAD';
      cellTitulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      cellTitulo.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
      cellTitulo.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      worksheet.getRow(1).height = 30;

      // Headers
      const headers = ['#', 'NOMBRE', 'TELÉFONO', 'DEPARTAMENTO', 'MUNICIPIO', 'DIRECCIÓN'];
      worksheet.getRow(2).values = headers;
      worksheet.getRow(2).height = 25;
      
      headers.forEach((header, idx) => {
        const cell = worksheet.getCell(2, idx + 1);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5B9BD5' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Datos
      medicosFiltrados.forEach((medico, idx) => {
        const fila = idx + 3;
        const valores = [
          idx + 1,
          medico.nombre.toUpperCase(),
          medico.telefono,
          getDepartamentoNombre(medico.departamento),
          getMunicipioNombre(medico.municipio),
          medico.direccion
        ];

        worksheet.getRow(fila).values = valores;

        valores.forEach((valor, colIdx) => {
          const cell = worksheet.getCell(fila, colIdx + 1);
          cell.font = { name: 'Calibri', size: 10 };
          
          if (colIdx === 0) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }

          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Generar y descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Medicos_Referentes_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al generar archivo Excel');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center gap-4">
          <button onClick={onBack} className="hover:bg-blue-600 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">Médicos Referentes</h1>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Lista de Médicos Referentes</h2>
            <div className="flex gap-2">
              <button 
                onClick={exportarExcel} 
                className="btn-secondary flex items-center gap-2"
              >
                <FileSpreadsheet size={18} />
                Exportar Excel
              </button>
              <button onClick={() => abrirModal()} className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                Nuevo Médico Referente
              </button>
            </div>
          </div>

          {/* Filtros de búsqueda */}
          <div className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="label">Buscar por Nombre</label>
              <input
                type="text"
                className="input-field"
                placeholder="Nombre del médico..."
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Filtrar por Departamento</label>
              <select
                className="input-field"
                value={filtroDepartamento}
                onChange={(e) => {
                  setFiltroDepartamento(e.target.value);
                  setFiltroMunicipio(''); // Limpiar municipio al cambiar departamento
                }}
              >
                <option value="">Todos los departamentos</option>
                {departamentosGuatemala.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Filtrar por Municipio</label>
              <select
                className="input-field"
                value={filtroMunicipio}
                onChange={(e) => setFiltroMunicipio(e.target.value)}
                disabled={!filtroDepartamento}
              >
                <option value="">
                  {filtroDepartamento ? 'Todos los municipios' : 'Seleccione departamento primero'}
                </option>
                {municipiosFiltradosFiltro.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Mostrando {medicosFiltrados.length} de {medicos.length} médicos referentes
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicosFiltrados.map(medico => (
              <div key={medico.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{medico.nombre}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal(medico)} className="text-blue-600 hover:text-blue-800">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => eliminarMedico(medico.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>Teléfono:</strong> {medico.telefono}</div>
                  <div><strong>Departamento:</strong> {getDepartamentoNombre(medico.departamento)}</div>
                  <div><strong>Municipio:</strong> {getMunicipioNombre(medico.municipio)}</div>
                  <div><strong>Dirección:</strong> {medico.direccion}</div>
                </div>
              </div>
            ))}
          </div>

          {medicosFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {medicos.length === 0 ? (
                <>
                  <p className="text-lg">No hay médicos referentes registrados</p>
                  <p className="text-sm">Haz click en "Nuevo Médico Referente" para agregar uno</p>
                </>
              ) : (
                <>
                  <p className="text-lg">No se encontraron médicos con los filtros aplicados</p>
                  <p className="text-sm">Intenta con otros criterios de búsqueda</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
                {editando ? 'Editar' : 'Nuevo'} Médico Referente
              </h3>
              <button onClick={cerrarModal}><X size={24} /></button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nombre Completo *</label>
                <input
                  type="text"
                  className="input-field"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Dr. Juan Pérez"
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

              <div className="md:col-span-2">
                <Autocomplete
                  label="Municipio"
                  options={municipiosFiltradosFormulario}
                  value={municipio}
                  onChange={setMunicipio}
                  placeholder="Seleccione municipio"
                  disabled={!departamento}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Dirección Completa *</label>
                <textarea
                  className="input-field"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Zona 10, Edificio X, Oficina Y"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={cerrarModal} className="btn-secondary">Cancelar</button>
              <button onClick={guardarMedico} className="btn-primary flex items-center gap-2">
                <Save size={18} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};