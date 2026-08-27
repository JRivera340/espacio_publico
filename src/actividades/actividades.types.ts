import { ActividadStatus } from './enums/actividad-status.enum';
import { OperativoSubtipo } from './enums/operativo-subtipo.enum';
import { Turno } from './enums/turno.enum';

export type CreateActividadInput = {
  status?: ActividadStatus;
  dateTime: string;
  activityType: string;
  operativoSubtipo?: OperativoSubtipo;
  shift?: Turno;
  isNightShift?: boolean;
  lat: number;
  lng: number;
  barrio: string;
  photos?: string[];
  results: string;
  incautacionLicores?: number;
  incautacionArmasBlancas?: number;
  personasTransladadas?: number;
  personasSensibilizadas?: number;
  num_1801?: number;
  actaOperativo?: string;
  actaPdfUrl?: string;
  entidadResponsable?: string;
  entidadesAcompanantes?: string[];
  isGroupOperativo?: boolean;
  gestoresInvolucradosIds?: string[];
  dynamicAnswers?: Record<string, any>;
};

export type UpdateActividadInput = Partial<CreateActividadInput> & {
  createdByUserId?: string;
};

export type ListFilters = {
  desde?: string;
  hasta?: string;
  barrio?: string;
  gestor?: string;
  status?: string;
  isNightShift?: boolean;
  limit?: number;
  offset?: number;
};
