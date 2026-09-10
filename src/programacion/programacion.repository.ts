import { ProgramacionEstado } from './enums/programacion-estado.enum';
import { CreateProgramacionInput, UpdateProgramacionInput, ListFilters } from './programacion.types';

// Forma de salida. Fecha como string ISO, igual que Actividad: es lo que
// consume el frontend y evita que un Date crudo se serialice distinto segun
// el transporte.
export type ProgramacionItem = {
  id: string;
  fecha: string;
  barrio?: string | null;
  descripcion: string;
  gestorUserIds: string[];
  creadoPorUserId: string;
  estado: ProgramacionEstado;
  actividadId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Pagina = { data: ProgramacionItem[]; total: number };

export interface ProgramacionRepository {
  createMany(creadoPorUserId: string, items: CreateProgramacionInput[]): Promise<ProgramacionItem[]>;
  findById(id: string): Promise<ProgramacionItem>;
  patch(id: string, dto: UpdateProgramacionInput): Promise<ProgramacionItem>;
  listMine(gestorUserId: string, filters?: ListFilters): Promise<Pagina>;
  listAll(filters?: ListFilters): Promise<Pagina>;
  delete(id: string): Promise<void>;
  // Marca CUMPLIDA (y guarda actividadId) cada tarea PENDIENTE que coincida
  // en barrio, mismo dia (hora Bogota) y al menos un gestor en comun con
  // gestorIds. No toca tareas CUMPLIDA/CANCELADA ni de otro barrio/dia.
  completarCoincidentes(gestorIds: string[], barrio: string, fechaISO: string, actividadId: string): Promise<void>;
}
