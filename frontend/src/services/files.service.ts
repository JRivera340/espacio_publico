import api from './api';

// El backend sube UN archivo por peticion: `FileInterceptor('file')` en
// files.controller.ts, y responde { key, url }. El campo del formulario tiene
// que llamarse `file` exactamente: con cualquier otro nombre multer no
// encuentra nada y el controller responde 400.
//
// No se fija Content-Type a mano. El navegador tiene que ponerlo el solo para
// incluir el `boundary` del multipart; escribirlo sin boundary deja al backend
// sin poder separar las partes.
export interface UploadResponse {
  key: string;
  url: string;
}

export const filesService = {
  /** Sube el acta (PDF) de una actividad. */
  async uploadActa(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Timeout amplio para conexiones moviles lentas: se usa en terreno.
    const { data } = await api.post<UploadResponse>('/files/upload-acta', formData, {
      timeout: 5 * 60 * 1000,
    });
    return data;
  },

  /** Sube una foto de evidencia. */
  async uploadFoto(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<UploadResponse>('/files/upload', formData, {
      timeout: 5 * 60 * 1000,
    });
    return data;
  },
};
