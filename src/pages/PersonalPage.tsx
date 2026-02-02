import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  DollarSign, 
  Calendar,
  UserPlus,
  FileText,
  TrendingUp,
  Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmpleadosPage } from './EmpleadosPage';
import { AsistenciaPage } from './AsistenciaPage';
import { NominaPage } from './NominaPage';
import { ConfiguracionPage } from './ConfiguracionPage';

interface PersonalPageProps {
  onBack: () => void;
}

type Vista = 'dashboard' | 'empleados' | 'asistencia' | 'nomina' | 'configuracion';

export const PersonalPage: React.FC<PersonalPageProps> = ({ onBack }) => {
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');
  const [loading, setLoading] = useState(false);
  
  const [estadisticas, setEstadisticas] = useState({
    totalEmpleados: 0,
    empleadosActivos: 0,
    ausenciasHoy: 0,
    totalNomina: 0
  });

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      // Total empleados
      const { data: empleados } = await supabase
        .from('empleados')
        .select('id, estado, salario_mensual');

      const total = empleados?.length || 0;
      const activos = empleados?.filter(e => e.estado === 'activo').length || 0;
      const totalNomina = empleados
        ?.filter(e => e.estado === 'activo')
        .reduce((sum, e) => sum + (e.salario_mensual || 0), 0) || 0;

      // Ausencias hoy
      const hoy = new Date().toISOString().split('T')[0];
      const { data: ausencias } = await supabase
        .from('ausencias')
        .select('id')
        .lte('fecha_inicio', hoy)
        .gte('fecha_fin', hoy)
        .eq('estado', 'aprobado');

      setEstadisticas({
        totalEmpleados: total,
        empleadosActivos: activos,
        ausenciasHoy: ausencias?.length || 0,
        totalNomina: totalNomina
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (vistaActual === 'empleados') {
    return <EmpleadosPage onBack={() => setVistaActual('dashboard')} />;
  }

  if (vistaActual === 'asistencia') {
    return <AsistenciaPage onBack={() => setVistaActual('dashboard')} />;
  }

  if (vistaActual === 'nomina') {
    return <NominaPage onBack={() => setVistaActual('dashboard')} />;
  }

  if (vistaActual === 'configuracion') {
    return <ConfiguracionPage onBack={() => setVistaActual('dashboard')} />;
  }

  if (vistaActual !== 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <button 
              onClick={() => setVistaActual('dashboard')} 
              className="text-white hover:text-indigo-100 mb-4 flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Volver al Dashboard
            </button>
            <h1 className="text-3xl font-bold">
              {vistaActual === 'empleados' && '👥 Gestión de Empleados'}
              {vistaActual === 'asistencia' && '⏰ Control de Asistencia'}
              {vistaActual === 'nomina' && '💰 Nómina'}
            </h1>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <p className="text-blue-900 text-lg">🚧 Módulo en desarrollo</p>
            <p className="text-blue-700 mt-2">Próximamente disponible</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button 
            onClick={onBack} 
            className="text-white hover:text-indigo-100 mb-4 flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">👥 Gestión de Personal</h1>
          <p className="text-indigo-100 mt-2">Recursos Humanos y Nómina</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Estadísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Users className="text-indigo-600" size={32} />
            </div>
            <p className="text-gray-600 text-sm mb-1">Total Empleados</p>
            <p className="text-3xl font-bold text-gray-900">{estadisticas.totalEmpleados}</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Clock className="text-green-600" size={32} />
            </div>
            <p className="text-gray-600 text-sm mb-1">Activos</p>
            <p className="text-3xl font-bold text-green-600">
              {estadisticas.empleadosActivos}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="text-orange-600" size={32} />
            </div>
            <p className="text-gray-600 text-sm mb-1">Ausencias Hoy</p>
            <p className="text-3xl font-bold text-orange-600">
              {estadisticas.ausenciasHoy}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="text-blue-600" size={32} />
            </div>
            <p className="text-gray-600 text-sm mb-1">Nómina Mensual</p>
            <p className="text-2xl font-bold text-blue-600">
              Q {estadisticas.totalNomina.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Menú de Acciones */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button 
            onClick={() => setVistaActual('empleados')}
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1 text-left"
          >
            <Users className="text-indigo-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Empleados</h3>
            <p className="text-gray-600">Gestionar personal y datos</p>
          </button>

          <button 
            onClick={() => setVistaActual('asistencia')}
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1 text-left"
          >
            <Clock className="text-green-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Asistencia</h3>
            <p className="text-gray-600">Control de horarios</p>
          </button>

          <button 
            onClick={() => setVistaActual('nomina')}
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1 text-left"
          >
            <DollarSign className="text-blue-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Nómina</h3>
            <p className="text-gray-600">Calcular y generar pagos</p>
          </button>

          <button 
            onClick={() => setVistaActual('configuracion')}
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1 text-left"
          >
            <Settings className="text-purple-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Configuración</h3>
            <p className="text-gray-600">Departamentos y puestos</p>
          </button>

          <button className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1 text-left">
            <Calendar className="text-orange-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Ausencias</h3>
            <p className="text-gray-600">Permisos y vacaciones</p>
          </button>

          <button className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1 text-left">
            <FileText className="text-gray-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">Reportes</h3>
            <p className="text-gray-600">Reportes de RR.HH.</p>
          </button>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
            <TrendingUp size={20} />
            Sistema de Recursos Humanos
          </h3>
          <ul className="text-sm text-indigo-800 space-y-2">
            <li>• <strong>Empleados:</strong> Gestión completa del personal</li>
            <li>• <strong>Asistencia:</strong> Control de entradas y salidas</li>
            <li>• <strong>Nómina:</strong> Cálculo flexible de salarios</li>
            <li>• <strong>Reportes:</strong> Exportación a Excel disponible</li>
          </ul>
        </div>
      </div>
    </div>
  );
};