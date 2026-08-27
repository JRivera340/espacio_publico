import { NotFoundException } from '@nestjs/common';
import { InMemoryActividadesRepository } from './actividades.repository.memory';
import { ActividadStatus } from './enums/actividad-status.enum';
import { CreateActividadInput } from './actividades.types';

const GESTOR = '00000000-0000-0000-0000-000000000001';

function entrada(over: Partial<CreateActividadInput> = {}): CreateActividadInput {
  return {
    dateTime: '2026-08-20T14:00:00.000Z',
    activityType: 'ESPACIO_PUBLICO - 1801',
    lat: 4.6,
    lng: -74.07,
    barrio: 'LA MACARENA',
    results: 'Recuperacion de anden sobre la carrera quinta',
    ...over,
  };
}

describe('InMemoryActividadesRepository', () => {
  let repo: InMemoryActividadesRepository;

  beforeEach(() => {
    repo = new InMemoryActividadesRepository();
  });

  it('crea la actividad en BORRADOR y devuelve fechas como string ISO', async () => {
    const a = await repo.create(GESTOR, entrada());
    expect(a.status).toBe(ActividadStatus.BORRADOR);
    expect(a.createdByUserId).toBe(GESTOR);
    expect(a.dateTime).toBe('2026-08-20T14:00:00.000Z');
    expect(a.photos).toEqual([]);
    expect(a.gestoresInvolucradosIds).toEqual([]);
  });

  it('asigna numeracion correlativa a cada actividad', async () => {
    const primera = await repo.create(GESTOR, entrada());
    const segunda = await repo.create(GESTOR, entrada());
    expect(primera.categorySeq).toBe(1);
    expect(segunda.categorySeq).toBe(2);
  });

  it('lanza NotFoundException al buscar un id que no existe', async () => {
    await expect(repo.findById('no-existe')).rejects.toThrow(NotFoundException);
  });

  it('listMine devuelve solo las del gestor que pregunta', async () => {
    await repo.create(GESTOR, entrada());
    await repo.create('00000000-0000-0000-0000-000000000009', entrada());
    const pagina = await repo.listMine(GESTOR);
    expect(pagina.total).toBe(1);
    expect(pagina.data[0].createdByUserId).toBe(GESTOR);
  });
});
