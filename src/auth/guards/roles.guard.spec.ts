import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../common/enums/role.enum';

function contextoCon(user: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => null,
    getClass: () => null,
  } as any;
}

function guardConRoles(roles: Role[] | undefined) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('deja pasar cuando la ruta no declara roles', () => {
    expect(guardConRoles(undefined).canActivate(contextoCon({ role: Role.ADMIN }))).toBe(true);
  });

  it('deja pasar cuando el rol esta en la lista', () => {
    const guard = guardConRoles([Role.ADMIN, Role.VALIDADOR_ESPACIO_PUBLICO]);
    expect(guard.canActivate(contextoCon({ role: Role.VALIDADOR_ESPACIO_PUBLICO }))).toBe(true);
  });

  it('rechaza cuando el rol no alcanza', () => {
    const guard = guardConRoles([Role.ADMIN]);
    expect(() => guard.canActivate(contextoCon({ role: Role.GESTOR_ESPACIO_PUBLICO })))
      .toThrow(ForbiddenException);
  });

  it('rechaza cuando el token no trae rol', () => {
    const guard = guardConRoles([Role.ADMIN]);
    expect(() => guard.canActivate(contextoCon({}))).toThrow(ForbiddenException);
  });
});
