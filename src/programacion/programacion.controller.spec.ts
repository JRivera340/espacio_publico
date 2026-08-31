import { ProgramacionController, parseFilters } from './programacion.controller';
import { ProgramacionService } from './programacion.service';

describe('parseFilters', () => {
  it('deja pasar desde/hasta/gestor/estado cuando vienen en la query', () => {
    const filters = parseFilters({ desde: '2026-09-01', hasta: '2026-09-30', gestor: 'g1', estado: 'PENDIENTE' });
    expect(filters).toEqual({ desde: '2026-09-01', hasta: '2026-09-30', gestor: 'g1', estado: 'PENDIENTE' });
  });

  it('deja los filtros sin definir cuando no vienen en la query', () => {
    expect(parseFilters({})).toEqual({});
  });
});

describe('ProgramacionController.listarMias', () => {
  it('usa el userId del token, nunca un parametro de la request', async () => {
    const service = { listarMias: jest.fn().mockResolvedValue({ data: [], total: 0 }) } as unknown as ProgramacionService;
    const controller = new ProgramacionController(service);

    const req = { user: { userId: 'gestor-del-token', email: 'g@test.com', role: 'GESTOR_ESPACIO_PUBLICO' } } as any;
    // Un intento de pedir la programacion de otro gestor via query param no
    // debe llegar al servicio: parseFilters no reconoce "gestorUserId".
    await controller.listarMias(req, { gestorUserId: 'otro-gestor' });

    expect(service.listarMias).toHaveBeenCalledWith('gestor-del-token', {});
  });
});

describe('ProgramacionController.crear', () => {
  it('crea con el userId del validador autenticado y reenvia el lote completo', async () => {
    const service = { crear: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]) } as unknown as ProgramacionService;
    const controller = new ProgramacionController(service);

    const req = { user: { userId: 'validador-1', email: 'v@test.com', role: 'VALIDADOR_ESPACIO_PUBLICO' } } as any;
    const items = [
      { fecha: '2026-09-01T14:00:00.000Z', descripcion: 'item 1' },
      { fecha: '2026-09-02T14:00:00.000Z', descripcion: 'item 2' },
    ] as any;

    const resultado = await controller.crear(req, items);

    expect(service.crear).toHaveBeenCalledWith('validador-1', items);
    expect(resultado).toHaveLength(2);
  });
});
