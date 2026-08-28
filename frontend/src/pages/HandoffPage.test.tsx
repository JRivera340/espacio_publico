import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HandoffPage } from './HandoffPage';
import { useAuthStore } from '../store/authStore';

function tokenFalso(role: string) {
  const payload = { sub: 'u-1', email: 'gestor@ejemplo.com', role };
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

function montar() {
  return render(<MemoryRouter><HandoffPage /></MemoryRouter>);
}

describe('HandoffPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.getState().logout();
    window.location.hash = '';
  });

  it('inicia sesion con el token del fragmento y limpia la url', async () => {
    window.location.hash = `#token=${tokenFalso('GESTOR_ESPACIO_PUBLICO')}`;
    montar();
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(window.location.hash).toBe('');
  });

  it('muestra el error cuando el backend redirigio con ?error=', async () => {
    montar();
    // sin hash y sin sesion: la pantalla no puede iniciar sesion
    await waitFor(() => expect(screen.getByText(/no se pudo iniciar sesion/i)).toBeDefined());
  });

  it('no pisa el estado en la segunda corrida del efecto de StrictMode', async () => {
    window.location.hash = `#token=${tokenFalso('ADMIN')}`;
    const { rerender } = montar();
    rerender(<MemoryRouter><HandoffPage /></MemoryRouter>);
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
  });
});
