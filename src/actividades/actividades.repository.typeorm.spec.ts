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
    publishedPhotos: [],
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
    const a = mapear(entidad({ photos: null as any, publishedPhotos: null as any, gestoresInvolucradosIds: null as any }));
    expect(a.photos).toEqual([]);
    expect(a.publishedPhotos).toEqual([]);
    expect(a.gestoresInvolucradosIds).toEqual([]);
  });

  it('no resuelve nombres: este modulo no tiene tabla de usuarios', () => {
    const a = mapear(entidad());
    expect(a.createdByNombre).toBeNull();
    expect(a.validatorName).toBeNull();
  });
});

// Stub de QueryBuilder que registra las clausulas `andWhere` en vez de tocar
// una base real. Sirve para confirmar que getMyStats/getBarriosStats aplican
// el filtro de fecha, que es justo lo que la version en memoria no hacia.
function crearQueryBuilderStub(resultado: { count?: number; rawMany?: any[] }) {
  const clausulas: string[] = [];
  const qb: any = {
    where: () => qb,
    andWhere: (sql: string) => {
      clausulas.push(sql);
      return qb;
    },
    select: () => qb,
    addSelect: () => qb,
    groupBy: () => qb,
    addGroupBy: () => qb,
    getCount: async () => resultado.count ?? 0,
    getRawMany: async () => resultado.rawMany ?? [],
  };
  return { qb, clausulas };
}

describe('TypeOrmActividadesRepository — filtro de fecha en estadisticas', () => {
  it('getMyStats aplica desde/hasta a las tres consultas de conteo', async () => {
    const { qb, clausulas } = crearQueryBuilderStub({ count: 1 });
    const repoFake: any = { createQueryBuilder: () => qb };
    const repo = new TypeOrmActividadesRepository(repoFake);

    await repo.getMyStats('gestor-1', { desde: '2026-08-20', hasta: '2026-08-25' });

    const textoClausulas = clausulas.join(' | ');
    expect(textoClausulas).toContain(':desde');
    expect(textoClausulas).toContain(':hasta');
  });

  it('getBarriosStats aplica desde/hasta a la consulta agregada', async () => {
    const { qb, clausulas } = crearQueryBuilderStub({ rawMany: [] });
    const repoFake: any = { createQueryBuilder: () => qb };
    const repo = new TypeOrmActividadesRepository(repoFake);

    await repo.getBarriosStats({ desde: '2026-08-20' });

    expect(clausulas.join(' | ')).toContain(':desde');
  });
});
