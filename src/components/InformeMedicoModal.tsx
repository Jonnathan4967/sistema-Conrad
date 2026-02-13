import React, { useState, useEffect } from 'react';
import { X, Save, Download, FileText, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType, PageNumber,
  Header, Footer
} from 'docx';

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

// ✅ Configuración de firma guardada en localStorage
const FIRMA_KEY = 'conrad_firma_medico';

const firmaDefecto = {
  nombre: 'Dra. Karen Mercedes Bolaños Granados',
  especialidad: 'Médico Radiólogo',
  colegiado: 'No. Colegiado 16,857',
  lugar: 'Chimaltenango'
};

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

  // ✅ Configuración de firma
  const [mostrarConfigFirma, setMostrarConfigFirma] = useState(false);
  const [incluirFirma, setIncluirFirma] = useState(true);
  const [firma, setFirma] = useState(() => {
    try {
      const saved = localStorage.getItem(FIRMA_KEY);
      return saved ? JSON.parse(saved) : firmaDefecto;
    } catch {
      return firmaDefecto;
    }
  });

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

  const guardarFirmaEnStorage = () => {
    localStorage.setItem(FIRMA_KEY, JSON.stringify(firma));
    alert('✅ Configuración de firma guardada');
    setMostrarConfigFirma(false);
  };

  const guardarInforme = async () => {
    if (!descripcion || !impresion) {
      alert('⚠️ Por favor llena todos los campos obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const datosInforme = {
        consulta_id: paciente.consulta_id,
        paciente_id: paciente.id,
        tipo_estudio: obtenerTipoEstudio(paciente.estudios[0]),
        nombre_estudio: paciente.estudios[0] || 'Estudio General',
        contenido: { descripcion },
        conclusion: impresion,
        estado: 'borrador'
      };

      if (informeExistente) {
        const { error } = await supabase.from('informes_medicos').update(datosInforme).eq('id', informeExistente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('informes_medicos').insert([datosInforme]);
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
    const est = (estudio || '').toUpperCase();
    if (est.includes('TAC') || est.includes('TOMOGRAFIA')) return 'TAC';
    if (est.includes('RX') || est.includes('RAYO')) return 'RX';
    if (est.includes('USG') || est.includes('ULTRASONIDO')) return 'USG';
    if (est.includes('EKG') || est.includes('ELECTRO')) return 'EKG';
    if (est.includes('MAMO')) return 'MAMO';
    return 'GENERAL';
  };

  // ✅ Helpers para Word
  const line = (texto = '') => new Paragraph({
    children: [new TextRun({ text: texto, font: 'Arial', size: 22 })],
    spacing: { after: 0, before: 0 }
  });

  const espaciado = (pts = 120) => new Paragraph({
    children: [],
    spacing: { after: pts }
  });

  const separador = () => new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a56a0', space: 4 } },
    spacing: { after: 160 }
  });

  const seccionTitulo = (texto: string) => new Paragraph({
    children: [new TextRun({ text: texto.toUpperCase(), bold: true, font: 'Arial', size: 22, color: '1a56a0' })],
    spacing: { before: 200, after: 120 }
  });

  const parrafoJustificado = (texto: string) => new Paragraph({
    children: [new TextRun({ text: texto, font: 'Arial', size: 22 })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 100 }
  });

  const generarWord = async () => {
    try {
      // ✅ Fecha en Guatemala
      const ahora = new Date();
      const gt = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
      const fechaFormateada = gt.toLocaleDateString('es-GT', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      // ✅ Tabla de datos del paciente (más profesional que texto plano)
      const colorAzulClaro = 'DBEAFE';
      const bordeTabla = { style: BorderStyle.SINGLE, size: 4, color: '93C5FD' };
      const bordes = { top: bordeTabla, bottom: bordeTabla, left: bordeTabla, right: bordeTabla };
      const filaDatos = (etiqueta: string, valor: string) => new TableRow({
        children: [
          new TableCell({
            borders: bordes,
            width: { size: 2200, type: WidthType.DXA },
            shading: { fill: colorAzulClaro, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 160, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: etiqueta, bold: true, font: 'Arial', size: 20 })] })]
          }),
          new TableCell({
            borders: bordes,
            width: { size: 7160, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 160, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: valor, font: 'Arial', size: 20 })] })]
          })
        ]
      });

      const tablaInfo = new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 7160],
        rows: [
          filaDatos('Nombre:', paciente.nombre.toUpperCase()),
          filaDatos('Edad:', paciente.edad),
          filaDatos('Referente:', paciente.medico_referente !== 'SIN INFORMACIÓN'
            ? `DR/DRA. ${paciente.medico_referente.toUpperCase()}`
            : 'SIN INFORMACIÓN'),
          filaDatos('Estudio:', paciente.estudios.join(', ').toUpperCase()),
          filaDatos('Fecha:', fechaFormateada),
        ]
      });

      // ✅ Párrafos de descripción (respetar saltos de línea del usuario)
      const parrafosDescripcion = descripcion.split('\n').map(linea =>
        parrafoJustificado(linea || ' ')
      );

      // ✅ Párrafos de impresión diagnóstica
      const parrafosImpresion = impresion.split('\n').map(linea =>
        new Paragraph({
          children: [new TextRun({ text: linea || ' ', font: 'Arial', size: 22 })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 80 }
        })
      );

      // ✅ Sección de firma (opcional)
      const seccionFirma = incluirFirma ? [
        espaciado(400),
        line('Atentamente,'),
        espaciado(600),
        new Paragraph({
          children: [new TextRun({ text: '_'.repeat(40), font: 'Arial', size: 22, color: '374151' })],
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [new TextRun({ text: firma.nombre, bold: true, font: 'Arial', size: 22 })],
          spacing: { after: 60 }
        }),
        new Paragraph({
          children: [new TextRun({ text: firma.especialidad, font: 'Arial', size: 20, italics: true })],
          spacing: { after: 60 }
        }),
        new Paragraph({
          children: [new TextRun({ text: firma.colegiado, font: 'Arial', size: 20 })],
          spacing: { after: 0 }
        }),
      ] : [
        espaciado(400),
        line('Atentamente,'),
        espaciado(800),
        new Paragraph({
          children: [new TextRun({ text: '_'.repeat(40), font: 'Arial', size: 22, color: '374151' })],
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Nombre y sello del médico', font: 'Arial', size: 20, italics: true, color: '9CA3AF' })],
          spacing: { after: 0 }
        }),
      ];

      const doc = new Document({
        styles: {
          default: {
            document: { run: { font: 'Arial', size: 22, color: '111827' } }
          }
        },
        sections: [{
          properties: {
            page: {
              size: { width: 12240, height: 15840 }, // US Letter
              margin: { top: 1080, right: 1260, bottom: 1080, left: 1260 }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Table({
                  width: { size: 9720, type: WidthType.DXA },
                  columnWidths: [7200, 2520],
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0 },
                    bottom: { style: BorderStyle.SINGLE, size: 8, color: '1a56a0' },
                    left: { style: BorderStyle.NONE, size: 0 },
                    right: { style: BorderStyle.NONE, size: 0 },
                  },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 7200, type: WidthType.DXA },
                          borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                          margins: { bottom: 80 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: 'CENTRO DE DIAGNÓSTICO CONRAD', bold: true, font: 'Arial', size: 26, color: '1a56a0' })]
                            }),
                            new Paragraph({
                              children: [new TextRun({ text: `${firma.lugar} · Guatemala`, font: 'Arial', size: 18, color: '6B7280' })]
                            }),
                          ]
                        }),
                        new TableCell({
                          width: { size: 2520, type: WidthType.DXA },
                          borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                          margins: { bottom: 80 },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.RIGHT,
                              children: [new TextRun({ text: 'INFORME MÉDICO', bold: true, font: 'Arial', size: 22, color: '1a56a0' })]
                            }),
                            new Paragraph({
                              alignment: AlignmentType.RIGHT,
                              children: [new TextRun({ text: fechaFormateada, font: 'Arial', size: 18, color: '6B7280' })]
                            }),
                          ]
                        }),
                      ]
                    })
                  ]
                }),
                espaciado(120)
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  border: { top: { style: BorderStyle.SINGLE, size: 4, color: '1a56a0', space: 4 } },
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80 },
                  children: [
                    new TextRun({ text: 'Documento generado por Sistema Conrad  ·  Página ', font: 'Arial', size: 16, color: '9CA3AF' }),
                    new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '9CA3AF' }),
                  ]
                })
              ]
            })
          },
          children: [
            // Datos del paciente en tabla
            seccionTitulo('Datos del Paciente'),
            tablaInfo,
            espaciado(240),
            separador(),

            // Nota de referencia
            new Paragraph({
              children: [
                new TextRun({ text: 'Agradeciendo su referencia, se informa el estudio realizado a continuación:', font: 'Arial', size: 20, italics: true, color: '374151' })
              ],
              spacing: { after: 280 }
            }),

            // Título del estudio
            new Paragraph({
              children: [new TextRun({ text: (paciente.estudios[0] || 'ESTUDIO MÉDICO').toUpperCase(), bold: true, font: 'Arial', size: 26, color: '111827' })],
              spacing: { before: 0, after: 200 }
            }),
            separador(),

            // Descripción
            seccionTitulo('Descripción'),
            ...parrafosDescripcion,
            espaciado(200),

            // Impresión Diagnóstica
            seccionTitulo('Impresión Diagnóstica'),
            ...parrafosImpresion,

            // Firma
            ...seccionFirma,
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Informe_${paciente.nombre.replace(/\s+/g, '_')}_${(paciente.estudios[0] || 'estudio').replace(/\s+/g, '_')}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);

      alert('✅ Documento Word descargado correctamente');
    } catch (error) {
      console.error('Error al generar Word:', error);
      alert('❌ Error al generar documento: ' + (error as any).message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
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
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Info del Paciente */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-gray-500">Paciente</p><p className="font-bold">{paciente.nombre}</p></div>
            <div><p className="text-gray-500">Edad</p><p className="font-bold">{paciente.edad}</p></div>
            <div><p className="text-gray-500">Referente</p><p className="font-bold">{paciente.medico_referente}</p></div>
            <div><p className="text-gray-500">Estudio</p><p className="font-bold text-blue-700">{paciente.estudios.join(', ')}</p></div>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">

            {/* Descripción */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3">Descripción: *</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                placeholder="Descripción detallada del estudio realizado..."
                style={{ lineHeight: '1.7' }}
              />
              <p className="text-xs text-gray-500 mt-1">💡 Los saltos de línea se respetan en el documento Word</p>
            </div>

            {/* Impresión Diagnóstica */}
            <div className="bg-yellow-50 rounded-lg p-5 border-2 border-yellow-200">
              <label className="block text-lg font-bold text-gray-800 mb-3">
                <FileText className="inline mr-2" size={20} />
                Impresión Diagnóstica: *
              </label>
              <textarea
                value={impresion}
                onChange={(e) => setImpresion(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white font-sans"
                placeholder="- Hallazgo 1&#10;- Hallazgo 2&#10;- Hallazgo 3"
                style={{ lineHeight: '1.7' }}
              />
            </div>

            {/* ✅ Configuración de Firma */}
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setMostrarConfigFirma(!mostrarConfigFirma)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings size={18} className="text-gray-600" />
                  <span className="font-semibold text-gray-700">Configuración de Firma</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${incluirFirma ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {incluirFirma ? 'Incluida' : 'Sin firma'}
                  </span>
                </div>
                {mostrarConfigFirma ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
              </button>

              {mostrarConfigFirma && (
                <div className="p-5 space-y-4">
                  {/* Toggle incluir firma */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="incluirFirma"
                      checked={incluirFirma}
                      onChange={(e) => setIncluirFirma(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="incluirFirma" className="font-medium text-gray-700 cursor-pointer">
                      Incluir firma en el documento Word
                    </label>
                  </div>

                  {incluirFirma && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del médico</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={firma.nombre}
                          onChange={(e) => setFirma({ ...firma, nombre: e.target.value })}
                          placeholder="Dra. Karen Bolaños" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={firma.especialidad}
                          onChange={(e) => setFirma({ ...firma, especialidad: e.target.value })}
                          placeholder="Médico Radiólogo" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No. Colegiado</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={firma.colegiado}
                          onChange={(e) => setFirma({ ...firma, colegiado: e.target.value })}
                          placeholder="No. Colegiado 16,857" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Lugar</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={firma.lugar}
                          onChange={(e) => setFirma({ ...firma, lugar: e.target.value })}
                          placeholder="Chimaltenango" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={guardarFirmaEnStorage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      💾 Guardar para futuros informes
                    </button>
                    <button
                      onClick={() => { setFirma(firmaDefecto); }}
                      className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Restaurar defecto
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">La firma se guarda en este navegador para no tener que configurarla cada vez.</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-5 border-t flex items-center justify-between">
          <button onClick={onClose} className="px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm">
            Cancelar
          </button>
          <div className="flex gap-3">
            <button
              onClick={guardarInforme}
              disabled={guardando}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 font-medium text-sm shadow-md"
            >
              <Save size={18} />
              {guardando ? 'Guardando...' : 'Guardar Informe'}
            </button>
            <button
              onClick={generarWord}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium text-sm shadow-md"
            >
              <Download size={18} />
              Descargar Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};