import { Inject, Injectable } from '@nestjs/common';
import { PROGRAMACION_REPOSITORY } from './programacion.tokens';
import type { ProgramacionRepository } from './programacion.repository';
import { CreateProgramacionInput, UpdateProgramacionInput, ListFilters } from './programacion.types';

@Injectable()
export class ProgramacionService {
  constructor(
    @Inject(PROGRAMACION_REPOSITORY)
    private readonly repo: ProgramacionRepository,
  ) {}

  crear(creadoPorUserId: string, items: CreateProgramacionInput[]) {
    return this.repo.createMany(creadoPorUserId, items);
  }

  // El gestor autenticado solo puede ver lo que se le asigno a el. El id
  // sale siempre del token, nunca de un parametro de la request — mismo
  // criterio que ActividadesService.listarMias / GET /actividades/mine.
  listarMias(gestorUserId: string, filters?: ListFilters) {
    return this.repo.listMine(gestorUserId, filters);
  }

  listarTodas(filters?: ListFilters) {
    return this.repo.listAll(filters);
  }

  editar(id: string, dto: UpdateProgramacionInput) {
    return this.repo.patch(id, dto);
  }

  borrar(id: string) {
    return this.repo.delete(id);
  }
}
