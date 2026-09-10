import * as crypto from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { ProgramacionEstado } from './enums/programacion-estado.enum';
import { ProgramacionItem, ProgramacionRepository, Pagina } from './programacion.repository';
import { CreateProgramacionInput, UpdateProgramacionInput, ListFilters } from './programacion.types';

export class InMemoryProgramacionRepository implements ProgramacionRepository {
  protected readonly filas: ProgramacionItem[] = [];

  async createMany(creadoPorUserId: string, items: CreateProgramacionInput[]): Promise<ProgramacionItem[]> {
    const ahora = new Date().toISOString();
    const creadas = items.map((data): ProgramacionItem => ({
      id: crypto.randomUUID(),
      fecha: new Date(data.fecha).toISOString(),
      barrio: data.barrio ?? null,
      descripcion: data.descripcion,
      gestorUserIds: data.gestorUserIds ?? [],
      creadoPorUserId,
      estado: data.estado ?? ProgramacionEstado.PENDIENTE,
      actividadId: data.actividadId ?? null,
      createdAt: ahora,
      updatedAt: ahora,
    }));
    this.filas.push(...creadas);
    return creadas.map((c) => this.clonar(c));
  }

  async findById(id: string): Promise<ProgramacionItem> {
    return this.clonar(this.buscar(id));
  }

  async patch(id: string, dto: UpdateProgramacionInput): Promise<ProgramacionItem> {
    const fila = this.buscar(id);
    // Mismo criterio que el repositorio typeorm: castear la fecha antes de
    // mezclar en vez de asignarla directo.
    const { fecha, ...resto } = dto;
    Object.assign(fila, resto);
    if (fecha) fila.fecha = new Date(fecha).toISOString();
    fila.updatedAt = new Date().toISOString();
    return this.clonar(fila);
  }

  async listMine(gestorUserId: string, filters?: ListFilters): Promise<Pagina> {
    const propias = this.filas.filter((f) => f.gestorUserIds.includes(gestorUserId));
    return this.paginar(this.aplicarFiltros(propias, filters), filters);
  }

  async listAll(filters?: ListFilters): Promise<Pagina> {
    return this.paginar(this.aplicarFiltros(this.filas, filters), filters);
  }

  async delete(id: string): Promise<void> {
    const idx = this.filas.findIndex((f) => f.id === id);
    if (idx === -1) throw new NotFoundException('Programacion no encontrada');
    this.filas.splice(idx, 1);
  }

  async completarCoincidentes(gestorIds: string[], barrio: string, fechaISO: string, actividadId: string): Promise<void> {
    const diaObjetivo = soloFechaBogota(fechaISO);
    for (const fila of this.filas) {
      if (fila.estado !== ProgramacionEstado.PENDIENTE) continue;
      if (fila.barrio !== barrio) continue;
      if (soloFechaBogota(fila.fecha) !== diaObjetivo) continue;
      if (!fila.gestorUserIds.some((id) => gestorIds.includes(id))) continue;
      fila.estado = ProgramacionEstado.CUMPLIDA;
      fila.actividadId = actividadId;
      fila.updatedAt = new Date().toISOString();
    }
  }

  private buscar(id: string): ProgramacionItem {
    const fila = this.filas.find((f) => f.id === id);
    if (!fila) throw new NotFoundException('Programacion no encontrada');
    return fila;
  }

  private aplicarFiltros(filas: ProgramacionItem[], filters?: ListFilters): ProgramacionItem[] {
    let resultado = filas;
    if (filters?.estado) resultado = resultado.filter((f) => f.estado === filters.estado);
    if (filters?.gestor) resultado = resultado.filter((f) => f.gestorUserIds.includes(filters.gestor!));
    if (filters?.desde && filters.desde.trim()) {
      resultado = resultado.filter((f) => f.fecha.slice(0, 10) >= filters.desde!.trim());
    }
    if (filters?.hasta && filters.hasta.trim()) {
      resultado = resultado.filter((f) => f.fecha.slice(0, 10) <= filters.hasta!.trim());
    }
    return resultado;
  }

  private paginar(filas: ProgramacionItem[], filters?: ListFilters): Pagina {
    const total = filas.length;
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit;
    const pagina = limit !== undefined ? filas.slice(offset, offset + limit) : filas.slice(offset);
    return { data: pagina.map((f) => this.clonar(f)), total };
  }

  private clonar(item: ProgramacionItem): ProgramacionItem {
    return { ...item };
  }
}

// Fecha calendario en hora de Bogota, sin la hora - "mismo dia" para el
// autocompletado se decide por esta comparacion, igual criterio que los
// filtros desde/hasta de listAll/listMine en el repositorio typeorm.
function soloFechaBogota(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}
