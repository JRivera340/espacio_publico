import { ProgramacionEstado } from './enums/programacion-estado.enum';

export type CreateProgramacionInput = {
  fecha: string;
  barrio?: string | null;
  descripcion: string;
  gestorUserIds?: string[];
  estado?: ProgramacionEstado;
  actividadId?: string | null;
};

export type UpdateProgramacionInput = Partial<CreateProgramacionInput>;

export type ListFilters = {
  desde?: string;
  hasta?: string;
  gestor?: string;
  estado?: string;
  limit?: number;
  offset?: number;
};
