import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// La landing publica pide las cifras al montarse. Se mockea para que el test
// sea hermetico: sin esto sale por red de verdad.
vi.mock('./services/publico.service', () => ({
  publicoService: {
    cifras: vi.fn().mockResolvedValue({ total: 0, porBarrio: {}, cifras: {} }),
    listar: vi.fn().mockResolvedValue([]),
    obtener: vi.fn(),
  },
}));

describe('App', () => {
  it('monta sin romper', () => {
    // La raiz es el ingreso: este modulo es la herramienta de trabajo del area.
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByLabelText(/Correo/i)).toBeDefined();
  });

  it('el visor publico vive aparte, en /publico', () => {
    render(
      <MemoryRouter initialEntries={['/publico']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Recuperacion y control del espacio publico/i)).toBeDefined();
  });

  it('la entrada de funcionarios sigue siendo /handoff', () => {
    render(
      <MemoryRouter initialEntries={['/handoff']}>
        <App />
      </MemoryRouter>,
    );
    // Sin token que procesar, termina en la pantalla de error.
    expect(screen.getByText(/no se pudo iniciar sesion/i)).toBeDefined();
  });
});
