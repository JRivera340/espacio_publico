import api from './api';

// La programacion es la PLANEACION: el validador carga lo que los gestores van
// a tener que hacer. La actividad es la EJECUCION. Son cosas distintas y viven
// en tablas distintas: un item programado no es una actividad registrada.

export type ProgramacionEstado = 'PENDIENTE' | 'CUMPLIDA' | 'CANCELADA';

export interface ProgramacionItem {
  id: string;
  fecha: string;
  barrio?: string | null;
  descripcion: string;
  gestorUserIds: string[];
  creadoPorUserId: string;
  estado: ProgramacionEstado;
  actividadId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Lo que se manda para crear. El backend acepta un lote: una programacion se
 *  carga completa, no de a una fila. */
export interface NuevoProgramacionItem {
  fecha: string;
  barrio?: string;
  descripcion: string;
  gestorUserIds?: string[];
}

export interface FiltrosProgramacion {
  desde?: string;
  hasta?: string;
  gestor?: string;
  estado?: ProgramacionEstado;
}

function construirQuery(filtros?: FiltrosProgramacion): string {
  const params = new URLSearchParams();
  if (filtros?.desde) params.append('desde', filtros.desde);
  if (filtros?.hasta) params.append('hasta', filtros.hasta);
  if (filtros?.gestor) params.append('gestor', filtros.gestor);
  if (filtros?.estado) params.append('estado', filtros.estado);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function normalizar(item: any): ProgramacionItem {
  return { ...item, fecha: typeof item?.fecha === 'string' ? item.fecha : new Date(item?.fecha).toISOString() };
}

function comoLista(datos: any): ProgramacionItem[] {
  if (Array.isArray(datos)) return datos.map(normalizar);
  if (Array.isArray(datos?.data)) return datos.data.map(normalizar);
  return [];
}

export const programacionService = {
  /** VALIDADOR: carga la programacion. Acepta varias filas de un saque. */
  async crear(items: NuevoProgramacionItem[]): Promise<ProgramacionItem[]> {
    const { data } = await api.post('/programacion', items);
    return comoLista(data);
  },

  /** VALIDADOR y ADMIN: toda la programacion del area. */
  async listar(filtros?: FiltrosProgramacion): Promise<ProgramacionItem[]> {
    const { data } = await api.get(`/programacion${construirQuery(filtros)}`);
    return comoLista(data);
  },

  /**
   * GESTOR: su propio cronograma.
   *
   * El backend saca el gestor del token, nunca de un parametro: esta ruta no
   * acepta pedir la programacion de otra persona.
   */
  async mias(filtros?: Omit<FiltrosProgramacion, 'gestor'>): Promise<ProgramacionItem[]> {
    const { data } = await api.get(`/programacion/mias${construirQuery(filtros)}`);
    return comoLista(data);
  },

  async actualizar(id: string, cambios: Partial<NuevoProgramacionItem & { estado: ProgramacionEstado }>): Promise<ProgramacionItem> {
    const { data } = await api.patch(`/programacion/${id}`, cambios);
    return normalizar(data);
  },

  async eliminar(id: string): Promise<void> {
    await api.delete(`/programacion/${id}`);
  },
};
