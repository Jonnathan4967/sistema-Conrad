import { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { ProductosPage } from './pages/ProductosPage';
import { ReferentesPage } from './pages/ReferentesPage';
import { PacientesPage } from './pages/PacientesPage';
import { CuadreDiarioPage } from './pages/CuadreDiarioPage';
import { CuadreQuincenalPage } from './pages/CuadreQuincenalPage';
import { EstadisticasPage } from './pages/EstadisticasPage';
import { ReportesPage } from './pages/ReportesPage';
import { GestionUsuariosPage } from './pages/GestionUsuariosPage';
import { ComisionesPage } from './pages/ComisionesPage';
import { ContabilidadPage } from './pages/ContabilidadPage';
import { PersonalPage } from './pages/PersonalPage';
import { DoctoresPage } from './pages/DoctoresPage';
import { ResumenDiaPage } from './pages/ResumenDiaPage';

// Módulo de Inventario
import { InventarioHomePage } from './pages/InventarioHomePage';
import { ProductosInventarioPage } from './pages/ProductosInventarioPage';
import { MovimientosPage } from './pages/MovimientosPage';
import { ProveedoresPage } from './pages/ProveedoresPage';

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

  // Si está en el módulo de resumen del día
  if (currentModule === 'resumen') {
    return <ResumenDiaPage onBack={handleBackToDashboard} />;
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
        case 'pacientes':
          return <PacientesPage onBack={() => setCurrentPage('home')} />;
        case 'cuadre':
          return <CuadreDiarioPage onBack={() => setCurrentPage('home')} />;
        case 'cuadre-quincenal':
          return <CuadreQuincenalPage onBack={() => setCurrentPage('home')} />;
        case 'estadisticas':
          return <EstadisticasPage onBack={() => setCurrentPage('home')} />;
        case 'reportes':
          return <ReportesPage onBack={() => setCurrentPage('home')} />;
        case 'comisiones':
          return <ComisionesPage onBack={() => setCurrentPage('home')} />;
        case 'contabilidad':
          return <ContabilidadPage onBack={() => setCurrentPage('home')} />;
        case 'usuarios':
          return <GestionUsuariosPage onBack={() => setCurrentPage('home')} />;
        default:
          return <HomePage onNavigate={setCurrentPage} />;
      }
    };

    return (
      <div>
        {/* Botón para volver al dashboard - SOLO en HomePage */}
        {currentPage === 'home' && (
          <div className="fixed top-4 right-4 z-50">
            <button
              onClick={handleBackToDashboard}
              className="bg-white shadow-md px-3 py-1.5 rounded hover:bg-gray-50 transition-colors text-xs font-medium border border-gray-300"
            >
              ← Dashboard
            </button>
          </div>
        )}
        {renderPage()}
      </div>
    );
  }

  // Si está en el módulo de inventario
  if (currentModule === 'inventario') {
    const renderPage = () => {
      switch (currentPage) {
        case 'home':
          return <InventarioHomePage onNavigate={setCurrentPage} />;
        case 'productos':
          return <ProductosInventarioPage onBack={() => setCurrentPage('home')} />;
        case 'movimientos':
          return <MovimientosPage onBack={() => setCurrentPage('home')} />;
        case 'proveedores':
          return <ProveedoresPage onBack={() => setCurrentPage('home')} />;
        case 'reportes':
          return <InventarioHomePage onNavigate={setCurrentPage} />; // TODO: Crear ReportesPage
        default:
          return <InventarioHomePage onNavigate={setCurrentPage} />;
      }
    };

    return (
      <div>
        {currentPage === 'home' && (
          <div className="fixed top-4 right-4 z-50">
            <button
              onClick={handleBackToDashboard}
              className="bg-white shadow-md px-3 py-1.5 rounded hover:bg-gray-50 transition-colors text-xs font-medium border border-gray-300"
            >
              ← Dashboard
            </button>
          </div>
        )}
        {renderPage()}
      </div>
    );
  }

  // Si está en el módulo de visitadoras médicas
  if (currentModule === 'contabilidad') {
    return <ContabilidadPage onBack={handleBackToDashboard} />;
  }

  if (currentModule === 'personal') {
    return <PersonalPage onBack={handleBackToDashboard} />;
  }

  if (currentModule === 'doctores') {
    return <DoctoresPage onBack={handleBackToDashboard} />;
  }

  if (currentModule === 'visitadoras') {
    return (
      <div>
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleBackToDashboard}
            className="bg-white shadow-md px-3 py-1.5 rounded hover:bg-gray-50 transition-colors text-xs font-medium border border-gray-300"
          >
            ← Dashboard
          </button>
        </div>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">🚧 Módulo de Visitadoras Médicas</h1>
            <p className="text-gray-600">En construcción - Próximamente disponible</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback al dashboard
  return <DashboardPage onNavigateToModule={handleNavigateToModule} onLogout={handleLogout} />;
}

export default App;