import { BadRequestException, HttpException } from '@nestjs/common';
import { UsersProxyController, PATH_TRAVERSAL_PATTERN } from './users-proxy.controller';

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

  it('getUserById reenvia al hub cuando el id es un uuid valido', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '11111111-1111-1111-1111-111111111111', name: 'Ana' }),
    });
    global.fetch = fetchMock as any;

    const resultado = await controller.getUserById(
      '11111111-1111-1111-1111-111111111111',
      req,
    );

    expect(resultado).toEqual({ id: '11111111-1111-1111-1111-111111111111', name: 'Ana' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://hub.example.com/api/users/11111111-1111-1111-1111-111111111111',
      { headers: { Authorization: 'Bearer abc' } },
    );
  });

  it('getUserById rechaza un intento de recorrido de ruta porcentaje-codificado sin llamar al hub', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    await expect(controller.getUserById('..%2F..%2Fauth%2Flogin', req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getUserById rechaza un intento de recorrido de ruta ya decodificado sin llamar al hub', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    await expect(controller.getUserById('../../auth/login', req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getUserById rechaza un id que no es uuid', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    await expect(controller.getUserById('pepito', req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proxyToHub rechaza directamente un segmento con barra, sin llamar al hub', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const proxyToHub = (controller as any).proxyToHub.bind(controller);

    await expect(proxyToHub(['../../auth/login'], 'Bearer abc')).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});


describe('PATH_TRAVERSAL_PATTERN', () => {
  const bloqueados = [
    '..',
    '\\',
    'a\\b',
    '/',
    '%2f',
    '%2F',
    '%5c',
    '%2e%2e',
  ];
  const permitidos = ['gestores', 'list', '11111111-1111-1111-1111-111111111111'];

  it.each(bloqueados)('bloquea %p', (valor) => {
    expect(PATH_TRAVERSAL_PATTERN.test(valor)).toBe(true);
  });

  it.each(permitidos)('deja pasar %p', (valor) => {
    expect(PATH_TRAVERSAL_PATTERN.test(valor)).toBe(false);
  });
});
