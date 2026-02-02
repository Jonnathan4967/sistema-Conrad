import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Edit2, Trash2, User, Phone, Mail, Briefcase, Upload, FileText, X, Download, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface EmpleadosPageProps {
  onBack: () => void;
}

interface Empleado {
  id: string;
  codigo_empleado: string;
  nombres: string;
  apellidos: string;
  dpi: string;
  telefono: string;
  email: string;
  fecha_ingreso: string;
  salario_mensual: number;
  estado: string;
  foto_url: string;
  contrato_url: string;
  puestos?: { nombre: string };
  departamentos?: { nombre: string };
}

export const EmpleadosPage: React.FC<EmpleadosPageProps> = ({ onBack }) => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPerfil, setShowPerfil] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  const [fotoPreview, setFotoPreview] = useState<string>('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [contratoFile, setContratoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    codigo_empleado: '',
    nombres: '',
    apellidos: '',
    dpi: '',
    telefono: '',
    email: '',
    puesto_id: '',
    departamento_id: '',
    fecha_ingreso: format(new Date(), 'yyyy-MM-dd'),
    salario_mensual: '',
    estado: 'activo'
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [empData, puestosData, deptosData] = await Promise.all([
        supabase
          .from('empleados')
          .select(`
            *,
            puestos(nombre),
            departamentos(nombre)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('puestos').select('*').order('nombre'),
        supabase.from('departamentos').select('*').order('nombre')
      ]);

      setEmpleados(empData.data || []);
      setPuestos(puestosData.data || []);
      setDepartamentos(deptosData.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const subirArchivo = async (file: File, tipo: 'foto' | 'contrato'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${tipo}s/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('empleados')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('empleados')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombres || !formData.apellidos || !formData.salario_mensual) {
      alert('Complete los campos requeridos');
      return;
    }

    try {
      let fotoUrl = '';
      let contratoUrl = '';

      // Subir foto si hay
      if (fotoFile) {
        const url = await subirArchivo(fotoFile, 'foto');
        if (url) fotoUrl = url;
      }

      // Subir contrato si hay
      if (contratoFile) {
        const url = await subirArchivo(contratoFile, 'contrato');
        if (url) contratoUrl = url;
      }

      const { error } = await supabase
        .from('empleados')
        .insert([{
          ...formData,
          salario_mensual: parseFloat(formData.salario_mensual),
          foto_url: fotoUrl,
          contrato_url: contratoUrl
        }]);

      if (error) throw error;

      alert('Empleado registrado exitosamente');
      setShowModal(false);
      resetForm();
      cargarDatos();
    } catch (error: any) {
      console.error('Error:', error);
      if (error.code === '23505') {
        alert('Error: El código de empleado o DPI ya existe');
      } else {
        alert('Error al registrar empleado');
      }
    }
  };

  const eliminarEmpleado = async (id: string) => {
    if (!confirm('¿Dar de baja a este empleado?')) return;

    try {
      const { error } = await supabase
        .from('empleados')
        .update({ estado: 'inactivo', fecha_salida: new Date().toISOString().split('T')[0] })
        .eq('id', id);

      if (error) throw error;
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const verPerfil = (empleado: Empleado) => {
    setEmpleadoSeleccionado(empleado);
    setShowPerfil(true);
  };

  const resetForm = () => {
    setFormData({
      codigo_empleado: '',
      nombres: '',
      apellidos: '',
      dpi: '',
      telefono: '',
      email: '',
      puesto_id: '',
      departamento_id: '',
      fecha_ingreso: format(new Date(), 'yyyy-MM-dd'),
      salario_mensual: '',
      estado: 'activo'
    });
    setFotoPreview('');
    setFotoFile(null);
    setContratoFile(null);
  };

  const empleadosFiltrados = empleados.filter(e => {
    const coincideBusqueda = 
      e.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.codigo_empleado.toLowerCase().includes(busqueda.toLowerCase());
    
    const coincideEstado = filtroEstado === 'todos' || e.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={onBack} className="text-white hover:text-indigo-100 mb-4 flex items-center gap-2">
            <ArrowLeft size={20} />
            Volver a Personal
          </button>
          <h1 className="text-3xl font-bold">👥 Gestión de Empleados</h1>
          <p className="text-indigo-100 mt-2">Registro y administración de personal</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  className="input-field pl-10 w-full"
                  placeholder="Buscar por nombre o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            <select
              className="input-field"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>

            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Nuevo Empleado
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{empleadosFiltrados.length}</p>
            <p className="text-sm text-gray-600">Total Mostrados</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {empleados.filter(e => e.estado === 'activo').length}
            </p>
            <p className="text-sm text-gray-600">Activos</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {empleados.filter(e => e.estado === 'inactivo').length}
            </p>
            <p className="text-sm text-gray-600">Inactivos</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xl font-bold text-blue-600">
              Q {empleados
                .filter(e => e.estado === 'activo')
                .reduce((sum, e) => sum + e.salario_mensual, 0)
                .toLocaleString('es-GT', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-gray-600">Nómina Total</p>
          </div>
        </div>

        {/* Lista de Empleados */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : empleadosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No hay empleados registrados</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {empleadosFiltrados.map((empleado) => (
              <div 
                key={empleado.id} 
                className={`bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer ${
                  empleado.estado === 'inactivo' ? 'opacity-60' : ''
                }`}
                onClick={() => verPerfil(empleado)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0">
                    {empleado.foto_url ? (
                      <img src={empleado.foto_url} alt={empleado.nombres} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="text-indigo-600" size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">
                      {empleado.nombres} {empleado.apellidos}
                    </h3>
                    <p className="text-sm text-gray-500">{empleado.codigo_empleado}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                      empleado.estado === 'activo' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {empleado.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Briefcase size={16} className="text-indigo-600" />
                    <span>{empleado.puestos?.nombre || 'Sin puesto'}</span>
                  </div>
                  {empleado.telefono && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone size={16} className="text-indigo-600" />
                      {empleado.telefono}
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Salario</p>
                      <p className="font-bold text-indigo-600">
                        Q {empleado.salario_mensual.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {empleado.contrato_url && (
                      <FileText className="text-blue-600" size={20} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nuevo Empleado */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Registrar Nuevo Empleado</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Foto */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-gray-400" size={64} />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700">
                      <Upload size={16} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Código Empleado *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.codigo_empleado}
                      onChange={(e) => setFormData({ ...formData, codigo_empleado: e.target.value })}
                      placeholder="EMP-001"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Fecha de Ingreso *</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.fecha_ingreso}
                      onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nombres *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      placeholder="Juan Carlos"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Apellidos *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      placeholder="Pérez López"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">DPI</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.dpi}
                      onChange={(e) => setFormData({ ...formData, dpi: e.target.value })}
                      placeholder="1234567890101"
                      maxLength={13}
                    />
                  </div>

                  <div>
                    <label className="label">Teléfono</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="1234-5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="empleado@ejemplo.com"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Departamento</label>
                    <select
                      className="input-field"
                      value={formData.departamento_id}
                      onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value })}
                    >
                      <option value="">Seleccione...</option>
                      {departamentos.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Puesto</label>
                    <select
                      className="input-field"
                      value={formData.puesto_id}
                      onChange={(e) => setFormData({ ...formData, puesto_id: e.target.value })}
                    >
                      <option value="">Seleccione...</option>
                      {puestos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Salario Mensual (Q) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={formData.salario_mensual}
                    onChange={(e) => setFormData({ ...formData, salario_mensual: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Contrato */}
                <div>
                  <label className="label">Contrato (PDF - Opcional)</label>
                  <div className="flex items-center gap-2">
                    <label className="btn-secondary cursor-pointer flex items-center gap-2">
                      <Upload size={16} />
                      {contratoFile ? contratoFile.name : 'Seleccionar archivo'}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setContratoFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {contratoFile && (
                      <button
                        type="button"
                        onClick={() => setContratoFile(null)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Guardar Empleado
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Perfil */}
      {showPerfil && empleadoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8">
            {/* Header del perfil */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-white/20">
                    {empleadoSeleccionado.foto_url ? (
                      <img src={empleadoSeleccionado.foto_url} alt={empleadoSeleccionado.nombres} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="text-white" size={48} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {empleadoSeleccionado.nombres} {empleadoSeleccionado.apellidos}
                    </h2>
                    <p className="text-indigo-100">{empleadoSeleccionado.codigo_empleado}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                      empleadoSeleccionado.estado === 'activo' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-500 text-white'
                    }`}>
                      {empleadoSeleccionado.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPerfil(false)}
                  className="text-white hover:text-indigo-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Contenido del perfil */}
            <div className="p-6 space-y-6">
              {/* Información Laboral */}
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Briefcase className="text-indigo-600" size={20} />
                  Información Laboral
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Departamento</p>
                    <p className="font-semibold">{empleadoSeleccionado.departamentos?.nombre || 'No asignado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Puesto</p>
                    <p className="font-semibold">{empleadoSeleccionado.puestos?.nombre || 'No asignado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Ingreso</p>
                    <p className="font-semibold">{format(new Date(empleadoSeleccionado.fecha_ingreso), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Salario Mensual</p>
                    <p className="font-semibold text-indigo-600">
                      Q {empleadoSeleccionado.salario_mensual.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información Personal */}
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <User className="text-indigo-600" size={20} />
                  Información Personal
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  {empleadoSeleccionado.dpi && (
                    <div>
                      <p className="text-sm text-gray-600">DPI</p>
                      <p className="font-semibold">{empleadoSeleccionado.dpi}</p>
                    </div>
                  )}
                  {empleadoSeleccionado.telefono && (
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="font-semibold">{empleadoSeleccionado.telefono}</p>
                    </div>
                  )}
                  {empleadoSeleccionado.email && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{empleadoSeleccionado.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contrato */}
              {empleadoSeleccionado.contrato_url && (
                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <FileText className="text-indigo-600" size={20} />
                    Documentos
                  </h3>
                  <a
                    href={empleadoSeleccionado.contrato_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition"
                  >
                    <FileText className="text-blue-600" size={24} />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900">Contrato Laboral</p>
                      <p className="text-sm text-blue-700">Descargar PDF</p>
                    </div>
                    <Download className="text-blue-600" size={20} />
                  </a>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-4 border-t">
                {empleadoSeleccionado.estado === 'activo' && (
                  <button
                    onClick={() => {
                      eliminarEmpleado(empleadoSeleccionado.id);
                      setShowPerfil(false);
                    }}
                    className="btn-secondary text-red-600 hover:bg-red-50"
                  >
                    Dar de Baja
                  </button>
                )}
                <button
                  onClick={() => setShowPerfil(false)}
                  className="btn-primary ml-auto"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};