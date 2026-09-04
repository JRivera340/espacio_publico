import { describe, it, expect } from 'vitest';
import { getNavItems } from './navItems';
import type { Role } from '../../types';

describe('getNavItems', () => {
  it('el gestor de espacio publico solo ve su propio panel', () => {
    const items = getNavItems('GESTOR_ESPACIO_PUBLICO');
    expect(items.map((i) => i.to)).toEqual(['/gestor/dashboard', '/gestor/cronograma', '/gestor/perfil']);
  });

  it('el validador de espacio publico solo ve su propio panel', () => {
    const items = getNavItems('VALIDADOR_ESPACIO_PUBLICO');
    expect(items.map((i) => i.to)).toEqual(['/validador/dashboard', '/validador/programacion']);
  });

  // El panel del gestor es "mis propias actividades" y el backend lo restringe
  // a GESTOR_ESPACIO_PUBLICO. Ofrecerselo al ADMIN seria un item que solo
  // lleva a un 403.
  it('el administrador ve validacion y administracion, no el panel del gestor', () => {
    const items = getNavItems('ADMIN');
    expect(items.map((i) => i.to)).toEqual(['/validador/dashboard', '/validador/programacion', '/admin']);
  });

  it('un rol sin nav definida no rompe: devuelve lista vacia', () => {
    const rolInesperado = 'ROL_INVENTADO' as unknown as Role;
    expect(getNavItems(rolInesperado)).toEqual([]);
  });
});
