import axios from 'axios';

// Cliente propio, SIN el interceptor que agrega el token. El visor publico es
// anonimo: no puede arrastrar la sesion de nadie ni disparar el evento de
// sesion vencida si el backend responde 401.
const baseURL = (() => {
  const envUrl = import.meta.env.VITE_EP_API_URL as string | undefined;
  return envUrl ? `${envUrl.replace(/\/$/, '')}/api` : '/api';
})();

const publicApi = axios.create({ baseURL, timeout: 20000 });

/** Lo que el backend deja salir de una actividad publicada. Nada mas que esto. */
export interface JornadaPublica {
  id: string;
  fecha: string;
  lat: number | null;
  lng: number | null;
  barrio: string;
  subtipo: string;
  codigo: string;
  photos: string[];
  cifras: Record<string, number> | null;
}

export interface CifrasPublicas {
  total: number;
  porBarrio: Record<string, number>;
  cifras: Record<string, number>;
}

export interface FiltrosPublicos {
  desde?: string;
  hasta?: string;
  barrio?: string;
  limit?: number;
  offset?: number;
}

function construirQuery(filtros?: FiltrosPublicos): string {
  const params = new URLSearchParams();
  if (filtros?.desde) params.append('desde', filtros.desde);
  if (filtros?.hasta) params.append('hasta', filtros.hasta);
  if (filtros?.barrio) params.append('barrio', filtros.barrio);
  if (filtros?.limit) params.append('limit', String(filtros.limit));
  if (filtros?.offset !== undefined) params.append('offset', String(filtros.offset));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function comoLista(datos: any): JornadaPublica[] {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.data)) return datos.data;
  return [];
}

export const publicoService = {
  async listar(filtros?: FiltrosPublicos): Promise<JornadaPublica[]> {
    const { data } = await publicApi.get(`/publico/actividades${construirQuery(filtros)}`);
    return comoLista(data);
  },

  async obtener(id: string): Promise<JornadaPublica> {
    const { data } = await publicApi.get(`/publico/actividades/${id}`);
    return data as JornadaPublica;
  },

  async cifras(filtros?: FiltrosPublicos): Promise<CifrasPublicas> {
    const { data } = await publicApi.get(`/publico/cifras${construirQuery(filtros)}`);
    return {
      total: data?.total ?? 0,
      porBarrio: data?.porBarrio ?? {},
      cifras: data?.cifras ?? {},
    };
  },
};
