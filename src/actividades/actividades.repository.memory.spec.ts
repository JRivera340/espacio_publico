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
});
