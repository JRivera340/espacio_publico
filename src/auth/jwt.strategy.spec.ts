import { JwtStrategy } from './jwt.strategy';
import { Role } from '../common/enums/role.enum';

describe('JwtStrategy', () => {
  it('mapea el payload del hub a la identidad que usan los controllers', async () => {
    process.env.JWT_SECRET = 'secreto-de-prueba';
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
