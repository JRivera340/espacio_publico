import { OperativoSubtipo } from '../actividades/enums/operativo-subtipo.enum';

// Campos de dynamicAnswers que pueden salir por el visor publico.
//
// dynamicAnswers es JSONB libre: ademas de las cifras del operativo puede
// traer observaciones en texto y datos de personas intervenidas. Nada de eso
// puede salir por un endpoint sin autenticacion.
//
// Por eso la lista es de PERMITIDOS, no de prohibidos: un campo nuevo del
// formulario no aparece en el visor hasta que alguien lo agregue aca a
// proposito. Si el default se equivoca, se equivoca callando.
const CIFRAS_ESPACIO_PUBLICO = [
  'estructurasNoConvencionales',
  'cambuches',
  'cachivacherosIntervenidos',
  'comparendos',
  'armasCortopunzantes',
  'armasFuego',
  'mendicidad',
  'trasladadosCtp',
  'capturados',
  'personasSensibilizadas',
  'kgMercanciaIncautada',
  'pipetasIncautadas',
  'bicicletasRecuperadas',
  'celularesRecuperados',
  'carretasIncautadas',
  'vendedoresInformalesRetirados',
  'vendedoresInformalesIntervenidos',
  'm2RecuperadosEspacioPublico',
];

const CAMPOS_PUBLICOS_POR_SUBTIPO: Partial<Record<OperativoSubtipo, string[]>> = {
  [OperativoSubtipo.ESPACIO_PUBLICO_1801]: CIFRAS_ESPACIO_PUBLICO,
};

/**
 * Deja pasar solo los campos permitidos del subtipo, y solo si son cifras.
 *
 * El filtro por tipo es la segunda barrera: aunque alguien agregue por error
 * una clave a la lista de arriba, si el valor es texto libre no sale. Devuelve
 * null cuando no queda nada que publicar, para no mandar objetos vacios.
 *
 * Los formularios dinamicos devuelven sus respuestas como texto, asi que un
 * "12" llega en string. Se acepta solo si el texto ENTERO es un numero: "12"
 * pasa como 12, "12 caninos" no pasa.
 */
export function sanitizarDatosPublicos(
  subtipo: OperativoSubtipo,
  datos: Record<string, any> | null | undefined,
): Record<string, number | boolean> | null {
  if (!datos || typeof datos !== 'object') return null;

  const permitidos = CAMPOS_PUBLICOS_POR_SUBTIPO[subtipo];
  if (!permitidos || permitidos.length === 0) return null;

  const limpio: Record<string, number | boolean> = {};
  for (const key of permitidos) {
    const valor = datos[key];

    if (typeof valor === 'number' && Number.isFinite(valor)) {
      limpio[key] = valor;
    } else if (typeof valor === 'boolean') {
      limpio[key] = valor;
    } else if (typeof valor === 'string') {
      const texto = valor.trim();
      if (texto === '') continue;
      if (texto === 'true' || texto === 'false') {
        limpio[key] = texto === 'true';
        continue;
      }
      const numero = Number(texto);
      if (Number.isFinite(numero)) limpio[key] = numero;
    }
  }

  return Object.keys(limpio).length > 0 ? limpio : null;
}
