import { TypeOrmActividadesRepository } from './actividades.repository.typeorm';
import { ActividadEntity } from './entities/actividad.entity';
import { ActividadStatus } from './enums/actividad-status.enum';
import { OperativoSubtipo } from './enums/operativo-subtipo.enum';
import { Turno } from './enums/turno.enum';

function entidad(over: Partial<ActividadEntity> = {}): ActividadEntity {
  return {
    id: 'abc',
    createdByUserId: 'gestor-1',
    status: ActividadStatus.BORRADOR,
    dateTime: new Date('2026-08-20T14:00:00.000Z'),
    activityType: 'ESPACIO_PUBLICO - 1801',
    operativoSubtipo: OperativoSubtipo.ESPACIO_PUBLICO_1801,
    shift: Turno.DIURNO,
    lat: 4.6,
    lng: -74.07,
    barrio: 'LA MACARENA',
    photos: [],
    results: 'texto',
    incautacionLicores: 0,
    incautacionArmasBlancas: 0,
    personasTransladadas: 0,
    personasSensibilizadas: 0,
    entidadesAcompanantes: [],
    isGroupOperativo: false,
    gestoresInvolucradosIds: [],
    createdAt: new Date('2026-08-20T13:00:00.000Z'),
    updatedAt: new Date('2026-08-20T13:00:00.000Z'),
    ...over,
  } as ActividadEntity;
}

describe('TypeOrmActividadesRepository.toActividad', () => {
  const repo = new TypeOrmActividadesRepository({} as any);
  const mapear = (e: ActividadEntity) => (repo as any).toActividad(e);

  it('convierte los Date a string ISO', () => {
    expect(mapear(entidad()).dateTime).toBe('2026-08-20T14:00:00.000Z');
  });

  it('deja pasar una fecha que ya viene como string del driver', () => {
    const e = entidad({ dateTime: '2026-08-20T14:00:00.000Z' as any });
    expect(mapear(e).dateTime).toBe('2026-08-20T14:00:00.000Z');
  });

  it('devuelve null en las fechas opcionales ausentes', () => {
    const a = mapear(entidad());
    expect(a.validatedAt).toBeNull();
    expect(a.publishedAt).toBeNull();
  });

  it('normaliza los arrays nulos a vacios', () => {
    const a = mapear(entidad({ photos: null as any, gestoresInvolucradosIds: null as any }));
    expect(a.photos).toEqual([]);
    expect(a.gestoresInvolucradosIds).toEqual([]);
  });

  it('no resuelve nombres: este modulo no tiene tabla de usuarios', () => {
    const a = mapear(entidad());
    expect(a.createdByNombre).toBeNull();
    expect(a.validatorName).toBeNull();
  });
});
