import type { User } from '../types';

// Single source of truth para las claves de almacenamiento del token
// Usamos sessionStorage para que cada pestana tenga su propia sesion independiente
// Esto evita que el login/logout se sincronice automaticamente entre pestanas
const TOKEN_KEY = 'ep_auth_token';
const USER_KEY = 'ep_auth_user';

export const authService = {
  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      // Si el JSON esta corrupto, limpiamos
      this.clearSession();
      return null;
    }
  },

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  saveSession(token: string, user: User): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
