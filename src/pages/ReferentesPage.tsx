import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Autocomplete } from '../components/Autocomplete';
import { departamentosGuatemala, municipiosGuatemala } from '../data/guatemala';
import { AutorizacionModal } from '../components/AutorizacionModal';
import ExcelJS from 'exceljs';

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
  const [editando, setEditando] = useState(false);
  const [medicoEditando, setMedicoEditando] = useState<Medico | null>(null);
  
  // ✅ NUEVO: Estados para autorización
  const [mostrarAutorizacion, setMostrarAutorizacion] = useState(false);
  const [medicoAEliminar, setMedicoAEliminar] = useState<Medico | null>(null);
  
  // Estados para filtros
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  
  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [direccion, setDireccion] = useState('');

  useEffect(() => {
    cargarMedicos();
  }, []);

  const cargarMedicos = async () => {
    try {
      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .eq('es_referente', true)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setMedicos(data || []);
    } catch (error) {
      console.error('Error al cargar médicos:', error);
      alert('Error al cargar médicos referentes');
    }
  };

  const abrirModalNuevo = () => {
    setEditando(false);
    setMedicoEditando(null);
    setNombre('');
    setTelefono('');
    setDepartamento('');
    setMunicipio('');
    setDireccion('');
    setShowModal(true);
  };

  const abrirModalEditar = (medico: Medico) => {
    setEditando(true);
    setMedicoEditando(medico);
    setNombre(medico.nombre);
    setTelefono(medico.telefono);
    setDepartamento(medico.departamento);
    setMunicipio(medico.municipio);
    setDireccion(medico.direccion);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setMedicoEditando(null);
    setNombre('');
    setTelefono('');
    setDepartamento('');
    setMunicipio('');
    setDireccion('');
  };

  const guardarMedico = async () => {
    if (!nombre || !telefono || !departamento || !municipio || !direccion) {
      alert('Por favor complete todos los campos');
      return;
    }

    try {
      if (editando && medicoEditando) {
        const { error } = await supabase
          .from('medicos')
          .update({
            nombre,
            telefono,
            departamento,
            municipio,
            direccion
          })
          .eq('id', medicoEditando.id);

        if (error) throw error;
        alert('Médico actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('medicos')
          .insert([{
            nombre,
            telefono,
            departamento,
            municipio,
            direccion,
            es_referente: true,
            activo: true
          }]);

        if (error) throw error;
        alert('Médico agregado exitosamente');
      }

      cerrarModal();
      cargarMedicos();
    } catch (error) {
      console.error('Error al guardar médico:', error);
      alert('Error al guardar médico');
    }
  };

  // ✅ NUEVO: Solicitar autorización para eliminar
  const solicitarEliminarMedico = (medico: Medico) => {
    setMedicoAEliminar(medico);
    setMostrarAutorizacion(true);
  };

  // ✅ MODIFICADO: Eliminar médico (se ejecuta después de la autorización)
  const eliminarMedico = async () => {
    if (!medicoAEliminar) return;

    try {
      const { error } = await supabase
        .from('medicos')
        .update({ activo: false })
        .eq('id', medicoAEliminar.id);

      if (error) throw error;

      // Registrar en log
      const usuario = sessionStorage.getItem('usernameConrad') || '';
      const nombreUsuario = sessionStorage.getItem('nombreUsuarioConrad') || '';
      const rol = sessionStorage.getItem('rolUsuarioConrad') || '';

      await supabase.rpc('registrar_actividad', {
        p_usuario: usuario,
        p_nombre_usuario: nombreUsuario,
        p_rol: rol,
        p_modulo: 'sanatorio',
        p_accion: 'eliminar',
        p_tipo_registro: 'medico_referente',
        p_registro_id: medicoAEliminar.id,
        p_detalles: { nombre: medicoAEliminar.nombre, departamento: medicoAEliminar.departamento },
        p_requirio_autorizacion: true
      });

      alert('✅ Médico eliminado exitosamente');
      cargarMedicos();
      setMostrarAutorizacion(false);
      setMedicoAEliminar(null);
    } catch (error) {
      console.error('Error al eliminar médico:', error);
      alert('❌ Error al eliminar médico');
    }
  };

  // Filtros
  const medicosFiltrados = medicos.filter(medico => {
    const nombreMatch = medico.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    const departamentoMatch = filtroDepartamento === '' || medico.departamento === filtroDepartamento;
    const municipioMatch = filtroMunicipio === '' || medico.municipio === filtroMunicipio;
    return nombreMatch && departamentoMatch && municipioMatch;
  });

  const municipiosFiltradosFiltro = filtroDepartamento 
    ? municipiosGuatemala.filter(m => m.departamento_id === filtroDepartamento)
    : municipiosGuatemala;

  const municipiosFiltradosFormulario = departamento
    ? municipiosGuatemala.filter(m => m.departamento_id === departamento)
    : [];

  const exportarExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Médicos Referentes');

      // Título
      worksheet.mergeCells('A1:F1');
      const tituloCell = worksheet.getCell('A1');
      tituloCell.value = 'MÉDICOS REFERENTES - CONRAD';
      tituloCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      tituloCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      tituloCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 30;

      // Headers
      const headers = ['#', 'NOMBRE', 'TELÉFONO', 'DEPARTAMENTO', 'MUNICIPIO', 'DIRECCIÓN'];
      worksheet.getRow(2).values = headers;
      
      const headerRow = worksheet.getRow(2);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF5B9BD5' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      // Anchos de columna
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 35;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 20;
      worksheet.getColumn(5).width = 20;
      worksheet.getColumn(6).width = 40;

      // Datos
      medicosFiltrados.forEach((medico, index) => {
        const row = worksheet.addRow([
          index + 1,
          medico.nombre,
          medico.telefono,
          departamentosGuatemala.find(d => d.id === medico.departamento)?.nombre || medico.departamento,
          municipiosGuatemala.find(m => m.id === medico.municipio)?.nombre || medico.municipio,
          medico.direccion
        ]);

        row.font = { name: 'Calibri', size: 10 };
        row.alignment = { vertical: 'middle' };
        
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          
          if (colNumber === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });
      });

      // Bordes en headers
      worksheet.getRow(2).eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Medicos_Referentes_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('✅ Reporte de médicos referentes exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('❌ Error al exportar reporte');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:text-blue-100 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">Médicos Referentes</h1>
          <p className="text-blue-100 mt-2">Gestión de médicos que refieren pacientes</p>
        </div>
      </header>

      <div className="container mx-auto p-4">
        {/* Filtros y acciones */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Filtros de Búsqueda</h2>
            <div className="flex gap-2">
              <button onClick={exportarExcel} className="btn-secondary flex items-center gap-2">
                <FileSpreadsheet size={18} />
                Exportar Excel
              </button>
              <button onClick={abrirModalNuevo} className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                Agregar Médico
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
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
              <label className="label">Departamento</label>
              <select
                className="input-field"
                value={filtroDepartamento}
                onChange={(e) => {
                  setFiltroDepartamento(e.target.value);
                  setFiltroMunicipio('');
                }}
              >
                <option value="">Todos</option>
                {departamentosGuatemala.map(dep => (
                  <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Municipio</label>
              <select
                className="input-field"
                value={filtroMunicipio}
                onChange={(e) => setFiltroMunicipio(e.target.value)}
                disabled={!filtroDepartamento}
              >
                <option value="">Todos</option>
                {municipiosFiltradosFiltro.map(mun => (
                  <option key={mun.id} value={mun.id}>{mun.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Mostrando <strong>{medicosFiltrados.length}</strong> de <strong>{medicos.length}</strong> médicos referentes
          </div>
        </div>

        {/* Lista de médicos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicosFiltrados.map((medico) => (
            <div key={medico.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-blue-700">{medico.nombre}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirModalEditar(medico)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => solicitarEliminarMedico(medico)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p><strong>Teléfono:</strong> {medico.telefono}</p>
                <p>
                  <strong>Ubicación:</strong><br />
                  {departamentosGuatemala.find(d => d.id === medico.departamento)?.nombre || medico.departamento}
                  {' - '}
                  {municipiosGuatemala.find(m => m.id === medico.municipio)?.nombre || medico.municipio}
                </p>
                <p className="text-gray-600">{medico.direccion}</p>
              </div>
            </div>
          ))}
        </div>

        {medicosFiltrados.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron médicos referentes</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editando ? 'Editar Médico Referente' : 'Agregar Médico Referente'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
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
                <label className="label">Teléfono *</label>
                <input
                  type="text"
                  className="input-field"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="5555-5555"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Departamento *</label>
                  <Autocomplete
                    label="Departamento"
                    options={departamentosGuatemala}
                    value={departamento}
                    onChange={(value) => {
                      setDepartamento(value);
                      setMunicipio('');
                    }}
                    placeholder="Seleccione departamento"
                    required
                  />
                </div>

                <div>
                  <label className="label">Municipio *</label>
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
              </div>

              <div>
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

      {/* ✅ NUEVO: Modal de Autorización */}
      {mostrarAutorizacion && medicoAEliminar && (
        <AutorizacionModal
          accion="Eliminar Médico Referente"
          detalles={`${medicoAEliminar.nombre} - ${medicoAEliminar.departamento}, ${medicoAEliminar.municipio}`}
          onAutorizado={() => eliminarMedico()}
          onCancelar={() => {
            setMostrarAutorizacion(false);
            setMedicoAEliminar(null);
          }}
        />
      )}
    </div>
  );
};