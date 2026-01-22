import { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { ProductosPage } from './pages/ProductosPage';
import { ReferentesPage } from './pages/ReferentesPage';
import { CuadreDiarioPage } from './pages/CuadreDiarioPage';
import { EstadisticasPage } from './pages/EstadisticasPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    // Verificar si ya está autenticado
    const auth = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(auth === 'true');
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentModule('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentModule('dashboard');
    setCurrentPage('home');
  };

  const handleNavigateToModule = (module: string) => {
    setCurrentModule(module);
    setCurrentPage('home');
  };

  const handleBackToDashboard = () => {
    setCurrentModule('dashboard');
    setCurrentPage('home');
  };

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Si está en el dashboard, mostrarlo
  if (currentModule === 'dashboard') {
    return (
      <DashboardPage 
        onNavigateToModule={handleNavigateToModule}
        onLogout={handleLogout}
      />
    );
  }

  // Si está en el módulo de sanatorio
  if (currentModule === 'sanatorio') {
    const renderPage = () => {
      switch (currentPage) {
        case 'home':
          return <HomePage onNavigate={setCurrentPage} />;
        case 'productos':
          return <ProductosPage onBack={() => setCurrentPage('home')} />;
        case 'referentes':
          return <ReferentesPage onBack={() => setCurrentPage('home')} />;
        case 'cuadre':
          return <CuadreDiarioPage onBack={() => setCurrentPage('home')} />;
        case 'estadisticas':
          return <EstadisticasPage onBack={() => setCurrentPage('home')} />;
        default:
          return <HomePage onNavigate={setCurrentPage} />;
      }
    };

    return (
      <div>
        {/* Botón para volver al dashboard */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleBackToDashboard}
            className="bg-white shadow-md px-3 py-1.5 rounded hover:bg-gray-50 transition-colors text-xs font-medium border border-gray-300"
          >
            ← Dashboard
          </button>
        </div>
        {renderPage()}
      </div>
    );
  }

  // Fallback al dashboard
  return <DashboardPage onNavigateToModule={handleNavigateToModule} onLogout={handleLogout} />;
}

export default App;
