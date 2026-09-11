import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PerfilGestorPage } from './PerfilGestorPage';
import { programacionService } from '../../services/programacion.service';
import { activityService } from '../../services/activity.service';

vi.mock('../../services/programacion.service', () => ({
  programacionService: { mias: vi.fn() },
}));
vi.mock('../../services/activity.service', () => ({
  activityService: { listMine: vi.fn(), descargarPazYSalvo: vi.fn() },
}));
vi.mock('../../store/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({ user: { id: 'g-1', name: 'Rosa', lastname: 'Diaz', email: 'rosa@ejemplo.com', role: 'GESTOR_ESPACIO_PUBLICO' } }),
}));

afterEach(cleanup);

describe('PerfilGestorPage', () => {
  it('muestra el porcentaje de cumplimiento del mes actual', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
    (programacionService.mias as any).mockResolvedValue([
      { id: '1', fecha: '2026-09-05T10:00:00.000Z', descripcion: 'x', estado: 'CUMPLIDA', creadoPorUserId: 'v-1' },
      { id: '2', fecha: '2026-09-10T10:00:00.000Z', descripcion: 'y', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
    ]);
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });

    render(<MemoryRouter><PerfilGestorPage /></MemoryRouter>);

    await vi.waitFor(() => expect(screen.getByText('Mi perfil')).toBeTruthy());
    await vi.waitFor(() => expect(screen.getByText('50%')).toBeTruthy()); // 1 cumplida / (1 cumplida + 1 vencida)

    vi.useRealTimers();
  });

  it('muestra las actividades registradas en el mes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
    (programacionService.mias as any).mockResolvedValue([]);
    (activityService.listMine as any).mockResolvedValue({
      data: [{ id: 'a1', dateTime: '2026-09-03T10:00:00.000Z' }, { id: 'a2', dateTime: '2026-08-01T10:00:00.000Z' }],
      total: 2,
    });

    render(<MemoryRouter><PerfilGestorPage /></MemoryRouter>);

    await vi.waitFor(() => expect(screen.getByText('1')).toBeTruthy()); // solo la de septiembre

    vi.useRealTimers();
  });

  it('descarga el paz y salvo con el periodo elegido', async () => {
    (programacionService.mias as any).mockResolvedValue([]);
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });
    (activityService.descargarPazYSalvo as any).mockResolvedValue(new Blob(['x']));
    (URL as any).createObjectURL = vi.fn(() => 'blob:fake');
    (URL as any).revokeObjectURL = vi.fn();

    render(<MemoryRouter><PerfilGestorPage /></MemoryRouter>);
    await screen.findByText('Mi perfil');

    fireEvent.click(screen.getByRole('button', { name: /Descargar PDF/i }));

    await waitFor(() => expect(activityService.descargarPazYSalvo).toHaveBeenCalled());
  });
});
