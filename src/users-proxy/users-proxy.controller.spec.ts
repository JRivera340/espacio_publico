import { HttpException } from '@nestjs/common';
import { UsersProxyController } from './users-proxy.controller';

describe('UsersProxyController', () => {
  let controller: UsersProxyController;
  const req = { headers: { authorization: 'Bearer abc' } } as any;

  beforeEach(() => {
    process.env.JWT_SECRET = 'secreto';
    process.env.HUB_API_URL = 'https://hub.example.com';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';
    controller = new UsersProxyController();
  });

  afterEach(() => jest.restoreAllMocks());

  it('reenvia la lista de gestores con el token del usuario', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', name: 'Ana' }],
    });
    global.fetch = fetchMock as any;

    const resultado = await controller.getGestores(req);

    expect(resultado).toEqual([{ id: '1', name: 'Ana' }]);
    expect(fetchMock).toHaveBeenCalledWith('https://hub.example.com/api/users/gestores/list', {
      headers: { Authorization: 'Bearer abc' },
    });
  });

  it('propaga el status de error del hub', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'sin permiso' }),
    }) as any;

    await expect(controller.getGestores(req)).rejects.toMatchObject({ status: 403 });
  });

  it('devuelve 502 cuando el hub no responde', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;

    await expect(controller.getGestores(req)).rejects.toMatchObject({ status: 502 });
  });
});
