import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublicLanding } from './PublicLanding';
import { publicoService } from '../../services/publico.service';

vi.mock('../../services/publico.service', () => ({
  publicoService: { cifras: vi.fn(), listar: vi.fn(), obtener: vi.fn() },
}));

const CIFRAS = {
  total: 4,
  porBarrio: { 'EL DORADO': 1, VERACRUZ: 3 },
  cifras: { cambuches: 4, comparendos: 6, capturados: 0 },
};

function renderPantalla() {
  return render(
    <MemoryRouter>
      <PublicLanding />
    </MemoryRouter>,
  );
}

describe('PublicLanding', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (publicoService.cifras as any).mockReset().mockResolvedValue(CIFRAS);
  });

  it('muestra el total de jornadas publicadas', async () => {
    renderPantalla();
    await screen.findByText(/Jornadas publicadas/i);
    // El 4 aparece tambien como cifra de cambuches; basta con que este el total.
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getByText(/2 barrios/)).toBeDefined();
  });

  it('nombra las cifras en lenguaje comun, no con la clave tecnica', async () => {
    renderPantalla();
    expect(await screen.findByText('Cambuches intervenidos')).toBeDefined();
    expect(screen.queryByText('cambuches')).toBeNull();
  });

  it('omite las cifras en cero para no llenar la pantalla de nada', async () => {
    renderPantalla();
    await screen.findByText('Cambuches intervenidos');
    expect(screen.queryByText('Capturas')).toBeNull();
  });

  it('lista los barrios donde se trabajo', async () => {
    renderPantalla();
    expect(await screen.findByText(/EL DORADO/)).toBeDefined();
    expect(screen.getByText(/VERACRUZ/)).toBeDefined();
  });

  // Un fallo nuestro no puede leerse como "el area no hizo nada".
  it('distingue un fallo de carga de no tener jornadas publicadas', async () => {
    (publicoService.cifras as any).mockRejectedValue(new Error('boom'));
    renderPantalla();
    expect(await screen.findByText(/No pudimos cargar las cifras/)).toBeDefined();
    expect(screen.queryByText(/Todavia no hay jornadas/)).toBeNull();
  });

  it('avisa cuando todavia no hay nada publicado', async () => {
    (publicoService.cifras as any).mockResolvedValue({ total: 0, porBarrio: {}, cifras: {} });
    renderPantalla();
    expect(await screen.findByText(/Todavia no hay jornadas publicadas/)).toBeDefined();
  });
});
