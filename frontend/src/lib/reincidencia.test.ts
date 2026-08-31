import { describe, it, expect } from 'vitest';
import { detectarReincidencia, type EventoGeo } from './reincidencia.lib';

const ev = (id: string, lat: number, lng: number, barrio: string, fechaMs: number): EventoGeo =>
  ({ id, lat, lng, barrio, fechaMs });

describe('detectarReincidencia', () => {
  it('agrupa eventos cercanos (<=60m) y marca reincidente con >=2', () => {
    const evs = [
      ev('a', 4.6000, -74.0700, 'X', 1000),
      ev('b', 4.60003, -74.07002, 'X', 2000), // ~4m del anterior
      ev('c', 4.7000, -74.1000, 'Y', 3000),   // lejos → aislado
    ];
    const out = detectarReincidencia(evs, 60, 2);
    expect(out).toHaveLength(1);
    expect(out[0].eventos).toBe(2);
    expect(out[0].ids.sort()).toEqual(['a', 'b']);
    expect(out[0].primeraMs).toBe(1000);
    expect(out[0].ultimaMs).toBe(2000);
  });

  it('evento aislado no reincide', () => {
    expect(detectarReincidencia([ev('a', 4.6, -74.07, 'X', 1)], 60, 2)).toEqual([]);
  });

  it('ordena por nº de eventos desc', () => {
    const evs = [
      ev('a', 4.6, -74.07, 'X', 1), ev('b', 4.60003, -74.07, 'X', 2), ev('c', 4.60003, -74.07002, 'X', 3),
      ev('d', 4.5, -74.0, 'Z', 1), ev('e', 4.50003, -74.0, 'Z', 2),
    ];
    const out = detectarReincidencia(evs, 60, 2);
    expect(out[0].eventos).toBe(3);
    expect(out[1].eventos).toBe(2);
  });
});
