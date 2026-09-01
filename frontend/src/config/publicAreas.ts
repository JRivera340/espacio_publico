/**
 * Que se le cuenta al ciudadano sobre el area.
 *
 * Fuente unica del texto publico: para cambiar como se le explica el area a la
 * gente se edita este archivo, no los componentes. Todo lo de aca sale de lo
 * que el sistema realmente registra.
 */
export interface AreaPublica {
  nombre: string;
  nombreLargo: string;
  /** Una linea: que hace esta area. Sin jerga institucional. */
  proposito: string;
  /** Dos o tres frases: como trabaja en terreno. */
  descripcion: string;
  color: string;
  /** Frentes de trabajo reales. */
  frentes: string[];
  /** Que queda registrado de cada jornada. */
  registra: string[];
}

export const AREA: AreaPublica = {
  nombre: 'Espacio Publico',
  nombreLargo: 'Recuperacion y control del espacio publico',
  proposito: 'Devuelve a la ciudadania los andenes, plazas y parques de la localidad.',
  descripcion:
    'Los equipos recorren la localidad recuperando espacio que estaba ocupado, acompanando a ' +
    'quienes trabajan en la calle y atendiendo las situaciones que impiden circular o usar los ' +
    'lugares publicos. Cada jornada queda registrada con su ubicacion, su fecha y lo que se hizo.',
  color: '#F97316',
  frentes: ['Operativos del articulo 1801'],
  registra: [
    'Donde y cuando se hizo la jornada',
    'Que se recupero o intervino, en cifras',
    'Fotografias del lugar',
  ],
};

/**
 * Nombres legibles de las cifras que se publican.
 *
 * Las claves son las mismas que deja pasar la lista de permitidos del backend
 * (`public-fields.ts`). Una cifra sin nombre aca igual se muestra, con su clave
 * tecnica: preferimos que se vea fea antes que ocultarle un dato al ciudadano.
 */
export const NOMBRE_PUBLICO_DE_CIFRA: Record<string, string> = {
  estructurasNoConvencionales: 'Estructuras no convencionales intervenidas',
  cambuches: 'Cambuches intervenidos',
  cachivacherosIntervenidos: 'Cachivacheros intervenidos',
  comparendos: 'Comparendos impuestos',
  trasladadosCtp: 'Personas trasladadas a proteccion',
  capturados: 'Capturas',
  armasCortopunzantes: 'Armas cortopunzantes incautadas',
  armasFuego: 'Armas de fuego incautadas',
  personasSensibilizadas: 'Personas sensibilizadas',
  kgMercanciaIncautada: 'Kilos de mercancia incautada',
  pipetasIncautadas: 'Pipetas incautadas',
  bicicletasRecuperadas: 'Bicicletas recuperadas',
  celularesRecuperados: 'Celulares recuperados',
  carretasIncautadas: 'Carretas incautadas',
  mendicidad: 'Personas en situacion de mendicidad acompanadas',
  vendedoresInformalesRetirados: 'Vendedores informales reubicados',
  vendedoresInformalesIntervenidos: 'Vendedores informales acompanados',
  m2RecuperadosEspacioPublico: 'Metros cuadrados recuperados',
};

export function nombrePublicoDeCifra(clave: string): string {
  return NOMBRE_PUBLICO_DE_CIFRA[clave] ?? clave;
}
