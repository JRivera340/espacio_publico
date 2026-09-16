import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ValidadorDashboard } from './ValidadorDashboard';
import { activityService } from '../../services/activity.service';

vi.mock('../../services/activity.service', () => ({
  activityService: { listPending: vi.fn(), listMyValidations: vi.fn() },
}));

const PENDIENTE = {
  id: 'p1',
  status: 'ENVIADA',
  dateTime: '2026-08-10T14:00:00.000Z',
  barrio: 'SAMPER',
  isNightShift: false,
  categorySeq: 1,
} as any;

const VALIDADA_PUBLICADA = {
  id: 'v1',
  status: 'PUBLICADA',
  dateTime: '2026-08-05T14:00:00.000Z',
  barrio: 'LA MACARENA',
  isNightShift: false,
  categorySeq: 2,
} as any;

const VALIDADA_RECHAZADA = {
  id: 'v2',
  status: 'RECHAZADA',
  dateTime: '2026-08-06T14:00:00.000Z',
  barrio: 'SAMPER',
  isNightShift: true,
  categorySeq: 3,
} as any;

// Los nombres de barrio tambien aparecen como <option> del filtro: esta
// consulta ignora esas opciones para no confundir "sigue en el filtro" con
// "sigue en la lista de resultados".
function filaConTexto(texto: string) {
  return screen.queryAllByText(
    (content, node) => content === texto && node?.tagName.toLowerCase() !== 'option',
  );
}

function renderPantalla() {
  return render(
    <MemoryRouter>
      <ValidadorDashboard />
    </MemoryRouter>,
  );
}

describe('ValidadorDashboard', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (activityService.listPending as any).mockReset().mockResolvedValue({ data: [PENDIENTE], total: 1 });
    (activityService.listMyValidations as any)
      .mockReset()
      .mockResolvedValue({ data: [VALIDADA_PUBLICADA, VALIDADA_RECHAZADA], total: 2 });
  });

  it('renombra la pestana de validadas a Historial', async () => {
    renderPantalla();
    expect(await screen.findByRole('button', { name: 'Historial' })).toBeDefined();
    expect(screen.queryByText('Ya validadas')).toBeNull();
  });

  it('filtra el historial por barrio', async () => {
    renderPantalla();
    fireEvent.click(await screen.findByRole('button', { name: 'Historial' }));
    await screen.findAllByText('LA MACARENA');

    const filtroBarrio = screen.getByLabelText('Barrio') as HTMLSelectElement;
    fireEvent.change(filtroBarrio, { target: { value: 'SAMPER' } });

    await waitFor(() => expect(filaConTexto('LA MACARENA')).toHaveLength(0));
    expect(filaConTexto('SAMPER').length).toBeGreaterThan(0);
  });

  it('filtra el historial por estado', async () => {
    renderPantalla();
    fireEvent.click(await screen.findByRole('button', { name: 'Historial' }));
    await screen.findAllByText('LA MACARENA');

    const filtroEstado = screen.getByLabelText('Estado') as HTMLSelectElement;
    fireEvent.change(filtroEstado, { target: { value: 'RECHAZADA' } });

    await waitFor(() => expect(filaConTexto('LA MACARENA')).toHaveLength(0));
    expect(filaConTexto('SAMPER').length).toBeGreaterThan(0);
  });

  it('no ofrece filtro de estado en la pestana de pendientes', async () => {
    renderPantalla();
    await screen.findAllByText('SAMPER');
    expect(screen.queryByLabelText('Estado')).toBeNull();
  });
});
