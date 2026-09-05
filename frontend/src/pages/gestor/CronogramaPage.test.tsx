import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CronogramaPage } from './CronogramaPage';
import { programacionService } from '../../services/programacion.service';

vi.mock('../../services/programacion.service', () => ({
  programacionService: { mias: vi.fn() },
}));

afterEach(cleanup);

describe('CronogramaPage', () => {
  it('muestra el mes actual con el dia de una actividad programada marcado', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T12:00:00.000Z'));
    (programacionService.mias as any).mockResolvedValue([
      { id: '1', fecha: '2026-09-15T15:00:00.000Z', descripcion: 'Operativo andenes', barrio: 'LAS CRUCES', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
    ]);

    render(<MemoryRouter><CronogramaPage /></MemoryRouter>);

    await vi.waitFor(() => expect(screen.getByText('Septiembre 2026')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));
    expect(screen.getByText('Operativo andenes')).toBeTruthy();

    vi.useRealTimers();
  });

  it('al hacer clic en un dia muestra el detalle de lo programado ese dia', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T12:00:00.000Z'));
    (programacionService.mias as any).mockResolvedValue([
      { id: '1', fecha: '2026-09-15T15:00:00.000Z', descripcion: 'Operativo andenes', barrio: 'LAS CRUCES', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
      { id: '2', fecha: '2026-09-20T15:00:00.000Z', descripcion: 'Operativo cachivacheros', barrio: 'SAN DIEGO', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
    ]);

    render(<MemoryRouter><CronogramaPage /></MemoryRouter>);

    await vi.waitFor(() => expect(screen.getByText('Septiembre 2026')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));

    expect(screen.getByText('Operativo andenes')).toBeTruthy();
    expect(screen.queryByText('Operativo cachivacheros')).toBeNull();

    vi.useRealTimers();
  });

  it('sin programacion muestra el estado vacio, con el calendario igual visible', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T12:00:00.000Z'));
    (programacionService.mias as any).mockResolvedValue([]);

    render(<MemoryRouter><CronogramaPage /></MemoryRouter>);

    await vi.waitFor(() => expect(screen.getByText('Septiembre 2026')).toBeTruthy());
    expect(screen.getByText(/Cuando el area cargue la programacion/i)).toBeTruthy();

    vi.useRealTimers();
  });
});
