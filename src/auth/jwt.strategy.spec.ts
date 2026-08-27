import { JwtStrategy } from './jwt.strategy';
import { Role } from '../common/enums/role.enum';

describe('JwtStrategy', () => {
  // getEnv() exige tambien las variables de DB, no solo el secreto: el spec
  // las setea todas a mano para no depender de que exista un .env en la
  // maquina donde se corran los tests.
  beforeEach(() => {
    process.env.JWT_SECRET = 'secreto-de-prueba';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_DATABASE = 'test';
  });

  it('mapea el payload del hub a la identidad que usan los controllers', async () => {
    const strategy = new JwtStrategy();
    const identidad = await strategy.validate({
      sub: '11111111-1111-1111-1111-111111111111',
      email: 'gestor@ejemplo.com',
      role: Role.GESTOR_ESPACIO_PUBLICO,
    });
    expect(identidad).toEqual({
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'gestor@ejemplo.com',
      role: Role.GESTOR_ESPACIO_PUBLICO,
    });
  });
});
