import { describe, it, expect } from 'vitest';
import { getNavItems } from './navItems';
import type { Role } from '../../types';

describe('getNavItems', () => {
  it('el gestor de espacio publico solo ve su propio panel', () => {
    const items = getNavItems('GESTOR_ESPACIO_PUBLICO');
    expect(items.map((i) => i.to)).toEqual(['/gestor/dashboard']);
  });

  it('el validador de espacio publico solo ve su propio panel', () => {
    const items = getNavItems('VALIDADOR_ESPACIO_PUBLICO');
    expect(items.map((i) => i.to)).toEqual(['/validador/dashboard']);
  });

  it('el administrador ve las tres rutas del modulo', () => {
    const items = getNavItems('ADMIN');
    expect(items.map((i) => i.to)).toEqual(['/gestor/dashboard', '/validador/dashboard', '/admin']);
  });

  it('un rol sin nav definida no rompe: devuelve lista vacia', () => {
    const rolInesperado = 'ROL_INVENTADO' as unknown as Role;
    expect(getNavItems(rolInesperado)).toEqual([]);
  });
});
