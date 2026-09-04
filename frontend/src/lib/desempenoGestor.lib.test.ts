import { describe, it, expect } from 'vitest';
import { resumenDelMes } from './desempenoGestor.lib';
import type { ProgramacionItem } from '../services/programacion.service';
import type { Actividad } from '../types';

const AHORA = new Date(2026, 8, 20, 12); // 20 de septiembre 2026, mediodia

function item(fecha: string, estado: ProgramacionItem['estado']): ProgramacionItem {
  return {
    id: fecha + estado, fecha, descripcion: 'x', estado, creadoPorUserId: 'v-1',
  };
}

function actividad(dateTime: string): Actividad {
  return { id: dateTime, dateTime } as Actividad;
}

describe('desempenoGestor.lib', () => {
  it('cuenta programadas, cumplidas, pendientes y vencidas solo del mes de referencia', () => {
    const programacion: ProgramacionItem[] = [
      item('2026-09-05T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-10T10:00:00.000Z', 'PENDIENTE'), // ya paso, vencida
      item('2026-09-25T10:00:00.000Z', 'PENDIENTE'), // todavia no llega
      item('2026-08-15T10:00:00.000Z', 'CUMPLIDA'), // mes distinto, no cuenta
    ];

    const resumen = resumenDelMes(programacion, [], new Date(2026, 8, 1), AHORA);

    expect(resumen.programadasMes).toBe(3);
    expect(resumen.cumplidasMes).toBe(1);
    expect(resumen.vencidasMes).toBe(1);
    expect(resumen.pendientesMes).toBe(1);
  });

  it('el cumplimiento es cumplidas sobre cumplidas mas vencidas, sin contar lo que todavia no vence', () => {
    const programacion: ProgramacionItem[] = [
      item('2026-09-05T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-06T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-10T10:00:00.000Z', 'PENDIENTE'), // vencida
      item('2026-09-25T10:00:00.000Z', 'PENDIENTE'), // no vence todavia
    ];

    const resumen = resumenDelMes(programacion, [], new Date(2026, 8, 1), AHORA);

    // 2 cumplidas / (2 cumplidas + 1 vencida) = 66.67% -> redondeado 67
    expect(resumen.porcentajeCumplimiento).toBe(67);
  });

  it('sin cumplidas ni vencidas el cumplimiento es 100 (el mes no tuvo incumplimientos)', () => {
    const resumen = resumenDelMes([], [], new Date(2026, 8, 1), AHORA);
    expect(resumen.porcentajeCumplimiento).toBe(100);
  });

  it('cuenta las actividades registradas en el mes, sin importar su estado de programacion', () => {
    const actividades: Actividad[] = [
      actividad('2026-09-03T10:00:00.000Z'),
      actividad('2026-09-18T10:00:00.000Z'),
      actividad('2026-08-30T10:00:00.000Z'), // otro mes
    ];
    const resumen = resumenDelMes([], actividades, new Date(2026, 8, 1), AHORA);
    expect(resumen.actividadesRegistradasMes).toBe(2);
  });
});
