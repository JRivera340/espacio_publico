import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { ACTIVIDADES_REPOSITORY } from './actividades.tokens';
import type { ActividadesRepository } from './actividades.repository';
import { CreateActividadInput, UpdateActividadInput, ListFilters } from './actividades.types';
import { Role } from '../common/enums/role.enum';
import { ProgramacionService } from '../programacion/programacion.service';
import { ReporteService } from '../reporte/reporte.service';

@Injectable()
export class ActividadesService {
  private readonly logger = new Logger(ActividadesService.name);

  constructor(
    @Inject(ACTIVIDADES_REPOSITORY)
    private readonly repo: ActividadesRepository,
    private readonly programacionService: ProgramacionService,
    private readonly reporteService: ReporteService,
  ) {}

  crear(createdByUserId: string, dto: CreateActividadInput) {
    return this.repo.create(createdByUserId, dto);
  }

  // Un gestor solo puede ver el detalle de sus propias actividades, o de
  // aquellas donde figura como co-involucrado en un operativo en grupo
  // (gestoresInvolucradosIds). Validador y ADMIN ven cualquiera; el visor
  // publico llama sin userId/role y tampoco queda restringido por esto.
  async obtener(id: string, userId?: string, role?: string) {
    const actividad = await this.repo.findById(id);
    if (role === Role.GESTOR_ESPACIO_PUBLICO) {
      const esDueno = actividad.createdByUserId === userId;
      const esInvolucrado = (actividad.gestoresInvolucradosIds ?? []).includes(userId ?? '');
      if (!esDueno && !esInvolucrado) {
        throw new ForbiddenException('No tienes acceso a esta actividad');
      }
    }
    return actividad;
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

  // Igual que obtener(): un gestor solo recibe los ids de sus propias
  // actividades. Validador y ADMIN reciben los de todas.
  listarIds(filters: ListFilters, userId?: string, role?: string) {
    if (role === Role.GESTOR_ESPACIO_PUBLICO) {
      return this.repo.listAllIds({ ...filters, gestor: userId });
    }
    return this.repo.listAllIds(filters);
  }

  listarMisValidaciones(validatorUserId: string, filters?: ListFilters) {
    return this.repo.listValidatedByUser(validatorUserId, filters);
  }

  listarPublicadas(filters?: ListFilters) {
    return this.repo.listPublicadas(filters);
  }

  // El envio en si nunca se bloquea por el autocompletado: si la busqueda de
  // tareas coincidentes falla, el gestor ya envio su actividad y eso no se
  // deshace por un problema aparte. Se registra el error pero no se relanza.
  async enviar(id: string, userId: string, role?: string) {
    const enviada = await this.repo.send(id, userId, role);
    const gestorIds = [enviada.createdByUserId, ...(enviada.gestoresInvolucradosIds ?? [])];
    try {
      await this.programacionService.completarCoincidentes(gestorIds, enviada.barrio, enviada.dateTime, enviada.id);
    } catch (err) {
      this.logger.error(`No se pudo autocompletar la programacion: ${(err as Error).message}`, (err as Error).stack);
    }
    return enviada;
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

  // El propio gestor pide su documento sobre sus propios datos - nunca el id
  // de otro gestor por parametro, mismo criterio que listarMias.
  async generarPazYSalvo(userId: string, nombreGestor: string, desde: string, hasta: string): Promise<Buffer> {
    const [actividades, programacion] = await Promise.all([
      this.repo.listMine(userId, { desde, hasta }),
      this.programacionService.listarMias(userId, { desde, hasta }),
    ]);
    return this.reporteService.generarPazYSalvoPdf(actividades.data, programacion.data, { nombreGestor, desde, hasta });
  }
}
