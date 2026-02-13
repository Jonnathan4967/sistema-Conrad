import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Copy, 
  Clock, 
  CheckCircle, 
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Token {
  token: string;
  usuario_solicitante: string;
  accion_solicitada: string;
  detalles: any;
  usado: boolean;
  created_at: string;
  expires_at: string;
  usado_at: string | null;
  usado_por: string | null;
}

// ✅ CORREGIDO: Guatemala es UTC-6 fijo (sin horario de verano)
// Supabase devuelve created_at en UTC — restamos 6 horas exactas en milisegundos
const toGuatemala = (fechaUTC: string): Date => {
  const utc = new Date(fechaUTC);
  const OFFSET_GT = 6 * 60 * 60 * 1000; // 6 horas en ms
  return new Date(utc.getTime() - OFFSET_GT);
};

export const GenerarCodigosPanel: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [mostrarGenerador, setMostrarGenerador] = useState(false);
  const [accion, setAccion] = useState('');
  const [detalles, setDetalles] = useState('');
  const [loading, setLoading] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState('');

  useEffect(() => {
    cargarTokens();
    const interval = setInterval(cargarTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  const cargarTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('tokens_autorizacion')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error al cargar tokens:', error);
    }
  };

  const generarCodigo = async () => {
    if (!accion.trim()) {
      alert('⚠️ Describe la acción a autorizar');
      return;
    }

    setLoading(true);
    try {
      const usuario = localStorage.getItem('usernameConrad') || 'admin';

      const { data, error } = await supabase.rpc('generar_token_autorizacion', {
        p_usuario_solicitante: usuario,
        p_accion: accion,
        p_detalles: detalles ? { descripcion: detalles } : null
      });

      if (error) throw error;

      setCodigoGenerado(data);
      setAccion('');
      setDetalles('');
      await cargarTokens();

      navigator.clipboard.writeText(data);
      alert(`✅ Código generado: ${data}\n📋 Copiado al portapapeles`);
    } catch (error: any) {
      console.error('Error al generar código:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    alert(`📋 Código ${codigo} copiado al portapapeles`);
  };

  const limpiarTokensExpirados = async () => {
    try {
      const { error } = await supabase.rpc('limpiar_tokens_expirados');
      if (error) throw error;
      await cargarTokens();
      alert('✅ Tokens expirados eliminados');
    } catch (error) {
      console.error('Error al limpiar:', error);
    }
  };

  const getTiempoRestante = (expires_at: string) => {
    // ✅ Esta comparación es en milisegundos absolutos — no depende de zona horaria
    const ahora = new Date();
    const expira = new Date(expires_at);
    const diff = expira.getTime() - ahora.getTime();

    if (diff <= 0) return '⏰ Expirado';

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    if (mins === 0) return `⏰ ${secs}s`;
    return `⏰ ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="text-indigo-600" size={32} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Generar Códigos de Autorización</h2>
              <p className="text-sm text-gray-600">Códigos para aprobar acciones sensibles</p>
            </div>
          </div>
          <button
            onClick={limpiarTokensExpirados}
            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            🗑️ Limpiar Expirados
          </button>
        </div>

        {/* Generador */}
        {mostrarGenerador ? (
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Acción a Autorizar: *
                </label>
                <input
                  type="text"
                  value={accion}
                  onChange={(e) => setAccion(e.target.value)}
                  placeholder="Ej: Eliminar paciente, Eliminar producto..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detalles (opcional):
                </label>
                <input
                  type="text"
                  value={detalles}
                  onChange={(e) => setDetalles(e.target.value)}
                  placeholder="Ej: Juan Pérez, Producto XYZ..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMostrarGenerador(false);
                    setAccion('');
                    setDetalles('');
                  }}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={generarCodigo}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <Shield size={18} />
                      Generar Código
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setMostrarGenerador(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Generar Nuevo Código
          </button>
        )}

        {/* Código recién generado */}
        {codigoGenerado && (
          <div className="mt-4 bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <p className="text-sm text-green-700 mb-2 font-medium">✅ Código Generado:</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white rounded p-3 text-center">
                <p className="text-3xl font-mono font-bold text-green-700 tracking-widest">
                  {codigoGenerado}
                </p>
              </div>
              <button
                onClick={() => copiarCodigo(codigoGenerado)}
                className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                title="Copiar código"
              >
                <Copy size={20} />
              </button>
            </div>
            <p className="text-xs text-green-600 mt-2 text-center">
              ⏰ Este código expira en 15 minutos
            </p>
          </div>
        )}
      </div>

      {/* Lista de códigos activos y recientes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-800 text-white p-4">
          <h3 className="font-bold text-lg">Códigos Activos y Recientes</h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {tokens.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Shield size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay códigos generados</p>
            </div>
          ) : (
            <div className="divide-y">
              {tokens.map((token, idx) => {
                const expiro = new Date(token.expires_at) < new Date();
                const activo = !token.usado && !expiro;

                return (
                  <div
                    key={idx}
                    className={`p-4 ${
                      token.usado
                        ? 'bg-gray-50'
                        : expiro
                        ? 'bg-red-50'
                        : 'bg-green-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Código */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-white border-2 border-gray-300 rounded px-3 py-1">
                            <p className="text-xl font-mono font-bold text-gray-900 tracking-wider">
                              {token.token}
                            </p>
                          </div>

                          {token.usado ? (
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium flex items-center gap-1">
                              <CheckCircle size={12} />
                              Usado
                            </span>
                          ) : expiro ? (
                            <span className="px-2 py-1 bg-red-200 text-red-700 rounded text-xs font-medium flex items-center gap-1">
                              <X size={12} />
                              Expirado
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-200 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                              <Shield size={12} />
                              Activo
                            </span>
                          )}

                          {activo && (
                            <button
                              onClick={() => copiarCodigo(token.token)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Copiar código"
                            >
                              <Copy size={14} className="text-gray-600" />
                            </button>
                          )}
                        </div>

                        {/* Info */}
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-gray-900">
                            {token.accion_solicitada}
                          </p>
                          {token.detalles?.descripcion && (
                            <p className="text-gray-600">
                              📝 {token.detalles.descripcion}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            {/* ✅ CORREGIDO: Mostrar hora en Guatemala, no UTC */}
                            <span>
                              Creado: {toGuatemala(token.created_at).toLocaleTimeString('es-GT', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                            {token.usado ? (
                              <span className="text-gray-700">
                                ✓ Usado por: {token.usado_por}
                              </span>
                            ) : (
                              <span className={expiro ? 'text-red-600' : 'text-green-600'}>
                                {getTiempoRestante(token.expires_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle size={18} />
          Información Importante:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Los códigos expiran automáticamente en <strong>15 minutos</strong></li>
          <li>Cada código solo puede usarse <strong>una vez</strong></li>
          <li>Los códigos usados quedan registrados en el log de actividad</li>
          <li>Puedes copiar el código al portapapeles con el botón de copiar</li>
        </ul>
      </div>
    </div>
  );
};