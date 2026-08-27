import * as crypto from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { ActividadStatus } from './enums/actividad-status.enum';
import { OperativoSubtipo } from './enums/operativo-subtipo.enum';
import { Turno } from './enums/turno.enum';
import { Actividad, ActividadesRepository, Pagina, GestorStats, BarrioStats } from './actividades.repository';
import { CreateActividadInput, UpdateActividadInput, ListFilters } from './actividades.types';

export class InMemoryActividadesRepository implements ActividadesRepository {
  protected readonly filas: Actividad[] = [];

  async create(createdByUserId: string, data: CreateActividadInput): Promise<Actividad> {
    const ahora = new Date().toISOString();
    const actividad: Actividad = {
      id: crypto.randomUUID(),
      createdByUserId,
      createdByNombre: null,
      status: data.status ?? ActividadStatus.BORRADOR,
      dateTime: new Date(data.dateTime).toISOString(),
      activityType: data.activityType,
      operativoSubtipo: data.operativoSubtipo ?? OperativoSubtipo.ESPACIO_PUBLICO_1801,
      shift: data.shift ?? Turno.DIURNO,
      isNightShift: data.isNightShift ?? false,
      lat: data.lat,
      lng: data.lng,
      barrio: data.barrio,
      photos: [...(data.photos ?? [])],
      results: data.results,
      incautacionLicores: data.incautacionLicores ?? 0,
      incautacionArmasBlancas: data.incautacionArmasBlancas ?? 0,
      personasTransladadas: data.personasTransladadas ?? 0,
      personasSensibilizadas: data.personasSensibilizadas ?? 0,
      num_1801: data.num_1801 ?? null,
      actaOperativo: data.actaOperativo ?? null,
      actaPdfUrl: data.actaPdfUrl ?? null,
      entidadResponsable: data.entidadResponsable ?? null,
      entidadesAcompanantes: [...(data.entidadesAcompanantes ?? [])],
      isGroupOperativo: data.isGroupOperativo ?? false,
      gestoresInvolucradosIds: [...(data.gestoresInvolucradosIds ?? [])],
      validatorUserId: null,
      validatorName: null,
      validatedAt: null,
      validationNotes: null,
      publishedAt: null,
      dynamicAnswers: data.dynamicAnswers ? { ...data.dynamicAnswers } : null,
      categorySeq: this.filas.length + 1,
      createdAt: ahora,
      updatedAt: ahora,
    };
    this.filas.push(actividad);
    return this.clonar(actividad);
  }

  async findById(id: string): Promise<Actividad> {
    return this.clonar(this.buscar(id));
  }

  async listMine(userId: string, filters?: ListFilters): Promise<Pagina> {
    return this.paginar(this.filas.filter((f) => f.createdByUserId === userId), filters);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async patch(id: string, userId: string, role: string, dto: UpdateActividadInput): Promise<Actividad> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listPending(filters?: ListFilters): Promise<Pagina> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listAll(filters: ListFilters): Promise<Pagina> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listAllIds(filters: ListFilters): Promise<string[]> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listValidatedByUser(validatorUserId: string, filters?: ListFilters): Promise<Pagina> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listPublicadas(filters?: ListFilters): Promise<Pagina> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(id: string, userId: string, role?: string): Promise<Actividad> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async approve(id: string, validatorUserId: string, notes?: string, selectedPhotos?: string[]): Promise<Actividad> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async reject(id: string, validatorUserId: string, notes?: string): Promise<Actividad> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(id: string): Promise<void> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async bulkDelete(ids: string[]): Promise<void> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMyStats(userId: string, filters?: ListFilters): Promise<{ enviada: number; aprobada: number; rechazada: number }> {
    throw new Error('no implementado');
  }

  async getGestoresStats(): Promise<GestorStats[]> {
    throw new Error('no implementado');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getBarriosStats(filters?: ListFilters): Promise<{ cubiertas: BarrioStats[]; descuidadas: string[] }> {
    throw new Error('no implementado');
  }

  protected buscar(id: string): Actividad {
    const fila = this.filas.find((f) => f.id === id);
    if (!fila) throw new NotFoundException('Actividad no encontrada');
    return fila;
  }

  protected paginar(filas: Actividad[], filters?: ListFilters): Pagina {
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? filas.length;
    return {
      data: filas.slice(offset, offset + limit).map((f) => this.clonar(f)),
      total: filas.length,
    };
  }

  // Clon de una fila para que quien la reciba no pueda mutar el estado
  // interno del repositorio a traves de sus arrays u objetos anidados.
  private clonar(f: Actividad): Actividad {
    return {
      ...f,
      photos: [...f.photos],
      entidadesAcompanantes: [...f.entidadesAcompanantes],
      gestoresInvolucradosIds: [...f.gestoresInvolucradosIds],
      dynamicAnswers: f.dynamicAnswers ? { ...f.dynamicAnswers } : f.dynamicAnswers,
    };
  }
}
