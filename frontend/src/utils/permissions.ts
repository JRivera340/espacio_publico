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

// Roles permitidos por ruta protegida. Tiene que coincidir con los @Roles del
// backend: si aca entra un rol que alla se rechaza, el usuario llega a una
// pantalla que solo sabe devolver 403.
//
// Las rutas de gestor son SOLO del gestor, ADMIN incluido. El backend las
// restringe a GESTOR_ESPACIO_PUBLICO (GET /actividades/mine, mine/stats y
// POST /actividades) porque son "mis propias actividades": para un ADMIN, que
// no registra actividades, la pantalla siempre estaria vacia. El ADMIN ve todo
// desde /admin. Las de validador si lo incluyen, igual que el backend.
export const ROUTE_ACCESS: Record<string, Role[]> = {
  '/gestor/dashboard': ['GESTOR_ESPACIO_PUBLICO'],
  '/gestor/crear-actividad': ['GESTOR_ESPACIO_PUBLICO'],
  '/gestor/editar-actividad/:id': ['GESTOR_ESPACIO_PUBLICO'],
  '/gestor/actividad/:id': ['GESTOR_ESPACIO_PUBLICO'],
  '/gestor/cronograma': ['GESTOR_ESPACIO_PUBLICO'],
  '/validador/dashboard': ['VALIDADOR_ESPACIO_PUBLICO', 'ADMIN'],
  '/validador/actividad/:id': ['VALIDADOR_ESPACIO_PUBLICO', 'ADMIN'],
  '/validador/programacion': ['VALIDADOR_ESPACIO_PUBLICO', 'ADMIN'],
  '/admin': ['ADMIN'],
};

export function getDashboardPath(role: Role): string {
  return RUTA_POR_ROL[role];
}
