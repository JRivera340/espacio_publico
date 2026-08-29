import type { Actividad } from '../types';

// Codigo visible de una actividad. Espeja exactamente el criterio del backend
// (src/actividades/lib/codigo.ts, funcion codigoVisible): mismo prefijo fijo,
// mismo relleno y el mismo marcador para actividades sin secuencia asignada.
// Si alguno de los dos lados cambia el criterio sin el otro, el visor publico
// y el informe muestran codigos distintos para la misma actividad.
export function getActivityCode(actividad: Pick<Actividad, 'categorySeq'>): string {
  const { categorySeq } = actividad;
  if (categorySeq === null || categorySeq === undefined) return 'EP-SN';
  return `EP-${String(categorySeq).padStart(2, '0')}`;
}
