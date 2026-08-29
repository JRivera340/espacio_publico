import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GestorDashboard } from './GestorDashboard';
import { activityService } from '../../services/activity.service';

vi.mock('../../services/activity.service', () => ({
  activityService: { listMine: vi.fn(), misEstadisticas: vi.fn() },
}));

describe('GestorDashboard', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (activityService.misEstadisticas as any).mockResolvedValue({ enviada: 1, aprobada: 2, rechazada: 0 });
  });

  it('lista las actividades propias', async () => {
    (activityService.listMine as any).mockResolvedValue({
      data: [{ id: 'a1', barrio: 'LA MACARENA', status: 'BORRADOR', dateTime: '2026-08-20T14:00:00.000Z', categorySeq: 1 }],
      total: 1,
    });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('table')).toBeDefined());
    expect(within(screen.getByRole('table')).getByText(/LA MACARENA/)).toBeDefined();
  });

  it('muestra un mensaje cuando el gestor no tiene actividades', async () => {
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/no tienes actividades|sin actividades/i)).toBeDefined());
  });

  it('no ofrece ningun control para pedir actividades de otro gestor', async () => {
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(activityService.listMine).toHaveBeenCalled());
    // listMine se llama sin ningun identificador de usuario/gestor: el
    // backend decide de quien son las actividades a partir del token.
    const filtrosEnviados = (activityService.listMine as any).mock.calls[0][0];
    expect(filtrosEnviados).not.toHaveProperty('userId');
    expect(filtrosEnviados).not.toHaveProperty('gestorId');
    expect(filtrosEnviados).not.toHaveProperty('createdByUserId');
  });

  it('llama a misEstadisticas para mostrar los contadores', async () => {
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('1')).toBeDefined());
    expect(screen.getByText('2')).toBeDefined();
  });
});
