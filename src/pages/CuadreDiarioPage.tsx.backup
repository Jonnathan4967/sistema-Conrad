import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface CuadreDiario {
  fecha: string;
  total_consultas: number;
  sub_total: number;
  descuento: number;
  monto_gravable: number;
  impuesto: number;
  total_ventas: number;
}

interface CuadreDiarioPageProps {
  onBack: () => void;
}

export const CuadreDiarioPage: React.FC<CuadreDiarioPageProps> = ({ onBack }) => {
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cuadre, setCuadre] = useState<CuadreDiario | null>(null);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCuadre();
  }, [fecha]);

  const cargarCuadre = async () => {
    setLoading(true);
    try {
      // Obtener consultas del día
      const { data: consultas, error: errorConsultas } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre),
          medicos(nombre)
        `)
        .eq('fecha', fecha);

      if (errorConsultas) throw errorConsultas;

      // Obtener detalles de consultas
      const consultasIds = consultas?.map(c => c.id) || [];
      
      if (consultasIds.length === 0) {
        setCuadre({
          fecha,
          total_consultas: 0,
          sub_total: 0,
          descuento: 0,
          monto_gravable: 0,
          impuesto: 0,
          total_ventas: 0
        });
        setDetalles([]);
        setLoading(false);
        return;
      }

      const { data: detallesData, error: errorDetalles } = await supabase
        .from('detalle_consultas')
        .select(`
          *,
          sub_estudios(nombre)
        `)
        .in('consulta_id', consultasIds);

      if (errorDetalles) throw errorDetalles;

      // Calcular totales
      const subTotal = detallesData?.reduce((sum, d) => sum + d.precio, 0) || 0;
      const descuento = 0; // Implementar lógica si se requiere
      const montoGravable = subTotal - descuento;
      const impuesto = 0; // Implementar lógica si se requiere
      const totalVentas = montoGravable + impuesto;

      setCuadre({
        fecha,
        total_consultas: consultas?.length || 0,
        sub_total: subTotal,
        descuento,
        monto_gravable: montoGravable,
        impuesto,
        total_ventas: totalVentas
      });

      // Preparar detalles para mostrar
      const detallesConInfo = consultas?.map(consulta => {
        const detallesConsulta = detallesData?.filter(d => d.consulta_id === consulta.id) || [];
        const total = detallesConsulta.reduce((sum, d) => sum + d.precio, 0);
        
        return {
          ...consulta,
          detalles: detallesConsulta,
          total
        };
      });

      setDetalles(detallesConInfo || []);
    } catch (error) {
      console.error('Error al cargar cuadre:', error);
      alert('Error al cargar el cuadre diario');
    }
    setLoading(false);
  };

  const getTipoCobro = (tipo: string) => {
    const tipos: any = {
      normal: 'Normal',
      social: 'Social',
      especial: 'Especial'
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center gap-4">
          <button onClick={onBack} className="hover:bg-blue-600 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">Cuadre Diario</h1>
        </div>
      </header>

      <div className="container mx-auto p-4">
        {/* Selector de fecha */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="text-blue-600" size={24} />
            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                className="input-field"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <button 
              onClick={cargarCuadre}
              className="btn-primary mt-6"
            >
              Actualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Cargando...</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            {cuadre && (
              <div className="card mb-6 bg-blue-50">
                <h2 className="text-xl font-bold mb-4">Resumen del {format(new Date(fecha), 'dd/MM/yyyy')}</h2>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded shadow">
                    <p className="text-sm text-gray-600">Total Consultas</p>
                    <p className="text-3xl font-bold text-blue-700">{cuadre.total_consultas}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded shadow">
                    <p className="text-sm text-gray-600">Sub-Total</p>
                    <p className="text-3xl font-bold text-green-700">Q {cuadre.sub_total.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded shadow">
                    <p className="text-sm text-gray-600">Total Ventas</p>
                    <p className="text-3xl font-bold text-blue-700">Q {cuadre.total_ventas.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-4 grid md:grid-cols-3 gap-2 text-sm">
                  <div><strong>Descuento:</strong> Q {cuadre.descuento.toFixed(2)}</div>
                  <div><strong>Monto Gravable:</strong> Q {cuadre.monto_gravable.toFixed(2)}</div>
                  <div><strong>Impuesto:</strong> Q {cuadre.impuesto.toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Detalle de consultas */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Detalle de Consultas</h2>
              
              {detalles.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No hay consultas registradas para esta fecha</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {detalles.map((consulta, index) => (
                    <div key={consulta.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">#{index + 1} - {consulta.pacientes?.nombre}</h3>
                          <p className="text-sm text-gray-600">
                            Médico: {consulta.sin_informacion_medico ? 'Sin información' : (consulta.medicos?.nombre || 'N/A')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {getTipoCobro(consulta.tipo_cobro)}
                          </span>
                          <p className="text-lg font-bold text-blue-700 mt-1">Q {consulta.total.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="border-t pt-2 mt-2">
                        <p className="text-sm font-semibold mb-1">Estudios realizados:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {consulta.detalles.map((detalle: any) => (
                            <li key={detalle.id} className="flex justify-between">
                              <span>• {detalle.sub_estudios?.nombre}</span>
                              <span className="font-medium">Q {detalle.precio.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-4 text-xs text-gray-500 mt-2 pt-2 border-t">
                        <span>Factura: {consulta.requiere_factura ? 'Sí' : 'No'}</span>
                        <span>Pago: {consulta.forma_pago}</span>
                        {consulta.numero_factura && <span>No. Factura: {consulta.numero_factura}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
