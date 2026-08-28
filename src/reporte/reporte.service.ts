import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import type { Actividad } from '../actividades/actividades.repository';
import { codigoVisible } from '../actividades/lib/codigo';

// Columnas fijas del reporte, en orden. Despues de estas se agregan las
// columnas dinamicas que salen de aplanar dynamicAnswers.
function enlacePublico(frontendUrl: string, actividad: Actividad): string {
  const base = frontendUrl.replace(/\/+$/, '');
  return `${base}/public/actividad/${actividad.id}`;
}

// Solo se aplanan valores numericos y booleanos: dynamicAnswers es JSONB
// libre y puede traer texto de observaciones o datos de personas.
function aplanarDynamicAnswers(dynamicAnswers?: Record<string, any> | null): Record<string, number | boolean> {
  const plano: Record<string, number | boolean> = {};
  if (!dynamicAnswers) return plano;
  for (const [clave, valor] of Object.entries(dynamicAnswers)) {
    if (typeof valor === 'number' || typeof valor === 'boolean') {
      plano[clave] = valor;
    }
  }
  return plano;
}

function filaDeActividad(actividad: Actividad, frontendUrl: string): Record<string, any> {
  return {
    Codigo: codigoVisible(actividad.categorySeq),
    Fecha: actividad.dateTime,
    Turno: actividad.shift,
    Estado: actividad.status,
    Barrio: actividad.barrio,
    Latitud: actividad.lat,
    Longitud: actividad.lng,
    Tipo: actividad.activityType,
    Resultados: actividad.results,
    'Entidad responsable': actividad.entidadResponsable ?? '',
    'Entidades acompanantes': (actividad.entidadesAcompanantes ?? []).join(', '),
    'Personas sensibilizadas': actividad.personasSensibilizadas,
    'Personas trasladadas': actividad.personasTransladadas,
    'Incautacion licores': actividad.incautacionLicores,
    'Incautacion armas blancas': actividad.incautacionArmasBlancas,
    'Operativos 1801': actividad.num_1801 ?? '',
    Enlace: enlacePublico(frontendUrl, actividad),
    ...aplanarDynamicAnswers(actividad.dynamicAnswers),
  };
}

@Injectable()
export class ReporteService {
  generarXlsx(actividades: Actividad[], frontendUrl: string): Buffer {
    const filas = actividades.map((actividad) => filaDeActividad(actividad, frontendUrl));
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Actividades');
    return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
  }
}
