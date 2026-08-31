import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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

// El panel del gestor pide sus actividades al montarse - sin este mock estos
// tests de ruteo harian una llamada de red real.
vi.mock('./services/activity.service', () => ({
  activityService: {
    listMine: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    misEstadisticas: vi.fn().mockResolvedValue({ enviada: 0, aprobada: 0, rechazada: 0 }),
    listPending: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    listMyValidations: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    listAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
}));

// El panel del validador y el de programacion tambien piden datos al montarse.
vi.mock('./services/programacion.service', () => ({
  programacionService: {
    listar: vi.fn().mockResolvedValue([]),
    mias: vi.fn().mockResolvedValue([]),
  },
}));

// Sin globals:true en la config de vitest, testing-library no engancha su
// limpieza automatica entre tests.
describe('RutaProtegida - control de acceso por rol', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('un validador autenticado no ve el panel de administracion: se lo manda a su propio dashboard', async () => {
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
    expect((await screen.findAllByText(/esperando validacion/i)).length).toBeGreaterThan(0);
  });

  it('un gestor autenticado no ve el dashboard del validador: se lo manda al propio', async () => {
    useAuthStore.getState().login('tok', {
      id: 'u-1', name: 'gestor@ejemplo.com', lastname: '',
      email: 'gestor@ejemplo.com', role: 'GESTOR_ESPACIO_PUBLICO',
    });

    render(
      <MemoryRouter initialEntries={['/validador/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryAllByText(/esperando validacion/i)).toHaveLength(0);
    await waitFor(() => expect(screen.getByText(/panel del gestor/i)).toBeDefined());
  });

  it('el admin si puede ver el panel de administracion', async () => {
    useAuthStore.getState().login('tok', {
      id: 'u-1', name: 'admin@ejemplo.com', lastname: '',
      email: 'admin@ejemplo.com', role: 'ADMIN',
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/indicadores del area/i)).toBeDefined();
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
