import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const getAutenticado = vi.fn();

vi.mock('axios', () => ({
  default: { create: vi.fn(() => ({ get, interceptors: { request: { use: vi.fn() } } })) },
}));

// El cliente con token. Si el visor lo usara, estos espias lo delatan.
vi.mock('./api', () => ({ default: { get: getAutenticado, post: vi.fn() } }));

const { publicoService } = await import('./publico.service');

const JORNADA = {
  id: 'j1',
  fecha: '2026-08-26T08:00:00.000Z',
  lat: 4.599,
  lng: -74.087,
  barrio: 'EL DORADO',
  subtipo: 'ESPACIO_PUBLICO_1801',
  codigo: 'EP-04',
  photos: [],
  cifras: { cambuches: 1 },
};

describe('publicoService', () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: { data: [JORNADA] } });
  });

  // El visor es anonimo. Si usara el cliente con interceptor, arrastraria el
  // token de quien tenga sesion abierta y dispararia el aviso de sesion vencida
  // ante un 401 que no tiene nada que ver con el ciudadano.
  it('nunca pasa por el cliente que agrega el token', async () => {
    await publicoService.listar();
    await publicoService.cifras();
    get.mockResolvedValue({ data: JORNADA });
    await publicoService.obtener('j1');

    expect(get).toHaveBeenCalledTimes(3);
    expect(getAutenticado).not.toHaveBeenCalled();
  });

  it('lista las jornadas publicadas', async () => {
    const lista = await publicoService.listar({ limit: 100 });
    expect(get.mock.calls[0][0]).toContain('/publico/actividades');
    expect(lista).toHaveLength(1);
  });

  it('tolera que la respuesta venga envuelta o plana', async () => {
    get.mockResolvedValue({ data: [JORNADA] });
    expect(await publicoService.listar()).toHaveLength(1);

    get.mockResolvedValue({ data: { data: [JORNADA] } });
    expect(await publicoService.listar()).toHaveLength(1);
  });

  it('no se cae si la respuesta no es una lista', async () => {
    get.mockResolvedValue({ data: null });
    expect(await publicoService.listar()).toEqual([]);
  });

  it('pasa los filtros al backend', async () => {
    await publicoService.listar({ barrio: 'EL DORADO', desde: '2026-08-01' });
    const ruta = get.mock.calls[0][0] as string;
    expect(ruta).toContain('barrio=EL+DORADO');
    expect(ruta).toContain('desde=2026-08-01');
  });

  it('devuelve cifras vacias en vez de romperse si faltan campos', async () => {
    get.mockResolvedValue({ data: {} });
    expect(await publicoService.cifras()).toEqual({ total: 0, porBarrio: {}, cifras: {} });
  });
});
