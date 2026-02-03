import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, CheckCircle2, Save, Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { generarCuadreExcel } from '../utils/cuadre-excel-generator';

interface CuadrePorFormaPago {
  forma_pago: string;
  cantidad: number;
  total: number;
}

interface CuadreDiario {
  fecha: string;
  total_consultas: number;
  total_ventas: number;
  cuadres_forma_pago: CuadrePorFormaPago[];
}

interface CuadreDiarioPageProps {
  onBack: () => void;
}

export const CuadreDiarioPage: React.FC<CuadreDiarioPageProps> = ({ onBack }) => {
  const getFechaGuatemala = () => {
    const ahora = new Date();
    const guatemalaTime = new Date(ahora.getTime() - (6 * 60 * 60 * 1000));
    return guatemalaTime.toISOString().split('T')[0];
  };

  const [fecha, setFecha] = useState(getFechaGuatemala());
  const [cuadre, setCuadre] = useState<CuadreDiario | null>(null);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [consultasAnuladas, setConsultasAnuladas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para cuadre de móviles
  const [cuadreMoviles, setCuadreMoviles] = useState<CuadreDiario | null>(null);
  const [detallesMoviles, setDetallesMoviles] = useState<any[]>([]);
  
  // Estados para cuadre de caja
  const [efectivoContado, setEfectivoContado] = useState('');
  const [tarjetaContado, setTarjetaContado] = useState('');
  const [transferenciaContado, setTransferenciaContado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [mostrarCuadre, setMostrarCuadre] = useState(false);
  
  // Estados para gastos
  const [gastos, setGastos] = useState<any[]>([]);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [conceptoGasto, setConceptoGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');

  // ✅ NUEVO: Estados para colapsar secciones
  const [mostrarDetallesMoviles, setMostrarDetallesMoviles] = useState(false);
  const [mostrarDetallesRegulares, setMostrarDetallesRegulares] = useState(false);
  const [mostrarGastos, setMostrarGastos] = useState(true);
  const [mostrarAnuladas, setMostrarAnuladas] = useState(false);

  useEffect(() => {
    cargarCuadre();
  }, [fecha]);

  const cargarCuadre = async () => {
    setLoading(true);
    try {
      const { data: consultas, error: errorConsultas } = await supabase
        .from('consultas')
        .select(`
          *,
          pacientes(nombre),
          medicos(nombre)
        `)
        .eq('fecha', fecha);

      if (errorConsultas) throw errorConsultas;

      const consultasRegulares = consultas?.filter(c => 
        c.anulado !== true && c.es_servicio_movil !== true
      ) || [];

      const consultasMoviles = consultas?.filter(c => 
        c.anulado !== true && c.es_servicio_movil === true
      ) || [];

      const consultasIds = consultas?.map(c => c.id) || [];
      
      if (consultasIds.length === 0) {
        setCuadre({
          fecha,
          total_consultas: 0,
          total_ventas: 0,
          cuadres_forma_pago: []
        });
        setCuadreMoviles({
          fecha,
          total_consultas: 0,
          total_ventas: 0,
          cuadres_forma_pago: []
        });
        setDetalles([]);
        setDetallesMoviles([]);
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

      // Calcular totales regulares
      const cuadrePorForma: { [key: string]: CuadrePorFormaPago } = {};
      const consultasAnuladas = consultas?.filter(c => c.anulado === true) || [];
      
      consultasRegulares.forEach(consulta => {
        const detallesConsulta = detallesData?.filter(d => d.consulta_id === consulta.id) || [];
        const totalConsulta = detallesConsulta.reduce((sum, d) => sum + d.precio, 0);
        const formaPago = consulta.forma_pago;

        if (!cuadrePorForma[formaPago]) {
          cuadrePorForma[formaPago] = {
            forma_pago: formaPago,
            cantidad: 0,
            total: 0
          };
        }

        cuadrePorForma[formaPago].cantidad += 1;
        cuadrePorForma[formaPago].total += totalConsulta;
      });

      const totalVentas = Object.values(cuadrePorForma).reduce((sum, c) => sum + c.total, 0);

      setCuadre({
        fecha,
        total_consultas: consultasRegulares.length,
        total_ventas: totalVentas,
        cuadres_forma_pago: Object.values(cuadrePorForma)
      });

      // Calcular totales móviles
      const cuadreMovilesPorForma: { [key: string]: CuadrePorFormaPago } = {};
      
      consultasMoviles.forEach(consulta => {
        const detallesConsulta = detallesData?.filter(d => d.consulta_id === consulta.id) || [];
        const totalRX = detallesConsulta.reduce((sum, d) => sum + d.precio, 0);
        let totalExtras = 0;
        if (consulta.movil_incluye_placas) totalExtras += consulta.movil_precio_placas || 0;
        if (consulta.movil_incluye_informe) totalExtras += consulta.movil_precio_informe || 0;
        
        const totalConsulta = totalRX + totalExtras;
        const formaPago = consulta.forma_pago;

        if (!cuadreMovilesPorForma[formaPago]) {
          cuadreMovilesPorForma[formaPago] = {
            forma_pago: formaPago,
            cantidad: 0,
            total: 0
          };
        }

        cuadreMovilesPorForma[formaPago].cantidad += 1;
        cuadreMovilesPorForma[formaPago].total += totalConsulta;
      });

      const totalVentasMoviles = Object.values(cuadreMovilesPorForma).reduce((sum, c) => sum + c.total, 0);

      setCuadreMoviles({
        fecha,
        total_consultas: consultasMoviles.length,
        total_ventas: totalVentasMoviles,
        cuadres_forma_pago: Object.values(cuadreMovilesPorForma)
      });

      const detallesConInfo = detallesData
        ?.filter(d => {
          const consulta = consultasRegulares.find(c => c.id === d.consulta_id);
          return !!consulta;
        })
        .map(d => {
          const consulta = consultasRegulares.find(c => c.id === d.consulta_id);
          return {
            ...d,
            paciente: consulta?.pacientes?.nombre,
            medico: consulta?.medicos?.nombre || 'Sin información',
            forma_pago: consulta?.forma_pago,
            tipo_cobro: consulta?.tipo_cobro,
            numero_transferencia: consulta?.numero_transferencia,
            numero_voucher: consulta?.numero_voucher
          };
        }) || [];
      
      setDetalles(detallesConInfo);

      const detallesMovilesConInfo = consultasMoviles.map(consulta => {
        const detallesConsulta = detallesData?.filter(d => d.consulta_id === consulta.id) || [];
        const totalRX = detallesConsulta.reduce((sum, d) => sum + d.precio, 0);
        let totalExtras = 0;
        if (consulta.movil_incluye_placas) totalExtras += consulta.movil_precio_placas || 0;
        if (consulta.movil_incluye_informe) totalExtras += consulta.movil_precio_informe || 0;

        return {
          paciente: consulta.pacientes?.nombre,
          establecimiento: consulta.movil_establecimiento,
          estudios: detallesConsulta,
          totalRX,
          totalExtras,
          total: totalRX + totalExtras,
          forma_pago: consulta.forma_pago,
          incluye_placas: consulta.movil_incluye_placas,
          precio_placas: consulta.movil_precio_placas,
          incluye_informe: consulta.movil_incluye_informe,
          precio_informe: consulta.movil_precio_informe
        };
      });

      setDetallesMoviles(detallesMovilesConInfo);
      
      setConsultasAnuladas(consultasAnuladas.map(c => ({
        nombre: c.pacientes?.nombre,
        usuario_anulo: c.usuario_anulo,
        fecha_anulacion: c.fecha_anulacion,
        motivo_anulacion: c.motivo_anulacion,
        total: detallesData?.filter(d => d.consulta_id === c.id).reduce((sum, d) => sum + d.precio, 0) || 0
      })));
      
      cargarGastos();
    } catch (error) {
      console.error('Error al cargar cuadre:', error);
      alert('Error al cargar el cuadre diario');
    }
    setLoading(false);
  };

  const cargarGastos = async () => {
    try {
      const { data, error } = await supabase
        .from('gastos')
        .select(`
          *,
          categorias_gastos(nombre)
        `)
        .eq('fecha', fecha)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setGastos(data || []);
    } catch (error) {
      console.error('Error al cargar gastos:', error);
    }
  };

  const agregarGasto = async () => {
    if (!conceptoGasto.trim() || !montoGasto) {
      alert('Complete todos los campos del gasto');
      return;
    }

    try {
      let { data: categoria, error: catError } = await supabase
        .from('categorias_gastos')
        .select('id')
        .eq('nombre', 'Gastos Operativos')
        .single();

      if (catError || !categoria) {
        const { data: nuevaCategoria, error: nuevaCatError } = await supabase
          .from('categorias_gastos')
          .insert([{ nombre: 'Gastos Operativos', descripcion: 'Gastos diarios operacionales' }])
          .select()
          .single();

        if (nuevaCatError) throw nuevaCatError;
        categoria = nuevaCategoria;
      }

      const { error } = await supabase
        .from('gastos')
        .insert([{
          fecha,
          categoria_id: categoria.id,
          concepto: conceptoGasto,
          monto: parseFloat(montoGasto),
          forma_pago: 'efectivo'
        }]);
      
      if (error) throw error;
      
      setConceptoGasto('');
      setMontoGasto('');
      setShowModalGasto(false);
      cargarGastos();
      alert('✅ Gasto agregado exitosamente');
    } catch (error) {
      console.error('Error al agregar gasto:', error);
      alert('Error al agregar gasto');
    }
  };

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    
    try {
      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      cargarGastos();
      alert('Gasto eliminado');
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      alert('Error al eliminar gasto');
    }
  };

  const descargarCuadre = async (formato: 'csv' | 'pdf') => {
    if (!efectivoContado || efectivoContado === '' || !tarjetaContado || tarjetaContado === '' || !transferenciaContado || transferenciaContado === '') {
      alert('Debe ingresar todos los montos contados');
      return;
    }

    const efectivoContadoNum = parseFloat(efectivoContado);
    const tarjetaContadoNum = parseFloat(tarjetaContado);
    const depositadoContadoNum = parseFloat(transferenciaContado);

    const diferencias = {
      efectivo: calcularDiferencia(efectivoEsperado, efectivoContadoNum),
      tarjeta: calcularDiferencia(tarjetaEsperada, tarjetaContadoNum),
      depositado: calcularDiferencia(depositadoEsperado, depositadoContadoNum)
    };

    const cuadreCorrecto = Math.abs(diferencias.efectivo) < 0.01 && 
                           Math.abs(diferencias.tarjeta) < 0.01 && 
                           Math.abs(diferencias.depositado) < 0.01;

    const fechaFormateada = format(new Date(fecha + 'T12:00:00'), 'dd/MM/yyyy');
    const horaActual = format(new Date(), 'HH:mm');

    if (formato === 'csv') {
      await generarCuadreExcel({
        fecha: fechaFormateada,
        horaActual,
        totalConsultas: cuadre?.total_consultas || 0,
        totalVentas: cuadre?.total_ventas || 0,
        efectivoEsperado,
        efectivoContado: efectivoContadoNum,
        tarjetaEsperada,
        tarjetaContado: tarjetaContadoNum,
        transferenciaEsperada: depositadoEsperado,
        transferenciaContado: depositadoContadoNum,
        diferencias,
        cuadreCorrecto,
        observaciones,
        cuadresPorFormaPago: cuadre?.cuadres_forma_pago.map(c => ({
          forma_pago: getFormaPagoNombre(c.forma_pago),
          cantidad: c.cantidad,
          total: c.total
        })) || []
      });

      alert(cuadreCorrecto ? 
        `✅ Cuadre correcto! Archivo Excel descargado.` : 
        `⚠️ Cuadre con diferencias. Archivo Excel descargado.`
      );
    }
  };

  const getFormaPagoNombre = (forma: string) => {
    const formas: any = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      efectivo_facturado: 'Depósito',
      estado_cuenta: 'Estado de Cuenta'
    };
    return formas[forma] || forma;
  };

  const calcularDiferencia = (esperado: number, contado: number) => {
    return contado - esperado;
  };

  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
  const efectivoEsperado = (cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'efectivo')?.total || 0) - totalGastos;
  const depositadoEsperado = (cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'efectivo_facturado')?.total || 0) +
                              (cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'transferencia')?.total || 0);
  const tarjetaEsperada = cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'tarjeta')?.total || 0;

  const efectivoContadoNum = parseFloat(efectivoContado) || 0;
  const depositadoContadoNum = parseFloat(transferenciaContado) || 0;
  const tarjetaContadoNum = parseFloat(tarjetaContado) || 0;

  const diferenciaEfectivo = calcularDiferencia(efectivoEsperado, efectivoContadoNum);
  const diferenciaDepositado = calcularDiferencia(depositadoEsperado, depositadoContadoNum);
  const diferenciaTarjeta = calcularDiferencia(tarjetaEsperada, tarjetaContadoNum);

  const cuadreCorrecto = Math.abs(diferenciaEfectivo) < 0.01 && 
                         Math.abs(diferenciaDepositado) < 0.01 &&
                         Math.abs(diferenciaTarjeta) < 0.01;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <button onClick={onBack} className="flex items-center gap-2 text-white hover:text-green-100 mb-4 transition-colors">
            <ArrowLeft size={20} />
            Volver
          </button>
          <h1 className="text-3xl font-bold">Cuadre Diario</h1>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-7xl">
        {/* ✅ MEJORADO: Selector de fecha más compacto */}
        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-600" size={20} />
              <input
                type="date"
                className="input-field"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <button
              onClick={() => setMostrarCuadre(!mostrarCuadre)}
              className="btn-primary flex items-center gap-2"
            >
              <DollarSign size={20} />
              {mostrarCuadre ? 'Ocultar' : 'Cuadrar'} Caja
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Cargando...</p>
          </div>
        ) : (
          <>
            {/* ✅ MEJORADO: Resumen compacto en una sola fila */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="text-sm text-gray-600">Total Consultas</div>
                <div className="text-2xl font-bold text-blue-700">{cuadre?.total_consultas || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="text-sm text-gray-600">Total Ventas</div>
                <div className="text-2xl font-bold text-green-700">Q {cuadre?.total_ventas.toFixed(2) || '0.00'}</div>
              </div>
              {cuadreMoviles && cuadreMoviles.total_consultas > 0 && (
                <>
                  <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                    <div className="text-sm text-gray-600">📱 Móviles</div>
                    <div className="text-2xl font-bold text-orange-700">{cuadreMoviles.total_consultas}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                    <div className="text-sm text-gray-600">Ventas Móviles</div>
                    <div className="text-2xl font-bold text-orange-700">Q {cuadreMoviles.total_ventas.toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>

            {/* ✅ MEJORADO: Formas de pago compactas */}
            <div className="card mb-4">
              <h3 className="text-lg font-semibold mb-3">Por Forma de Pago</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {cuadre?.cuadres_forma_pago.map(c => (
                  <div key={c.forma_pago} className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600 mb-1">{getFormaPagoNombre(c.forma_pago)}</div>
                    <div className="text-lg font-bold text-blue-600">Q {c.total.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{c.cantidad} consulta(s)</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ NUEVO: Sección colapsable de móviles */}
            {cuadreMoviles && cuadreMoviles.total_consultas > 0 && (
              <div className="card mb-4 bg-orange-50 border border-orange-200">
                <button
                  onClick={() => setMostrarDetallesMoviles(!mostrarDetallesMoviles)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="text-lg font-semibold text-orange-800">
                    📱 Servicios Móviles - Desglose por Forma de Pago
                  </h3>
                  {mostrarDetallesMoviles ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {mostrarDetallesMoviles && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {cuadreMoviles.cuadres_forma_pago.map(c => (
                      <div key={c.forma_pago} className="bg-white rounded p-3">
                        <div className="text-xs text-gray-600 mb-1">{getFormaPagoNombre(c.forma_pago)}</div>
                        <div className="text-lg font-bold text-orange-600">Q {c.total.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{c.cantidad} consulta(s)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ✅ MEJORADO: Gastos colapsables */}
            <div className="card mb-4">
              <button
                onClick={() => setMostrarGastos(!mostrarGastos)}
                className="w-full flex items-center justify-between mb-3"
              >
                <h3 className="text-lg font-semibold">
                  Gastos del Día {gastos.length > 0 && `(${gastos.length})`}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModalGasto(true);
                    }}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                  {mostrarGastos ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {mostrarGastos && (
                gastos.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay gastos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {gastos.map(gasto => (
                      <div key={gasto.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{gasto.concepto}</div>
                          <div className="text-xs text-gray-600">
                            {(() => {
                              const fecha = new Date(gasto.created_at);
                              const horaGT = new Date(fecha.getTime() - (6 * 60 * 60 * 1000));
                              return horaGT.toLocaleTimeString('es-GT', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true
                              });
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold text-red-600">
                            - Q {gasto.monto.toFixed(2)}
                          </div>
                          <button
                            onClick={() => eliminarGasto(gasto.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {gastos.length > 0 && (
                      <div className="flex justify-between items-center p-3 bg-red-100 border-2 border-red-400 rounded font-bold">
                        <span>Total Gastos:</span>
                        <span className="text-red-700">- Q {totalGastos.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* ✅ Cuadre de caja */}
            {mostrarCuadre && cuadre && cuadre.total_consultas > 0 && (
              <div className="card mb-4 bg-yellow-50 border-2 border-yellow-300">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="text-yellow-600" size={24} />
                  <h3 className="text-xl font-bold">Cuadre de Caja</h3>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-lg">
                    <label className="label">💵 Efectivo</label>
                    <div className="text-sm text-gray-600 mb-2">Esperado: Q {efectivoEsperado.toFixed(2)}</div>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={efectivoContado}
                      onChange={(e) => setEfectivoContado(e.target.value)}
                      placeholder="0.00"
                    />
                    {efectivoContado && (
                      <div className={`mt-2 text-sm font-semibold ${
                        Math.abs(diferenciaEfectivo) < 0.01 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(diferenciaEfectivo) < 0.01 ? '✓' : '✗'} Dif: Q {diferenciaEfectivo.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <label className="label">💳 Tarjeta</label>
                    <div className="text-sm text-gray-600 mb-2">Esperado: Q {tarjetaEsperada.toFixed(2)}</div>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={tarjetaContado}
                      onChange={(e) => setTarjetaContado(e.target.value)}
                      placeholder="0.00"
                    />
                    {tarjetaContado && (
                      <div className={`mt-2 text-sm font-semibold ${
                        Math.abs(diferenciaTarjeta) < 0.01 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(diferenciaTarjeta) < 0.01 ? '✓' : '✗'} Dif: Q {diferenciaTarjeta.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <label className="label">💰 Depositado</label>
                    <div className="text-sm text-gray-600 mb-2">Esperado: Q {depositadoEsperado.toFixed(2)}</div>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={transferenciaContado}
                      onChange={(e) => setTransferenciaContado(e.target.value)}
                      placeholder="0.00"
                    />
                    {transferenciaContado && (
                      <div className={`mt-2 text-sm font-semibold ${
                        Math.abs(diferenciaDepositado) < 0.01 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(diferenciaDepositado) < 0.01 ? '✓' : '✗'} Dif: Q {diferenciaDepositado.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="label">Observaciones</label>
                  <textarea
                    className="input-field"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas sobre el cuadre..."
                    rows={2}
                  />
                </div>

                {efectivoContado !== '' && tarjetaContado !== '' && transferenciaContado !== '' && (
                  <>
                    <div className={`p-3 rounded-lg text-center mb-4 ${
                      cuadreCorrecto ? 'bg-green-100 border border-green-500' : 'bg-red-100 border border-red-500'
                    }`}>
                      {cuadreCorrecto ? (
                        <div className="flex items-center justify-center gap-2 text-green-700 font-bold">
                          <CheckCircle2 size={24} />
                          <span>¡Cuadre Correcto!</span>
                        </div>
                      ) : (
                        <div className="text-red-700 font-bold">⚠️ Cuadre con Diferencias</div>
                      )}
                    </div>

                    <button
                      onClick={() => descargarCuadre('csv')}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Save size={20} />
                      📊 Descargar Excel
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ✅ NUEVO: Consultas anuladas colapsables */}
            {consultasAnuladas.length > 0 && (
              <div className="card border-2 border-red-500">
                <button
                  onClick={() => setMostrarAnuladas(!mostrarAnuladas)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="text-lg font-semibold text-red-700">
                    🚫 Consultas Anuladas ({consultasAnuladas.length})
                  </h3>
                  {mostrarAnuladas ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {mostrarAnuladas && (
                  <div className="mt-4 space-y-2">
                    {consultasAnuladas.map((anulada, index) => (
                      <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-semibold">{anulada.nombre}</div>
                            <div className="text-sm text-gray-600">{anulada.motivo_anulacion}</div>
                            <div className="text-xs text-gray-500">Por: {anulada.usuario_anulo}</div>
                          </div>
                          <div className="text-lg font-bold text-red-600">
                            Q {anulada.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Agregar Gasto */}
      {showModalGasto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Agregar Gasto</h2>
              <button
                onClick={() => {
                  setShowModalGasto(false);
                  setConceptoGasto('');
                  setMontoGasto('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Concepto *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Diesel"
                  value={conceptoGasto}
                  onChange={(e) => setConceptoGasto(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Monto (Q) *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  value={montoGasto}
                  onChange={(e) => setMontoGasto(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowModalGasto(false);
                  setConceptoGasto('');
                  setMontoGasto('');
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={agregarGasto} className="btn-primary">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};