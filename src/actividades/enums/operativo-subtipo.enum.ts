// Un solo frente de trabajo hoy. Se mantiene como enum y no como constante
// porque el formulario dinamico de gov_encuestas_publico indexa por subtipo,
// y el area puede sumar frentes sin cambiar el modelo.
export enum OperativoSubtipo {
  ESPACIO_PUBLICO_1801 = 'ESPACIO_PUBLICO_1801',
}
