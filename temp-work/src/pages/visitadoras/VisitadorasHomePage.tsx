import React, { useEffect, useState } from 'react';
import { useVisitadorasStore } from '../../store/visitadorasStore';
import { ArrowLeft } from 'lucide-react';
import { AdminVisitadorasView } from './AdminVisitadorasView';

interface VisitadorasHomePageProps {
  onBack: () => void;
}

export const VisitadorasHomePage: React.FC<VisitadorasHomePageProps> = ({ onBack }) => {
  const { adminUsuario, setAdminUsuario } = useVisitadorasStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    autoLogin();
  }, []);

  const autoLogin = () => {
    // Obtener nombre desde localStorage o default
    const nombre = localStorage.getItem('nombreUsuarioConrad') || 'Administrador';
    setAdminUsuario(nombre);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando módulo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:text-pink-100 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">👋 ¡Hola, {adminUsuario}!</h1>
          <p className="text-pink-100 mt-1">Módulo de Visitadoras Médicas</p>
        </div>
      </header>

      {/* Contenido principal */}
      <AdminVisitadorasView adminUsuario={adminUsuario} />
    </div>
  );
};
