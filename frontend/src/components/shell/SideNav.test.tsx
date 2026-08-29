import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SideNav } from './SideNav';
import type { NavItem } from './navItems';

const ITEM: NavItem = { key: 'admin', label: 'Administracion', icon: 'user', to: '/admin' };

function renderEn(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <SideNav items={[ITEM]} />
    </MemoryRouter>,
  );
  return screen.getByRole('link', { name: /administracion/i });
}

describe('SideNav', () => {
  afterEach(cleanup);

  it('resalta el item en su ruta exacta', () => {
    expect(renderEn('/admin').className).toContain('#F97316');
  });

  // Sin `end` en el NavLink, cualquier ruta que EXTIENDA la del item lo deja
  // resaltado: el usuario navega a una subpantalla y la nav sigue senalando
  // la anterior. Hoy ninguna ruta del modulo anida asi, pero la primera que
  // se agregue heredaria el defecto en silencio - por eso se prueba con una
  // ruta hija en vez de con las rutas actuales.
  it('no resalta el item en una ruta hija', () => {
    expect(renderEn('/admin/usuarios').className).not.toContain('#F97316');
  });
});
