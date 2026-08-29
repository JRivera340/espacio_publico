import type { OperativoSubtipo } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Catalogo del area — fuente de verdad de los mapeos entre el enum de subtipo
// de este modulo y el nombre de subcategoria en el microservicio de encuestas.
//
// Este modulo tiene una unica area, asi que no hay categoria que resolver: el
// nombre de la categoria se fija en CATEGORIA_NOMBRE, no se mapea.
//
// Para dar de alta un subtipo nuevo:
//   1. Agregar el valor al enum OperativoSubtipo en types/index.ts.
//   2. Agregar la entrada correspondiente en AREAS_CATALOG con el nombre EXACTO
//      de la subcategoria tal como esta en el microservicio de encuestas.
//   3. (Opcional) declarar aliases si el mismo concepto llega con otros nombres.
// Todos los mapeos de abajo se derivan automaticamente de este catalogo.
// ─────────────────────────────────────────────────────────────────────────────

export interface SubtipoDef {
  enum: OperativoSubtipo;
  /** Nombre exacto de la subcategoria en el microservicio de encuestas. */
  encuestasName: string;
  /** Otros nombres que tambien deben resolver a este subtipo. */
  aliases?: string[];
}

export interface AreaDef {
  /** Nombre exacto de la categoria en el microservicio de encuestas. */
  encuestasCategoryName: string;
  subtipos: SubtipoDef[];
}

export const AREAS_CATALOG: AreaDef[] = [
  {
    encuestasCategoryName: 'Espacio Público',
    subtipos: [{ enum: 'ESPACIO_PUBLICO_1801', encuestasName: '1801' }],
  },
];

const CATEGORIA_NOMBRE = 'ESPACIO_PUBLICO';

// ─── Mapeos derivados (no editar a mano) ──────────────────────────────────────

// enum de subtipo → nombre en encuestas
export const SUBCATEGORY_MAPPING: Record<string, string> = Object.fromEntries(
  AREAS_CATALOG.flatMap((a) => a.subtipos.map((s) => [s.enum, s.encuestasName])),
);

// nombre display / alias / enum de subtipo → enum de subtipo
export const SUBTYPE_MAPPING: Record<string, string> = Object.fromEntries(
  AREAS_CATALOG.flatMap((a) =>
    a.subtipos.flatMap((s) => [
      [s.enum, s.enum],
      [s.encuestasName, s.enum],
      ...(s.aliases ?? []).map((alias) => [alias, s.enum]),
    ]),
  ),
);

// Resuelve el enum tecnico + activityType a partir del nombre display que
// llega del formulario (CreateActivity). Es el punto que previene el error 400
// al enviar el formulario: nunca enviar al backend el nombre display sin
// convertir a enum.
export function resolveActivityEnums(operativoSubtipo: string) {
  const technicalSubtipo = SUBTYPE_MAPPING[operativoSubtipo] || operativoSubtipo;
  const subcategoryName = SUBCATEGORY_MAPPING[technicalSubtipo] || technicalSubtipo;
  return {
    technicalSubtipo,
    activityType: `${CATEGORIA_NOMBRE} - ${subcategoryName}`,
  };
}
