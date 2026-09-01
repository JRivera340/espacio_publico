/**
 * Lee el token de la respuesta de login del hub.
 *
 * El hub devuelve `accessToken` en camelCase (`auth.service.ts` del repo
 * gov-espacio-publico). Aceptar solo `access_token` hace que el login responda
 * 200 y aun asi se trate como un fallo, con el mensaje generico de "no se pudo
 * iniciar sesion": un exito que se ve como error. Se aceptan las tres formas
 * porque el nombre lo decide un repo ajeno que no controlamos.
 */
export function extraerTokenDelHub(cuerpo: unknown): string | null {
  const datos = cuerpo as Record<string, unknown> | null;
  if (!datos) return null;
  for (const clave of ['accessToken', 'access_token', 'token'] as const) {
    const valor = datos[clave];
    if (typeof valor === 'string' && valor.trim() !== '') return valor;
  }
  return null;
}
