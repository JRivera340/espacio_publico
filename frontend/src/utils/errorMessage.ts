import { AxiosError } from 'axios';

/**
 * Traduce un fallo de red o del backend al texto que ve el usuario.
 *
 * El backend lanza excepciones de Nest cuyo `message` ya esta escrito para
 * leerse (ver la convencion de excepciones del proyecto), asi que cuando viene
 * uno se usa tal cual en vez de inventar un texto generico.
 *
 * Devuelve null en 401: ahi el interceptor de axios ya emitio `session-expired`
 * y la app redirige al login. Mostrar ademas un cartel de error seria decirle
 * dos cosas distintas al usuario por el mismo hecho.
 */
export function mensajeDeError(err: unknown): string | null {
  if (err instanceof AxiosError) {
    if (err.response?.status === 401) return null;

    const delBackend = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof delBackend === 'string' && delBackend.trim()) return delBackend;
    // class-validator devuelve un arreglo de mensajes, no un string
    if (Array.isArray(delBackend) && typeof delBackend[0] === 'string') return delBackend[0];

    if (err.response?.status === 403) return 'No tienes permiso para ver esta informacion';
    if (!err.response) return 'No se pudo conectar con el servidor. Revisa tu conexion e intenta de nuevo';
  }
  return 'No se pudo cargar la informacion. Intenta de nuevo en unos minutos';
}
