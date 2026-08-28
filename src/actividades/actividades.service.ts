import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ACTIVIDADES_REPOSITORY } from './actividades.tokens';
import type { ActividadesRepository } from './actividades.repository';
import { CreateActividadInput, UpdateActividadInput, ListFilters } from './actividades.types';

@Injectable()
export class ActividadesService {
  constructor(
    @Inject(ACTIVIDADES_REPOSITORY)
    private readonly repo: ActividadesRepository,
  ) {}

  crear(createdByUserId: string, dto: CreateActividadInput) {
    return this.repo.create(createdByUserId, dto);
  }

  obtener(id: string) {
    return this.repo.findById(id);
  }

  editar(id: string, userId: string, role: string, dto: UpdateActividadInput) {
    return this.repo.patch(id, userId, role, dto);
  }

  listarMias(userId: string, filters?: ListFilters) {
    return this.repo.listMine(userId, filters);
  }

  listarPendientes(filters?: ListFilters) {
    return this.repo.listPending(filters);
  }

  listarTodas(filters: ListFilters) {
    return this.repo.listAll(filters);
  }

  listarIds(filters: ListFilters) {
    return this.repo.listAllIds(filters);
  }

  listarMisValidaciones(validatorUserId: string, filters?: ListFilters) {
    return this.repo.listValidatedByUser(validatorUserId, filters);
  }

  listarPublicadas(filters?: ListFilters) {
    return this.repo.listPublicadas(filters);
  }

  enviar(id: string, userId: string, role?: string) {
    return this.repo.send(id, userId, role);
  }

  aprobar(id: string, validatorUserId: string, notes?: string, selectedPhotos?: string[]) {
    return this.repo.approve(id, validatorUserId, notes, selectedPhotos);
  }

  rechazar(id: string, validatorUserId: string, notes?: string) {
    return this.repo.reject(id, validatorUserId, notes);
  }

  borrar(id: string) {
    return this.repo.delete(id);
  }

  async borrarVarias(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No se recibio ninguna actividad para borrar');
    }
    return this.repo.bulkDelete(ids);
  }

  misEstadisticas(userId: string, filters?: ListFilters) {
    return this.repo.getMyStats(userId, filters);
  }

  estadisticasGestores() {
    return this.repo.getGestoresStats();
  }

  estadisticasBarrios(filters?: ListFilters) {
    return this.repo.getBarriosStats(filters);
  }
}
