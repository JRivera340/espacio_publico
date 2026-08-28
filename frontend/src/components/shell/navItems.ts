import type { Role } from '../../types';
import type { NavIconName } from './NavIcon';

export interface NavItem {
  key: string;
  label: string;
  icon: NavIconName;
  to: string;
}

const GESTOR_ITEM: NavItem = { key: 'gestor', label: 'Mis actividades', icon: 'home', to: '/gestor/dashboard' };
const VALIDADOR_ITEM: NavItem = { key: 'validador', label: 'Validacion', icon: 'route', to: '/validador/dashboard' };
const ADMIN_ITEM: NavItem = { key: 'admin', label: 'Administracion', icon: 'user', to: '/admin' };

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
