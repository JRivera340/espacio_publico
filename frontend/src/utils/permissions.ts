import type { Role } from '../types';

// Fuente unica de verdad del mapa rol -> ruta y de los roles permitidos por
// ruta. navItems, HandoffPage y App.tsx consumen esto en vez de declarar su
// propia copia - antes las cuatro coincidian por casualidad y cualquier rol
// nuevo se agregaba en un lugar y se olvidaba en otro.

// Ruta de aterrizaje por rol tras el handoff. Record (no Partial) para que
// TypeScript exija un destino para cada rol del modulo: si se agrega un rol
// a `Role` sin agregar su entrada aca, el build falla en vez de dejar al
// usuario en una pantalla sin destino.
export const RUTA_POR_ROL: Record<Role, string> = {
  GESTOR_ESPACIO_PUBLICO: '/gestor/dashboard',
  VALIDADOR_ESPACIO_PUBLICO: '/validador/dashboard',
  ADMIN: '/admin',
};

// Roles permitidos por ruta protegida. El ADMIN entra a todas porque valida
// y administra por encima de gestor y validador (ver navItems). Las tres
// rutas de gestor ademas de dashboard son las pantallas de registro, edicion
// y detalle de una actividad - mismo rol que el dashboard.
export const ROUTE_ACCESS: Record<string, Role[]> = {
  '/gestor/dashboard': ['GESTOR_ESPACIO_PUBLICO', 'ADMIN'],
  '/gestor/crear-actividad': ['GESTOR_ESPACIO_PUBLICO', 'ADMIN'],
  '/gestor/editar-actividad/:id': ['GESTOR_ESPACIO_PUBLICO', 'ADMIN'],
  '/gestor/actividad/:id': ['GESTOR_ESPACIO_PUBLICO', 'ADMIN'],
  '/validador/dashboard': ['VALIDADOR_ESPACIO_PUBLICO', 'ADMIN'],
  '/admin': ['ADMIN'],
};

export function getDashboardPath(role: Role): string {
  return RUTA_POR_ROL[role];
}
