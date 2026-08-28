// Solo los roles que entran a este modulo. La identidad la emite el hub.
export type Role = 'GESTOR_ESPACIO_PUBLICO' | 'VALIDADOR_ESPACIO_PUBLICO' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  lastname: string;
  email: string;
  role: Role;
}

export type ActividadStatus = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA' | 'PUBLICADA';
