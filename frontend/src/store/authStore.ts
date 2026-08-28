import { create } from 'zustand';
import type { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (token: string, user: User) => void;
  logout: () => void;
  clearAuth: () => void;
}

// Rehidratacion inicial sincrona desde sessionStorage
const getInitialState = () => {
  try {
    const token = authService.getToken();
    const user = authService.getCurrentUser();
    if (token && user) {
      return { user, token, isAuthenticated: true };
    }
  } catch (e) {
    console.error('Error rehydrating auth state:', e);
  }
  return { user: null, token: null, isAuthenticated: false };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  login: (token, user) => {
    authService.saveSession(token, user);
    set({ user, token, isAuthenticated: true });
  },

  // logout (salida voluntaria via cerrarSesion) y clearAuth (evento de sesion
  // vencida) limpian exactamente lo mismo. Se conservan como dos nombres
  // porque describen intenciones distintas en quien los llama, pero comparten
  // la unica implementacion de abajo para que no puedan desincronizarse si el
  // estado gana un campo nuevo.
  logout: () => get().clearAuth(),

  clearAuth: () => {
    authService.clearSession();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
