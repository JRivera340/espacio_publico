import { IngresoController } from './ingreso.controller';

describe('IngresoController', () => {
  let controller: IngresoController;

  beforeEach(() => {
    process.env.HUB_API_URL = 'https://hub.example.com';
    process.env.JWT_SECRET = 'secreto-de-prueba';
    process.env.FRONTEND_URL = 'https://ejemplo.com';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';
    controller = new IngresoController();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exige correo y contrasena', async () => {
    await expect(controller.login({})).rejects.toThrow(/correo y tu contrasena/i);
    await expect(controller.login({ email: 'a@b.co' })).rejects.toThrow(/correo y tu contrasena/i);
  });

  // Este modulo NO valida contrasenas: el hub sigue siendo el unico proveedor
  // de identidad. Si algun dia esto dejara de reenviar al hub, seria un segundo
  // sistema de usuarios, que es justo lo que el diseno evita.
  it('reenvia las credenciales al hub, no las valida por su cuenta', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'tok-del-hub', user: { id: 'u1' } }),
    });
    global.fetch = fetchMock as any;

    const respuesta = await controller.login({ email: 'a@b.co', password: 'x' });

    expect(fetchMock).toHaveBeenCalledWith('https://hub.example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.co', password: 'x' }),
    });
    expect(respuesta.access_token).toBe('tok-del-hub');
  });

  it('acepta el token venga como access_token o como token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: 'otro-nombre' }),
    }) as any;

    expect((await controller.login({ email: 'a@b.co', password: 'x' })).access_token).toBe('otro-nombre');
  });

  // No puede volverse un oraculo de correos validos: la respuesta es la misma
  // exista o no el usuario.
  it('no revela si el correo existe cuando las credenciales son malas', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Usuario con correo a@b.co no encontrado' }),
    }) as any;

    await expect(controller.login({ email: 'a@b.co', password: 'x' })).rejects.toThrow(
      /Correo o contrasena incorrectos/,
    );
  });

  it('avisa cuando el hub no responde, en vez de decir credenciales invalidas', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;

    await expect(controller.login({ email: 'a@b.co', password: 'x' })).rejects.toThrow(
      /No se pudo contactar el sistema de usuarios/,
    );
  });

  it('falla claro si el hub responde sin token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 'u1' } }),
    }) as any;

    await expect(controller.login({ email: 'a@b.co', password: 'x' })).rejects.toThrow(
      /No se pudo iniciar sesion/,
    );
  });
});
