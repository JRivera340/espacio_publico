import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('deja pasar sin token una ruta marcada con @Public()', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const guard = new JwtAuthGuard(reflector);
    const contexto = { getHandler: () => null, getClass: () => null } as any;
    expect(guard.canActivate(contexto)).toBe(true);
  });
});
