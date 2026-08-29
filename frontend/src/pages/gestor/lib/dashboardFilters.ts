import type { Actividad, ActividadStatus } from '../../../types';

// Filtros que aplican sobre lo que ya devolvio el backend (listMine). El
// backend filtra por rango de fechas via querystring; estos filtros afinan
// lo que ya llego, no piden datos de otro gestor.
export interface DashboardFilters {
  status?: ActividadStatus | '';
  barrio?: string;
  turno?: 'DIURNO' | 'NOCTURNO' | '';
}

export function filterActividades(actividades: Actividad[], filtros: DashboardFilters): Actividad[] {
  return actividades.filter((a) => {
    if (filtros.status && a.status !== filtros.status) return false;
    if (filtros.barrio && a.barrio !== filtros.barrio) return false;
    if (filtros.turno) {
      const esNocturna = Boolean(a.isNightShift);
      if (filtros.turno === 'DIURNO' && esNocturna) return false;
      if (filtros.turno === 'NOCTURNO' && !esNocturna) return false;
    }
    return true;
  });
}

export function barriosUnicos(actividades: Actividad[]): string[] {
  return Array.from(new Set(actividades.map((a) => a.barrio))).sort();
}

export function esEditable(actividad: Pick<Actividad, 'status'>): boolean {
  return actividad.status === 'RECHAZADA';
}

export function inicioDeMes(fecha: Date = new Date()): string {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  return formatearFecha(d);
}

export function finDeMes(fecha: Date = new Date()): string {
  const d = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  return formatearFecha(d);
}

function formatearFecha(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
