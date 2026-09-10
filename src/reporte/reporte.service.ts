import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import type { Actividad } from '../actividades/actividades.repository';
import type { ProgramacionItem } from '../programacion/programacion.repository';
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

  // Documento propio del gestor: lo que tenia asignado, lo que completo y lo
  // que no, en un periodo. Es lo que necesita para respaldar su cobro - no
  // lleva datos de otros gestores ni de otras areas.
  async generarPazYSalvoPdf(
    actividades: Actividad[],
    programacion: ProgramacionItem[],
    opciones: { nombreGestor: string; desde: string; hasta: string },
  ): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const listo = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const cumplidas = programacion.filter((p) => p.estado === 'CUMPLIDA').length;
    const canceladas = programacion.filter((p) => p.estado === 'CANCELADA').length;
    const pendientes = programacion.length - cumplidas - canceladas;

    doc.fontSize(18).text('Paz y salvo - Espacio Publico', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#555555');
    doc.text(`Gestor: ${opciones.nombreGestor}`);
    doc.text(`Periodo: ${opciones.desde} a ${opciones.hasta}`);
    doc.text(`Generado: ${new Date().toISOString().slice(0, 10)}`);
    doc.fillColor('#000000');
    doc.moveDown(1);

    doc.fontSize(14).text('Resumen del periodo', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11);
    doc.text(`Tareas programadas: ${programacion.length}`);
    doc.text(`Completadas: ${cumplidas}`);
    doc.text(`Pendientes: ${pendientes}`);
    doc.text(`Canceladas: ${canceladas}`);
    doc.text(`Actividades registradas: ${actividades.length}`);
    doc.moveDown(1);

    doc.fontSize(14).text('Tareas programadas', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9);
    if (programacion.length === 0) {
      doc.text('No hubo tareas programadas en este periodo.');
    } else {
      for (const item of programacion) {
        const fecha = item.fecha.slice(0, 10);
        doc.text(`${fecha}  ${(item.barrio ?? 'Sin barrio').padEnd(24)}  ${item.estado.padEnd(11)}  ${item.descripcion}`);
      }
    }
    doc.moveDown(1);

    doc.fontSize(14).text('Actividades registradas', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9);
    if (actividades.length === 0) {
      doc.text('No se registraron actividades en este periodo.');
    } else {
      for (const a of actividades) {
        const fecha = a.dateTime.slice(0, 10);
        doc.text(`${fecha}  ${a.barrio.padEnd(24)}  ${a.status.padEnd(11)}  ${a.results.slice(0, 60)}`);
      }
    }

    doc.end();
    return listo;
  }
}
