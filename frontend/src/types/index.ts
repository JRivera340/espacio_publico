import type { OperativoData } from './operativoFields';

// Solo los roles que entran a este modulo. La identidad la emite el hub.
export type Role = 'GESTOR_ESPACIO_PUBLICO' | 'VALIDADOR_ESPACIO_PUBLICO' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  lastname: string;
  email: string;
  role: Role;
}

export type ActividadStatus = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA' | 'PUBLICADA';

// Unico subtipo operativo de este modulo.
export type OperativoSubtipo = 'ESPACIO_PUBLICO_1801';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface Catalogs {
  barrios: string[];
  entidades: string[];
}

// Forma que devuelve la API nueva. Sin operativoCategoria: no existe en este modulo.
export interface Actividad {
  id: string;
  createdByUserId: string;
  createdByNombre?: string;
  status: ActividadStatus;

  dateTime: string;
  activityType: string;
  operativoSubtipo: OperativoSubtipo;

  lat: number;
  lng: number;
  barrio: string;

  photos: string[];

  results: string;
  incautacionLicores: number;
  incautacionArmasBlancas: number;
  personasTransladadas: number;
  personasSensibilizadas: number;

  actaOperativo?: string | null;
  actaPdfUrl?: string | null;

  entidadResponsable: string;
  entidadesAcompanantes: string[];

  isNightShift?: boolean;
  operativoData?: OperativoData;

  validatorUserId?: string | null;
  validatorName?: string | null;
  validatedAt?: string | null;
  validationNotes?: string | null;

  publishedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateActividadDTO {
  dateTime: string;
  activityType: string;
  operativoSubtipo: OperativoSubtipo;
  lat: number;
  lng: number;
  barrio: string;
  photos?: string[];
  results: string;
  incautacionLicores?: number;
  incautacionArmasBlancas?: number;
  personasTransladadas?: number;
  personasSensibilizadas?: number;
  actaOperativo?: string;
  actaPdfUrl?: string;
  entidadResponsable: string;
  entidadesAcompanantes?: string[];
  isNightShift?: boolean;
  operativoData?: OperativoData;
}

export interface ActividadFilters {
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}
