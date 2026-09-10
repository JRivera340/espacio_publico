import * as crypto from 'crypto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActividadStatus } from './enums/actividad-status.enum';
import { OperativoSubtipo } from './enums/operativo-subtipo.enum';
import { Turno } from './enums/turno.enum';
import { Actividad, ActividadesRepository, Pagina, GestorStats, BarrioStats } from './actividades.repository';
import { CreateActividadInput, UpdateActividadInput, ListFilters } from './actividades.types';
import { BARRIOS } from '../catalogos/barrio.enum';

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

  // El filtro `gestor` de ListFilters no puede pisar la propiedad: si viene
  // con un id distinto al dueno, la interseccion sobre la misma columna deja
  // el resultado vacio, nunca las actividades de otro gestor.
  async listMine(userId: string, filters?: ListFilters): Promise<Pagina> {
    const propias = this.filas.filter((f) => f.createdByUserId === userId);
    return this.paginar(this.aplicarFiltros(propias, filters), filters);
  }

  async send(id: string, userId: string, role?: string): Promise<Actividad> {
    const fila = this.buscar(id);
    if (role !== 'ADMIN' && fila.createdByUserId !== userId) {
      throw new ForbiddenException('La actividad no es tuya');
    }
    if (fila.status === ActividadStatus.PUBLICADA) {
      throw new BadRequestException(
        'La actividad ya esta publicada — editarla no la reenvia a validacion',
      );
    }
    fila.status = ActividadStatus.ENVIADA;
    fila.validationNotes = null;
    fila.validatorUserId = null;
    fila.validatedAt = null;
    fila.updatedAt = new Date().toISOString();
    return this.clonar(fila);
  }

  // Aprobar PUBLICA directo. El estado APROBADA existe en el enum por
  // compatibilidad con datos historicos del hub, pero este flujo no lo usa.
  async approve(
    id: string,
    validatorUserId: string,
    notes?: string,
    selectedPhotos?: string[],
  ): Promise<Actividad> {
    const fila = this.buscar(id);
    const ahora = new Date().toISOString();
    fila.status = ActividadStatus.PUBLICADA;
    fila.validatorUserId = validatorUserId;
    fila.validatedAt = ahora;
    fila.validationNotes = notes ?? null;
    fila.publishedAt = ahora;
    if (Array.isArray(selectedPhotos)) fila.photos = selectedPhotos;
    fila.updatedAt = ahora;
    return this.clonar(fila);
  }

  async reject(id: string, validatorUserId: string, notes?: string): Promise<Actividad> {
    const fila = this.buscar(id);
    const ahora = new Date().toISOString();
    fila.status = ActividadStatus.RECHAZADA;
    fila.validatorUserId = validatorUserId;
    fila.validatedAt = ahora;
    fila.validationNotes = notes ?? null;
    fila.updatedAt = ahora;
    return this.clonar(fila);
  }

  async patch(
    id: string,
    userId: string,
    role: string,
    dto: UpdateActividadInput,
  ): Promise<Actividad> {
    const fila = this.buscar(id);

    if (role === 'GESTOR_ESPACIO_PUBLICO') {
      const esDueno = fila.createdByUserId === userId;
      const esInvolucrado = (fila.gestoresInvolucradosIds ?? []).includes(userId);
      if (!(fila.status === ActividadStatus.RECHAZADA && (esDueno || esInvolucrado))) {
        throw new ForbiddenException('Solo puedes editar tus actividades rechazadas');
      }
    } else if (role === 'VALIDADOR_ESPACIO_PUBLICO') {
      if (fila.status !== ActividadStatus.ENVIADA) {
        throw new ForbiddenException('Solo puedes editar actividades en estado ENVIADA');
      }
    }

    if (dto.createdByUserId && dto.createdByUserId !== fila.createdByUserId && role !== 'ADMIN') {
      throw new BadRequestException('Solo el administrador puede cambiar el gestor creador');
    }

    // El frontend manda las fechas como string ISO. Castear ANTES de mezclar es
    // lo que evita el error `toISOString is not a function` al persistir.
    const { dateTime, ...resto } = dto;
    Object.assign(fila, resto);
    if (dateTime) fila.dateTime = new Date(dateTime).toISOString();
    fila.updatedAt = new Date().toISOString();
    return this.clonar(fila);
  }

  async listPending(filters?: ListFilters): Promise<Pagina> {
    const enviadas = this.filas.filter((f) => f.status === ActividadStatus.ENVIADA);
    return this.paginar(this.aplicarFiltros(enviadas, filters), filters);
  }

  async listPublicadas(filters?: ListFilters): Promise<Pagina> {
    const publicadas = this.filas.filter((f) => f.status === ActividadStatus.PUBLICADA);
    return this.paginar(this.aplicarFiltros(publicadas, filters), filters);
  }

  async listAll(filters: ListFilters): Promise<Pagina> {
    return this.paginar(this.aplicarFiltros(this.filas, filters), filters);
  }

  async listAllIds(filters: ListFilters): Promise<string[]> {
    const { data } = await this.listAll({ ...filters, limit: undefined, offset: undefined });
    return data.map((f) => f.id);
  }

  async listValidatedByUser(validatorUserId: string, filters?: ListFilters): Promise<Pagina> {
    const validadas = this.filas.filter((f) => f.validatorUserId === validatorUserId);
    return this.paginar(this.aplicarFiltros(validadas, filters), filters);
  }

  async delete(id: string): Promise<void> {
    const i = this.filas.findIndex((f) => f.id === id);
    if (i === -1) throw new NotFoundException('Actividad no encontrada');
    this.filas.splice(i, 1);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      const i = this.filas.findIndex((f) => f.id === id);
      if (i !== -1) this.filas.splice(i, 1);
    }
  }

  async getMyStats(userId: string, filters?: ListFilters): Promise<{ enviada: number; aprobada: number; rechazada: number }> {
    const propias = this.aplicarFiltroFecha(
      this.filas.filter((f) => f.createdByUserId === userId),
      filters,
    );
    return {
      enviada: propias.filter((f) => f.status === ActividadStatus.ENVIADA).length,
      aprobada: propias.filter((f) => f.status === ActividadStatus.PUBLICADA).length,
      rechazada: propias.filter((f) => f.status === ActividadStatus.RECHAZADA).length,
    };
  }

  async getGestoresStats(): Promise<GestorStats[]> {
    const porGestor = new Map<string, Actividad[]>();
    for (const f of this.filas) {
      const lista = porGestor.get(f.createdByUserId) ?? [];
      lista.push(f);
      porGestor.set(f.createdByUserId, lista);
    }
    return Array.from(porGestor.entries()).map(([id, filas]) => ({
      id,
      totalActividades: filas.length,
      porEstado: filas.reduce<Record<string, number>>((acc, f) => {
        acc[f.status] = (acc[f.status] ?? 0) + 1;
        return acc;
      }, {}),
    }));
  }

  async getBarriosStats(filters?: ListFilters): Promise<{ cubiertas: BarrioStats[]; descuidadas: string[] }> {
    const consideradas = this.aplicarFiltroFecha(this.filas, filters);
    const porBarrio = new Map<string, Actividad[]>();
    for (const f of consideradas) {
      const lista = porBarrio.get(f.barrio) ?? [];
      lista.push(f);
      porBarrio.set(f.barrio, lista);
    }
    const cubiertas = Array.from(porBarrio.entries()).map(([barrio, filas]) => ({
      barrio,
      totalActividades: filas.length,
      ultimaActividad: filas.map((f) => f.dateTime).sort().at(-1) ?? null,
    }));
    const descuidadas = BARRIOS.filter((b) => !porBarrio.has(b));
    return { cubiertas, descuidadas };
  }

  // Filtros comunes de ListFilters (status, barrio, gestor, isNightShift,
  // desde/hasta). Se aplican igual en las seis lecturas que los reciben para
  // no divergir del comportamiento de la implementacion TypeORM.
  private aplicarFiltros(filas: Actividad[], filters?: ListFilters): Actividad[] {
    let resultado = filas;
    if (filters?.status) resultado = resultado.filter((f) => f.status === filters.status);
    if (filters?.barrio) resultado = resultado.filter((f) => f.barrio === filters.barrio);
    if (filters?.gestor) resultado = resultado.filter((f) => f.createdByUserId === filters.gestor);
    if (filters?.isNightShift !== undefined) {
      resultado = resultado.filter((f) => f.isNightShift === filters.isNightShift);
    }
    return this.aplicarFiltroFecha(resultado, filters);
  }

  // Filtro desde/hasta solo, extraido de aplicarFiltros para que getMyStats y
  // getBarriosStats tambien lo apliquen: la version TypeORM ya lo hacia en
  // ambas y esta se habia quedado atras, con produccion filtrando fecha y los
  // tests corriendo contra una version que la ignoraba por completo.
  private aplicarFiltroFecha(filas: Actividad[], filters?: ListFilters): Actividad[] {
    let resultado = filas;
    if (filters?.desde) resultado = resultado.filter((f) => f.dateTime >= filters.desde!);
    if (filters?.hasta) resultado = resultado.filter((f) => f.dateTime <= filters.hasta!);
    return resultado;
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
