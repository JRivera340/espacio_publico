// Funciones puras de transformacion usadas por migrate-from-hub.ts, separadas
// para poder testearlas sin base de datos ni red (mismo enfoque que el
// script hermano de ambiental: sin spec con conexion real, endurecido con
// dry-runs, pero la logica de mapeo si se cubre con tests unitarios).
import { ActividadStatus } from '../src/actividades/enums/actividad-status.enum';
import { OperativoSubtipo } from '../src/actividades/enums/operativo-subtipo.enum';
import { Turno } from '../src/actividades/enums/turno.enum';

// isNightShift NO se copia del valor crudo del hub: el hub tiene filas
// desalineadas donde "shift" y "isNightShift" no coinciden entre si. "shift"
// es la fuente de verdad, asi que isNightShift se DERIVA de shift en vez de
// migrarse tal cual.
export function derivarIsNightShift(shift: string): boolean {
  return shift === Turno.NOCTURNO;
}

// Misma regla de backfill que la migracion 1788600000000-ActividadesPublishedPhotos
// ya aplico sobre las filas existentes de esta base: lo ya considerado publico
// (APROBADA por datos historicos del hub, PUBLICADA por el flujo actual) con
// al menos una foto arranca con publishedPhotos igual a photos. El resto
// arranca vacio.
export function derivarPublishedPhotos(status: string, photos: string[]): string[] {
  const esPublicable = status === ActividadStatus.APROBADA || status === ActividadStatus.PUBLICADA;
  if (esPublicable && photos.length > 0) {
    return photos;
  }
  return [];
}

export type HubActivityRow = {
  id: string;
  createdByUserId: string;
  status: string;
  dateTime: Date;
  activityType: string;
  shift: string;
  lat: number;
  lng: number;
  barrio: string;
  photos: string[] | null;
  results: string;
  incautacionLicores: number;
  incautacionArmasBlancas: number;
  personasTransladadas: number;
  personasSensibilizadas: number;
  num_1801: number | null;
  actaOperativo: string | null;
  actaPdfUrl: string | null;
  entidadResponsable: string | null;
  entidadesAcompanantes: string[] | null;
  isGroupOperativo: boolean;
  validatorUserId: string | null;
  validatedAt: Date | null;
  validationNotes: string | null;
  publishedAt: Date | null;
  dynamicAnswers: Record<string, any> | null;
  categorySeq: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Mapeo de una fila del hub (tabla activities, operativoCategoria =
// ESPACIO_PUBLICO) mas sus gestores involucrados (de activity_gestores) al
// shape que espera ActividadEntity de este modulo. No remapea ningun id de
// usuario (createdByUserId, validatorUserId, gestoresInvolucradosIds):
// mismo hub, misma identidad emitida por JWT, los uuid ya son validos aca.
export function mapHubRowToActividad(row: HubActivityRow, gestoresInvolucradosIds: string[]) {
  const photos = row.photos || [];
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    status: row.status,
    dateTime: row.dateTime,
    activityType: row.activityType,
    // Unico subtipo que usa esta area, fijo aca sin importar lo que traiga
    // el hub.
    operativoSubtipo: OperativoSubtipo.ESPACIO_PUBLICO_1801,
    shift: row.shift,
    isNightShift: derivarIsNightShift(row.shift),
    lat: row.lat,
    lng: row.lng,
    barrio: row.barrio,
    photos,
    publishedPhotos: derivarPublishedPhotos(row.status, photos),
    results: row.results,
    incautacionLicores: row.incautacionLicores,
    incautacionArmasBlancas: row.incautacionArmasBlancas,
    personasTransladadas: row.personasTransladadas,
    personasSensibilizadas: row.personasSensibilizadas,
    num_1801: row.num_1801,
    actaOperativo: row.actaOperativo,
    actaPdfUrl: row.actaPdfUrl,
    entidadResponsable: row.entidadResponsable,
    entidadesAcompanantes: row.entidadesAcompanantes || [],
    isGroupOperativo: row.isGroupOperativo,
    gestoresInvolucradosIds: gestoresInvolucradosIds || [],
    validatorUserId: row.validatorUserId,
    validatedAt: row.validatedAt,
    validationNotes: row.validationNotes,
    publishedAt: row.publishedAt,
    dynamicAnswers: row.dynamicAnswers,
    categorySeq: row.categorySeq,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type ActividadUpsertPayload = ReturnType<typeof mapHubRowToActividad>;

// Usado SOLO para filas que ya existen en destino (reconciliacion, no primer
// insert): quita publishedPhotos del payload para que TypeORM.upsert() no lo
// incluya en el DO UPDATE SET y asi no pise una curaduria manual que un
// validador ya haya hecho en el modulo nuevo. Ver comentario de cabecera en
// migrate-from-hub.ts para el porque completo.
export function omitirPublishedPhotosParaReconciliacion(
  actividad: ActividadUpsertPayload,
): Omit<ActividadUpsertPayload, 'publishedPhotos'> {
  const { publishedPhotos: _publishedPhotos, ...resto } = actividad;
  return resto;
}
