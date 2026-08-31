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

export type Turno = 'DIURNO' | 'NOCTURNO';

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

  entidadResponsable?: string | null;
  entidadesAcompanantes: string[];

  isNightShift?: boolean;
  shift?: Turno;
  isGroupOperativo?: boolean;
  gestoresInvolucradosIds?: string[];

  // Cifra estructurada propia de los operativos 1801.
  num_1801?: number | null;

  // Respuestas del formulario dinamico de encuestas, indexadas por el id de
  // cada pregunta. El backend lo guarda como JSONB libre bajo este nombre: el
  // DTO corre con forbidNonWhitelisted, asi que mandarlo con cualquier otro
  // nombre (por ejemplo operativoData, como se llamaba en el hub) devuelve 400.
  dynamicAnswers?: Record<string, any> | null;

  validatorUserId?: string | null;
  validatorName?: string | null;
  validatedAt?: string | null;
  validationNotes?: string | null;

  publishedAt?: string | null;

  // Secuencia numerica por la que se arma el codigo visible (ver utils/activityCode.ts)
  categorySeq?: number | null;

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
  shift?: Turno;
  isGroupOperativo?: boolean;
  gestoresInvolucradosIds?: string[];
  num_1801?: number;
  dynamicAnswers?: Record<string, any>;
}

export interface ActividadFilters {
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}
