import { useAuthStore } from '../store/authStore';
import { irAlLoginDelHub } from '../config/hub';

// Unico punto de salida del modulo. Cierra la sesion de aca y manda al login
// del hub pidiendole que cierre la suya.
export function cerrarSesion(): void {
  useAuthStore.getState().logout();
  irAlLoginDelHub();
}
