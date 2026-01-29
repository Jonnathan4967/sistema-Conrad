import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';

interface AlertaCuadreProps {
  onVerCuadre: (fecha: string) => void;
}

export const AlertaCuadre: React.FC<AlertaCuadreProps> = ({ onVerCuadre }) => {
  const [diasSinCuadrar, setDiasSinCuadrar] = useState<string[]>([]);
  const [mostrar, setMostrar] = useState(true);

  useEffect(() => {
    verificarDiasSinCuadrar();
  }, []);

  const verificarDiasSinCuadrar = async () => {
    try {
      // Verificar últimos 7 días
      const hoy = new Date();
      const hace7Dias = subDays(hoy, 7);
      
      const fechasAVerificar: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const fecha = subDays(hoy, i);
        fechasAVerificar.push(format(fecha, 'yyyy-MM-dd'));
      }

      // Obtener consultas de esos días
      const { data: consultas, error: errorConsultas } = await supabase
        .from('consultas')
        .select('fecha, id')
        .gte('fecha', format(hace7Dias, 'yyyy-MM-dd'))
        .lt('fecha', format(hoy, 'yyyy-MM-dd'));

      if (errorConsultas) throw errorConsultas;

      // Obtener cuadres de esos días
      const { data: cuadres, error: errorCuadres } = await supabase
        .from('cuadres_diarios')
        .select('fecha')
        .gte('fecha', format(hace7Dias, 'yyyy-MM-dd'))
        .lt('fecha', format(hoy, 'yyyy-MM-dd'));

      if (errorCuadres) throw errorCuadres;

      // Agrupar consultas por fecha
      const fechasConConsultas = new Set(consultas?.map(c => c.fecha) || []);
      const fechasCuadradas = new Set(cuadres?.map(c => c.fecha) || []);

      // Encontrar días con consultas pero sin cuadrar
      const sinCuadrar: string[] = [];
      fechasConConsultas.forEach(fecha => {
        if (!fechasCuadradas.has(fecha)) {
          sinCuadrar.push(fecha);
        }
      });

      sinCuadrar.sort().reverse(); // Más reciente primero
      setDiasSinCuadrar(sinCuadrar);
    } catch (error) {
      console.error('Error al verificar días sin cuadrar:', error);
    }
  };

  if (!mostrar || diasSinCuadrar.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 border-2 border-red-500 rounded-lg shadow-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={28} />
            <div>
              <h3 className="font-bold text-red-900 text-lg">¡Días Sin Cuadrar!</h3>
              <p className="text-sm text-red-700">
                {diasSinCuadrar.length} día(s) pendiente(s)
              </p>
            </div>
          </div>
          <button
            onClick={() => setMostrar(false)}
            className="text-red-600 hover:bg-red-100 p-1 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-3">
          {diasSinCuadrar.slice(0, 3).map(fecha => (
            <div
              key={fecha}
              className="flex items-center justify-between bg-white p-3 rounded border border-red-200"
            >
              <div>
                <div className="font-semibold text-gray-900">
                  {format(new Date(fecha + 'T12:00:00'), 'dd/MM/yyyy')}
                </div>
                <div className="text-xs text-red-600">Debe realizar el cuadre urgentemente</div>
              </div>
              <button
                onClick={() => {
                  onVerCuadre(fecha);
                  setMostrar(false);
                }}
                className="btn-primary text-sm px-3 py-1"
              >
                Cuadrar
              </button>
            </div>
          ))}
        </div>

        {diasSinCuadrar.length > 3 && (
          <p className="text-xs text-center text-red-600">
            Y {diasSinCuadrar.length - 3} día(s) más sin cuadrar
          </p>
        )}
      </div>
    </div>
  );
};
