// =============================================
// PLANTILLAS DE INFORMES MÉDICOS
// =============================================

export interface CampoPlantilla {
  nombre: string;
  label: string;
  tipo: 'textarea' | 'text' | 'select';
  placeholder?: string;
  opciones?: string[];
  requerido?: boolean;
  filas?: number;
}

export interface PlantillaInforme {
  tipo: string;
  nombre: string;
  secciones: {
    titulo: string;
    campos: CampoPlantilla[];
  }[];
}

// =============================================
// PLANTILLA: TAC (TOMOGRAFÍA)
// =============================================
export const PLANTILLA_TAC: PlantillaInforme = {
  tipo: 'TAC',
  nombre: 'Tomografía Computarizada',
  secciones: [
    {
      titulo: 'TÉCNICA',
      campos: [
        {
          nombre: 'tecnica',
          label: 'Descripción de la Técnica',
          tipo: 'textarea',
          placeholder: 'Ej: Estudio tomográfico de abdomen y pelvis, realizado mediante cortes axiales de 5mm de grosor...',
          requerido: true,
          filas: 3
        }
      ]
    },
    {
      titulo: 'HÍGADO',
      campos: [
        {
          nombre: 'higado',
          label: 'Descripción del Hígado',
          tipo: 'textarea',
          placeholder: 'Ej: Parénquima hepático de forma, tamaño y localización habitual...',
          requerido: true,
          filas: 3
        }
      ]
    },
    {
      titulo: 'VÍAS BILIARES',
      campos: [
        {
          nombre: 'vias_biliares',
          label: 'Descripción de Vías Biliares',
          tipo: 'textarea',
          placeholder: 'Ej: Dentro de límites normales...',
          requerido: true,
          filas: 2
        }
      ]
    },
    {
      titulo: 'BAZO',
      campos: [
        {
          nombre: 'bazo',
          label: 'Descripción del Bazo',
          tipo: 'textarea',
          placeholder: 'Ej: Sin alteraciones...',
          requerido: true,
          filas: 2
        }
      ]
    },
    {
      titulo: 'PÁNCREAS',
      campos: [
        {
          nombre: 'pancreas',
          label: 'Descripción del Páncreas',
          tipo: 'textarea',
          placeholder: 'Ej: Sin alteraciones...',
          requerido: true,
          filas: 2
        }
      ]
    },
    {
      titulo: 'RIÑONES',
      campos: [
        {
          nombre: 'riñones',
          label: 'Descripción de Riñones',
          tipo: 'textarea',
          placeholder: 'Ej: Ambos riñones de forma y tamaño normal...',
          requerido: true,
          filas: 3
        }
      ]
    },
    {
      titulo: 'GLÁNDULAS SUPRARRENALES',
      campos: [
        {
          nombre: 'suprarrenales',
          label: 'Descripción de Glándulas Suprarrenales',
          tipo: 'textarea',
          placeholder: 'Ej: Sin alteraciones...',
          filas: 2
        }
      ]
    },
    {
      titulo: 'RETROPERITONEO Y GRANDES VASOS',
      campos: [
        {
          nombre: 'retroperitoneo',
          label: 'Descripción',
          tipo: 'textarea',
          placeholder: 'Ej: Sin evidencia de adenopatías...',
          filas: 2
        }
      ]
    }
  ]
};

// =============================================
// PLANTILLA: RX (RAYOS X)
// =============================================
export const PLANTILLA_RX: PlantillaInforme = {
  tipo: 'RX',
  nombre: 'Rayos X',
  secciones: [
    {
      titulo: 'TÉCNICA',
      campos: [
        {
          nombre: 'tecnica',
          label: 'Proyección y Técnica',
          tipo: 'textarea',
          placeholder: 'Ej: Radiografía de tórax en proyección PA y lateral...',
          requerido: true,
          filas: 2
        }
      ]
    },
    {
      titulo: 'HALLAZGOS',
      campos: [
        {
          nombre: 'silueta_cardiaca',
          label: 'Silueta Cardíaca',
          tipo: 'textarea',
          placeholder: 'Ej: De forma y tamaño normal...',
          filas: 2
        },
        {
          nombre: 'campos_pulmonares',
          label: 'Campos Pulmonares',
          tipo: 'textarea',
          placeholder: 'Ej: Adecuadamente expandidos, sin infiltrados...',
          requerido: true,
          filas: 3
        },
        {
          nombre: 'estructuras_oseas',
          label: 'Estructuras Óseas',
          tipo: 'textarea',
          placeholder: 'Ej: Sin alteraciones...',
          filas: 2
        },
        {
          nombre: 'otros_hallazgos',
          label: 'Otros Hallazgos',
          tipo: 'textarea',
          placeholder: 'Observaciones adicionales...',
          filas: 2
        }
      ]
    }
  ]
};

