import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, CheckCircle2, Plus, Trash2, X, ChevronDown, ChevronUp, Lock } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  
  // Estados para conteo de billetes y monedas
  const [billetes, setBilletes] = useState({
    b200: '',
    b100: '',
    b50: '',
    b20: '',
    b10: '',
    b5: '',
    b1: ''
  });

  const [monedas, setMonedas] = useState({
    m1: '',
    m050: '',
    m025: '',
    m010: '',
    m005: '',
    m001: ''
  });

  const [tarjetaContado, setTarjetaContado] = useState('');
  const [transferenciaContado, setTransferenciaContado] = useState('');
  const [estadoCuentaContado, setEstadoCuentaContado] = useState(''); // ✅ NUEVO
  const [observaciones, setObservaciones] = useState('');
  const [mostrarCuadre, setMostrarCuadre] = useState(false);
  
  // Estados de validación y firma
  const [cuadreValidado, setCuadreValidado] = useState(false);
  const [mostrarEsperados, setMostrarEsperados] = useState(false);
  const [pinCierre, setPinCierre] = useState('');
  const [nombreCajero, setNombreCajero] = useState('');
  const [cuadreCerrado, setCuadreCerrado] = useState(false);
  
  const [gastos, setGastos] = useState<any[]>([]);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [conceptoGasto, setConceptoGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');

  const [mostrarGastos, setMostrarGastos] = useState(true);
  const [mostrarAnuladas, setMostrarAnuladas] = useState(false);
  const [consultasAnuladas, setConsultasAnuladas] = useState<any[]>([]);

  useEffect(() => {
    cargarCuadre();
    resetearCuadre();
  }, [fecha]);

  const resetearCuadre = () => {
    setBilletes({ b200: '', b100: '', b50: '', b20: '', b10: '', b5: '', b1: '' });
    setMonedas({ m1: '', m050: '', m025: '', m010: '', m005: '', m001: '' });
    setTarjetaContado('');
    setTransferenciaContado('');
    setEstadoCuentaContado(''); // ✅ NUEVO
    setObservaciones('');
    setCuadreValidado(false);
    setMostrarEsperados(false);
    setPinCierre('');
    setNombreCajero('');
    setCuadreCerrado(false);
  };

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

      const consultasIds = consultas?.map(c => c.id) || [];
      
      if (consultasIds.length === 0) {
        setCuadre({
          fecha,
          total_consultas: 0,
          total_ventas: 0,
          cuadres_forma_pago: []
        });
        setConsultasAnuladas([]);
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

      const cuadrePorForma: { [key: string]: CuadrePorFormaPago } = {};
      const consultasAnuladasData = consultas?.filter(c => c.anulado === true) || [];
      
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

      setConsultasAnuladas(consultasAnuladasData.map(c => ({
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
        .order('created_at', { ascending: false});
      
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

  const calcularTotalEfectivoContado = () => {
    const totalBilletes = 
      (parseFloat(billetes.b200) || 0) * 200 +
      (parseFloat(billetes.b100) || 0) * 100 +
      (parseFloat(billetes.b50) || 0) * 50 +
      (parseFloat(billetes.b20) || 0) * 20 +
      (parseFloat(billetes.b10) || 0) * 10 +
      (parseFloat(billetes.b5) || 0) * 5 +
      (parseFloat(billetes.b1) || 0) * 1;

    const totalMonedas = 
      (parseFloat(monedas.m1) || 0) * 1 +
      (parseFloat(monedas.m050) || 0) * 0.50 +
      (parseFloat(monedas.m025) || 0) * 0.25 +
      (parseFloat(monedas.m010) || 0) * 0.10 +
      (parseFloat(monedas.m005) || 0) * 0.05 +
      (parseFloat(monedas.m001) || 0) * 0.01;

    return totalBilletes + totalMonedas;
  };

  // ✅ ALERT SIMPLIFICADO - Sin mostrar diferencias
  const validarCuadre = () => {
    const efectivoContadoNum = calcularTotalEfectivoContado();
    const tarjetaContadoNum = parseFloat(tarjetaContado) || 0;
    const transferenciaContadoNum = parseFloat(transferenciaContado) || 0;
    const estadoCuentaContadoNum = parseFloat(estadoCuentaContado) || 0; // ✅ NUEVO

    if (efectivoContadoNum === 0 && tarjetaContadoNum === 0 && transferenciaContadoNum === 0 && estadoCuentaContadoNum === 0) {
      alert('⚠️ Debe ingresar al menos un monto para validar el cuadre');
      return;
    }

    setMostrarEsperados(true);
    setCuadreValidado(true);

    const diferenciaEfec = Math.abs(efectivoContadoNum - efectivoEsperado);
    const diferenciaTarj = Math.abs(tarjetaContadoNum - tarjetaEsperada);
    const diferenciaTrans = Math.abs(transferenciaContadoNum - depositadoEsperado);
    const diferenciaEstadoCta = Math.abs(estadoCuentaContadoNum - estadoCuentaEsperada); // ✅ NUEVO

    const cuadra = diferenciaEfec < 0.01 && diferenciaTarj < 0.01 && diferenciaTrans < 0.01 && diferenciaEstadoCta < 0.01;

    if (!cuadra) {
      alert('⚠️ El cuadre NO coincide.');
    } else {
      alert('✅ ¡Cuadre correcto! Ahora puede confirmar el cierre.');
    }
  };

  const confirmarCierre = async () => {
    if (!nombreCajero.trim()) {
      alert('⚠️ Debe ingresar el nombre del cajero');
      return;
    }

    if (!pinCierre.trim()) {
      alert('⚠️ Debe ingresar el PIN de autorización');
      return;
    }

    const efectivoContadoNum = calcularTotalEfectivoContado();
    const tarjetaContadoNum = parseFloat(tarjetaContado) || 0;
    const transferenciaContadoNum = parseFloat(transferenciaContado) || 0;
    const estadoCuentaContadoNum = parseFloat(estadoCuentaContado) || 0; // ✅ NUEVO

    const diferencias = {
      efectivo: efectivoContadoNum - efectivoEsperado,
      tarjeta: tarjetaContadoNum - tarjetaEsperada,
      depositado: transferenciaContadoNum - depositadoEsperado,
      estado_cuenta: estadoCuentaContadoNum - estadoCuentaEsperada // ✅ NUEVO
    };

    const cuadreCorrecto = Math.abs(diferencias.efectivo) < 0.01 && 
                           Math.abs(diferencias.tarjeta) < 0.01 && 
                           Math.abs(diferencias.depositado) < 0.01 &&
                           Math.abs(diferencias.estado_cuenta) < 0.01; // ✅ NUEVO

    try {
      setCuadreCerrado(true);
      alert('✅ Cierre de caja confirmado exitosamente');
      
      await descargarCuadre('csv');
      
    } catch (error) {
      console.error('Error al confirmar cierre:', error);
      alert('❌ Error al confirmar el cierre de caja');
    }
  };

  const descargarCuadre = async (formato: 'csv' | 'pdf') => {
    const efectivoContadoNum = calcularTotalEfectivoContado();
    const tarjetaContadoNum = parseFloat(tarjetaContado) || 0;
    const depositadoContadoNum = parseFloat(transferenciaContado) || 0;
    const estadoCuentaContadoNum = parseFloat(estadoCuentaContado) || 0; // ✅ NUEVO

    const diferencias = {
      efectivo: calcularDiferencia(efectivoEsperado, efectivoContadoNum),
      tarjeta: calcularDiferencia(tarjetaEsperada, tarjetaContadoNum),
      depositado: calcularDiferencia(depositadoEsperado, depositadoContadoNum),
      estado_cuenta: calcularDiferencia(estadoCuentaEsperada, estadoCuentaContadoNum) // ✅ NUEVO
    };

    const cuadreCorrecto = Math.abs(diferencias.efectivo) < 0.01 && 
                           Math.abs(diferencias.tarjeta) < 0.01 && 
                           Math.abs(diferencias.depositado) < 0.01 &&
                           Math.abs(diferencias.estado_cuenta) < 0.01; // ✅ NUEVO

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
        cajero: nombreCajero,
        cuadresPorFormaPago: cuadre?.cuadres_forma_pago.map(c => ({
          forma_pago: getFormaPagoNombre(c.forma_pago),
          cantidad: c.cantidad,
          total: c.total
        })) || []
      });
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
  const estadoCuentaEsperada = cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'estado_cuenta')?.total || 0; // ✅ NUEVO

  const efectivoContadoNum = calcularTotalEfectivoContado();
  const depositadoContadoNum = parseFloat(transferenciaContado) || 0;
  const tarjetaContadoNum = parseFloat(tarjetaContado) || 0;
  const estadoCuentaContadoNum = parseFloat(estadoCuentaContado) || 0; // ✅ NUEVO

  const diferenciaEfectivo = calcularDiferencia(efectivoEsperado, efectivoContadoNum);
  const diferenciaDepositado = calcularDiferencia(depositadoEsperado, depositadoContadoNum);
  const diferenciaTarjeta = calcularDiferencia(tarjetaEsperada, tarjetaContadoNum);
  const diferenciaEstadoCuenta = calcularDiferencia(estadoCuentaEsperada, estadoCuentaContadoNum); // ✅ NUEVO

  const cuadreCorrecto = Math.abs(diferenciaEfectivo) < 0.01 && 
                         Math.abs(diferenciaDepositado) < 0.01 &&
                         Math.abs(diferenciaTarjeta) < 0.01 &&
                         Math.abs(diferenciaEstadoCuenta) < 0.01; // ✅ NUEVO

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
              <h1 className="text-2xl font-bold text-gray-900">Cierre de Caja</h1>
              <p className="text-gray-500 text-sm mt-1">Control y cuadre diario de operaciones</p>
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
                disabled={cuadreCerrado}
              />
            </div>
            {!cuadreCerrado && (
              <button
                onClick={() => setMostrarCuadre(!mostrarCuadre)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <DollarSign size={18} />
                {mostrarCuadre ? 'Ocultar' : 'Cuadrar Caja'}
              </button>
            )}
            {cuadreCerrado && (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <CheckCircle2 size={18} />
                Caja Cerrada
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-gray-600 mt-4">Cargando información...</p>
          </div>
        ) : (
          <>
            {/* ✅ FORMULARIO DE CUADRE ARRIBA */}
            {mostrarCuadre && cuadre && cuadre.total_consultas > 0 && !cuadreCerrado && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-500">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <DollarSign size={28} className="text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Cierre de Caja</h3>
                    <p className="text-sm text-gray-600 mt-1">Cuenta el dinero físicamente e ingresa las cantidades</p>
                  </div>
                </div>

                {/* CONTEO DE EFECTIVO */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    💵 Conteo de Efectivo
                  </h4>
                  
                  {/* Billetes */}
                  <div className="bg-green-50 rounded-lg p-5 mb-4 border border-green-200">
                    <h5 className="font-medium text-gray-700 mb-3">BILLETES:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {[
                        { key: 'b200', label: 'Q 200', value: 200 },
                        { key: 'b100', label: 'Q 100', value: 100 },
                        { key: 'b50', label: 'Q 50', value: 50 },
                        { key: 'b20', label: 'Q 20', value: 20 },
                        { key: 'b10', label: 'Q 10', value: 10 },
                        { key: 'b5', label: 'Q 5', value: 5 },
                        { key: 'b1', label: 'Q 1', value: 1 }
                      ].map(billete => (
                        <div key={billete.key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{billete.label}</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={billetes[billete.key as keyof typeof billetes]}
                            onChange={(e) => setBilletes({ ...billetes, [billete.key]: e.target.value })}
                            placeholder="0"
                          />
                          {billetes[billete.key as keyof typeof billetes] && (
                            <div className="text-xs text-green-700 mt-1 text-center font-semibold">
                              = Q {((parseFloat(billetes[billete.key as keyof typeof billetes]) || 0) * billete.value).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monedas */}
                  <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-200">
                    <h5 className="font-medium text-gray-700 mb-3">MONEDAS:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { key: 'm1', label: 'Q 1', value: 1 },
                        { key: 'm050', label: 'Q 0.50', value: 0.50 },
                        { key: 'm025', label: 'Q 0.25', value: 0.25 },
                        { key: 'm010', label: 'Q 0.10', value: 0.10 },
                        { key: 'm005', label: 'Q 0.05', value: 0.05 },
                        { key: 'm001', label: 'Q 0.01', value: 0.01 }
                      ].map(moneda => (
                        <div key={moneda.key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{moneda.label}</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={monedas[moneda.key as keyof typeof monedas]}
                            onChange={(e) => setMonedas({ ...monedas, [moneda.key]: e.target.value })}
                            placeholder="0"
                          />
                          {monedas[moneda.key as keyof typeof monedas] && (
                            <div className="text-xs text-yellow-700 mt-1 text-center font-semibold">
                              = Q {((parseFloat(monedas[moneda.key as keyof typeof monedas]) || 0) * moneda.value).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Efectivo Contado */}
                  <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">TOTAL EFECTIVO EN CAJA:</span>
                      <span className="text-3xl font-bold text-green-700">
                        Q {calcularTotalEfectivoContado().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ✅ OTROS MÉTODOS DE PAGO - AHORA CON ESTADO DE CUENTA */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Tarjeta */}
                  <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                    <label className="block text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      💳 Tarjeta (Vouchers)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={tarjetaContado}
                      onChange={(e) => setTarjetaContado(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center">Suma total de vouchers</p>
                  </div>

                  {/* Transferencias/Depósitos */}
                  <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                    <label className="block text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      🏦 Transferencias/Depósitos
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={transferenciaContado}
                      onChange={(e) => setTransferenciaContado(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center">Suma de comprobantes</p>
                  </div>

                  {/* ✅ NUEVO: Estado de Cuenta */}
                  <div className="bg-amber-50 rounded-lg p-5 border border-amber-200 md:col-span-2">
                    <label className="block text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      📋 Estado de Cuenta
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={estadoCuentaContado}
                      onChange={(e) => setEstadoCuentaContado(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center">Pagos a cuenta o crédito</p>
                  </div>
                </div>

                {/* Observaciones */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones del Cierre</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas, incidencias o comentarios sobre el cierre..."
                    rows={3}
                  />
                </div>

                {/* Botón de Validación */}
                {!cuadreValidado && (
                  <button
                    onClick={validarCuadre}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors mb-6"
                  >
                    <CheckCircle2 size={24} />
                    Validar Cuadre
                  </button>
                )}

                {/* RESULTADOS DE VALIDACIÓN */}
                {cuadreValidado && mostrarEsperados && (
                  <div className="space-y-4">
                    {/* Sección de Firma - SOLO SI CUADRA */}
                    {cuadreCorrecto ? (
                      <>
                        {/* Comparación - SOLO CUANDO CUADRA */}
                        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-300">
                          <h4 className="text-lg font-bold text-gray-900 mb-4">📊 Comparación Sistema vs Contado</h4>
                          
                          <div className="space-y-3">
                            {/* Efectivo */}
                            <div className="p-4 rounded-lg border-2 bg-green-50 border-green-500">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-gray-900">💵 Efectivo</span>
                                <span className="text-green-700 font-bold">✓ Correcto</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <div className="text-gray-600">Sistema:</div>
                                  <div className="font-bold">Q {efectivoEsperado.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Contado:</div>
                                  <div className="font-bold">Q {efectivoContadoNum.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Diferencia:</div>
                                  <div className="font-bold text-green-700">
                                    {diferenciaEfectivo > 0 ? '+' : ''}{diferenciaEfectivo.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tarjeta */}
                            <div className="p-4 rounded-lg border-2 bg-green-50 border-green-500">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-gray-900">💳 Tarjeta</span>
                                <span className="text-green-700 font-bold">✓ Correcto</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <div className="text-gray-600">Sistema:</div>
                                  <div className="font-bold">Q {tarjetaEsperada.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Contado:</div>
                                  <div className="font-bold">Q {tarjetaContadoNum.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Diferencia:</div>
                                  <div className="font-bold text-green-700">
                                    {diferenciaTarjeta > 0 ? '+' : ''}{diferenciaTarjeta.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Transferencias */}
                            <div className="p-4 rounded-lg border-2 bg-green-50 border-green-500">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-gray-900">🏦 Transferencias</span>
                                <span className="text-green-700 font-bold">✓ Correcto</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <div className="text-gray-600">Sistema:</div>
                                  <div className="font-bold">Q {depositadoEsperado.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Contado:</div>
                                  <div className="font-bold">Q {depositadoContadoNum.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Diferencia:</div>
                                  <div className="font-bold text-green-700">
                                    {diferenciaDepositado > 0 ? '+' : ''}{diferenciaDepositado.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* ✅ Estado de Cuenta */}
                            {estadoCuentaEsperada > 0 && (
                              <div className="p-4 rounded-lg border-2 bg-green-50 border-green-500">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-semibold text-gray-900">📋 Estado de Cuenta</span>
                                  <span className="text-green-700 font-bold">✓ Correcto</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <div className="text-gray-600">Sistema:</div>
                                    <div className="font-bold">Q {estadoCuentaEsperada.toFixed(2)}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600">Contado:</div>
                                    <div className="font-bold">Q {estadoCuentaContadoNum.toFixed(2)}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600">Diferencia:</div>
                                    <div className="font-bold text-green-700">
                                      {diferenciaEstadoCuenta > 0 ? '+' : ''}{diferenciaEstadoCuenta.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <CheckCircle2 size={32} className="text-green-600" />
                            <div>
                              <h4 className="text-xl font-bold text-green-700">¡Cuadre Correcto!</h4>
                              <p className="text-sm text-green-600">Confirme el cierre de caja</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre de quien cuadro *
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                value={nombreCajero}
                                onChange={(e) => setNombreCajero(e.target.value)}
                                placeholder="Ingrese su nombre completo"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                PIN de Autorización *
                              </label>
                              <input
                                type="password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                value={pinCierre}
                                onChange={(e) => setPinCierre(e.target.value)}
                                placeholder="••••"
                                maxLength={4}
                              />
                            </div>

                            <button
                              onClick={confirmarCierre}
                              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors"
                            >
                              <Lock size={24} />
                              Confirmar y Cerrar Caja
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <X size={32} className="text-red-600" />
                          <div>
                            <h4 className="text-xl font-bold text-red-700">Cuadre Incorrecto</h4>
                            <p className="text-sm text-red-600">Las siguientes formas de pago NO cuadran:</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {diferenciaEfectivo !== 0 && (
                            <div className="bg-white border border-red-300 rounded p-3 flex items-center gap-2">
                              <span className="text-red-600 font-bold">✗</span>
                              <span className="font-medium text-gray-900">💵 Efectivo</span>
                            </div>
                          )}
                          {diferenciaTarjeta !== 0 && (
                            <div className="bg-white border border-red-300 rounded p-3 flex items-center gap-2">
                              <span className="text-red-600 font-bold">✗</span>
                              <span className="font-medium text-gray-900">💳 Tarjeta</span>
                            </div>
                          )}
                          {diferenciaDepositado !== 0 && (
                            <div className="bg-white border border-red-300 rounded p-3 flex items-center gap-2">
                              <span className="text-red-600 font-bold">✗</span>
                              <span className="font-medium text-gray-900">🏦 Transferencias</span>
                            </div>
                          )}
                          {diferenciaEstadoCuenta !== 0 && (
                            <div className="bg-white border border-red-300 rounded p-3 flex items-center gap-2">
                              <span className="text-red-600 font-bold">✗</span>
                              <span className="font-medium text-gray-900">📋 Estado de Cuenta</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setCuadreValidado(false);
                            setMostrarEsperados(false);
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Volver a Contar
                        </button>
                      </div>
                    )}
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
                  <span className="text-red-600 text-2xl">📉</span>
                  <h3 className="text-lg font-semibold text-gray-900">Gastos del Día</h3>
                  {gastos.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
                      {gastos.length}
                    </span>
                  )}
                  {mostrarGastos ? <ChevronUp size={16} className="text-gray-400 ml-1" /> : <ChevronDown size={16} className="text-gray-400 ml-1" />}
                </button>
                {!cuadreCerrado && (
                  <button
                    onClick={() => setShowModalGasto(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                )}
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
                          {!cuadreCerrado && (
                            <button
                              onClick={() => eliminarGasto(gasto.id)}
                              className="text-red-600 hover:bg-red-100 p-2 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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