import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useAuthStore } from '../../store/authStore';

describe('AppShell', () => {
  // Sin `globals: true` en vitest.config.ts, testing-library no engancha su
  // afterEach automatico - hay que desmontar a mano entre tests.
  afterEach(cleanup);

  beforeEach(() => {
    useAuthStore.getState().login('tok', {
      id: 'u-1', name: 'gestor@ejemplo.com', lastname: '',
      email: 'gestor@ejemplo.com', role: 'GESTOR_ESPACIO_PUBLICO',
    });
  });

  it('muestra el contenido que envuelve', () => {
    render(<MemoryRouter><AppShell><p>contenido</p></AppShell></MemoryRouter>);
    expect(screen.getByText('contenido')).toBeDefined();
  });

  it('muestra el correo del usuario en sesion', () => {
    render(<MemoryRouter><AppShell><p>x</p></AppShell></MemoryRouter>);
    expect(screen.getByText(/gestor@ejemplo.com/)).toBeDefined();
  });

  it('ofrece cerrar sesion', () => {
    render(<MemoryRouter><AppShell><p>x</p></AppShell></MemoryRouter>);
    expect(screen.getByRole('button', { name: /cerrar sesion/i })).toBeDefined();
  });
});
