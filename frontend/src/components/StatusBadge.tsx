import type { ActividadStatus } from '../types';

// Un solo lugar decide como se nombra y se pinta cada estado. El panel y el
// detalle tienen que decir lo mismo de la misma actividad: si cada pantalla
// arma su propio mapa, el dia que se agrega un estado una de las dos lo muestra
// en blanco.
export const BADGE_POR_ESTADO: Record<ActividadStatus, string> = {
  BORRADOR: 'badge-borrador',
  ENVIADA: 'badge-enviada',
  APROBADA: 'badge-aprobada',
  RECHAZADA: 'badge-rechazada',
  PUBLICADA: 'badge-publicada',
};

export const ETIQUETA_POR_ESTADO: Record<ActividadStatus, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PUBLICADA: 'Publicada',
};

export const StatusBadge = ({ status }: { status: ActividadStatus }) => (
  <span className={BADGE_POR_ESTADO[status]}>{ETIQUETA_POR_ESTADO[status]}</span>
);
