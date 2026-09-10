import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProgramacionItemEntity } from './entities/programacion-item.entity';
import { ProgramacionEstado } from './enums/programacion-estado.enum';
import { ProgramacionItem, ProgramacionRepository, Pagina } from './programacion.repository';
import { CreateProgramacionInput, UpdateProgramacionInput, ListFilters } from './programacion.types';

@Injectable()
export class TypeOrmProgramacionRepository implements ProgramacionRepository {
  constructor(
    @InjectRepository(ProgramacionItemEntity)
    private readonly repo: Repository<ProgramacionItemEntity>,
  ) {}

  async createMany(creadoPorUserId: string, items: CreateProgramacionInput[]): Promise<ProgramacionItem[]> {
    const entidades = items.map((data) => this.repo.create({
      creadoPorUserId,
      fecha: new Date(data.fecha),
      barrio: data.barrio ?? null,
      descripcion: data.descripcion,
      gestorUserIds: data.gestorUserIds ?? [],
      estado: data.estado ?? ProgramacionEstado.PENDIENTE,
      actividadId: data.actividadId ?? null,
    }));
    const guardadas = await this.repo.save(entidades);
    return guardadas.map((e) => this.toProgramacionItem(e));
  }

  async findById(id: string): Promise<ProgramacionItem> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Programacion no encontrada');
    return this.toProgramacionItem(entity);
  }

  async patch(id: string, dto: UpdateProgramacionInput): Promise<ProgramacionItem> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Programacion no encontrada');

    // El frontend manda la fecha como string ISO. Castear ANTES de mezclar es
    // lo que evita el error `toISOString is not a function` al persistir —
    // mismo patron que ActividadesRepository.patch.
    const { fecha, ...resto } = dto;
    Object.assign(entity, resto);
    if (fecha) entity.fecha = new Date(fecha);

    const saved = await this.repo.save(entity);
    return this.toProgramacionItem(saved);
  }

  async listMine(gestorUserId: string, filters?: ListFilters): Promise<Pagina> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where(':gestorUserId = ANY(p."gestorUserIds")', { gestorUserId });
    this.aplicarFiltrosComunes(qb, filters);
    qb.orderBy('p.fecha', 'ASC');
    return this.ejecutarPagina(qb, filters);
  }

  async listAll(filters?: ListFilters): Promise<Pagina> {
    const qb = this.repo.createQueryBuilder('p');
    this.aplicarFiltrosComunes(qb, filters);
    qb.orderBy('p.fecha', 'ASC');
    return this.ejecutarPagina(qb, filters);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Programacion no encontrada');
    await this.repo.remove(entity);
  }

  async completarCoincidentes(gestorIds: string[], barrio: string, fechaISO: string, actividadId: string): Promise<void> {
    if (gestorIds.length === 0) return;
    await this.repo
      .createQueryBuilder()
      .update(ProgramacionItemEntity)
      .set({ estado: ProgramacionEstado.CUMPLIDA, actividadId })
      .where('estado = :pendiente', { pendiente: ProgramacionEstado.PENDIENTE })
      .andWhere('barrio = :barrio', { barrio })
      .andWhere(
        `DATE(fecha AT TIME ZONE 'America/Bogota') = DATE(CAST(:fecha AS timestamptz) AT TIME ZONE 'America/Bogota')`,
        { fecha: fechaISO },
      )
      .andWhere('"gestorUserIds" && CAST(:gestorIds AS uuid[])', { gestorIds })
      .execute();
  }

  private aplicarFiltrosComunes(qb: ReturnType<Repository<ProgramacionItemEntity>['createQueryBuilder']>, filters?: ListFilters): void {
    if (filters?.estado) qb.andWhere('p.estado = :estado', { estado: filters.estado });
    if (filters?.gestor) qb.andWhere(':gestor = ANY(p."gestorUserIds")', { gestor: filters.gestor });
    if (filters?.desde && filters.desde.trim()) {
      qb.andWhere(`DATE(p.fecha AT TIME ZONE 'America/Bogota') >= CAST(:desde AS DATE)`, { desde: filters.desde.trim() });
    }
    if (filters?.hasta && filters.hasta.trim()) {
      qb.andWhere(`DATE(p.fecha AT TIME ZONE 'America/Bogota') <= CAST(:hasta AS DATE)`, { hasta: filters.hasta.trim() });
    }
  }

  private async ejecutarPagina(
    qb: ReturnType<Repository<ProgramacionItemEntity>['createQueryBuilder']>,
    filters?: ListFilters,
  ): Promise<Pagina> {
    const total = await qb.getCount();
    const limit = filters?.limit;
    const offset = filters?.offset ?? 0;
    if (limit !== undefined) qb.take(limit);
    qb.skip(offset);

    const list = await qb.getMany();
    return { data: list.map((p) => this.toProgramacionItem(p)), total };
  }

  private toProgramacionItem(entity: ProgramacionItemEntity): ProgramacionItem {
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
      fecha: safeToISO(entity.fecha) || new Date().toISOString(),
      barrio: entity.barrio ?? null,
      descripcion: entity.descripcion,
      gestorUserIds: entity.gestorUserIds ?? [],
      creadoPorUserId: entity.creadoPorUserId,
      estado: entity.estado,
      actividadId: entity.actividadId ?? null,
      createdAt: safeToISO(entity.createdAt) || new Date().toISOString(),
      updatedAt: safeToISO(entity.updatedAt) || new Date().toISOString(),
    };
  }
}
