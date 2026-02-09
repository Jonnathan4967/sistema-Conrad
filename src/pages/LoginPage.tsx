import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data: usuarios, error: dbError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('activo', true)
        .single();
      
      if (dbError || !usuarios) {
        setError('Usuario o contraseña incorrectos');
        setLoading(false);
        return;
      }
      
      // Guardar sesión
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('nombreUsuarioConrad', usuarios.nombre);
      localStorage.setItem('usernameConrad', usuarios.username);
      localStorage.setItem('rolUsuarioConrad', usuarios.rol || 'secretaria'); // ✅ NUEVO
      onLogin();
    } catch (error) {
      console.error('Error de login:', error);
      setError('Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        backgroundImage: 'url(/conrad-building.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        minWidth: '100vw',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Overlay oscuro para mejor legibilidad */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)'
      }}></div>
      
      {/* Contenedor del formulario */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        borderRadius: '0.5rem',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        padding: '2rem',
        maxWidth: '28rem',
        width: '100%',
        margin: '0 1rem'
      }}>
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-blue-600" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">CONRAD</h1>
          <p className="text-gray-600 mt-2">Centro de Diagnóstico</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu usuario"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};