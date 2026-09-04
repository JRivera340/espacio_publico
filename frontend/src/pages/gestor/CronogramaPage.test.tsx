import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CronogramaPage } from './CronogramaPage';
import { programacionService } from '../../services/programacion.service';

vi.mock('../../services/programacion.service', () => ({
  programacionService: { mias: vi.fn() },
}));

afterEach(cleanup);

function conFechaFija(fechaIso: string, fn: () => void) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(fechaIso));
  try {
    fn();
  } finally {
    vi.useRealTimers();
  }
}

describe('CronogramaPage', () => {
  it('muestra el mes actual con el dia de una actividad programada marcado', async () => {
    (programacionService.mias as any).mockResolvedValue([
      { id: '1', fecha: '2026-09-15T15:00:00.000Z', descripcion: 'Operativo andenes', barrio: 'LAS CRUCES', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
    ]);

    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<MemoryRouter><CronogramaPage /></MemoryRouter>);
    });

    expect(await screen.findByText('Septiembre 2026')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));
    expect(screen.getByText('Operativo andenes')).toBeTruthy();
  });

  it('al hacer clic en un dia muestra el detalle de lo programado ese dia', async () => {
    (programacionService.mias as any).mockResolvedValue([
      { id: '1', fecha: '2026-09-15T15:00:00.000Z', descripcion: 'Operativo andenes', barrio: 'LAS CRUCES', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
      { id: '2', fecha: '2026-09-20T15:00:00.000Z', descripcion: 'Operativo cachivacheros', barrio: 'SAN DIEGO', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
    ]);

    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<MemoryRouter><CronogramaPage /></MemoryRouter>);
    });

    await screen.findByText('Septiembre 2026');
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));

    expect(screen.getByText('Operativo andenes')).toBeTruthy();
    expect(screen.queryByText('Operativo cachivacheros')).toBeNull();
  });

  it('sin programacion muestra el estado vacio, con el calendario igual visible', async () => {
    (programacionService.mias as any).mockResolvedValue([]);

    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<MemoryRouter><CronogramaPage /></MemoryRouter>);
    });

    expect(await screen.findByText('Septiembre 2026')).toBeTruthy();
    expect(screen.getByText(/Cuando el area cargue la programacion/i)).toBeTruthy();
  });
});
