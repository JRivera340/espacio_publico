import type { EventoGeo } from './reincidencia.lib';

export type ActOperativo = {
  id: string; operativoSubtipo: string; barrio: string;
  lat: number; lng: number; dateTime?: string; createdAt?: string;
};

const DAY = 86400000;
const fechaMsDe = (a: ActOperativo): number => new Date(a.dateTime ?? a.createdAt ?? 0).getTime();

export function totalYRitmo(acts: ActOperativo[], ahoraMs: number): { total: number; ultimos20d: number; estaSemana: number } {
  let ultimos20d = 0, estaSemana = 0;
  for (const a of acts) {
    const dif = ahoraMs - fechaMsDe(a);
    if (dif <= 20 * DAY) ultimos20d++;
    if (dif <= 7 * DAY) estaSemana++;
  }
  return { total: acts.length, ultimos20d, estaSemana };
}

function agrupar(acts: ActOperativo[], key: (a: ActOperativo) => string): { k: string; total: number }[] {
  const acc: Record<string, number> = {};
  for (const a of acts) { const v = key(a) || 'SIN'; acc[v] = (acc[v] || 0) + 1; }
  return Object.entries(acc).map(([k, total]) => ({ k, total })).sort((x, y) => y.total - x.total);
}

export function porSubtipo(acts: ActOperativo[]): { subtipo: string; total: number }[] {
  return agrupar(acts, a => a.operativoSubtipo).map(({ k, total }) => ({ subtipo: k, total }));
}

export function porBarrio(acts: ActOperativo[]): { barrio: string; total: number }[] {
  return agrupar(acts, a => a.barrio).map(({ k, total }) => ({ barrio: k, total }));
}

export function eventosOperativos(acts: ActOperativo[]): EventoGeo[] {
  return acts.map(a => ({ id: a.id, lat: a.lat, lng: a.lng, barrio: a.barrio, fechaMs: fechaMsDe(a) }));
}
