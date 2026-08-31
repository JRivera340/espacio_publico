import { describe, it, expect } from 'vitest';
import { totalYRitmo, porSubtipo, porBarrio, eventosOperativos, type ActOperativo } from './indicadoresOperativos.lib';

const AHORA = Date.parse('2026-07-08T12:00:00Z');
const dias = (n: number) => new Date(AHORA - n * 86400000).toISOString();
const a = (o: Partial<ActOperativo> & { id: string }): ActOperativo => ({
  operativoSubtipo: 'X', barrio: 'B', lat: 4.6, lng: -74.07, dateTime: dias(1), ...o,
});

describe('totalYRitmo', () => {
  it('cuenta total, últimos 20d y esta semana', () => {
    const acts = [a({ id: '1', dateTime: dias(1) }), a({ id: '2', dateTime: dias(10) }), a({ id: '3', dateTime: dias(40) })];
    const r = totalYRitmo(acts, AHORA);
    expect(r.total).toBe(3);
    expect(r.ultimos20d).toBe(2);
    expect(r.estaSemana).toBe(1); // solo dias(1) está dentro de 7d
  });
});

describe('porSubtipo', () => {
  it('agrupa por subtipo, desc', () => {
    const acts = [a({ id: '1', operativoSubtipo: 'COM' }), a({ id: '2', operativoSubtipo: 'COM' }), a({ id: '3', operativoSubtipo: 'PAG' })];
    expect(porSubtipo(acts)).toEqual([{ subtipo: 'COM', total: 2 }, { subtipo: 'PAG', total: 1 }]);
  });
});

describe('porBarrio', () => {
  it('agrupa por barrio, desc', () => {
    const acts = [a({ id: '1', barrio: 'LAS NIEVES' }), a({ id: '2', barrio: 'LAS NIEVES' }), a({ id: '3', barrio: 'VERACRUZ' })];
    expect(porBarrio(acts)[0]).toEqual({ barrio: 'LAS NIEVES', total: 2 });
  });
});

describe('eventosOperativos', () => {
  it('mapea a EventoGeo con fechaMs', () => {
    const out = eventosOperativos([a({ id: '1', lat: 4.6, lng: -74.07, barrio: 'B', dateTime: dias(1) })]);
    expect(out[0]).toMatchObject({ id: '1', lat: 4.6, lng: -74.07, barrio: 'B' });
    expect(typeof out[0].fechaMs).toBe('number');
  });
});
