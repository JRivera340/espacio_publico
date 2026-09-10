import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MonthCalendar } from './MonthCalendar';
import type { ProgramacionItem } from '../services/programacion.service';

const ITEMS: ProgramacionItem[] = [
  { id: '1', fecha: '2026-09-15T10:00:00.000Z', descripcion: 'Operativo A', estado: 'PENDIENTE', creadoPorUserId: 'v-1', gestorUserIds: [] },
  { id: '2', fecha: '2026-09-15T14:00:00.000Z', descripcion: 'Operativo B', estado: 'CUMPLIDA', creadoPorUserId: 'v-1', gestorUserIds: [] },
];

describe('MonthCalendar', () => {
  afterEach(() => cleanup());

  it('muestra el titulo del mes recibido', () => {
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={vi.fn()} items={[]} diaSeleccionado={null} onSeleccionarDia={vi.fn()} />,
    );
    expect(screen.getByText('Septiembre 2026')).toBeTruthy();
  });

  it('el boton de mes siguiente avanza un mes exacto', () => {
    const onMesChange = vi.fn();
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={onMesChange} items={[]} diaSeleccionado={null} onSeleccionarDia={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText('Mes siguiente'));
    const llamado: Date = onMesChange.mock.calls[0][0];
    expect(llamado.getMonth()).toBe(9);
  });

  it('el boton de mes anterior retrocede un mes exacto', () => {
    const onMesChange = vi.fn();
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={onMesChange} items={[]} diaSeleccionado={null} onSeleccionarDia={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText('Mes anterior'));
    const llamado: Date = onMesChange.mock.calls[0][0];
    expect(llamado.getMonth()).toBe(7);
  });

  it('avisa al hacer clic en un dia', () => {
    const onSeleccionarDia = vi.fn();
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={vi.fn()} items={ITEMS} diaSeleccionado={null} onSeleccionarDia={onSeleccionarDia} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));
    expect(onSeleccionarDia).toHaveBeenCalledTimes(1);
    const fecha: Date = onSeleccionarDia.mock.calls[0][0];
    expect(fecha.getDate()).toBe(15);
  });

  it('el dia con items muestra un indicador por cada uno', () => {
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={vi.fn()} items={ITEMS} diaSeleccionado={null} onSeleccionarDia={vi.fn()} />,
    );
    const dia15 = screen.getByRole('button', { name: /15 de septiembre/i });
    expect(dia15.querySelectorAll('[data-indicador-estado]')).toHaveLength(2);
  });
});
