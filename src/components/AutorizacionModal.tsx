import React, { useState } from 'react';
import { X, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AutorizacionModalProps {
  accion: string; // ej: "Eliminar Paciente"
  detalles: string; // ej: "Juan Pérez - ID: 123"
  onAutorizado: () => void;
  onCancelar: () => void;
}

export const AutorizacionModal: React.FC<AutorizacionModalProps> = ({
  accion,
  detalles,
  onAutorizado,
  onCancelar
}) => {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const usuario = localStorage.getItem('usernameConrad') || '';

  // Validar código
  const validarCodigo = async () => {
    if (!codigo || codigo.length !== 6) {
      setError('⚠️ Ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('validar_token_autorizacion', {
        p_token: codigo,
        p_usado_por: usuario
      });

      if (error) throw error;

      if (data === true) {
        // Código válido
        await registrarLog(codigo);
        onAutorizado();
      } else {
        setError('❌ Código inválido o expirado');
        setCodigo('');
      }
    } catch (error: any) {
      console.error('Error al validar código:', error);
      setError('❌ Error al validar código: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Registrar en log de actividad
  const registrarLog = async (codigoUsado: string) => {
    try {
      const nombreUsuario = localStorage.getItem('nombreUsuarioConrad') || '';
      const rol = localStorage.getItem('rolUsuarioConrad') || '';

      await supabase.rpc('registrar_actividad', {
        p_usuario: usuario,
        p_nombre_usuario: nombreUsuario,
        p_rol: rol,
        p_modulo: 'sistema',
        p_accion: accion.toLowerCase().replace(/\s+/g, '_'),
        p_tipo_registro: 'autorizacion',
        p_detalles: { descripcion: detalles },
        p_requirio_autorizacion: true,
        p_token_usado: codigoUsado
      });
    } catch (error) {
      console.error('Error al registrar log:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <Shield size={32} />
            <div>
              <h2 className="text-xl font-bold">Autorización Requerida</h2>
              <p className="text-sm text-red-100">Se requiere código del administrador</p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Información de la acción */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-gray-900">{accion}</p>
                <p className="text-sm text-gray-700 mt-1">{detalles}</p>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-blue-900 mb-2">📋 Instrucciones:</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Solicita al <strong>Administrador</strong> que genere un código</li>
              <li>El admin genera el código desde su panel</li>
              <li>Ingresa el código de 6 dígitos que te proporcione</li>
              <li>El código expira en 15 minutos</li>
            </ol>
          </div>

          {/* Input para el código */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Autorización (6 dígitos):
            </label>
            <input
              type="text"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              onKeyPress={(e) => e.key === 'Enter' && validarCodigo()}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono tracking-widest"
              placeholder="000000"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={validarCodigo}
              disabled={loading || codigo.length !== 6}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Autorizar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg border-t">
          <p className="text-xs text-gray-600 text-center">
            🔒 El administrador debe generar el código desde su panel de control
          </p>
        </div>
      </div>
    </div>
  );
};