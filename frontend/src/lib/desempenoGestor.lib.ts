import type { ProgramacionItem } from '../services/programacion.service';
import type { Actividad } from '../types';
import type { GestorResumen } from '../services/users.service';

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

export interface ResumenPorGestor extends ResumenDesempeno {
  gestorId: string;
  nombre: string;
}

// Un resumen por cada gestor del area, ordenado del que mejor cumple al que
// peor. Sirve tanto para "todos los gestores" en el cronograma del equipo
// como para el informe de desempeno: misma cuenta, un solo lugar que la hace.
export function resumenPorGestor(
  programacion: ProgramacionItem[],
  actividades: Actividad[],
  mesRef: Date,
  ahora: Date,
  gestores: GestorResumen[],
): ResumenPorGestor[] {
  return gestores
    .map((g) => {
      const resumen = resumenDelMes(
        programacion.filter((p) => p.gestorUserId === g.id),
        actividades.filter((a) => a.createdByUserId === g.id),
        mesRef,
        ahora,
      );
      return { gestorId: g.id, nombre: g.nombre, ...resumen };
    })
    .sort((a, b) => b.porcentajeCumplimiento - a.porcentajeCumplimiento);
}
