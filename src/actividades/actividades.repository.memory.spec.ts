import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  it('mutar el array devuelto no corrompe la fila guardada', async () => {
    const a = await repo.create(GESTOR, entrada());
    a.photos.push('colada.jpg');
    const releida = await repo.findById(a.id);
    expect(releida.photos).toEqual([]);
  });

  it('mutar el array de entrada despues de crear no corrompe la fila guardada', async () => {
    const fotos = ['original.jpg'];
    const a = await repo.create(GESTOR, entrada({ photos: fotos }));
    fotos.push('agregada-despues.jpg');
    const releida = await repo.findById(a.id);
    expect(releida.photos).toEqual(['original.jpg']);
  });

  describe('flujo de validacion', () => {
    const VALIDADOR = '00000000-0000-0000-0000-000000000002';

    it('send pasa a ENVIADA y limpia la validacion anterior', async () => {
      const a = await repo.create(GESTOR, entrada());
      await repo.reject(a.id, VALIDADOR, 'faltan fotos');
      const enviada = await repo.send(a.id, GESTOR);
      expect(enviada.status).toBe(ActividadStatus.ENVIADA);
      expect(enviada.validationNotes).toBeNull();
      expect(enviada.validatorUserId).toBeNull();
      expect(enviada.validatedAt).toBeNull();
    });

    it('send rechaza a un gestor que no es el dueno', async () => {
      const a = await repo.create(GESTOR, entrada());
      await expect(repo.send(a.id, 'otro-gestor')).rejects.toThrow(ForbiddenException);
    });

    it('send deja pasar a ADMIN aunque no sea el dueno', async () => {
      const a = await repo.create(GESTOR, entrada());
      const enviada = await repo.send(a.id, 'admin-id', 'ADMIN');
      expect(enviada.status).toBe(ActividadStatus.ENVIADA);
    });

    it('send falla si la actividad ya esta publicada', async () => {
      const a = await repo.create(GESTOR, entrada());
      await repo.approve(a.id, VALIDADOR);
      await expect(repo.send(a.id, GESTOR)).rejects.toThrow(BadRequestException);
    });

    it('approve deja la actividad en PUBLICADA, no en APROBADA', async () => {
      const a = await repo.create(GESTOR, entrada());
      await repo.send(a.id, GESTOR);
      const aprobada = await repo.approve(a.id, VALIDADOR, 'todo correcto');
      expect(aprobada.status).toBe(ActividadStatus.PUBLICADA);
      expect(aprobada.validatorUserId).toBe(VALIDADOR);
      expect(aprobada.publishedAt).not.toBeNull();
      expect(aprobada.validationNotes).toBe('todo correcto');
    });

    it('approve reemplaza las fotos cuando el validador selecciona un subconjunto', async () => {
      const a = await repo.create(GESTOR, entrada({ photos: ['uno.jpg', 'dos.jpg', 'tres.jpg'] }));
      const aprobada = await repo.approve(a.id, VALIDADOR, undefined, ['uno.jpg']);
      expect(aprobada.photos).toEqual(['uno.jpg']);
    });

    it('reject deja la actividad en RECHAZADA con la nota y sin publicar', async () => {
      const a = await repo.create(GESTOR, entrada());
      await repo.send(a.id, GESTOR);
      const rechazada = await repo.reject(a.id, VALIDADOR, 'faltan fotos');
      expect(rechazada.status).toBe(ActividadStatus.RECHAZADA);
      expect(rechazada.validationNotes).toBe('faltan fotos');
      expect(rechazada.publishedAt).toBeNull();
    });

    it('listPending devuelve solo las ENVIADA', async () => {
      const enviada = await repo.create(GESTOR, entrada());
      await repo.send(enviada.id, GESTOR);
      await repo.create(GESTOR, entrada());
      const pagina = await repo.listPending();
      expect(pagina.total).toBe(1);
      expect(pagina.data[0].status).toBe(ActividadStatus.ENVIADA);
    });

    it('listPublicadas devuelve solo las PUBLICADA', async () => {
      const a = await repo.create(GESTOR, entrada());
      await repo.approve(a.id, VALIDADOR);
      await repo.create(GESTOR, entrada());
      const pagina = await repo.listPublicadas();
      expect(pagina.total).toBe(1);
    });
  });

  describe('patch', () => {
    const VALIDADOR = '00000000-0000-0000-0000-000000000002';

    it('acepta dateTime como string ISO sin romper al guardar', async () => {
      const a = await repo.create(GESTOR, entrada());
      await repo.reject(a.id, VALIDADOR, 'corregir fecha');
      const parchada = await repo.patch(a.id, GESTOR, 'GESTOR_ESPACIO_PUBLICO', {
        dateTime: '2026-08-21T09:30:00.000Z',
      });
      expect(parchada.dateTime).toBe('2026-08-21T09:30:00.000Z');
    });

    it('un gestor solo puede editar sus actividades rechazadas', async () => {
      const a = await repo.create(GESTOR, entrada());
      await expect(
        repo.patch(a.id, GESTOR, 'GESTOR_ESPACIO_PUBLICO', { results: 'otra cosa' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un validador solo puede editar actividades enviadas', async () => {
      const a = await repo.create(GESTOR, entrada());
      await expect(
        repo.patch(a.id, VALIDADOR, 'VALIDADOR_ESPACIO_PUBLICO', { results: 'otra cosa' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('solo ADMIN puede reasignar el gestor creador', async () => {
      const a = await repo.create(GESTOR, entrada());
      await repo.send(a.id, GESTOR);
      await expect(
        repo.patch(a.id, VALIDADOR, 'VALIDADOR_ESPACIO_PUBLICO', { createdByUserId: 'otro' }),
      ).rejects.toThrow(BadRequestException);
      const reasignada = await repo.patch(a.id, 'admin-id', 'ADMIN', { createdByUserId: 'otro' });
      expect(reasignada.createdByUserId).toBe('otro');
    });
  });

  describe('filtros de ListFilters', () => {
    const OTRO_GESTOR = '00000000-0000-0000-0000-000000000009';

    it('listAll filtra por barrio', async () => {
      await repo.create(GESTOR, entrada({ barrio: 'LA MACARENA' }));
      await repo.create(GESTOR, entrada({ barrio: 'LAS CRUCES' }));
      const pagina = await repo.listAll({ barrio: 'LA MACARENA' });
      expect(pagina.total).toBe(1);
      expect(pagina.data[0].barrio).toBe('LA MACARENA');
    });

    it('listAll filtra por gestor', async () => {
      await repo.create(GESTOR, entrada());
      await repo.create(OTRO_GESTOR, entrada());
      const pagina = await repo.listAll({ gestor: GESTOR });
      expect(pagina.total).toBe(1);
      expect(pagina.data[0].createdByUserId).toBe(GESTOR);
    });

    it('listAll filtra por isNightShift', async () => {
      await repo.create(GESTOR, entrada({ isNightShift: true }));
      await repo.create(GESTOR, entrada({ isNightShift: false }));
      const pagina = await repo.listAll({ isNightShift: true });
      expect(pagina.total).toBe(1);
      expect(pagina.data[0].isNightShift).toBe(true);
    });

    it('listAll filtra por rango desde/hasta', async () => {
      await repo.create(GESTOR, entrada({ dateTime: '2026-08-10T14:00:00.000Z' }));
      await repo.create(GESTOR, entrada({ dateTime: '2026-08-20T14:00:00.000Z' }));
      await repo.create(GESTOR, entrada({ dateTime: '2026-08-30T14:00:00.000Z' }));
      const pagina = await repo.listAll({ desde: '2026-08-15', hasta: '2026-08-25' });
      expect(pagina.total).toBe(1);
      expect(pagina.data[0].dateTime).toBe('2026-08-20T14:00:00.000Z');
    });

    it('listAll combina dos filtros a la vez', async () => {
      await repo.create(GESTOR, entrada({ barrio: 'LA MACARENA', isNightShift: true }));
      await repo.create(GESTOR, entrada({ barrio: 'LA MACARENA', isNightShift: false }));
      await repo.create(GESTOR, entrada({ barrio: 'LAS CRUCES', isNightShift: true }));
      const pagina = await repo.listAll({ barrio: 'LA MACARENA', isNightShift: true });
      expect(pagina.total).toBe(1);
      expect(pagina.data[0].barrio).toBe('LA MACARENA');
      expect(pagina.data[0].isNightShift).toBe(true);
    });

    it('listPending, listPublicadas y listValidatedByUser respetan tambien el filtro de barrio', async () => {
      const VALIDADOR = '00000000-0000-0000-0000-000000000002';
      const enviadaMacarena = await repo.create(GESTOR, entrada({ barrio: 'LA MACARENA' }));
      await repo.send(enviadaMacarena.id, GESTOR);
      const enviadaCruces = await repo.create(GESTOR, entrada({ barrio: 'LAS CRUCES' }));
      await repo.send(enviadaCruces.id, GESTOR);

      const pendientes = await repo.listPending({ barrio: 'LA MACARENA' });
      expect(pendientes.total).toBe(1);
      expect(pendientes.data[0].barrio).toBe('LA MACARENA');

      await repo.approve(enviadaCruces.id, VALIDADOR);
      const publicadas = await repo.listPublicadas({ barrio: 'LAS CRUCES' });
      expect(publicadas.total).toBe(1);

      const validadas = await repo.listValidatedByUser(VALIDADOR, { barrio: 'LAS CRUCES' });
      expect(validadas.total).toBe(1);
      expect(validadas.data[0].barrio).toBe('LAS CRUCES');
    });

    it('listMine no deja ver actividades de otro gestor via el filtro gestor', async () => {
      await repo.create(GESTOR, entrada());
      await repo.create(OTRO_GESTOR, entrada());
      const pagina = await repo.listMine(GESTOR, { gestor: OTRO_GESTOR });
      expect(pagina.total).toBe(0);
      expect(pagina.data).toEqual([]);
    });

    it('listMine sigue devolviendo lo propio cuando el filtro gestor coincide con el dueno', async () => {
      await repo.create(GESTOR, entrada());
      await repo.create(OTRO_GESTOR, entrada());
      const pagina = await repo.listMine(GESTOR, { gestor: GESTOR });
      expect(pagina.total).toBe(1);
      expect(pagina.data[0].createdByUserId).toBe(GESTOR);
    });
  });

  describe('filtro de fecha en estadisticas', () => {
    it('getMyStats respeta desde/hasta', async () => {
      const vieja = await repo.create(GESTOR, entrada({ dateTime: '2026-08-01T14:00:00.000Z' }));
      await repo.send(vieja.id, GESTOR);
      const reciente = await repo.create(GESTOR, entrada({ dateTime: '2026-08-25T14:00:00.000Z' }));
      await repo.send(reciente.id, GESTOR);

      const stats = await repo.getMyStats(GESTOR, { desde: '2026-08-20' });
      expect(stats.enviada).toBe(1);
    });

    it('getBarriosStats respeta desde/hasta', async () => {
      await repo.create(GESTOR, entrada({ barrio: 'LA MACARENA', dateTime: '2026-08-01T14:00:00.000Z' }));
      await repo.create(GESTOR, entrada({ barrio: 'LAS CRUCES', dateTime: '2026-08-25T14:00:00.000Z' }));

      const { cubiertas } = await repo.getBarriosStats({ desde: '2026-08-20' });
      expect(cubiertas).toHaveLength(1);
      expect(cubiertas[0].barrio).toBe('LAS CRUCES');
    });
  });

});
