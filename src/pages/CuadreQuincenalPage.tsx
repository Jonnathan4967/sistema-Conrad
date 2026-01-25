import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generarCuadreQuincenal } from '../utils/cuadre-quincenal-generator';

interface CuadreQuincenalPageProps {
  onBack: () => void;
}

export const CuadreQuincenalPage: React.FC<CuadreQuincenalPageProps> = ({ onBack }) => {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [quincena, setQuincena] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const generarReporte = async () => {
    setLoading(true);

    try {
      // Calcular fechas según quincena
      const fechaInicio = quincena === 1 
        ? new Date(anio, mes - 1, 1)
        : new Date(anio, mes - 1, 16);
      
      const fechaFin = quincena === 1
        ? new Date(anio, mes - 1, 15, 23, 59, 59)
        : new Date(anio, mes - 1 + 1, 0, 23, 59, 59); // Último día del mes

      // Obtener consultas con médico referente y estado de cuenta
      const { data: consultas, error } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre, edad, telefono),
          medicos(nombre),
          detalle_consultas(
            precio,
            sub_estudios(nombre)
          )
        `)
        .gte('fecha', fechaInicio.toISOString())
        .lte('fecha', fechaFin.toISOString())
        .not('medico_id', 'is', null)
        .eq('sin_informacion_medico', false)
        .eq('forma_pago', 'estado_cuenta')
        .order('medico_id')
        .order('fecha');

      if (error) throw error;

      if (!consultas || consultas.length === 0) {
        alert('No hay estados de cuenta de pacientes referidos en esta quincena');
        setLoading(false);
        return;
      }

      // Agrupar por médico
      const consultasPorMedico: { [key: string]: any[] } = {};
      
      consultas.forEach(consulta => {
        const medicoNombre = consulta.medicos?.nombre || 'Sin médico';
        if (!consultasPorMedico[medicoNombre]) {
          consultasPorMedico[medicoNombre] = [];
        }
        consultasPorMedico[medicoNombre].push(consulta);
      });

      // Generar Excel
      await generarCuadreQuincenal({
        consultasPorMedico,
        mes: meses[mes - 1],
        anio,
        quincena,
        fechaInicio,
        fechaFin
      });

      alert('✅ Cuadre quincenal generado exitosamente');
    } catch (error) {
      console.error('Error al generar cuadre:', error);
      alert('Error al generar cuadre: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:text-purple-100 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          <div className="flex items-center gap-3">
            <Calendar size={32} />
            <div>
              <h1 className="text-3xl font-bold">Cuadre Quincenal</h1>
              <p className="text-purple-100 mt-1">Estados de cuenta por médico referente</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Generar Cuadre Quincenal</h2>

          <div className="space-y-6">
            {/* Selector de Mes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {meses.map((nombre, idx) => (
                  <option key={idx} value={idx + 1}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Año */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="2020"
                max="2030"
              />
            </div>

            {/* Selector de Quincena */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quincena
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setQuincena(1)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    quincena === 1
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}
                >
                  <div className="font-bold">1ra Quincena</div>
                  <div className="text-sm text-gray-600">Del 1 al 15</div>
                </button>
                <button
                  onClick={() => setQuincena(2)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    quincena === 2
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}
                >
                  <div className="font-bold">2da Quincena</div>
                  <div className="text-sm text-gray-600">Del 16 al fin de mes</div>
                </button>
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2">Resumen</h3>
              <p className="text-sm text-gray-700">
                Se generará el cuadre de la <strong>{quincena === 1 ? 'primera' : 'segunda'} quincena</strong> de{' '}
                <strong>{meses[mes - 1]} {anio}</strong>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                📅 Periodo: {quincena === 1 ? '1-15' : '16-fin de mes'} de {meses[mes - 1]}
              </p>
              <p className="text-sm text-gray-600">
                👨‍⚕️ Solo pacientes referidos con estado de cuenta pendiente
              </p>
            </div>

            {/* Botón Generar */}
            <button
              onClick={generarReporte}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Generar Cuadre Quincenal
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info adicional */}
        <div className="mt-6 max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">ℹ️ Información</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• El cuadre incluye solo pacientes con médico referente</li>
              <li>• Solo muestra estados de cuenta pendientes de pago</li>
              <li>• Se genera un reporte separado por cada médico</li>
              <li>• El archivo Excel incluye logo CONRAD y formato profesional</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};