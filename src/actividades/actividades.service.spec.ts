import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ActividadesService } from './actividades.service';
import { InMemoryActividadesRepository } from './actividades.repository.memory';
import { ActividadStatus } from './enums/actividad-status.enum';

const GESTOR = '00000000-0000-0000-0000-000000000001';
const VALIDADOR = '00000000-0000-0000-0000-000000000002';
const ADMIN = '00000000-0000-0000-0000-000000000003';
const OTRO_GESTOR = '00000000-0000-0000-0000-000000000009';
const GESTOR_INVOLUCRADO = '00000000-0000-0000-0000-000000000010';

const base = {
  dateTime: '2026-08-20T14:00:00.000Z',
  activityType: 'ESPACIO_PUBLICO - 1801',
  lat: 4.6,
  lng: -74.07,
  barrio: 'LA MACARENA',
  results: 'Recuperacion de anden',
};

describe('ActividadesService', () => {
  let repo: InMemoryActividadesRepository;
  let service: ActividadesService;

  beforeEach(() => {
    repo = new InMemoryActividadesRepository();
    service = new ActividadesService(repo);
  });

  it('recorre el ciclo completo hasta publicar', async () => {
    const creada = await service.crear(GESTOR, base);
    expect(creada.status).toBe(ActividadStatus.BORRADOR);

    const enviada = await service.enviar(creada.id, GESTOR, 'GESTOR_ESPACIO_PUBLICO');
    expect(enviada.status).toBe(ActividadStatus.ENVIADA);

    const pendientes = await service.listarPendientes();
    expect(pendientes.total).toBe(1);

    const publicada = await service.aprobar(creada.id, VALIDADOR, 'ok');
    expect(publicada.status).toBe(ActividadStatus.PUBLICADA);

    const pendientesLuego = await service.listarPendientes();
    expect(pendientesLuego.total).toBe(0);
  });

  it('rechaza un borrado masivo sin ids', async () => {
    await expect(service.borrarVarias([])).rejects.toThrow(BadRequestException);
  });

  it('las estadisticas del gestor cuentan lo publicado como aprobado', async () => {
    const a = await service.crear(GESTOR, base);
    await service.enviar(a.id, GESTOR, 'GESTOR_ESPACIO_PUBLICO');
    await service.aprobar(a.id, VALIDADOR);
    expect(await service.misEstadisticas(GESTOR)).toEqual({ enviada: 0, aprobada: 1, rechazada: 0 });
  });

  describe('obtener — un gestor no ve actividades ajenas', () => {
    it('el gestor dueno ve su actividad', async () => {
      const a = await service.crear(GESTOR, base);
      const vista = await service.obtener(a.id, GESTOR, 'GESTOR_ESPACIO_PUBLICO');
      expect(vista.id).toBe(a.id);
    });

    it('un gestor ajeno recibe Forbidden', async () => {
      const a = await service.crear(GESTOR, base);
      await expect(
        service.obtener(a.id, OTRO_GESTOR, 'GESTOR_ESPACIO_PUBLICO'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un gestor co-involucrado en un operativo en grupo si puede ver', async () => {
      const a = await service.crear(GESTOR, {
        ...base,
        isGroupOperativo: true,
        gestoresInvolucradosIds: [GESTOR_INVOLUCRADO],
      });
      const vista = await service.obtener(a.id, GESTOR_INVOLUCRADO, 'GESTOR_ESPACIO_PUBLICO');
      expect(vista.id).toBe(a.id);
    });

    it('validador ve cualquier actividad', async () => {
      const a = await service.crear(GESTOR, base);
      const vista = await service.obtener(a.id, VALIDADOR, 'VALIDADOR_ESPACIO_PUBLICO');
      expect(vista.id).toBe(a.id);
    });

    it('admin ve cualquier actividad', async () => {
      const a = await service.crear(GESTOR, base);
      const vista = await service.obtener(a.id, ADMIN, 'ADMIN');
      expect(vista.id).toBe(a.id);
    });
  });

  describe('listarIds — un gestor solo recibe los propios', () => {
    it('gestor recibe solo sus ids', async () => {
      const propia = await service.crear(GESTOR, base);
      await service.crear(OTRO_GESTOR, base);

      const ids = await service.listarIds({}, GESTOR, 'GESTOR_ESPACIO_PUBLICO');
      expect(ids).toEqual([propia.id]);
    });

    it('validador recibe los ids de todas', async () => {
      await service.crear(GESTOR, base);
      await service.crear(OTRO_GESTOR, base);

      const ids = await service.listarIds({}, VALIDADOR, 'VALIDADOR_ESPACIO_PUBLICO');
      expect(ids).toHaveLength(2);
    });

    it('admin recibe los ids de todas', async () => {
      await service.crear(GESTOR, base);
      await service.crear(OTRO_GESTOR, base);

      const ids = await service.listarIds({}, ADMIN, 'ADMIN');
      expect(ids).toHaveLength(2);
    });
  });
});