// =============================================
// PLANTILLA: USG (ULTRASONIDO)
// =============================================
export const PLANTILLA_USG: PlantillaInforme = {
  tipo: 'USG',
  nombre: 'Ultrasonido',
  secciones: [
    {
      titulo: 'TÉCNICA',
      campos: [
        {
          nombre: 'tecnica',
          label: 'Tipo de Ultrasonido',
          tipo: 'textarea',
          placeholder: 'Ej: Ultrasonido abdominal realizado con transductor convex...',
          requerido: true,
          filas: 2
        }
      ]
    },
    {
      titulo: 'ÓRGANOS EVALUADOS',
      campos: [
        {
          nombre: 'higado',
          label: 'Hígado',
          tipo: 'textarea',
          placeholder: 'Ej: De tamaño y ecogenicidad normal...',
          filas: 2
        },
        {
          nombre: 'vesicula',
          label: 'Vesícula Biliar',
          tipo: 'textarea',
          placeholder: 'Ej: Sin litiasis, pared normal...',
          filas: 2
        },
        {
          nombre: 'pancreas',
          label: 'Páncreas',
          tipo: 'textarea',
          placeholder: 'Ej: Visualizado parcialmente, sin alteraciones...',
          filas: 2
        },
        {
          nombre: 'bazo',
          label: 'Bazo',
          tipo: 'textarea',
          placeholder: 'Ej: De tamaño normal...',
          filas: 2
        },
        {
          nombre: 'riñones',
          label: 'Riñones',
          tipo: 'textarea',
          placeholder: 'Ej: Ambos riñones de forma y tamaño conservados...',
          requerido: true,
          filas: 3
        },
        {
          nombre: 'otros',
          label: 'Otros Hallazgos',
          tipo: 'textarea',
          placeholder: 'Vejiga, líquido libre, etc...',
          filas: 2
        }
      ]
    }
  ]
};

// =============================================
// PLANTILLA: EKG (ELECTROCARDIOGRAMA)
// =============================================
export const PLANTILLA_EKG: PlantillaInforme = {
  tipo: 'EKG',
  nombre: 'Electrocardiograma',
  secciones: [
    {
      titulo: 'DATOS TÉCNICOS',
      campos: [
        {
          nombre: 'frecuencia',
          label: 'Frecuencia Cardíaca',
          tipo: 'text',
          placeholder: 'Ej: 72 lpm',
          requerido: true
        },
        {
          nombre: 'ritmo',
          label: 'Ritmo',
          tipo: 'select',
          opciones: ['Sinusal', 'Fibrilación Auricular', 'Flutter Auricular', 'Otro'],
          requerido: true
        }
      ]
    },
    {
      titulo: 'INTERPRETACIÓN',
      campos: [
        {
          nombre: 'eje',
          label: 'Eje Eléctrico',
          tipo: 'text',
          placeholder: 'Ej: Normal',
          requerido: true
        },
        {
          nombre: 'intervalo_pr',
          label: 'Intervalo PR',
          tipo: 'text',
          placeholder: 'Ej: 0.16 seg',
          requerido: true
        },
        {
          nombre: 'complejo_qrs',
          label: 'Complejo QRS',
          tipo: 'text',
          placeholder: 'Ej: 0.08 seg',
          requerido: true
        },
        {
          nombre: 'segmento_st',
          label: 'Segmento ST',
          tipo: 'textarea',
          placeholder: 'Ej: Sin elevación ni depresión...',
          requerido: true,
          filas: 2
        },
        {
          nombre: 'onda_t',
          label: 'Onda T',
          tipo: 'textarea',
          placeholder: 'Ej: Positiva en todas las derivaciones...',
          filas: 2
        }
      ]
    }
  ]
};

// =============================================
// PLANTILLA: MAMOGRAFÍA
// =============================================
export const PLANTILLA_MAMO: PlantillaInforme = {
  tipo: 'MAMO',
  nombre: 'Mamografía',
  secciones: [
    {
      titulo: 'TÉCNICA',
      campos: [
        {
          nombre: 'tecnica',
          label: 'Proyecciones Realizadas',
          tipo: 'textarea',
          placeholder: 'Ej: Mamografía bilateral en proyecciones CC y MLO...',
          requerido: true,
          filas: 2
        }
      ]
    },
    {
      titulo: 'MAMA DERECHA',
      campos: [
        {
          nombre: 'mama_derecha',
          label: 'Descripción',
          tipo: 'textarea',
          placeholder: 'Ej: Tejido fibroglandular tipo A/B/C/D...',
          requerido: true,
          filas: 3
        }
      ]
    },
    {
      titulo: 'MAMA IZQUIERDA',
      campos: [
        {
          nombre: 'mama_izquierda',
          label: 'Descripción',
          tipo: 'textarea',
          placeholder: 'Ej: Tejido fibroglandular tipo A/B/C/D...',
          requerido: true,
          filas: 3
        }
      ]
    },
    {
      titulo: 'CLASIFICACIÓN BI-RADS',
      campos: [
        {
          nombre: 'birads',
          label: 'Categoría BI-RADS',
          tipo: 'select',
          opciones: [
            'BI-RADS 0 - Estudio incompleto',
            'BI-RADS 1 - Negativo',
            'BI-RADS 2 - Hallazgo benigno',
            'BI-RADS 3 - Probablemente benigno',
            'BI-RADS 4 - Sospechoso',
            'BI-RADS 5 - Altamente sugestivo de malignidad',
            'BI-RADS 6 - Malignidad comprobada'
          ],
          requerido: true
        }
      ]
    }
  ]
};

