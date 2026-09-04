import type { ProgramacionItem } from '../services/programacion.service';
import type { Actividad } from '../types';

export interface ResumenDesempeno {
  programadasMes: number;
  cumplidasMes: number;
  pendientesMes: number;
  vencidasMes: number;
  porcentajeCumplimiento: number;
  actividadesRegistradasMes: number;
}

function delMismoMes(fechaIso: string, mesRef: Date): boolean {
  const f = new Date(fechaIso);
  return f.getFullYear() === mesRef.getFullYear() && f.getMonth() === mesRef.getMonth();
}

// El cumplimiento se mide contra lo que YA debia estar resuelto (cumplidas +
// vencidas). Lo pendiente que todavia no llego a su fecha no cuenta ni a
// favor ni en contra: el mes no termino, no hay como haber incumplido algo
// que todavia no vence.
export function resumenDelMes(
  programacion: ProgramacionItem[],
  actividades: Actividad[],
  mesRef: Date,
  ahora: Date,
): ResumenDesempeno {
  const delMes = programacion.filter((p) => delMismoMes(p.fecha, mesRef));

  const cumplidasMes = delMes.filter((p) => p.estado === 'CUMPLIDA').length;
  const vencidasMes = delMes.filter((p) => p.estado === 'PENDIENTE' && new Date(p.fecha) < ahora).length;
  const pendientesMes = delMes.filter((p) => p.estado === 'PENDIENTE' && new Date(p.fecha) >= ahora).length;

  const base = cumplidasMes + vencidasMes;
  const porcentajeCumplimiento = base === 0 ? 100 : Math.round((cumplidasMes / base) * 100);

  const actividadesRegistradasMes = actividades.filter((a) => delMismoMes(a.dateTime, mesRef)).length;

  return { programadasMes: delMes.length, cumplidasMes, pendientesMes, vencidasMes, porcentajeCumplimiento, actividadesRegistradasMes };
}
