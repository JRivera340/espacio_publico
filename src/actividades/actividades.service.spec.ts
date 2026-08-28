import { BadRequestException } from '@nestjs/common';
import { ActividadesService } from './actividades.service';
import { InMemoryActividadesRepository } from './actividades.repository.memory';
import { ActividadStatus } from './enums/actividad-status.enum';

const GESTOR = '00000000-0000-0000-0000-000000000001';
const VALIDADOR = '00000000-0000-0000-0000-000000000002';

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
});
