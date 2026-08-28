import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { ActividadStatus } from './enums/actividad-status.enum';
import { ActividadEntity } from './entities/actividad.entity';
import { Actividad, ActividadesRepository, Pagina, GestorStats, BarrioStats } from './actividades.repository';
import { CreateActividadInput, UpdateActividadInput, ListFilters } from './actividades.types';
import { BARRIOS } from '../catalogos/barrio.enum';

@Injectable()
export class TypeOrmActividadesRepository implements ActividadesRepository {
  constructor(
    @InjectRepository(ActividadEntity)
    private readonly repo: Repository<ActividadEntity>,
  ) {}

  async create(createdByUserId: string, data: CreateActividadInput): Promise<Actividad> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.repo.manager.transaction(async (manager) => {
          const repo = manager.getRepository(ActividadEntity);

          const entity = repo.create({
            createdByUserId,
            status: data.status ?? ActividadStatus.BORRADOR,
            dateTime: new Date(data.dateTime),
            activityType: data.activityType,
            operativoSubtipo: data.operativoSubtipo,
            shift: data.shift,
            isNightShift: data.isNightShift ?? false,
            lat: data.lat,
            lng: data.lng,
            barrio: data.barrio,
            photos: data.photos || [],
            results: data.results,
            incautacionLicores: data.incautacionLicores || 0,
            incautacionArmasBlancas: data.incautacionArmasBlancas || 0,
            personasTransladadas: data.personasTransladadas || 0,
            personasSensibilizadas: data.personasSensibilizadas || 0,
            num_1801: data.num_1801 ?? null,
            actaOperativo: data.actaOperativo,
            actaPdfUrl: data.actaPdfUrl,
            entidadResponsable: data.entidadResponsable,
            entidadesAcompanantes: data.entidadesAcompanantes || [],
            isGroupOperativo: data.isGroupOperativo || false,
            gestoresInvolucradosIds: data.gestoresInvolucradosIds || [],
            dynamicAnswers: data.dynamicAnswers ?? null,
          });

          // Numeracion visible correlativa. Sin categorias en esta base: el
          // maximo se calcula sobre toda la tabla.
          const seqRow = await repo
            .createQueryBuilder('a')
            .select('MAX(a.categorySeq)', 'mx')
            .getRawOne();
          entity.categorySeq = (parseInt(seqRow?.mx, 10) || 0) + 1;

          const saved = await repo.save(entity);

          return this.toActividad(saved);
        });
      } catch (error: any) {
        lastError = error;
        if (
          error.code === '23505' ||
          error.code === '23503' ||
          error.code === '23502' ||
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }

        if (attempt < maxRetries) {
          const waitTime = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('No se pudo crear la actividad tras varios intentos');
  }

  async findById(id: string): Promise<Actividad> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Actividad no encontrada');
    return this.toActividad(entity);
  }

  async patch(
    id: string,
    userId: string,
    role: string,
    dto: UpdateActividadInput,
  ): Promise<Actividad> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Actividad no encontrada');

    if (role === 'GESTOR_ESPACIO_PUBLICO') {
      const esDueno = entity.createdByUserId === userId;
      if (!(entity.status === ActividadStatus.RECHAZADA && esDueno)) {
        throw new ForbiddenException('Solo puedes editar tus actividades rechazadas');
      }
    } else if (role === 'VALIDADOR_ESPACIO_PUBLICO') {
      if (entity.status !== ActividadStatus.ENVIADA) {
        throw new ForbiddenException('Solo puedes editar actividades en estado ENVIADA');
      }
    }

    if (dto.createdByUserId && dto.createdByUserId !== entity.createdByUserId && role !== 'ADMIN') {
      throw new BadRequestException('Solo el administrador puede cambiar el gestor creador');
    }

    // El frontend manda las fechas como string ISO. Castear ANTES de mezclar es
    // lo que evita el error `toISOString is not a function` al persistir.
    const { dateTime, ...resto } = dto;
    Object.assign(entity, resto);
    if (dateTime) entity.dateTime = new Date(dateTime);

    const saved = await this.repo.save(entity);
    return this.toActividad(saved);
  }

  // El filtro `gestor` de ListFilters no puede pisar la propiedad: si viene
  // con un id distinto al dueno, la interseccion sobre la misma columna deja
  // el resultado vacio, nunca las actividades de otro gestor.
  async listMine(userId: string, filters?: ListFilters): Promise<Pagina> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.createdByUserId = :userId', { userId });
    this.aplicarFiltrosComunes(qb, filters);
    qb.orderBy('a.dateTime', 'DESC');
    return this.ejecutarPagina(qb, filters);
  }

  async listPending(filters?: ListFilters): Promise<Pagina> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: ActividadStatus.ENVIADA });
    this.aplicarFiltrosComunes(qb, filters);
    qb.orderBy('a.categorySeq', 'DESC');
    return this.ejecutarPagina(qb, filters);
  }

  async listPublicadas(filters?: ListFilters): Promise<Pagina> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: ActividadStatus.PUBLICADA });
    this.aplicarFiltrosComunes(qb, filters);
    qb.orderBy('a.publishedAt', 'DESC');
    return this.ejecutarPagina(qb, filters);
  }

  async listAll(filters: ListFilters): Promise<Pagina> {
    const qb = this.repo.createQueryBuilder('a');
    this.aplicarFiltrosComunes(qb, filters);
    qb.orderBy('a.categorySeq', 'DESC');
    return this.ejecutarPagina(qb, filters);
  }

  async listAllIds(filters: ListFilters): Promise<string[]> {
    const qb = this.repo.createQueryBuilder('a');
    this.aplicarFiltrosComunes(qb, filters);
    qb.select(['a.id']);
    const results = await qb.getMany();
    return results.map((r) => r.id);
  }

  async listValidatedByUser(validatorUserId: string, filters?: ListFilters): Promise<Pagina> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.validatorUserId = :validatorUserId', { validatorUserId });
    this.aplicarFiltrosComunes(qb, filters);
    qb.orderBy('a.categorySeq', 'DESC');
    return this.ejecutarPagina(qb, filters);
  }

  async send(id: string, userId: string, role?: string): Promise<Actividad> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Actividad no encontrada');

    if (role !== 'ADMIN' && entity.createdByUserId !== userId) {
      throw new ForbiddenException('La actividad no es tuya');
    }
    if (entity.status === ActividadStatus.PUBLICADA) {
      throw new BadRequestException(
        'La actividad ya esta publicada — editarla no la reenvia a validacion',
      );
    }

    entity.status = ActividadStatus.ENVIADA;
    entity.validationNotes = null;
    entity.validatorUserId = null;
    entity.validatedAt = null;
    const saved = await this.repo.save(entity);
    return this.toActividad(saved);
  }

  // Aprobar PUBLICA directo. El estado APROBADA existe en el enum por
  // compatibilidad con datos historicos del hub, pero este flujo no lo usa.
  async approve(
    id: string,
    validatorUserId: string,
    notes?: string,
    selectedPhotos?: string[],
  ): Promise<Actividad> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Actividad no encontrada');

    const ahora = new Date();
    entity.status = ActividadStatus.PUBLICADA;
    entity.validatorUserId = validatorUserId;
    entity.validatedAt = ahora;
    entity.validationNotes = notes ?? null;
    entity.publishedAt = ahora;
    if (Array.isArray(selectedPhotos)) entity.photos = selectedPhotos;

    const saved = await this.repo.save(entity);
    return this.toActividad(saved);
  }

  async reject(id: string, validatorUserId: string, notes?: string): Promise<Actividad> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Actividad no encontrada');

    entity.status = ActividadStatus.RECHAZADA;
    entity.validatorUserId = validatorUserId;
    entity.validatedAt = new Date();
    entity.validationNotes = notes ?? null;

    const saved = await this.repo.save(entity);
    return this.toActividad(saved);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Actividad no encontrada');
    await this.repo.remove(entity);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await this.repo.delete({ id: In(ids) });
  }

  async getMyStats(
    userId: string,
    filters?: ListFilters,
  ): Promise<{ enviada: number; aprobada: number; rechazada: number }> {
    const base = () => {
      const qb = this.repo
        .createQueryBuilder('a')
        .where('a.createdByUserId = :userId', { userId });
      this.aplicarFiltrosFecha(qb, filters);
      return qb;
    };

    const [enviada, aprobada, rechazada] = await Promise.all([
      base().andWhere('a.status = :s', { s: ActividadStatus.ENVIADA }).getCount(),
      base().andWhere('a.status = :s', { s: ActividadStatus.PUBLICADA }).getCount(),
      base().andWhere('a.status = :s', { s: ActividadStatus.RECHAZADA }).getCount(),
    ]);

    return { enviada, aprobada, rechazada };
  }

  async getGestoresStats(): Promise<GestorStats[]> {
    const raw = await this.repo
      .createQueryBuilder('a')
      .select('a.createdByUserId', 'userId')
      .addSelect('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.createdByUserId')
      .addGroupBy('a.status')
      .getRawMany();

    const porGestor = new Map<string, { total: number; porEstado: Record<string, number> }>();
    for (const row of raw) {
      const userId = row.userId;
      if (!porGestor.has(userId)) porGestor.set(userId, { total: 0, porEstado: {} });
      const stats = porGestor.get(userId)!;
      const count = parseInt(row.count, 10) || 0;
      stats.total += count;
      stats.porEstado[row.status] = (stats.porEstado[row.status] ?? 0) + count;
    }

    return Array.from(porGestor.entries()).map(([id, stats]) => ({
      id,
      totalActividades: stats.total,
      porEstado: stats.porEstado,
    }));
  }

  async getBarriosStats(
    filters?: ListFilters,
  ): Promise<{ cubiertas: BarrioStats[]; descuidadas: string[] }> {
    const qb = this.repo
      .createQueryBuilder('a')
      .select('a.barrio', 'barrio')
      .addSelect('COUNT(*)', 'total')
      .addSelect('MAX(a.dateTime)', 'ultimaActividad')
      .groupBy('a.barrio');
    this.aplicarFiltrosFecha(qb, filters);

    const raw = await qb.getRawMany();
    const cubiertas = raw
      .map((r) => ({
        barrio: r.barrio,
        totalActividades: parseInt(r.total, 10) || 0,
        ultimaActividad: r.ultimaActividad ? new Date(r.ultimaActividad).toISOString() : null,
      }))
      .sort((a, b) => b.totalActividades - a.totalActividades);

    const barriosCubiertos = new Set(cubiertas.map((c) => c.barrio));
    const descuidadas = BARRIOS.filter((b) => !barriosCubiertos.has(b));
    return { cubiertas, descuidadas };
  }

  private aplicarFiltrosFecha(qb: ReturnType<Repository<ActividadEntity>['createQueryBuilder']>, filters?: ListFilters): void {
    if (filters?.desde && filters.desde.trim()) {
      qb.andWhere(
        `DATE(a.dateTime AT TIME ZONE 'America/Bogota') >= CAST(:desde AS DATE)`,
        { desde: filters.desde.trim() },
      );
    }
    if (filters?.hasta && filters.hasta.trim()) {
      qb.andWhere(
        `DATE(a.dateTime AT TIME ZONE 'America/Bogota') <= CAST(:hasta AS DATE)`,
        { hasta: filters.hasta.trim() },
      );
    }
  }

  private aplicarFiltrosComunes(qb: ReturnType<Repository<ActividadEntity>['createQueryBuilder']>, filters?: ListFilters): void {
    if (filters?.status) qb.andWhere('a.status = :status', { status: filters.status });
    if (filters?.barrio) qb.andWhere('a.barrio = :barrio', { barrio: filters.barrio });
    if (filters?.gestor) qb.andWhere('a.createdByUserId = :gestor', { gestor: filters.gestor });
    if (filters?.isNightShift !== undefined) {
      qb.andWhere('a.isNightShift = :isNightShift', { isNightShift: filters.isNightShift });
    }
    this.aplicarFiltrosFecha(qb, filters);
  }

  private async ejecutarPagina(
    qb: ReturnType<Repository<ActividadEntity>['createQueryBuilder']>,
    filters?: ListFilters,
  ): Promise<Pagina> {
    const total = await qb.getCount();
    const limit = filters?.limit;
    const offset = filters?.offset ?? 0;
    if (limit !== undefined) qb.take(limit);
    qb.skip(offset);

    const list = await qb.getMany();
    return { data: list.map((a) => this.toActividad(a)), total };
  }

  private toActividad(entity: ActividadEntity): Actividad {
    const safeToISO = (date: any): string | null => {
      if (!date) return null;
      try {
        if (typeof date === 'string') return date;
        return date.toISOString();
      } catch (e) {
        return null;
      }
    };

    return {
      id: entity.id,
      createdByUserId: entity.createdByUserId,
      createdByNombre: null,
      status: entity.status,
      dateTime: safeToISO(entity.dateTime) || new Date().toISOString(),
      activityType: entity.activityType,
      operativoSubtipo: entity.operativoSubtipo,
      shift: entity.shift,
      isNightShift: entity.isNightShift,
      lat: entity.lat,
      lng: entity.lng,
      barrio: entity.barrio,
      photos: entity.photos || [],
      results: entity.results,
      incautacionLicores: entity.incautacionLicores || 0,
      incautacionArmasBlancas: entity.incautacionArmasBlancas || 0,
      personasTransladadas: entity.personasTransladadas || 0,
      personasSensibilizadas: entity.personasSensibilizadas || 0,
      num_1801: entity.num_1801 ?? null,
      actaOperativo: entity.actaOperativo ?? null,
      actaPdfUrl: entity.actaPdfUrl ?? null,
      entidadResponsable: entity.entidadResponsable ?? null,
      entidadesAcompanantes: entity.entidadesAcompanantes || [],
      isGroupOperativo: entity.isGroupOperativo || false,
      gestoresInvolucradosIds: entity.gestoresInvolucradosIds || [],
      validatorUserId: entity.validatorUserId ?? null,
      validatorName: null,
      validatedAt: safeToISO(entity.validatedAt),
      validationNotes: entity.validationNotes ?? null,
      publishedAt: safeToISO(entity.publishedAt),
      dynamicAnswers: entity.dynamicAnswers ?? null,
      categorySeq: entity.categorySeq ?? undefined,
      createdAt: safeToISO(entity.createdAt) || new Date().toISOString(),
      updatedAt: safeToISO(entity.updatedAt) || new Date().toISOString(),
    };
  }
}