// =============================================
// FUNCIÓN: Obtener Plantilla por Tipo
// =============================================
export const obtenerPlantilla = (tipoEstudio: string): PlantillaInforme | null => {
  const tipo = tipoEstudio.toUpperCase();
  
  if (tipo.includes('TAC') || tipo.includes('TOMOGRAFIA')) {
    return PLANTILLA_TAC;
  }
  if (tipo.includes('RX') || tipo.includes('RAYO')) {
    return PLANTILLA_RX;
  }
  if (tipo.includes('USG') || tipo.includes('ULTRASONIDO') || tipo.includes('ECOGRAFIA')) {
    return PLANTILLA_USG;
  }
  if (tipo.includes('EKG') || tipo.includes('ELECTRO')) {
    return PLANTILLA_EKG;
  }
  if (tipo.includes('MAMO')) {
    return PLANTILLA_MAMO;
  }
  
  // Plantilla genérica por defecto
  return {
    tipo: 'GENERICO',
    nombre: 'Informe General',
    secciones: [
      {
        titulo: 'TÉCNICA',
        campos: [
          {
            nombre: 'tecnica',
            label: 'Técnica Utilizada',
            tipo: 'textarea',
            placeholder: 'Descripción de la técnica...',
            requerido: true,
            filas: 3
          }
        ]
      },
      {
        titulo: 'HALLAZGOS',
        campos: [
          {
            nombre: 'hallazgos',
            label: 'Hallazgos del Estudio',
            tipo: 'textarea',
            placeholder: 'Descripción de los hallazgos...',
            requerido: true,
            filas: 6
          }
        ]
      }
    ]
  };
};

// =============================================
// VALORES POR DEFECTO (Texto prellenado)
// =============================================
export const obtenerValoresPorDefecto = (tipo: string): Record<string, string> => {
  const tipoUpper = tipo.toUpperCase();
  
  if (tipoUpper.includes('TAC')) {
    return {
      tecnica: 'Estudio tomográfico de abdomen y pelvis, realizado mediante cortes axiales de 5mm de grosor, con contraste endovenoso.',
      higado: 'Parénquima hepático de forma, tamaño y localización habitual. Sin lesiones focales.',
      vias_biliares: 'Vía biliar intra y extrahepática de calibre normal.',
      bazo: 'De tamaño y densidad normal.',
      pancreas: 'Sin alteraciones evidentes.',
      riñones: 'Ambos riñones de forma y tamaño normal. Sin evidencia de litiasis.',
      suprarrenales: 'Sin alteraciones.',
      retroperitoneo: 'Sin evidencia de adenopatías ni colecciones.'
    };
  }
  
  if (tipoUpper.includes('RX')) {
    return {
      tecnica: 'Radiografía de tórax en proyección PA.',
      silueta_cardiaca: 'De forma y tamaño normal.',
      campos_pulmonares: 'Adecuadamente expandidos, sin infiltrados ni consolidaciones.',
      estructuras_oseas: 'Sin lesiones líticas ni blásticas.'
    };
  }
  
  if (tipoUpper.includes('USG')) {
    return {
      tecnica: 'Ultrasonido abdominal realizado con transductor convex.',
      higado: 'De tamaño y ecogenicidad normal.',
      vesicula: 'Sin litiasis, pared de grosor normal.',
      bazo: 'De tamaño normal.',
      riñones: 'Ambos riñones de forma y tamaño conservados. Sin dilatación pielocalicial.'
    };
  }
  
  if (tipoUpper.includes('EKG')) {
    return {
      ritmo: 'Sinusal',
      eje: 'Normal',
      intervalo_pr: '0.16 seg',
      complejo_qrs: '0.08 seg',
      segmento_st: 'Sin elevación ni depresión significativa.',
      onda_t: 'Positiva en todas las derivaciones.'
    };
  }
  
  return {};
};