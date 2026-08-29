import api from './api';
import type { Catalogs } from '../types';

export const catalogService = {
  async getAll(): Promise<Catalogs> {
    const { data } = await api.get<Catalogs>('/catalogos/all');
    return data;
  },

  async getBarrios(): Promise<string[]> {
    const { data } = await api.get<{ barrios: string[] }>('/catalogos/barrios');
    return data.barrios;
  },

  async getEntidades(): Promise<string[]> {
    const { data } = await api.get<{ entidades: string[] }>('/catalogos/entidades');
    return data.entidades;
  },
};
