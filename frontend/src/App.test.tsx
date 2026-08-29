import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useAuthStore } from './store/authStore';

// Sin este mock, el timeout que arma App tras un session-expired terminaria
// llamando a la navegacion real del hub (window.location.replace) durante
// el test.
vi.mock('./config/hub', () => ({
  irAlLoginDelHub: vi.fn(),
  HUB_URL: 'https://hub.test',
  HUB_LOGIN_URL: 'https://hub.test/login?logout=1',
}));

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

describe('evento session-expired', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useAuthStore.getState().logout();
    vi.clearAllMocks();
  });

  it('limpia isAuthenticated en el store al despacharse', () => {
    useAuthStore.getState().login('tok', {
      id: 'u-1', name: 'gestor@ejemplo.com', lastname: '',
      email: 'gestor@ejemplo.com', role: 'GESTOR_ESPACIO_PUBLICO',
    });

    render(
      <MemoryRouter initialEntries={['/gestor/dashboard']}>
        <App />
      </MemoryRouter>,
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    window.dispatchEvent(new Event('session-expired'));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('registra el oyente al montar y lo quita al desmontar', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(addSpy).toHaveBeenCalledWith('session-expired', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('session-expired', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
