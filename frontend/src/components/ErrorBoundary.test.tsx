import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ComponenteQueTruena(): JSX.Element {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  afterEach(cleanup);

  it('muestra el contenido normal cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>todo bien</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('todo bien')).toBeDefined();
  });

  it('atrapa la excepcion de render y muestra un mensaje con boton de recarga', () => {
    // React loguea el error de todos modos por consola - se silencia para
    // que el test no ensucie la salida, no para esconder un fallo real.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ComponenteQueTruena />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/algo salio mal/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /recargar pagina/i })).toBeDefined();

    consoleSpy.mockRestore();
  });
});
