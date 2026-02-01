import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, CheckCircle2, Save, AlertCircle, Plus, Trash2, X } from 'lucide-react';
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
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cuadre, setCuadre] = useState<CuadreDiario | null>(null);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [consultasAnuladas, setConsultasAnuladas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [agruparPorPaciente, setAgruparPorPaciente] = useState(false);
  const [pacientesExpandidos, setPacientesExpandidos] = useState<Set<string>>(new Set());
  
  // Estados para cuadre de caja
  const [efectivoContado, setEfectivoContado] = useState('');
  const [tarjetaContado, setTarjetaContado] = useState('');
  const [transferenciaContado, setTransferenciaContado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [mostrarCuadre, setMostrarCuadre] = useState(false);
  
  // Estados para gastos del día
  const [gastos, setGastos] = useState<any[]>([]);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [conceptoGasto, setConceptoGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');

  useEffect(() => {
    cargarCuadre();
  }, [fecha]);

  // Agrupar estudios por paciente
  const agruparEstudiosPorPaciente = () => {
    const agrupado: { [key: string]: any } = {};
    
    detalles.forEach(detalle => {
      const key = detalle.paciente;
      if (!agrupado[key]) {
        agrupado[key] = {
          paciente: detalle.paciente,
          estudios: [],
          total: 0,
          formasPago: new Set()
        };
      }
      agrupado[key].estudios.push(detalle);
      agrupado[key].total += detalle.precio;
      agrupado[key].formasPago.add(detalle.forma_pago);
    });
    
    return Object.values(agrupado);
  };

  const togglePaciente = (paciente: string) => {
    const nuevosExpandidos = new Set(pacientesExpandidos);
    if (nuevosExpandidos.has(paciente)) {
      nuevosExpandidos.delete(paciente);
    } else {
      nuevosExpandidos.add(paciente);
    }
    setPacientesExpandidos(nuevosExpandidos);
  };

  const cargarCuadre = async () => {
    setLoading(true);
    try {
      // Obtener consultas del día (12 AM a 12 AM - medianoche a medianoche)
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
          total_ventas: 0,
          cuadres_forma_pago: []
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

      // Calcular totales por forma de pago (SOLO consultas NO anuladas)
      const cuadrePorForma: { [key: string]: CuadrePorFormaPago } = {};
      const consultasActivas = consultas?.filter(c => c.anulado !== true) || []; // null o false = activa
      const consultasAnuladas = consultas?.filter(c => c.anulado === true) || []; // solo true = anulada
      
      consultasActivas.forEach(consulta => {
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
        total_consultas: consultasActivas.length, // Solo contar las NO anuladas
        total_ventas: totalVentas,
        cuadres_forma_pago: Object.values(cuadrePorForma)
      });

      // Guardar detalles con información de la consulta (SOLO NO anuladas)
      const detallesConInfo = detallesData
        ?.filter(d => {
          const consulta = consultasActivas.find(c => c.id === d.consulta_id);
          return !!consulta; // Solo incluir detalles de consultas NO anuladas
        })
        .map(d => {
          const consulta = consultasActivas.find(c => c.id === d.consulta_id);
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
      
      // Guardar información de consultas anuladas
      setConsultasAnuladas(consultasAnuladas.map(c => ({
        nombre: c.pacientes?.nombre,
        usuario_anulo: c.usuario_anulo,
        fecha_anulacion: c.fecha_anulacion,
        motivo_anulacion: c.motivo_anulacion,
        total: detallesData?.filter(d => d.consulta_id === c.id).reduce((sum, d) => sum + d.precio, 0) || 0
      })));
      
      // Cargar gastos del día
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
        .from('gastos_diarios')
        .select('*')
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
      const { error } = await supabase
        .from('gastos_diarios')
        .insert([{
          fecha,
          concepto: conceptoGasto,
          monto: parseFloat(montoGasto)
        }]);
      
      if (error) throw error;
      
      setConceptoGasto('');
      setMontoGasto('');
      setShowModalGasto(false);
      cargarGastos();
      alert('Gasto agregado exitosamente');
    } catch (error) {
      console.error('Error al agregar gasto:', error);
      alert('Error al agregar gasto');
    }
  };

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    
    try {
      const { error } = await supabase
        .from('gastos_diarios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      cargarGastos();
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
    const depositadoContadoNum = parseFloat(transferenciaContado); // Reutilizamos el campo

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
      // Usar el nuevo generador de Excel profesional
      await generarCuadreExcel({
        fecha: fechaFormateada,
        horaActual,
        totalConsultas: cuadre?.total_consultas || 0,
        totalVentas: cuadre?.total_ventas || 0,
        efectivoEsperado,
        efectivoContado: efectivoContadoNum,
        tarjetaEsperada,
        tarjetaContado: tarjetaContadoNum,
        transferenciaEsperada: depositadoEsperado, // Ahora es depositado
        transferenciaContado: depositadoContadoNum, // Ahora es depositado
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
        `✅ Cuadre correcto! Archivo Excel descargado con formato profesional.` : 
        `⚠️ Cuadre con diferencias. Archivo Excel descargado para revisión.`
      );

    } else if (formato === 'pdf') {
      // Formato PDF - Generar HTML y abrir para imprimir como PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cuadre de Caja - ${fechaFormateada}</title>
  <style>
    @page { 
      size: letter;
      margin: 2cm;
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 28px;
    }
    .header h2 {
      color: #666;
      margin: 5px 0;
      font-size: 18px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px;
      background: #f3f4f6;
      border-radius: 4px;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      background: #2563eb;
      color: white;
      padding: 10px;
      font-size: 16px;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th {
      background: #e5e7eb;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #d1d5db;
    }
    td {
      padding: 10px;
      border: 1px solid #d1d5db;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .resultado {
      margin: 30px 0;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      font-size: 20px;
      font-weight: bold;
    }
    .resultado.correcto {
      background: #d1fae5;
      color: #065f46;
      border: 2px solid #10b981;
    }
    .resultado.diferencias {
      background: #fee2e2;
      color: #991b1b;
      border: 2px solid #ef4444;
    }
    .observaciones {
      background: #fef3c7;
      padding: 15px;
      border-left: 4px solid #f59e0b;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .status-ok { color: #059669; font-weight: bold; }
    .status-diff { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CUADRE DE CAJA DIARIO</h1>
    <h2>CONRAD - Centro de Diagnóstico</h2>
  </div>

  <div class="info-row">
    <strong>Fecha:</strong>
    <span>${fechaFormateada}</span>
  </div>
  <div class="info-row">
    <strong>Hora de Cuadre:</strong>
    <span>${horaActual}</span>
  </div>

  <div class="section">
    <div class="section-title">RESUMEN DEL DÍA</div>
    <div class="info-row">
      <strong>Total Consultas:</strong>
      <span>${cuadre?.total_consultas || 0}</span>
    </div>
    <div class="info-row">
      <strong>Total Ventas:</strong>
      <span style="font-size: 18px; font-weight: bold; color: #2563eb;">Q ${(cuadre?.total_ventas || 0).toFixed(2)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">CUADRE POR FORMA DE PAGO</div>
    <table>
      <thead>
        <tr>
          <th>Forma de Pago</th>
          <th style="text-align: right;">Esperado</th>
          <th style="text-align: right;">Contado</th>
          <th style="text-align: right;">Diferencia</th>
          <th style="text-align: center;">Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>💵 Efectivo</strong></td>
          <td style="text-align: right;">Q ${efectivoEsperado.toFixed(2)}</td>
          <td style="text-align: right;">Q ${efectivoContadoNum.toFixed(2)}</td>
          <td style="text-align: right;">Q ${diferencias.efectivo.toFixed(2)}</td>
          <td style="text-align: center;" class="${Math.abs(diferencias.efectivo) < 0.01 ? 'status-ok' : 'status-diff'}">
            ${Math.abs(diferencias.efectivo) < 0.01 ? '✅ OK' : '⚠️ DIFERENCIA'}
          </td>
        </tr>
        <tr>
          <td><strong>💳 Tarjeta</strong></td>
          <td style="text-align: right;">Q ${tarjetaEsperada.toFixed(2)}</td>
          <td style="text-align: right;">Q ${tarjetaContadoNum.toFixed(2)}</td>
          <td style="text-align: right;">Q ${diferencias.tarjeta.toFixed(2)}</td>
          <td style="text-align: center;" class="${Math.abs(diferencias.tarjeta) < 0.01 ? 'status-ok' : 'status-diff'}">
            ${Math.abs(diferencias.tarjeta) < 0.01 ? '✅ OK' : '⚠️ DIFERENCIA'}
          </td>
        </tr>
        <tr>
          <td><strong>💰 Depositado</strong></td>
          <td style="text-align: right;">Q ${depositadoEsperado.toFixed(2)}</td>
          <td style="text-align: right;">Q ${depositadoContadoNum.toFixed(2)}</td>
          <td style="text-align: right;">Q ${diferencias.depositado.toFixed(2)}</td>
          <td style="text-align: center;" class="${Math.abs(diferencias.depositado) < 0.01 ? 'status-ok' : 'status-diff'}">
            ${Math.abs(diferencias.depositado) < 0.01 ? '✅ OK' : '⚠️ DIFERENCIA'}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="resultado ${cuadreCorrecto ? 'correcto' : 'diferencias'}">
    ${cuadreCorrecto ? '✅ CUADRE CORRECTO' : '⚠️ CUADRE CON DIFERENCIAS'}
  </div>

  ${observaciones ? `
  <div class="observaciones">
    <strong>OBSERVACIONES:</strong><br>
    ${observaciones}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">DETALLE POR FORMA DE PAGO</div>
    <table>
      <thead>
        <tr>
          <th>Forma de Pago</th>
          <th style="text-align: center;">Cantidad</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${cuadre?.cuadres_forma_pago.map(c => `
        <tr>
          <td>${getFormaPagoNombre(c.forma_pago)}</td>
          <td style="text-align: center;">${c.cantidad}</td>
          <td style="text-align: right;"><strong>Q ${c.total.toFixed(2)}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Documento generado automáticamente<br>
    Sistema CONRAD - ${format(new Date(), 'dd/MM/yyyy HH:mm')}
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
      `;

      // Abrir en nueva ventana para imprimir como PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        alert('Por favor permite ventanas emergentes para descargar el PDF');
      }
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

  // Calcular total de gastos
  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);

  // Efectivo esperado MENOS gastos del día (solo efectivo, sin facturado)
  const efectivoEsperado = (cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'efectivo')?.total || 0) - totalGastos;
  
  // Depositado incluye efectivo_facturado Y transferencia
  const depositadoEsperado = (cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'efectivo_facturado')?.total || 0) +
                              (cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'transferencia')?.total || 0);
  
  const tarjetaEsperada = cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'tarjeta')?.total || 0;

  const efectivoContadoNum = parseFloat(efectivoContado) || 0;
  const depositadoContadoNum = parseFloat(transferenciaContado) || 0; // Reutilizamos este campo para depositado
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
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">Cuadre Diario</h1>
          <p className="text-green-100 mt-2">Control de caja y ventas del día</p>
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
            <div className="ml-auto">
              <button
                onClick={() => setMostrarCuadre(!mostrarCuadre)}
                className="btn-primary flex items-center gap-2"
              >
                <DollarSign size={20} />
                {mostrarCuadre ? 'Ocultar' : 'Cuadrar'} Caja
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Cargando...</p>
          </div>
        ) : (
          <>
            {/* Resumen de ventas */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="card bg-blue-50">
                <h3 className="text-lg font-semibold mb-4">Resumen del Día</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span>Total Consultas:</span>
                    <span className="font-bold">{cuadre?.total_consultas || 0}</span>
                  </div>
                  <div className="flex justify-between text-2xl border-t pt-3">
                    <span className="font-semibold">Total Ventas:</span>
                    <span className="font-bold text-blue-700">
                      Q {cuadre?.total_ventas.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cuadre por forma de pago */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Por Forma de Pago</h3>
                <div className="space-y-2">
                  {cuadre?.cuadres_forma_pago.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay consultas</p>
                  ) : (
                    cuadre?.cuadres_forma_pago.map(c => (
                      <div key={c.forma_pago} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{getFormaPagoNombre(c.forma_pago)}</div>
                          <div className="text-sm text-gray-600">{c.cantidad} consulta(s)</div>
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          Q {c.total.toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Gastos del Día */}
            <div className="card mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Gastos del Día</h3>
                <button
                  onClick={() => setShowModalGasto(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Agregar Gasto
                </button>
              </div>

              {gastos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay gastos registrados</p>
              ) : (
                <div className="space-y-2">
                  {gastos.map(gasto => (
                    <div key={gasto.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                      <div>
                        <div className="font-medium">{gasto.concepto}</div>
                        <div className="text-sm text-gray-600">
                          {(() => {
                            const fecha = new Date(gasto.created_at);
                            // Convertir a hora Guatemala (UTC-6)
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
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-red-100 border-2 border-red-400 rounded font-bold">
                    <span>Total Gastos:</span>
                    <span className="text-red-700">
                      - Q {gastos.reduce((sum, g) => sum + g.monto, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cuadre de caja */}
            {mostrarCuadre && cuadre && cuadre.total_consultas > 0 && (
              <div className="card mb-6 bg-yellow-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-yellow-600" size={28} />
                    <h3 className="text-xl font-bold">Cuadre de Caja</h3>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  {/* Efectivo */}
                  <div className="bg-white p-4 rounded-lg">
                    <label className="label">💵 Efectivo Contado</label>
                    <div className="text-sm text-gray-600 mb-2">
                      Esperado: Q {efectivoEsperado.toFixed(2)}
                    </div>
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
                        Diferencia: Q {diferenciaEfectivo.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Tarjeta */}
                  <div className="bg-white p-4 rounded-lg">
                    <label className="label">💳 Tarjeta Contado</label>
                    <div className="text-sm text-gray-600 mb-2">
                      Esperado: Q {tarjetaEsperada.toFixed(2)}
                    </div>
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
                        Diferencia: Q {diferenciaTarjeta.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Depositado (incluye efectivo_facturado + transferencia) */}
                  <div className="bg-white p-4 rounded-lg">
                    <label className="label">💰 Depositado Contado</label>
                    <div className="text-sm text-gray-600 mb-2">
                      Esperado: Q {depositadoEsperado.toFixed(2)}
                    </div>
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
                        Diferencia: Q {diferenciaDepositado.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                <div className="mb-4">
                  <label className="label">Observaciones (opcional)</label>
                  <textarea
                    className="input-field"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas sobre el cuadre, explicación de diferencias, etc."
                    rows={3}
                  />
                </div>

                {/* Resultado del cuadre */}
                {efectivoContado !== '' && tarjetaContado !== '' && transferenciaContado !== '' && (
                  <>
                    <div className={`p-4 rounded-lg text-center mb-4 ${
                      cuadreCorrecto ? 'bg-green-100 border-2 border-green-500' : 'bg-red-100 border-2 border-red-500'
                    }`}>
                      {cuadreCorrecto ? (
                        <div className="flex items-center justify-center gap-3 text-green-700">
                          <CheckCircle2 size={32} />
                          <span className="text-xl font-bold">¡Cuadre Correcto!</span>
                        </div>
                      ) : (
                        <div className="text-red-700">
                          <span className="text-xl font-bold">⚠️ Cuadre con Diferencias</span>
                          <p className="text-sm mt-2">Revise los montos contados vs esperados</p>
                        </div>
                      )}
                    </div>

                    {/* Botones de descarga */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => descargarCuadre('csv')}
                        className="btn-primary flex items-center justify-center gap-2 py-3 text-lg"
                      >
                        <Save size={24} />
                        📊 Descargar Excel
                      </button>
                      <button
                        onClick={() => descargarCuadre('pdf')}
                        className="btn-secondary flex items-center justify-center gap-2 py-3 text-lg"
                      >
                        <Save size={24} />
                        📄 Descargar PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Detalles de consultas */}
            {detalles.length > 0 && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Detalle de Consultas</h3>
                  <button
                    onClick={() => setAgruparPorPaciente(!agruparPorPaciente)}
                    className="btn-secondary text-sm"
                  >
                    {agruparPorPaciente ? '📋 Ver Todos' : '👥 Agrupar por Paciente'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  {!agruparPorPaciente ? (
                    // Vista normal - todos los estudios
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Paciente</th>
                          <th className="px-4 py-2 text-left">Estudio</th>
                          <th className="px-4 py-2 text-left">Tipo</th>
                          <th className="px-4 py-2 text-left">Forma Pago</th>
                          <th className="px-4 py-2 text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalles.map((detalle, index) => (
                          <tr key={index} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2">{detalle.paciente}</td>
                            <td className="px-4 py-2">{detalle.sub_estudios?.nombre}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                detalle.tipo_cobro === 'normal' ? 'bg-blue-100' :
                                detalle.tipo_cobro === 'social' ? 'bg-green-100' : 'bg-orange-100'
                              }`}>
                                {detalle.tipo_cobro}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div>
                                {getFormaPagoNombre(detalle.forma_pago)}
                                {detalle.forma_pago === 'tarjeta' && !detalle.numero_voucher && (
                                  <div className="text-xs text-yellow-600 font-semibold">
                                    ⚠️ Voucher Pendiente
                                  </div>
                                )}
                                {detalle.numero_transferencia && (
                                  <div className="text-xs text-gray-600">Trans: {detalle.numero_transferencia}</div>
                                )}
                                {detalle.numero_voucher && (
                                  <div className="text-xs text-gray-600">Voucher: {detalle.numero_voucher}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right font-semibold">
                              Q {detalle.precio.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    // Vista agrupada por paciente
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Paciente</th>
                          <th className="px-4 py-2 text-center"># Estudios</th>
                          <th className="px-4 py-2 text-left">Forma(s) Pago</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          <th className="px-4 py-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {agruparEstudiosPorPaciente().map((grupo, index) => (
                          <React.Fragment key={index}>
                            {/* Fila del paciente */}
                            <tr className="border-t bg-blue-50 hover:bg-blue-100 cursor-pointer"
                                onClick={() => togglePaciente(grupo.paciente)}>
                              <td className="px-4 py-2 font-semibold">{grupo.paciente}</td>
                              <td className="px-4 py-2 text-center">
                                <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                                  {grupo.estudios.length}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex gap-1 flex-wrap">
                                  {Array.from(grupo.formasPago).map((fp: any) => (
                                    <span key={fp} className="text-xs bg-gray-200 px-2 py-1 rounded">
                                      {getFormaPagoNombre(fp)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-blue-700">
                                Q {grupo.total.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {pacientesExpandidos.has(grupo.paciente) ? '▼' : '▶'}
                              </td>
                            </tr>
                            {/* Filas de estudios expandidas */}
                            {pacientesExpandidos.has(grupo.paciente) && grupo.estudios.map((detalle: any, idx: number) => (
                              <tr key={`${index}-${idx}`} className="border-t bg-gray-50">
                                <td className="px-4 py-2 pl-8 text-sm text-gray-600">↳ {detalle.sub_estudios?.nombre}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    detalle.tipo_cobro === 'normal' ? 'bg-blue-100' :
                                    detalle.tipo_cobro === 'social' ? 'bg-green-100' : 'bg-orange-100'
                                  }`}>
                                    {detalle.tipo_cobro}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm">{getFormaPagoNombre(detalle.forma_pago)}</td>
                                <td className="px-4 py-2 text-right text-sm">Q {detalle.precio.toFixed(2)}</td>
                                <td></td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Sección de Consultas Anuladas */}
            {consultasAnuladas.length > 0 && (
              <div className="card border-4 border-red-500">
                <h3 className="text-lg font-semibold mb-4 text-red-700">🚫 Consultas Anuladas (No cuentan en el cuadre)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Paciente</th>
                        <th className="px-4 py-2 text-left">Total Anulado</th>
                        <th className="px-4 py-2 text-left">Anulado Por</th>
                        <th className="px-4 py-2 text-left">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultasAnuladas.map((anulada, index) => (
                        <tr key={index} className="border-t bg-red-50">
                          <td className="px-4 py-2 font-semibold">{anulada.nombre}</td>
                          <td className="px-4 py-2">Q {anulada.total.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm">{anulada.usuario_anulo}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{anulada.motivo_anulacion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              <h2 className="text-xl font-bold">Agregar Gasto del Día</h2>
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
                  placeholder="Ej: Diesel para transporte"
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
                Agregar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};