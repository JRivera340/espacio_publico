import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { EquipoCronogramaPanel } from './EquipoCronogramaPanel';
import type { ProgramacionItem } from '../services/programacion.service';
import type { Actividad } from '../types';

afterEach(cleanup);

const GESTORES = [{ id: 'g-1', nombre: 'Ana Perez' }, { id: 'g-2', nombre: 'Luis Mora' }];

const PROGRAMACION: ProgramacionItem[] = [
  { id: '1', fecha: '2026-09-15T15:00:00.000Z', descripcion: 'Operativo andenes', barrio: 'LAS CRUCES', estado: 'PENDIENTE', gestorUserIds: ['g-1'], creadoPorUserId: 'v-1' },
  { id: '2', fecha: '2026-09-16T15:00:00.000Z', descripcion: 'Operativo cachivacheros', barrio: 'SAN DIEGO', estado: 'CUMPLIDA', gestorUserIds: ['g-2'], creadoPorUserId: 'v-1' },
];

function conFechaFija(fechaIso: string, fn: () => void) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(fechaIso));
  try {
    fn();
  } finally {
    vi.useRealTimers();
  }
}

describe('EquipoCronogramaPanel', () => {
  it('sin filtrar por gestor muestra la tabla de cumplimiento de todo el equipo', () => {
    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<EquipoCronogramaPanel programacion={PROGRAMACION} actividades={[]} gestores={GESTORES} />);
    });
    expect(screen.getByRole('cell', { name: 'Ana Perez' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Luis Mora' })).toBeTruthy();
  });

  it('al elegir un gestor el calendario solo marca lo suyo y aparecen sus KPIs individuales', () => {
    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<EquipoCronogramaPanel programacion={PROGRAMACION} actividades={[]} gestores={GESTORES} />);
    });

    fireEvent.change(screen.getByLabelText('Gestor'), { target: { value: 'g-1' } });

    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));
    expect(screen.getByText('Operativo andenes')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /16 de septiembre/i }));
    expect(screen.queryByText('Operativo cachivacheros')).toBeNull();
  });

  it('la lista del dia seleccionado muestra a que gestor le corresponde cada item', () => {
    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<EquipoCronogramaPanel programacion={PROGRAMACION} actividades={[]} gestores={GESTORES} />);
    });
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));
    expect(screen.getByText(/Ana Perez - LAS CRUCES/)).toBeTruthy();
  });
});
