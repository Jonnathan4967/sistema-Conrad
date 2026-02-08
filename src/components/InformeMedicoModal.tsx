import React, { useState, useEffect } from 'react';
import { X, Save, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle } from 'docx';

interface InformeMedicoModalProps {
  paciente: {
    id: string;
    consulta_id: string;
    nombre: string;
    edad: string;
    fecha: string;
    estudios: string[];
    medico_referente: string;
  };
  onClose: () => void;
  onSaved: () => void;
}

export const InformeMedicoModal: React.FC<InformeMedicoModalProps> = ({
  paciente,
  onClose,
  onSaved
}) => {
  const [descripcion, setDescripcion] = useState('');
  const [impresion, setImpresion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [informeExistente, setInformeExistente] = useState<any>(null);

  useEffect(() => {
    cargarInforme();
  }, []);

  const cargarInforme = async () => {
    try {
      const { data } = await supabase
        .from('informes_medicos')
        .select('*')
        .eq('consulta_id', paciente.consulta_id)
        .single();

      if (data) {
        setInformeExistente(data);
        setDescripcion(data.contenido?.descripcion || '');
        setImpresion(data.conclusion || '');
      }
    } catch (error) {
      console.error('Error al cargar informe:', error);
    } finally {
      setLoading(false);
    }
  };

  const guardarInforme = async () => {
    if (!descripcion || !impresion) {
      alert('⚠️ Por favor llena todos los campos obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const contenido = {
        descripcion
      };

      const datosInforme = {
        consulta_id: paciente.consulta_id,
        paciente_id: paciente.id,
        tipo_estudio: obtenerTipoEstudio(paciente.estudios[0]),
        nombre_estudio: paciente.estudios[0] || 'Estudio General',
        contenido: contenido,
        conclusion: impresion,
        estado: 'borrador'
      };

      if (informeExistente) {
        const { error } = await supabase
          .from('informes_medicos')
          .update(datosInforme)
          .eq('id', informeExistente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('informes_medicos')
          .insert([datosInforme]);

        if (error) throw error;
      }

      alert('✅ Informe guardado correctamente');
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert('❌ Error al guardar: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const obtenerTipoEstudio = (estudio: string): string => {
    const est = estudio.toUpperCase();
    if (est.includes('TAC') || est.includes('TOMOGRAFIA')) return 'TAC';
    if (est.includes('RX') || est.includes('RAYO')) return 'RX';
    if (est.includes('USG') || est.includes('ULTRASONIDO')) return 'USG';
    if (est.includes('EKG') || est.includes('ELECTRO')) return 'EKG';
    if (est.includes('MAMO')) return 'MAMO';
    return 'GENERAL';
  };

  const generarWord = async () => {
    try {
      const hoy = new Date();
      const fechaFormateada = hoy.toLocaleDateString('es-GT', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 pulgada
                right: 1440,
                bottom: 1440,
                left: 1440,
              }
            }
          },
          children: [
            // Fecha y lugar
            new Paragraph({
              text: `Chimaltenango, ${fechaFormateada}`,
              spacing: { after: 200 }
            }),

            // Datos del paciente
            new Paragraph({
              children: [
                new TextRun({ text: "Nombre:\t", bold: false }),
                new TextRun({ text: paciente.nombre.toUpperCase() })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Edad:\t", bold: false }),
                new TextRun({ text: paciente.edad })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Referente:\t", bold: false }),
                new TextRun({ text: paciente.medico_referente + ", agradeciendo su referencia se informa el estudio realizado a continuación." })
              ],
              spacing: { after: 400 }
            }),

            // Título del estudio
            new Paragraph({
              children: [
                new TextRun({ 
                  text: paciente.estudios[0]?.toUpperCase() || 'ESTUDIO MÉDICO',
                  bold: true
                })
              ],
              alignment: AlignmentType.LEFT,
              spacing: { after: 300 }
            }),

            // Descripción
            new Paragraph({
              children: [
                new TextRun({ text: "Descripción:", bold: true })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: descripcion,
              spacing: { after: 400 },
              alignment: AlignmentType.JUSTIFIED
            }),

            // Impresión Diagnóstica
            new Paragraph({
              children: [
                new TextRun({ text: "Impresión Diagnóstica:", bold: true })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: impresion,
              spacing: { after: 600 },
              alignment: AlignmentType.JUSTIFIED
            }),

            // Firma
            new Paragraph({
              text: "Atentamente,",
              spacing: { before: 600, after: 400 }
            }),
            new Paragraph({
              text: "_______________________________________",
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: "Dra. Karen Mercedes Bolaños Granados",
              spacing: { after: 50 }
            }),
            new Paragraph({
              text: "Médico Radiólogo",
              spacing: { after: 50 }
            }),
            new Paragraph({
              text: "No. Colegiado 16,857",
              spacing: { after: 100 }
            })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const nombreArchivo = `${paciente.nombre.replace(/\s+/g, '_')}_${paciente.estudios[0]?.replace(/\s+/g, '_')}.doc`;
      link.download = nombreArchivo;
      link.click();
      window.URL.revokeObjectURL(url);

      alert('✅ Documento Word descargado correctamente');
    } catch (error) {
      console.error('Error al generar Word:', error);
      alert('❌ Error al generar documento. Asegúrate de tener instalado: npm install docx');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {informeExistente ? 'Editar Informe' : 'Crear Informe Médico'}
            </h2>
            <p className="text-blue-100 mt-1">{paciente.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info del Paciente */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Paciente</p>
              <p className="font-bold text-gray-800">{paciente.nombre}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Edad</p>
              <p className="font-bold text-gray-800">{paciente.edad}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fecha</p>
              <p className="font-bold text-gray-800">{new Date(paciente.fecha).toLocaleDateString('es-GT')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Médico Referente</p>
              <p className="font-bold text-gray-800">{paciente.medico_referente}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Estudio</p>
            <p className="font-bold text-lg text-blue-700">{paciente.estudios.join(', ')}</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Descripción */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3">
                Descripción: *
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                placeholder="Descripción detallada del estudio realizado..."
                required
                style={{ lineHeight: '1.6' }}
              />
              <p className="text-sm text-gray-500 mt-2">
                💡 Describe los hallazgos del estudio en detalle
              </p>
            </div>

            {/* Impresión Diagnóstica */}
            <div className="bg-yellow-50 rounded-lg p-6 border-2 border-yellow-200">
              <label className="block text-lg font-bold text-gray-800 mb-3">
                <FileText className="inline mr-2" size={20} />
                Impresión Diagnóstica: *
              </label>
              <textarea
                value={impresion}
                onChange={(e) => setImpresion(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white font-sans"
                placeholder="Lista de hallazgos e impresiones diagnósticas (uno por línea)&#10;Ejemplo:&#10;- Hallazgo 1&#10;- Hallazgo 2&#10;- Hallazgo 3"
                required
                style={{ lineHeight: '1.6' }}
              />
              <p className="text-sm text-gray-600 mt-2">
                💡 Lista los hallazgos principales y conclusiones diagnósticas
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancelar
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={guardarInforme}
              disabled={guardando}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
            >
              <Save size={20} />
              {guardando ? 'Guardando...' : 'Guardar Informe'}
            </button>
            
            <button
              onClick={generarWord}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-lg"
            >
              <Download size={20} />
              Descargar Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};