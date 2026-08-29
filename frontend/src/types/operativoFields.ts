// Datos especificos del unico subtipo de operativo de este modulo.
export interface EspacioPublico1801Data {
  tipo: 'ESPACIO_PUBLICO_1801';
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

export type OperativoData = EspacioPublico1801Data;
