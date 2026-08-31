// Las cifras del operativo de espacio publico (articulo 1801).
//
// NO son columnas de la tabla: viajan dentro de `dynamicAnswers`, que es JSONB
// libre y ademas puede traer observaciones en texto y datos de personas. Por eso
// `dynamicAnswers` sigue tipado como Record<string, any> y esta interfaz
// describe SOLO la parte de cifras, para leerla con nombres en vez de strings
// sueltos.
//
// Los nombres de aca son exactamente los de la lista de permitidos del visor
// publico (`src/publico/public-fields.ts` del backend). Si se agrega una cifra,
// hay que agregarla en los dos lados: aca para poder leerla, y alla para que
// llegue a salir. El test de este archivo lo verifica.
export interface CifrasEspacioPublico1801 {
  estructurasNoConvencionales?: number;
  cambuches?: number;
  cachivacherosIntervenidos?: number;
  comparendos?: number;
  trasladadosCtp?: number;
  capturados?: number;
  armasCortopunzantes?: number;
  armasFuego?: number;
  personasSensibilizadas?: number;
  kgMercanciaIncautada?: number;
  pipetasIncautadas?: number;
  bicicletasRecuperadas?: number;
  celularesRecuperados?: number;
  carretasIncautadas?: number;
  mendicidad?: number;
  vendedoresInformalesRetirados?: number;
  vendedoresInformalesIntervenidos?: number;
  m2RecuperadosEspacioPublico?: number;
}

/** Lee las cifras de una actividad sin castear a mano en cada consumidor. */
export function cifrasDe(dynamicAnswers?: Record<string, any> | null): CifrasEspacioPublico1801 {
  return (dynamicAnswers ?? {}) as CifrasEspacioPublico1801;
}
