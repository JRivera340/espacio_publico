import { describe, it, expect } from 'vitest';
import { gridDelMes, mesSiguiente, mesAnterior, tituloMes, mismoDia } from './calendar.lib';

describe('calendar.lib', () => {
  it('genera una grilla de 42 dias que empieza en lunes', () => {
    const grid = gridDelMes(new Date(2026, 8, 15)); // septiembre 2026
    expect(grid).toHaveLength(42);
    expect(grid[0].fecha.getDay()).toBe(1);
  });

  it('marca los dias que pertenecen al mes de referencia', () => {
    const grid = gridDelMes(new Date(2026, 8, 15));
    const enMes = grid.filter((d) => d.enMes);
    expect(enMes).toHaveLength(30);
    expect(enMes[0].fecha.getDate()).toBe(1);
    expect(enMes[29].fecha.getDate()).toBe(30);
  });

  it('mesSiguiente y mesAnterior mueven exactamente un mes', () => {
    const base = new Date(2026, 8, 15);
    expect(mesSiguiente(base).getMonth()).toBe(9);
    expect(mesAnterior(base).getMonth()).toBe(7);
  });

  it('tituloMes devuelve el nombre en espanol capitalizado', () => {
    expect(tituloMes(new Date(2026, 8, 1))).toBe('Septiembre 2026');
  });

  it('mismoDia compara solo la fecha, no la hora', () => {
    expect(mismoDia(new Date(2026, 8, 15, 3), new Date(2026, 8, 15, 22))).toBe(true);
    expect(mismoDia(new Date(2026, 8, 15), new Date(2026, 8, 16))).toBe(false);
  });
});
