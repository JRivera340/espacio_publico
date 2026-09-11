import { Injectable } from '@nestjs/common';
import { ActividadesService } from '../actividades/actividades.service';
import { ActividadStatus } from '../actividades/enums/actividad-status.enum';
import { OperativoSubtipo } from '../actividades/enums/operativo-subtipo.enum';
import { ListFilters } from '../actividades/actividades.types';
import { Actividad } from '../actividades/actividades.repository';
import { sanitizarDatosPublicos } from './public-fields';
import { codigoVisible } from '../actividades/lib/codigo';

// Forma publica de una actividad. Se construye campo por campo a proposito:
// una nueva columna en la entidad no se filtra sola, hay que agregarla aca.
export type ActividadPublica = {
  id: string;
  fecha: string;
  lat: number;
  lng: number;
  barrio: string;
  subtipo: OperativoSubtipo;
  codigo: string;
  photos: string[];
  cifras: Record<string, number | boolean> | null;
};

export type CifrasAgregadas = {
  total: number;
  porBarrio: Record<string, number>;
  cifras: Record<string, number>;
};

@Injectable()
export class PublicoService {
  constructor(private readonly actividades: ActividadesService) {}

  private aForma(a: Actividad): ActividadPublica {
    return {
      id: a.id,
      fecha: a.dateTime,
      lat: a.lat,
      lng: a.lng,
      barrio: a.barrio,
      subtipo: a.operativoSubtipo,
      codigo: codigoVisible(a.categorySeq),
      // El visor publico solo muestra lo que el validador eligio publicar,
      // no el set completo de evidencia del operativo.
      photos: [...(a.publishedPhotos ?? [])],
      cifras: sanitizarDatosPublicos(a.operativoSubtipo, a.dynamicAnswers),
    };
  }

  async listar(filters?: ListFilters) {
    const { data, total } = await this.actividades.listarPublicadas(filters);
    return { data: data.map((a) => this.aForma(a)), total };
  }

  async obtener(id: string): Promise<ActividadPublica | null> {
    const actividad = await this.actividades.obtener(id);
    if (!actividad || actividad.status !== ActividadStatus.PUBLICADA) return null;
    return this.aForma(actividad);
  }

  async cifras(filters?: ListFilters): Promise<CifrasAgregadas> {
    const { data } = await this.actividades.listarPublicadas({ ...filters, limit: undefined, offset: undefined });

    const porBarrio: Record<string, number> = {};
    const cifras: Record<string, number> = {};

    for (const a of data) {
      porBarrio[a.barrio] = (porBarrio[a.barrio] ?? 0) + 1;

      const sanitizado = sanitizarDatosPublicos(a.operativoSubtipo, a.dynamicAnswers);
      if (!sanitizado) continue;
      for (const [clave, valor] of Object.entries(sanitizado)) {
        if (typeof valor !== 'number') continue;
        cifras[clave] = (cifras[clave] ?? 0) + valor;
      }
    }

    return { total: data.length, porBarrio, cifras };
  }
}
