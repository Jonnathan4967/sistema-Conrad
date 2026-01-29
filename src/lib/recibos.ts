import { format } from 'date-fns';

// Función para formatear edad correctamente
const formatearEdad = (paciente: any): string => {
  if (paciente.edad_valor && paciente.edad_tipo) {
    return `${paciente.edad_valor} ${paciente.edad_tipo}`;
  }
  return `${paciente.edad} años`;
};

interface DatosRecibo {
  numeroPaciente?: number; // Número secuencial del paciente
  paciente: {
    nombre: string;
    edad: number;
    edad_valor?: number;
    edad_tipo?: 'días' | 'meses' | 'años';
    telefono: string;
  };
  medico?: {
    nombre: string;
  };
  esReferente: boolean;
  estudios: Array<{
    nombre: string;
    precio: number;
  }>;
  total: number;
  formaPago: string;
  fecha: Date;
  sinInfoMedico: boolean;
}

export const generarReciboCompleto = (datos: DatosRecibo) => {
  const formaPagoTexto = datos.formaPago === 'efectivo' ? 'EFECTIVO' : 
                          datos.formaPago === 'tarjeta' ? 'TARJETA' :
                          datos.formaPago === 'transferencia' ? 'TRANSFERENCIA' : 
                          datos.formaPago === 'efectivo_facturado' ? 'DEPÓSITO' :
                          'CUENTA POR COBRAR';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Recibo Completo</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 11pt;
          line-height: 1.4;
          padding: 10mm;
          width: 80mm;
          background: white;
          color: black;
        }
        .recibo {
          border: 2px solid black;
          padding: 5mm;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid black;
          padding-bottom: 3mm;
          margin-bottom: 3mm;
        }
        .fecha-hora {
          text-align: right;
          font-size: 10pt;
          margin-bottom: 3mm;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2mm;
          font-size: 11pt;
        }
        .label {
          font-weight: bold;
        }
        .section {
          border-top: 1px solid black;
          padding-top: 2mm;
          margin-top: 2mm;
        }
        .estudios {
          margin: 3mm 0;
        }
        .estudio-item {
          margin-bottom: 1mm;
          padding-left: 2mm;
        }
        .total-section {
          border-top: 2px solid black;
          padding-top: 3mm;
          margin-top: 3mm;
        }
        .total {
          border-top: 1px solid black;
          border-bottom: 2px solid black;
          padding: 2mm 0;
          margin-top: 2mm;
          font-weight: bold;
          font-size: 12pt;
        }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="recibo">
        <div class="header">
          <div style="font-weight: bold; font-size: 12pt;">CONRAD</div>
          <div style="font-size: 10pt;">Centro de Diagnóstico</div>
          <div style="font-size: 9pt;">Recibo de Consulta</div>
          ${datos.numeroPaciente ? `<div style="font-size: 9pt; margin-top: 2mm;">PACIENTE #${datos.numeroPaciente}</div>` : ''}
        </div>

        <div class="fecha-hora">
          FECHA: ${format(datos.fecha, 'dd/MM/yyyy')}<br>
          HORA: ${format(datos.fecha, 'HH:mm')}
        </div>

        <div class="row">
          <span class="label">NOMBRE:</span>
          <span>${datos.paciente.nombre}</span>
        </div>

        <div class="row">
          <span class="label">EDAD:</span>
          <span>${formatearEdad(datos.paciente)}</span>
        </div>

        <div class="row">
          <span class="label">TELÉFONO:</span>
          <span>${datos.paciente.telefono}</span>
        </div>

        <div class="row">
          <span class="label">REFERENTE:</span>
          <span>${datos.esReferente ? 'SÍ' : 'NO'}</span>
        </div>

        ${datos.esReferente && datos.medico ? `
        <div class="row">
          <span class="label">DR/DRA:</span>
          <span>${datos.medico.nombre}</span>
        </div>
        ` : ''}

        <div class="section estudios">
          <div class="label" style="margin-bottom: 2mm;">ESTUDIOS:</div>
          ${datos.estudios.map(e => 
            `<div class="estudio-item">• ${e.nombre}</div>`
          ).join('')}
        </div>

        <!-- Sección de pago al final -->
        <div class="total-section">
          <div class="row">
            <span class="label">PACIENTE:</span>
            <span>${datos.paciente.nombre}</span>
          </div>

          ${datos.estudios.map(e =>
            `<div class="row" style="font-size: 10pt;">
              <span>${e.nombre}</span>
              <span>Q ${e.precio.toFixed(2)}</span>
            </div>`
          ).join('')}

          <div class="total">
            <div class="row">
              <span>TOTAL:</span>
              <span>Q ${datos.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="row" style="margin-top: 3mm;">
            <span class="label">FORMA DE PAGO:</span>
            <span>${formaPagoTexto}</span>
          </div>
        </div>

        <div class="section" style="text-align: center; font-size: 9pt; margin-top: 5mm;">
          Gracias por su preferencia
        </div>
      </div>

      <div style="text-align: center; margin-top: 10mm;">
        <button onclick="window.print()" style="padding: 8px 16px; background: black; color: white; border: none; cursor: pointer; font-size: 11pt; margin-right: 5px;">
          IMPRIMIR
        </button>
        <button onclick="window.close()" style="padding: 8px 16px; background: #666; color: white; border: none; cursor: pointer; font-size: 11pt;">
          CERRAR
        </button>
      </div>
    </body>
    </html>
  `;
};

export const generarReciboMedico = (datos: DatosRecibo) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Recibo Médico</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 11pt;
          line-height: 1.4;
          padding: 10mm;
          width: 80mm;
          background: white;
          color: black;
        }
        .recibo {
          border: 2px solid black;
          padding: 5mm;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid black;
          padding-bottom: 3mm;
          margin-bottom: 3mm;
        }
        .fecha-hora {
          text-align: right;
          font-size: 10pt;
          margin-bottom: 3mm;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2mm;
          font-size: 11pt;
        }
        .label {
          font-weight: bold;
        }
        .section {
          border-top: 1px solid black;
          padding-top: 2mm;
          margin-top: 2mm;
        }
        .estudios {
          margin: 3mm 0;
        }
        .estudio-item {
          margin-bottom: 1mm;
          padding-left: 2mm;
        }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="recibo">
        <div class="header">
          <div style="font-weight: bold; font-size: 12pt;">CONRAD</div>
          <div style="font-size: 10pt;">Centro de Diagnóstico</div>
          <div style="font-size: 9pt;">Orden para Médico</div>
          ${datos.numeroPaciente ? `<div style="font-size: 9pt; margin-top: 2mm;">PACIENTE #${datos.numeroPaciente}</div>` : ''}
        </div>

        <div class="fecha-hora">
          FECHA: ${format(datos.fecha, 'dd/MM/yyyy')}
        </div>

        <div class="row">
          <span class="label">NOMBRE:</span>
          <span>${datos.paciente.nombre}</span>
        </div>

        <div class="row">
          <span class="label">EDAD:</span>
          <span>${formatearEdad(datos.paciente)}</span>
        </div>

        <div class="row">
          <span class="label">TELÉFONO:</span>
          <span>${datos.paciente.telefono}</span>
        </div>

        <div class="row">
          <span class="label">REFERENTE:</span>
          <span>${datos.esReferente ? 'SÍ' : 'NO'}</span>
        </div>

        ${datos.esReferente && datos.medico ? `
        <div class="row">
          <span class="label">DR/DRA:</span>
          <span>${datos.medico.nombre}</span>
        </div>
        ` : ''}

        <div class="section estudios">
          <div class="label" style="margin-bottom: 2mm;">ESTUDIOS SOLICITADOS:</div>
          ${datos.estudios.map(e => 
            `<div class="estudio-item">• ${e.nombre}</div>`
          ).join('')}
        </div>

        <div class="section" style="text-align: center; font-size: 9pt; margin-top: 5mm; padding-top: 5mm;">
          <div style="border-top: 1px solid black; padding-top: 3mm;">
            Firma y Sello
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 10mm;">
        <button onclick="window.print()" style="padding: 8px 16px; background: black; color: white; border: none; cursor: pointer; font-size: 11pt; margin-right: 5px;">
          IMPRIMIR
        </button>
        <button onclick="window.close()" style="padding: 8px 16px; background: #666; color: white; border: none; cursor: pointer; font-size: 11pt;">
          CERRAR
        </button>
      </div>
    </body>
    </html>
  `;
};

export const abrirRecibo = (html: string, titulo: string) => {
  const ventana = window.open('', titulo, 'height=600,width=400');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
    
    // Esperar a que se cargue el contenido antes de imprimir
    ventana.onload = () => {
      setTimeout(() => {
        ventana.print();
      }, 250);
    };
  } else {
    alert('Por favor permita ventanas emergentes para imprimir el recibo');
  }
};