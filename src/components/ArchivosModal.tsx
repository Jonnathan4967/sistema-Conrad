import React, { useState, useEffect } from 'react';
import { X, Upload, File, Download, Trash2, Eye, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ArchivosModalProps {
  paciente: {
    id: string;
    consulta_id: string;
    nombre: string;
    fecha: string;
    numero_paciente: number;
  };
  onClose: () => void;
  onUploaded: () => void;
}

interface Archivo {
  id: string;
  nombre_archivo: string;
  url_archivo: string;
  tamano_bytes: number;
  descripcion: string;
  uploaded_at: string;
}

export const ArchivosModal: React.FC<ArchivosModalProps> = ({
  paciente,
  onClose,
  onUploaded
}) => {
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    cargarArchivos();
  }, []);

  const cargarArchivos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('archivos_estudios')
        .select('*')
        .eq('consulta_id', paciente.consulta_id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setArchivos(data || []);
    } catch (error) {
      console.error('Error al cargar archivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe exceder 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const subirArchivo = async () => {
    if (!selectedFile) {
      setError('Por favor seleccione un archivo');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const timestamp = new Date().getTime();
      const nombreArchivo = `${paciente.numero_paciente}_${timestamp}_${selectedFile.name}`;
      const rutaArchivo = `estudios/${nombreArchivo}`;

      const { error: uploadError } = await supabase.storage
        .from('estudios-pacientes')
        .upload(rutaArchivo, selectedFile, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('estudios-pacientes')
        .getPublicUrl(rutaArchivo);

      const { error: dbError } = await supabase
        .from('archivos_estudios')
        .insert([{
          consulta_id: paciente.consulta_id,
          paciente_id: paciente.id,
          nombre_archivo: selectedFile.name,
          url_archivo: urlData.publicUrl,
          tamano_bytes: selectedFile.size,
          descripcion: descripcion || null
        }]);

      if (dbError) throw dbError;

      setSelectedFile(null);
      setDescripcion('');
      await cargarArchivos();
      onUploaded();
      alert('✅ Archivo subido correctamente');
    } catch (error: any) {
      console.error('Error al subir:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const verArchivo = (url: string) => {
    window.open(url, '_blank');
  };

  const descargarArchivo = (url: string, nombre: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const eliminarArchivo = async (archivo: Archivo) => {
    if (!confirm(`¿Eliminar "${archivo.nombre_archivo}"?`)) return;

    try {
      const { error } = await supabase
        .from('archivos_estudios')
        .delete()
        .eq('id', archivo.id);

      if (error) throw error;

      await cargarArchivos();
      onUploaded();
      alert('✅ Archivo eliminado');
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const formatearTamano = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Archivos del Estudio</h2>
            <p className="text-purple-100">{paciente.nombre}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b bg-purple-50">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Upload size={20} />
            Subir Nuevo Archivo
          </h3>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle size={16} />
                  {selectedFile.name} ({formatearTamano(selectedFile.size)})
                </p>
              )}
            </div>

            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción (opcional)"
              className="w-full px-4 py-2 border rounded-lg"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="text-red-500" size={20} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={subirArchivo}
              disabled={!selectedFile || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Subir Archivo
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FileText size={20} />
            Archivos Guardados ({archivos.length})
          </h3>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : archivos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <File size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay archivos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivos.map((archivo) => (
                <div key={archivo.id} className="bg-white border rounded-lg p-4 hover:shadow-md">
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      <FileText className="text-red-500" size={24} />
                      <div>
                        <h4 className="font-medium">{archivo.nombre_archivo}</h4>
                        <p className="text-sm text-gray-500">
                          {formatearTamano(archivo.tamano_bytes)} • {new Date(archivo.uploaded_at).toLocaleDateString('es-GT')}
                        </p>
                        {archivo.descripcion && <p className="text-sm text-gray-600 mt-1">📝 {archivo.descripcion}</p>}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => verArchivo(archivo.url_archivo)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => descargarArchivo(archivo.url_archivo, archivo.nombre_archivo)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Descargar">
                        <Download size={18} />
                      </button>
                      <button onClick={() => eliminarArchivo(archivo)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 border-t flex justify-between">
          <p className="text-sm text-gray-600">💡 Máx 10MB • Solo PDF</p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};