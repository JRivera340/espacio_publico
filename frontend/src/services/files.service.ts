import api from './api';

export interface UploadActaResponse {
  success: boolean;
  key: string;
  url: string;
  message: string;
}

export interface UploadFotoResponse {
  success: boolean;
  keys: string[];
  urls: string[];
  count: number;
  message: string;
}

export const filesService = {
  // Sube un acta (PDF) para una actividad
  async uploadActa(file: File, activityId?: string): Promise<UploadActaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (activityId) {
      formData.append('activityId', activityId);
    }

    // Timeout amplio para conexiones moviles lentas (5 minutos)
    const { data } = await api.post<UploadActaResponse>('/files/upload-acta', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000,
    });

    return data;
  },

  // Sube una o mas fotos para una actividad
  async uploadFoto(files: File[], activityId?: string): Promise<UploadFotoResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (activityId) {
      formData.append('activityId', activityId);
    }

    const { data } = await api.post<UploadFotoResponse>('/files/upload', formData, {
      headers: { 'Content-Type': undefined },
      timeout: 5 * 60 * 1000,
    });

    return data;
  },
};
