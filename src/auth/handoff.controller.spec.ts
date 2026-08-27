import { JwtService } from '@nestjs/jwt';
import { HandoffController } from './handoff.controller';

const SECRETO = 'secreto-de-prueba';
const FRONTEND = 'https://espaciopublico.bogotaneidapp.com';

function respuestaFalsa() {
  return { redirect: jest.fn() } as any;
}

describe('HandoffController', () => {
  let jwtService: JwtService;
  let controller: HandoffController;

  beforeEach(() => {
    process.env.JWT_SECRET = SECRETO;
    process.env.FRONTEND_URL = FRONTEND;
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';
    jwtService = new JwtService({ secret: SECRETO });
    controller = new HandoffController(jwtService);
  });

  it('redirige con el token en el fragmento cuando la firma es valida', () => {
    const token = jwtService.sign(
      { sub: '1', email: 'gestor@ejemplo.com', role: 'GESTOR_ESPACIO_PUBLICO' },
      { secret: SECRETO },
    );
    const res = respuestaFalsa();
    controller.handoff(token, res);
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      `${FRONTEND}/handoff#token=${encodeURIComponent(token)}`,
    );
  });

  it('redirige con missing_token cuando el body no trae token', () => {
    const res = respuestaFalsa();
    controller.handoff(undefined, res);
    expect(res.redirect).toHaveBeenCalledWith(302, `${FRONTEND}/handoff?error=missing_token`);
  });

  it('redirige con invalid_token cuando la firma no corresponde', () => {
    const ajeno = new JwtService({ secret: 'otro-secreto' }).sign(
      { sub: '1', email: 'x@ejemplo.com', role: 'ADMIN' },
      { secret: 'otro-secreto' },
    );
    const res = respuestaFalsa();
    controller.handoff(ajeno, res);
    expect(res.redirect).toHaveBeenCalledWith(302, `${FRONTEND}/handoff?error=invalid_token`);
  });

  it('redirige con invalid_token cuando el token expiro', () => {
    const vencido = jwtService.sign(
      { sub: '1', email: 'x@ejemplo.com', role: 'ADMIN' },
      { secret: SECRETO, expiresIn: '-1h' },
    );
    const res = respuestaFalsa();
    controller.handoff(vencido, res);
    expect(res.redirect).toHaveBeenCalledWith(302, `${FRONTEND}/handoff?error=invalid_token`);
  });

  it('nunca escribe el token en el log', () => {
    const token = jwtService.sign({ sub: '1', email: 'x@ejemplo.com', role: 'ADMIN' }, { secret: SECRETO });
    const warn = jest.spyOn(controller['logger'], 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(controller['logger'], 'error').mockImplementation(() => undefined);
    controller.handoff(token, respuestaFalsa());
    const escrito = [...warn.mock.calls, ...error.mock.calls].flat().join(' ');
    expect(escrito).not.toContain(token);
  });
});
