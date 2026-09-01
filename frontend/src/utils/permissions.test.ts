import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { RUTA_POR_ROL, ROUTE_ACCESS, getDashboardPath } from './permissions';
import type { Role } from '../types';
import { getNavItems } from '../components/shell/navItems';

const TODOS_LOS_ROLES: Role[] = ['GESTOR_ESPACIO_PUBLICO', 'VALIDADOR_ESPACIO_PUBLICO', 'ADMIN'];

describe('RUTA_POR_ROL', () => {
  it('tiene un destino para cada rol del modulo', () => {
    for (const role of TODOS_LOS_ROLES) {
      expect(typeof RUTA_POR_ROL[role]).toBe('string');
      expect(RUTA_POR_ROL[role].length).toBeGreaterThan(0);
    }
  });

  it('getDashboardPath devuelve el mismo valor que el mapa', () => {
    for (const role of TODOS_LOS_ROLES) {
      expect(getDashboardPath(role)).toBe(RUTA_POR_ROL[role]);
    }
  });
});

describe('ROUTE_ACCESS', () => {
  it('cada ruta de RUTA_POR_ROL tiene su entrada de roles permitidos', () => {
    for (const role of TODOS_LOS_ROLES) {
      const ruta = RUTA_POR_ROL[role];
      expect(ROUTE_ACCESS[ruta]).toBeDefined();
      expect(ROUTE_ACCESS[ruta]).toContain(role);
    }
  });

  // El backend restringe GET /actividades/mine, mine/stats y POST /actividades
  // a GESTOR_ESPACIO_PUBLICO. Si el frontend deja entrar al ADMIN, llega a una
  // pantalla que solo puede devolver 403 y se ve igual que una vacia.
  it('ADMIN no entra a las rutas de gestor', () => {
    const rutasDeGestor = Object.keys(ROUTE_ACCESS).filter((r) => r.startsWith('/gestor/'));
    expect(rutasDeGestor.length).toBeGreaterThan(0);
    for (const ruta of rutasDeGestor) {
      expect(ROUTE_ACCESS[ruta]).not.toContain('ADMIN');
    }
  });

  it('ADMIN entra a validacion y administracion, como en el backend', () => {
    expect(ROUTE_ACCESS['/validador/dashboard']).toContain('ADMIN');
    expect(ROUTE_ACCESS['/admin']).toContain('ADMIN');
  });
});

// La navegacion no puede ofrecer una pantalla que ROUTE_ACCESS niega: seria un
// item que lleva a un redirect.
describe('navItems coincide con ROUTE_ACCESS', () => {
  it('cada rol solo ve items a los que tiene acceso', () => {
    for (const role of TODOS_LOS_ROLES) {
      for (const item of getNavItems(role)) {
        expect(ROUTE_ACCESS[item.to], `${role} ve un item hacia ${item.to}`).toContain(role);
      }
    }
  });
});

// Espejo canonico: App.tsx es quien declara las rutas reales via <Route>. Si
// alguien agrega, saca o renombra una ruta protegida ahi sin actualizar
// ROUTE_ACCESS (o al reves), este test falla en vez de derivar en silencio -
// misma idea que utils/permissions.test.ts en el hub para su App.tsx.
describe('espejo con App.tsx', () => {
  const appTsxPath = resolve(dirname(fileURLToPath(import.meta.url)), '../App.tsx');
  const appSource = readFileSync(appTsxPath, 'utf-8');

  // Rutas publicas que no pasan por RutaProtegida: no forman parte del mapa
  // rol -> ruta y se excluyen a propósito de la comparacion.
  const RUTAS_PUBLICAS = new Set(['/', '/ingreso', '/publico', '/publico/mapa', '/publico/jornada/:id', '/handoff', '*']);

  function rutasDeclaradasEnApp(): string[] {
    const matches = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)];
    return matches.map((m) => m[1]).filter((path) => !RUTAS_PUBLICAS.has(path));
  }

  it('toda ruta protegida en App.tsx tiene entrada en ROUTE_ACCESS', () => {
    const rutasApp = rutasDeclaradasEnApp();
    expect(rutasApp.length).toBeGreaterThan(0);
    for (const ruta of rutasApp) {
      expect(Object.keys(ROUTE_ACCESS)).toContain(ruta);
    }
  });

  it('toda entrada de ROUTE_ACCESS corresponde a una ruta real en App.tsx', () => {
    const rutasApp = new Set(rutasDeclaradasEnApp());
    for (const ruta of Object.keys(ROUTE_ACCESS)) {
      expect(rutasApp.has(ruta)).toBe(true);
    }
  });
});
