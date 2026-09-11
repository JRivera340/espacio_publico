import { ActividadStatus } from './enums/actividad-status.enum';
import { OperativoSubtipo } from './enums/operativo-subtipo.enum';
import { Turno } from './enums/turno.enum';
import { CreateActividadInput, UpdateActividadInput, ListFilters } from './actividades.types';

// Forma de salida. Las fechas viajan como string ISO y no como Date: es lo que
// consume el frontend, y evita que un Date crudo se serialice distinto segun
// el transporte.
export type Actividad = {
  id: string;
  createdByUserId: string;
  createdByNombre?: string | null;
  status: ActividadStatus;
  dateTime: string;
  activityType: string;
  operativoSubtipo: OperativoSubtipo;
  shift: Turno;
  isNightShift?: boolean;
  lat: number;
  lng: number;
  barrio: string;
  photos: string[];
  publishedPhotos: string[];
  results: string;
  incautacionLicores: number;
  incautacionArmasBlancas: number;
  personasTransladadas: number;
  personasSensibilizadas: number;
  num_1801?: number | null;
  actaOperativo?: string | null;
  actaPdfUrl?: string | null;
  entidadResponsable?: string | null;
  entidadesAcompanantes: string[];
  isGroupOperativo: boolean;
  gestoresInvolucradosIds: string[];
  validatorUserId?: string | null;
  validatorName?: string | null;
  validatedAt?: string | null;
  validationNotes?: string | null;
  publishedAt?: string | null;
  dynamicAnswers?: Record<string, any> | null;
  categorySeq?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Pagina = { data: Actividad[]; total: number };

export interface GestorStats {
  id: string;
  totalActividades: number;
  porEstado: Record<string, number>;
}

export interface BarrioStats {
  barrio: string;
  totalActividades: number;
  ultimaActividad: string | null;
}

export interface ActividadesRepository {
  create(createdByUserId: string, data: CreateActividadInput): Promise<Actividad>;
  findById(id: string): Promise<Actividad>;
  patch(id: string, userId: string, role: string, dto: UpdateActividadInput): Promise<Actividad>;
  listMine(userId: string, filters?: ListFilters): Promise<Pagina>;
  listPending(filters?: ListFilters): Promise<Pagina>;
  listAll(filters: ListFilters): Promise<Pagina>;
  listAllIds(filters: ListFilters): Promise<string[]>;
  listValidatedByUser(validatorUserId: string, filters?: ListFilters): Promise<Pagina>;
  listPublicadas(filters?: ListFilters): Promise<Pagina>;
  send(id: string, userId: string, role?: string): Promise<Actividad>;
  approve(id: string, validatorUserId: string, notes?: string, selectedPhotos?: string[]): Promise<Actividad>;
  reject(id: string, validatorUserId: string, notes?: string): Promise<Actividad>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
  getMyStats(userId: string, filters?: ListFilters): Promise<{ enviada: number; aprobada: number; rechazada: number }>;
  getGestoresStats(): Promise<GestorStats[]>;
  getBarriosStats(filters?: ListFilters): Promise<{ cubiertas: BarrioStats[]; descuidadas: string[] }>;
}
