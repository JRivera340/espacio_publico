import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useAuthStore } from './store/authStore';

// Sin globals:true en la config de vitest, testing-library no engancha su
// limpieza automatica entre tests.
describe('RutaProtegida - control de acceso por rol', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('un validador autenticado no ve el panel de administracion: se lo manda a su propio dashboard', () => {
    useAuthStore.getState().login('tok', {
      id: 'u-1', name: 'validador@ejemplo.com', lastname: '',
      email: 'validador@ejemplo.com', role: 'VALIDADOR_ESPACIO_PUBLICO',
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/panel de administracion/i)).toBeNull();
    expect(screen.getByText(/dashboard del validador/i)).toBeDefined();
  });

  it('un gestor autenticado no ve el dashboard del validador: se lo manda al propio', () => {
    useAuthStore.getState().login('tok', {
      id: 'u-1', name: 'gestor@ejemplo.com', lastname: '',
      email: 'gestor@ejemplo.com', role: 'GESTOR_ESPACIO_PUBLICO',
    });

    render(
      <MemoryRouter initialEntries={['/validador/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/dashboard del validador/i)).toBeNull();
    expect(screen.getByText(/dashboard del gestor/i)).toBeDefined();
  });

  it('el admin si puede ver el panel de administracion', () => {
    useAuthStore.getState().login('tok', {
      id: 'u-1', name: 'admin@ejemplo.com', lastname: '',
      email: 'admin@ejemplo.com', role: 'ADMIN',
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText(/panel de administracion/i)).toBeDefined();
  });
});
