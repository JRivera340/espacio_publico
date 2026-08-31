import type { Role } from '../../types';
import type { NavIconName } from './NavIcon';
import { RUTA_POR_ROL } from '../../utils/permissions';

export interface NavItem {
  key: string;
  label: string;
  icon: NavIconName;
  to: string;
}

// Las rutas salen de RUTA_POR_ROL (permissions.ts) en vez de repetirse aca -
// es el mismo mapa que usan HandoffPage y App.tsx.
const GESTOR_ITEM: NavItem = { key: 'gestor', label: 'Mis actividades', icon: 'home', to: RUTA_POR_ROL.GESTOR_ESPACIO_PUBLICO };
const VALIDADOR_ITEM: NavItem = { key: 'validador', label: 'Validacion', icon: 'route', to: RUTA_POR_ROL.VALIDADOR_ESPACIO_PUBLICO };
const ADMIN_ITEM: NavItem = { key: 'admin', label: 'Administracion', icon: 'user', to: RUTA_POR_ROL.ADMIN };
const CRONOGRAMA_ITEM: NavItem = { key: 'cronograma', label: 'Mi cronograma', icon: 'route', to: '/gestor/cronograma' };
const PROGRAMACION_ITEM: NavItem = { key: 'programacion', label: 'Programacion', icon: 'home', to: '/validador/programacion' };

// Nav recortada a las pantallas de este modulo (espacio publico). Cada rol ve
// solo lo que ROUTE_ACCESS le permite: el ADMIN no lleva el item de gestor
// porque esa pantalla es de las actividades propias y el backend se la niega.
export function getNavItems(role: Role): NavItem[] {
  switch (role) {
    case 'GESTOR_ESPACIO_PUBLICO':
      return [GESTOR_ITEM, CRONOGRAMA_ITEM];
    case 'VALIDADOR_ESPACIO_PUBLICO':
      return [VALIDADOR_ITEM, PROGRAMACION_ITEM];
    case 'ADMIN':
      return [VALIDADOR_ITEM, PROGRAMACION_ITEM, ADMIN_ITEM];
    default:
      return [];
  }
}
