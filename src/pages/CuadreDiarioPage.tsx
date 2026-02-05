import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, CheckCircle2, Save, Plus, Trash2, X, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Users, FileText, Clock } from 'lucide-react';
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
  
  const [cuadreMoviles, setCuadreMoviles] = useState<CuadreDiario | null>(null);
  const [detallesMoviles, setDetallesMoviles] = useState<any[]>([]);
  
  const [efectivoContado, setEfectivoContado] = useState('');
  const [tarjetaContado, setTarjetaContado] = useState('');
  const [transferenciaContado, setTransferenciaContado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [mostrarCuadre, setMostrarCuadre] = useState(false);
  
  const [gastos, setGastos] = useState<any[]>([]);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [conceptoGasto, setConceptoGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');

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
      estado_cuenta: 'Estado de Cuenta',
      multiple: 'Múltiple'
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

  // Calcular ticket promedio
  const ticketPromedio = cuadre && cuadre.total_consultas > 0 
    ? cuadre.total_ventas / cuadre.total_consultas 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Volver</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cuadre Diario</h1>
              <p className="text-gray-500 text-sm mt-1">Control de caja y operaciones del día</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {format(new Date(fecha + 'T12:00:00'), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-7xl">
        {/* Selector de Fecha y Botón Cuadrar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Fecha:</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <button
              onClick={() => setMostrarCuadre(!mostrarCuadre)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <DollarSign size={18} />
              {mostrarCuadre ? 'Ocultar' : 'Realizar'} Cuadre
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-gray-600 mt-4">Cargando información...</p>
          </div>
        ) : (
          <>
            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Consultas */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Users size={20} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Consultas</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{cuadre?.total_consultas || 0}</div>
                <div className="text-sm text-gray-500 mt-1">Pacientes atendidos</div>
              </div>

              {/* Total Ventas */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <DollarSign size={20} className="text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Ingresos</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">Q {cuadre?.total_ventas.toFixed(2) || '0.00'}</div>
                <div className="text-sm text-gray-500 mt-1">Total del día</div>
              </div>

              {/* Ticket Promedio */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <TrendingUp size={20} className="text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Promedio</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">Q {ticketPromedio.toFixed(2)}</div>
                <div className="text-sm text-gray-500 mt-1">Por consulta</div>
              </div>

              {/* Gastos */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <TrendingDown size={20} className="text-red-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Gastos</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">Q {totalGastos.toFixed(2)}</div>
                <div className="text-sm text-gray-500 mt-1">{gastos.length} registro(s)</div>
              </div>
            </div>

            {/* Desglose por Forma de Pago */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={20} className="text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Desglose por Forma de Pago</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {cuadre?.cuadres_forma_pago.map(c => (
                  <div key={c.forma_pago} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-2 font-medium uppercase">{getFormaPagoNombre(c.forma_pago)}</div>
                    <div className="text-2xl font-bold text-gray-900">Q {c.total.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-2">{c.cantidad} consulta(s)</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Servicios Móviles */}
            {cuadreMoviles && cuadreMoviles.total_consultas > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
                <button
                  onClick={() => setMostrarDetallesMoviles(!mostrarDetallesMoviles)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <span className="text-lg">📱</span>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900">Servicios Móviles</h3>
                      <p className="text-sm text-gray-500">{cuadreMoviles.total_consultas} consultas - Q {cuadreMoviles.total_ventas.toFixed(2)}</p>
                    </div>
                  </div>
                  {mostrarDetallesMoviles ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                
                {mostrarDetallesMoviles && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {cuadreMoviles.cuadres_forma_pago.map(c => (
                        <div key={c.forma_pago} className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <div className="text-xs text-gray-600 mb-2 font-medium uppercase">{getFormaPagoNombre(c.forma_pago)}</div>
                          <div className="text-xl font-bold text-gray-900">Q {c.total.toFixed(2)}</div>
                          <div className="text-xs text-gray-500 mt-1">{c.cantidad} consulta(s)</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Gastos del Día */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMostrarGastos(!mostrarGastos)}
                  className="flex items-center gap-2"
                >
                  <TrendingDown size={20} className="text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Gastos del Día</h3>
                  {gastos.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
                      {gastos.length}
                    </span>
                  )}
                  {mostrarGastos ? <ChevronUp size={16} className="text-gray-400 ml-1" /> : <ChevronDown size={16} className="text-gray-400 ml-1" />}
                </button>
                <button
                  onClick={() => setShowModalGasto(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Agregar
                </button>
              </div>

              {mostrarGastos && (
                gastos.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No hay gastos registrados hoy</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gastos.map(gasto => (
                      <div key={gasto.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{gasto.concepto}</div>
                          <div className="text-xs text-gray-500 mt-1">
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
                            className="text-red-600 hover:bg-red-100 p-2 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {gastos.length > 0 && (
                      <div className="flex justify-between items-center p-4 bg-red-100 border border-red-300 rounded-lg font-bold mt-3">
                        <span className="text-gray-900">Total Gastos:</span>
                        <span className="text-red-700 text-xl">- Q {totalGastos.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Cuadre de Caja */}
            {mostrarCuadre && cuadre && cuadre.total_consultas > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="bg-yellow-100 p-2 rounded-lg">
                    <DollarSign size={24} className="text-yellow-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Cuadre de Caja</h3>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  {/* Efectivo */}
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      💵 Efectivo
                    </label>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3">
                      <span className="text-xs text-gray-500">Esperado:</span>
                      <div className="text-xl font-bold text-gray-900">Q {efectivoEsperado.toFixed(2)}</div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={efectivoContado}
                      onChange={(e) => setEfectivoContado(e.target.value)}
                      placeholder="Ingrese monto contado"
                    />
                    {efectivoContado && (
                      <div className={`mt-3 p-2 rounded-lg text-center text-sm font-semibold ${
                        Math.abs(diferenciaEfectivo) < 0.01 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {Math.abs(diferenciaEfectivo) < 0.01 ? '✓ Correcto' : `Diferencia: Q ${diferenciaEfectivo.toFixed(2)}`}
                      </div>
                    )}
                  </div>

                  {/* Tarjeta */}
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      💳 Tarjeta
                    </label>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3">
                      <span className="text-xs text-gray-500">Esperado:</span>
                      <div className="text-xl font-bold text-gray-900">Q {tarjetaEsperada.toFixed(2)}</div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={tarjetaContado}
                      onChange={(e) => setTarjetaContado(e.target.value)}
                      placeholder="Ingrese monto contado"
                    />
                    {tarjetaContado && (
                      <div className={`mt-3 p-2 rounded-lg text-center text-sm font-semibold ${
                        Math.abs(diferenciaTarjeta) < 0.01 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {Math.abs(diferenciaTarjeta) < 0.01 ? '✓ Correcto' : `Diferencia: Q ${diferenciaTarjeta.toFixed(2)}`}
                      </div>
                    )}
                  </div>

                  {/* Depositado */}
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      🏦 Depositado
                    </label>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3">
                      <span className="text-xs text-gray-500">Esperado:</span>
                      <div className="text-xl font-bold text-gray-900">Q {depositadoEsperado.toFixed(2)}</div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={transferenciaContado}
                      onChange={(e) => setTransferenciaContado(e.target.value)}
                      placeholder="Ingrese monto contado"
                    />
                    {transferenciaContado && (
                      <div className={`mt-3 p-2 rounded-lg text-center text-sm font-semibold ${
                        Math.abs(diferenciaDepositado) < 0.01 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {Math.abs(diferenciaDepositado) < 0.01 ? '✓ Correcto' : `Diferencia: Q ${diferenciaDepositado.toFixed(2)}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas sobre el cuadre del día..."
                    rows={3}
                  />
                </div>

                {/* Resultado y Botón */}
                {efectivoContado !== '' && tarjetaContado !== '' && transferenciaContado !== '' && (
                  <>
                    <div className={`p-5 rounded-lg text-center mb-6 border-2 ${
                      cuadreCorrecto 
                        ? 'bg-green-50 border-green-500' 
                        : 'bg-yellow-50 border-yellow-500'
                    }`}>
                      {cuadreCorrecto ? (
                        <div className="flex items-center justify-center gap-3">
                          <CheckCircle2 size={28} className="text-green-600" />
                          <span className="text-xl font-bold text-green-700">¡Cuadre Correcto!</span>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xl font-bold text-yellow-700 mb-1">⚠️ Cuadre con Diferencias</div>
                          <p className="text-sm text-yellow-600">Revisa los montos ingresados</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => descargarCuadre('csv')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Save size={20} />
                      Descargar Reporte Excel
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Consultas Anuladas */}
            {consultasAnuladas.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <button
                  onClick={() => setMostrarAnuladas(!mostrarAnuladas)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <X size={20} className="text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Consultas Anuladas ({consultasAnuladas.length})
                    </h3>
                  </div>
                  {mostrarAnuladas ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                
                {mostrarAnuladas && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    {consultasAnuladas.map((anulada, index) => (
                      <div key={index} className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{anulada.nombre}</div>
                            <div className="text-sm text-gray-600 mt-1">{anulada.motivo_anulacion}</div>
                            <div className="text-xs text-gray-500 mt-1">Anulado por: {anulada.usuario_anulo}</div>
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
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">Agregar Gasto</h2>
              <button
                onClick={() => {
                  setShowModalGasto(false);
                  setConceptoGasto('');
                  setMontoGasto('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Concepto *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Diesel, Papelería, Mantenimiento"
                  value={conceptoGasto}
                  onChange={(e) => setConceptoGasto(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monto (Q) *</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={agregarGasto} 
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Guardar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};