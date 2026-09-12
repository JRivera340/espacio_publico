/**
 * Piezas fijas del terreno de prueba del control de calidad.
 *
 * Viven en `src/` y no dentro del script porque los usan tres cosas distintas:
 * el sembrado (`scripts/seed-qa.ts`), la verificacion de fuga de datos
 * (`scripts/qa-verificar.ts`) y sus tests. Si la carnada se escribiera dos
 * veces, el dia que cambie una el grep dejaria de encontrar nada y el chequeo
 * pasaria en verde sin haber probado nada.
 */

// Marca que llevan todas las filas del control de calidad. Es tambien la
// condicion de borrado del sembrado, asi que tiene que ser algo que no pueda
// aparecer en un texto escrito por una persona.
export const MARCA_QA = '[QA-PLAN4]';

/**
 * Datos personales INVENTADOS que se siembran en el texto libre.
 *
 * No son de nadie: el prefijo ZZTEST existe para poder buscarlos con grep sobre
 * la respuesta cruda de los endpoints publicos sin un solo falso positivo. Si
 * alguno aparece ahi, hay una fuga.
 */
export const CARNADAS_QA = {
  nombre: 'ZZTESTNOMBRE Zzapellido',
  documento: 'ZZTESTDOC-1020304050',
  correo: 'zztestcorreo@ejemplo.test',
  textoLibre: 'ZZTESTOBSERVACION anotacion interna que no puede salir al publico',
} as const;

/**
 * Fecha de la fila cerca de la medianoche, en hora de Bogota (UTC-5).
 *
 * A las 23:40 del 1 de septiembre en Bogota, en UTC ya es el 2 de septiembre.
 * De eso vive el chequeo de zona horaria: el panel, el visor publico y el
 * Excel tienen que incluirla o excluirla los tres igual al filtrar por dia.
 */
export const FECHA_MEDIANOCHE_QA = '2026-09-01T23:40:00-05:00';

// El dia al que pertenece en Bogota, y el dia al que se corre en UTC.
export const DIA_BOGOTA_MEDIANOCHE = '2026-09-01';
export const DIA_UTC_MEDIANOCHE = '2026-09-02';

// Gestor B nunca inicia sesion: existe para que el gestor A intente ver lo que
// no es suyo. Por eso es un uuid fijo y no una cuenta del hub.
export const GESTOR_B_POR_DEFECTO = '00000000-0000-4000-8000-0000000000b2';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Id del gestor B, con `SEED_GESTOR_B_ID` para apuntarlo a una cuenta real.
 *
 * `idsOcupados` son los ids del gestor A y del validador. Si el gestor B cae
 * en uno de ellos, la prueba de aislamiento queda inservible sin fallar: el
 * gestor A veria "lo del gestor B" porque seria lo propio, y el chequeo pasaria
 * en verde.
 */
export function resolverGestorB(
  env: Record<string, string | undefined>,
  idsOcupados: string[] = [],
): string {
  const crudo = env.SEED_GESTOR_B_ID?.trim();
  const id = crudo ? crudo : GESTOR_B_POR_DEFECTO;

  if (!UUID.test(id)) {
    throw new Error(`SEED_GESTOR_B_ID no es un uuid valido: "${crudo}".`);
  }

  const choca = idsOcupados.some((ocupado) => ocupado.toLowerCase() === id.toLowerCase());
  if (choca) {
    throw new Error(
      'El gestor B del control de calidad no puede ser el mismo id que el gestor A ni que el validador: la prueba de aislamiento no probaria nada.',
    );
  }

  return id;
}
