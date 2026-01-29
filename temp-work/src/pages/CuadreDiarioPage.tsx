import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, CheckCircle2, Save, AlertCircle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  
  // Estados para cuadre de caja
  const [efectivoContado, setEfectivoContado] = useState('');
  const [tarjetaContado, setTarjetaContado] = useState('');
  const [transferenciaContado, setTransferenciaContado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [mostrarCuadre, setMostrarCuadre] = useState(false);

  useEffect(() => {
    cargarCuadre();
  }, [fecha]);

  const cargarCuadre = async () => {
    setLoading(true);
    try {
      // Ya no cargamos cuadres guardados, solo las consultas del día
      
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

      // Calcular totales por forma de pago
      const cuadrePorForma: { [key: string]: CuadrePorFormaPago } = {};
      
      consultas?.forEach(consulta => {
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
        total_consultas: consultas?.length || 0,
        total_ventas: totalVentas,
        cuadres_forma_pago: Object.values(cuadrePorForma)
      });

      // Guardar detalles con información de la consulta
      const detallesConInfo = detallesData?.map(d => {
        const consulta = consultas?.find(c => c.id === d.consulta_id);
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
    } catch (error) {
      console.error('Error al cargar cuadre:', error);
      alert('Error al cargar el cuadre diario');
    }
    setLoading(false);
  };

  const descargarCuadre = async (formato: 'csv' | 'pdf') => {
    if (!efectivoContado || efectivoContado === '' || !tarjetaContado || tarjetaContado === '' || !transferenciaContado || transferenciaContado === '') {
      alert('Debe ingresar todos los montos contados');
      return;
    }

    const efectivoContadoNum = parseFloat(efectivoContado);
    const tarjetaContadoNum = parseFloat(tarjetaContado);
    const transferenciaContadoNum = parseFloat(transferenciaContado);

    const diferencias = {
      efectivo: calcularDiferencia(efectivoEsperado, efectivoContadoNum),
      tarjeta: calcularDiferencia(tarjetaEsperada, tarjetaContadoNum),
      transferencia: calcularDiferencia(transferenciaEsperada, transferenciaContadoNum)
    };

    const cuadreCorrecto = Math.abs(diferencias.efectivo) < 0.01 && 
                           Math.abs(diferencias.tarjeta) < 0.01 && 
                           Math.abs(diferencias.transferencia) < 0.01;

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
        transferenciaEsperada,
        transferenciaContado: transferenciaContadoNum,
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
          <td><strong>🏦 Transferencia</strong></td>
          <td style="text-align: right;">Q ${transferenciaEsperada.toFixed(2)}</td>
          <td style="text-align: right;">Q ${transferenciaContadoNum.toFixed(2)}</td>
          <td style="text-align: right;">Q ${diferencias.transferencia.toFixed(2)}</td>
          <td style="text-align: center;" class="${Math.abs(diferencias.transferencia) < 0.01 ? 'status-ok' : 'status-diff'}">
            ${Math.abs(diferencias.transferencia) < 0.01 ? '✅ OK' : '⚠️ DIFERENCIA'}
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
      efectivo_facturado: 'Efectivo Facturado',
      estado_cuenta: 'Estado de Cuenta'
    };
    return formas[forma] || forma;
  };

  const calcularDiferencia = (esperado: number, contado: number) => {
    return contado - esperado;
  };

  const efectivoEsperado = (cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'efectivo')?.total || 0) +
                           (cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'efectivo_facturado')?.total || 0);
  const tarjetaEsperada = cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'tarjeta')?.total || 0;
  const transferenciaEsperada = cuadre?.cuadres_forma_pago.find(c => c.forma_pago === 'transferencia')?.total || 0;

  const efectivoContadoNum = parseFloat(efectivoContado) || 0;
  const tarjetaContadoNum = parseFloat(tarjetaContado) || 0;
  const transferenciaContadoNum = parseFloat(transferenciaContado) || 0;

  const diferenciaEfectivo = calcularDiferencia(efectivoEsperado, efectivoContadoNum);
  const diferenciaTarjeta = calcularDiferencia(tarjetaEsperada, tarjetaContadoNum);
  const diferenciaTransferencia = calcularDiferencia(transferenciaEsperada, transferenciaContadoNum);

  const cuadreCorrecto = Math.abs(diferenciaEfectivo) < 0.01 && 
                          Math.abs(diferenciaTarjeta) < 0.01 && 
                          Math.abs(diferenciaTransferencia) < 0.01;

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

                  {/* Transferencia */}
                  <div className="bg-white p-4 rounded-lg">
                    <label className="label">🏦 Transferencia Contado</label>
                    <div className="text-sm text-gray-600 mb-2">
                      Esperado: Q {transferenciaEsperada.toFixed(2)}
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
                        Math.abs(diferenciaTransferencia) < 0.01 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Diferencia: Q {diferenciaTransferencia.toFixed(2)}
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
                <h3 className="text-lg font-semibold mb-4">Detalle de Consultas</h3>
                <div className="overflow-x-auto">
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
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
