import api from './api';
import { authService } from './auth.service';
import type { Actividad, ActividadFilters, CreateActividadDTO, PaginatedResponse } from '../types';

// Normaliza los campos que deben ser arrays, por si el backend devuelve un
// valor suelto en vez de un array de un elemento.
function normalizeActividad(actividad: any): Actividad {
  return {
    ...actividad,
    photos: Array.isArray(actividad.photos)
      ? actividad.photos
      : (actividad.photos ? [actividad.photos] : []),
    entidadesAcompanantes: Array.isArray(actividad.entidadesAcompanantes)
      ? actividad.entidadesAcompanantes
      : (actividad.entidadesAcompanantes ? [actividad.entidadesAcompanantes] : []),
  };
}

// Normaliza una respuesta paginada del backend a { data, total }, tolerando
// que el backend devuelva un array plano en vez del envoltorio { data, total }.
function unwrapPaginated(data: any): PaginatedResponse<Actividad> {
  if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
    const normalizedData = Array.isArray(data.data) ? data.data.map(normalizeActividad) : [];
    return { data: normalizedData, total: data.total || normalizedData.length };
  }
  const actividades = Array.isArray(data) ? (data as any[]).map(normalizeActividad) : [];
  return { data: actividades, total: actividades.length };
}

function buildQuery(filters?: ActividadFilters): string {
  const params = new URLSearchParams();
  if (filters?.desde) params.append('desde', filters.desde);
  if (filters?.hasta) params.append('hasta', filters.hasta);
  if (filters?.gestor) params.append('gestor', filters.gestor);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const activityService = {
  // GESTOR: crear actividad
  async create(dto: CreateActividadDTO): Promise<Actividad> {
    const { data } = await api.post<Actividad>('/actividades', dto);
    return normalizeActividad(data);
  },

  // GESTOR: enviar actividad a validacion
  async send(id: string): Promise<Actividad> {
    const { data } = await api.post<Actividad>(`/actividades/${id}/send`);
    return normalizeActividad(data);
  },

  // VALIDADOR: actividades esperando validacion
  async listPending(filters?: ActividadFilters): Promise<PaginatedResponse<Actividad>> {
    const { data } = await api.get<PaginatedResponse<Actividad>>(`/actividades/pending${buildQuery(filters)}`);
    return unwrapPaginated(data);
  },

  // VALIDADOR: lo que ya valide
  async listMyValidations(filters?: ActividadFilters): Promise<PaginatedResponse<Actividad>> {
    const { data } = await api.get<PaginatedResponse<Actividad>>(`/actividades/my-validations${buildQuery(filters)}`);
    return unwrapPaginated(data);
  },

  // VALIDADOR y ADMIN: todas las actividades del area
  async listAll(filters?: ActividadFilters): Promise<PaginatedResponse<Actividad>> {
    const { data } = await api.get<PaginatedResponse<Actividad>>(`/actividades${buildQuery(filters)}`);
    return unwrapPaginated(data);
  },

  // VALIDADOR: aprobar. selectedPhotos son las fotos que SI se publican; las
  // que no elija no salen al visor publico.
  async approve(id: string, notes?: string, selectedPhotos?: string[]): Promise<Actividad> {
    const { data } = await api.post<Actividad>(`/actividades/${id}/approve`, { notes, selectedPhotos });
    return normalizeActividad(data);
  },

  // VALIDADOR: rechazar. La nota es lo unico que le dice al gestor que corregir.
  async reject(id: string, notes: string): Promise<Actividad> {
    const { data } = await api.post<Actividad>(`/actividades/${id}/reject`, { notes });
    return normalizeActividad(data);
  },

  // VALIDADOR y ADMIN: informe en Excel.
  //
  // Va como blob a proposito: si axios lo trata como texto, el archivo llega
  // corrupto y el error recien aparece al abrirlo en Excel.
  async descargarInforme(filters?: ActividadFilters): Promise<Blob> {
    const { data } = await api.get(`/actividades/report-xlsx${buildQuery(filters)}`, {
      responseType: 'blob',
    });
    return data as Blob;
  },

  // GESTOR: ver mis actividades
  async listMine(filters?: ActividadFilters): Promise<PaginatedResponse<Actividad>> {
    const { data } = await api.get<PaginatedResponse<Actividad>>(`/actividades/mine${buildQuery(filters)}`);
    return unwrapPaginated(data);
  },

  // Obtener actividad por id (soporta acceso publico sin autenticacion)
  async getById(id: string): Promise<Actividad> {
    const hasToken = !!authService.getToken();
    const url = hasToken ? `/actividades/${id}` : `/publico/actividades/${id}`;
    try {
      const { data } = await api.get<Actividad>(url);
      return normalizeActividad(data);
    } catch (error) {
      if (hasToken) {
        try {
          const { data } = await api.get<Actividad>(`/publico/actividades/${id}`);
          return normalizeActividad(data);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // GESTOR: actualizar actividad
  async update(id: string, dto: Partial<CreateActividadDTO>): Promise<Actividad> {
    const { data } = await api.patch<Actividad>(`/actividades/${id}`, dto);
    return normalizeActividad(data);
  },

  // GESTOR: estadisticas de mis actividades
  async misEstadisticas(filters?: { desde?: string; hasta?: string }): Promise<{ enviada: number; aprobada: number; rechazada: number }> {
    const params = new URLSearchParams();
    if (filters?.desde) params.append('desde', filters.desde);
    if (filters?.hasta) params.append('hasta', filters.hasta);
    const queryString = params.toString();
    const { data } = await api.get<{ enviada: number; aprobada: number; rechazada: number }>(
      `/actividades/mine/stats${queryString ? `?${queryString}` : ''}`,
    );
    return data;
  },
};
