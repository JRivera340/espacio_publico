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

// Nav recortada a las pantallas de este modulo (espacio publico). El ADMIN
// entra a las tres porque valida y administra por encima de los otros roles;
// gestor y validador solo ven su propio flujo.
export function getNavItems(role: Role): NavItem[] {
  switch (role) {
    case 'GESTOR_ESPACIO_PUBLICO':
      return [GESTOR_ITEM];
    case 'VALIDADOR_ESPACIO_PUBLICO':
      return [VALIDADOR_ITEM];
    case 'ADMIN':
      return [GESTOR_ITEM, VALIDADOR_ITEM, ADMIN_ITEM];
    default:
      return [];
  }
}
