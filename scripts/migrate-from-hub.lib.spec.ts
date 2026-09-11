import { ActividadStatus } from '../src/actividades/enums/actividad-status.enum';
import { OperativoSubtipo } from '../src/actividades/enums/operativo-subtipo.enum';
import { Turno } from '../src/actividades/enums/turno.enum';
import {
  derivarIsNightShift,
  derivarPublishedPhotos,
  HubActivityRow,
  mapHubRowToActividad,
  omitirPublishedPhotosParaReconciliacion,
} from './migrate-from-hub.lib';

function filaBase(overrides: Partial<HubActivityRow> = {}): HubActivityRow {
  return {
    id: 'a1',
    createdByUserId: 'u1',
    status: ActividadStatus.BORRADOR,
    dateTime: new Date('2026-01-01T00:00:00Z'),
    activityType: 'operativo',
    shift: Turno.DIURNO,
    lat: 1,
    lng: 2,
    barrio: 'Centro',
    photos: [],
    results: 'resultado',
    incautacionLicores: 0,
    incautacionArmasBlancas: 0,
    personasTransladadas: 0,
    personasSensibilizadas: 0,
    num_1801: null,
    actaOperativo: null,
    actaPdfUrl: null,
    entidadResponsable: null,
    entidadesAcompanantes: [],
    isGroupOperativo: false,
    validatorUserId: null,
    validatedAt: null,
    validationNotes: null,
    publishedAt: null,
    dynamicAnswers: null,
    categorySeq: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('derivarIsNightShift', () => {
  it('DIURNO produce false', () => {
    expect(derivarIsNightShift(Turno.DIURNO)).toBe(false);
  });

  it('NOCTURNO produce true', () => {
    expect(derivarIsNightShift(Turno.NOCTURNO)).toBe(true);
  });
});

describe('derivarPublishedPhotos', () => {
  it('APROBADA con fotos publica las fotos', () => {
    expect(derivarPublishedPhotos(ActividadStatus.APROBADA, ['a.jpg'])).toEqual(['a.jpg']);
  });

  it('PUBLICADA con fotos publica las fotos', () => {
    expect(derivarPublishedPhotos(ActividadStatus.PUBLICADA, ['a.jpg', 'b.jpg'])).toEqual(['a.jpg', 'b.jpg']);
  });

  it('APROBADA sin fotos queda vacio', () => {
    expect(derivarPublishedPhotos(ActividadStatus.APROBADA, [])).toEqual([]);
  });

  it('BORRADOR con fotos no publica nada', () => {
    expect(derivarPublishedPhotos(ActividadStatus.BORRADOR, ['a.jpg'])).toEqual([]);
  });

  it('RECHAZADA con fotos no publica nada', () => {
    expect(derivarPublishedPhotos(ActividadStatus.RECHAZADA, ['a.jpg'])).toEqual([]);
  });
});

describe('mapHubRowToActividad', () => {
  it('fija operativoSubtipo a ESPACIO_PUBLICO_1801 sin importar el origen', () => {
    const fila = filaBase();
    const actividad = mapHubRowToActividad(fila, []);
    expect(actividad.operativoSubtipo).toBe(OperativoSubtipo.ESPACIO_PUBLICO_1801);
  });

  it('deriva isNightShift de shift en vez de copiar un campo separado', () => {
    const fila = filaBase({ shift: Turno.NOCTURNO });
    const actividad = mapHubRowToActividad(fila, []);
    expect(actividad.shift).toBe(Turno.NOCTURNO);
    expect(actividad.isNightShift).toBe(true);
  });

  it('agrupa gestoresInvolucradosIds recibidos, default vacio', () => {
    const fila = filaBase();
    expect(mapHubRowToActividad(fila, []).gestoresInvolucradosIds).toEqual([]);
    expect(mapHubRowToActividad(fila, ['g1', 'g2']).gestoresInvolucradosIds).toEqual(['g1', 'g2']);
  });

  it('no remapea los ids de usuario del hub', () => {
    const fila = filaBase({ createdByUserId: 'u-hub-1', validatorUserId: 'u-hub-2' });
    const actividad = mapHubRowToActividad(fila, ['u-hub-3']);
    expect(actividad.createdByUserId).toBe('u-hub-1');
    expect(actividad.validatorUserId).toBe('u-hub-2');
    expect(actividad.gestoresInvolucradosIds).toEqual(['u-hub-3']);
  });

  it('publishedPhotos sigue la regla de backfill segun status y fotos', () => {
    const publicada = mapHubRowToActividad(filaBase({ status: ActividadStatus.PUBLICADA, photos: ['x.jpg'] }), []);
    expect(publicada.publishedPhotos).toEqual(['x.jpg']);

    const borrador = mapHubRowToActividad(filaBase({ status: ActividadStatus.BORRADOR, photos: ['x.jpg'] }), []);
    expect(borrador.publishedPhotos).toEqual([]);
  });
});

describe('omitirPublishedPhotosParaReconciliacion', () => {
  it('quita publishedPhotos del payload sin tocar el resto de campos', () => {
    const actividad = mapHubRowToActividad(
      filaBase({ status: ActividadStatus.PUBLICADA, photos: ['a.jpg', 'b.jpg'] }),
      ['g1'],
    );
    const payload = omitirPublishedPhotosParaReconciliacion(actividad);

    expect(payload).not.toHaveProperty('publishedPhotos');
    expect((payload as any).photos).toEqual(['a.jpg', 'b.jpg']);
    expect(payload.id).toBe(actividad.id);
    expect(payload.status).toBe(actividad.status);
    expect(payload.gestoresInvolucradosIds).toEqual(['g1']);
  });

  it('no muta el objeto original', () => {
    const actividad = mapHubRowToActividad(
      filaBase({ status: ActividadStatus.APROBADA, photos: ['a.jpg'] }),
      [],
    );
    omitirPublishedPhotosParaReconciliacion(actividad);

    expect(actividad).toHaveProperty('publishedPhotos');
    expect(actividad.publishedPhotos).toEqual(['a.jpg']);
  });
});
