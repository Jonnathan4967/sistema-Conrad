import React from 'react';
import { Activity, Package, LogOut, FileText, Users } from 'lucide-react';

interface DashboardPageProps {
  onNavigateToModule: (module: string) => void;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
  onNavigateToModule, 
  onLogout 
}) => {
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    onLogout();
  };

  const handleModuleClick = (moduleId: string) => {
    // Si es visitadoras, abrir en nueva pestaña
    if (moduleId === 'visitadoras') {
      window.open('https://conrad-visitadoras.vercel.app', '_blank');
      return;
    }
    // Para otros módulos, navegar normal
    onNavigateToModule(moduleId);
  };

  const modules = [
    {
      id: 'sanatorio',
      name: 'Centro de Diagnóstico',
      description: 'Gestión de consultas, pacientes y estudios médicos',
      icon: Activity,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'inventario',
      name: 'Inventario',
      description: 'Control de productos, stock y suministros',
      icon: Package,
      color: 'green',
      gradient: 'from-green-500 to-green-600',
      disabled: false
    },
    {
      id: 'visitadoras',
      name: 'Visitadoras Médicas',
      description: 'Gestión de visitadoras médicas',
      icon: Users,
      color: 'pink',
      gradient: 'from-pink-500 to-pink-600',
      disabled: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">CONRAD - Sistema de Gestión</h1>
            <p className="text-sm text-gray-600">Panel Principal</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Módulos */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Selecciona un Módulo</h2>
          <p className="text-gray-600">Elige el área que deseas gestionar</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => !module.disabled && handleModuleClick(module.id)}
                disabled={module.disabled}
                className={`
                  relative overflow-hidden rounded-xl shadow-lg transition-all duration-300
                  ${module.disabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-300' 
                    : `bg-gradient-to-br ${module.gradient} hover:scale-105 hover:shadow-2xl cursor-pointer`
                  }
                  p-8 text-left text-white group
                `}
              >
                {/* Icono de fondo */}
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-6 -translate-y-6">
                  <Icon size={120} />
                </div>

                {/* Contenido */}
                <div className="relative z-10">
                  <div className="bg-white bg-opacity-20 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
                    <Icon size={32} />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2">{module.name}</h3>
                  <p className="text-white text-opacity-90">{module.description}</p>
                  
                  {module.disabled && (
                    <div className="mt-4 inline-block bg-white bg-opacity-30 px-3 py-1 rounded-full text-sm">
                      Próximamente
                    </div>
                  )}

                  {!module.disabled && (
                    <div className="mt-4 flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform">
                      Abrir módulo →
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Información adicional */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-2">📊 Estado del Sistema</h3>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">3</div>
                <div className="text-sm text-gray-600">Módulos Activos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Próximamente</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600">Operativo</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Developer Info - Discreto en esquina */}
        <button
          onClick={() => {
            const modal = document.getElementById('dev-info-modal');
            if (modal) modal.style.display = 'flex';
          }}
          className="fixed bottom-4 right-4 w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all shadow-md text-xs"
          title="Información del desarrollador"
        >
          {'</>'}
        </button>

        {/* Modal Developer Info */}
        <div
          id="dev-info-modal"
          className="fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-50"
          style={{ display: 'none' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              const modal = document.getElementById('dev-info-modal');
              if (modal) modal.style.display = 'none';
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 relative">
            <button
              onClick={() => {
                const modal = document.getElementById('dev-info-modal');
                if (modal) modal.style.display = 'none';
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">{'</>'}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Desarrollado por</h2>
              <p className="text-xl text-gray-700 mt-2">Jonnathan David Franco Hernández</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">EMAIL</p>
                    <p className="text-sm font-medium text-gray-800">aguilarhz20001@gmail.com</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">TELÉFONO / WHATSAPP</p>
                    <p className="text-sm font-medium text-gray-800">3658-3824</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Hecho con <span className="text-red-500">❤</span> en Guatemala
              </p>
              <p className="text-xs text-gray-400 mt-1">
                © 2026 Jonnathan Franco. Todos los derechos reservados.
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 font-mono">
                React • Vite • Supabase • PostgreSQL • Leaflet • jsPDF
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
