// Codigo visible de una actividad (EP-01, EP-02...). Unica fuente: antes
// publico.service.ts producia "EP-4" y reporte.service.ts "EP-04" para la
// misma fila, asi que un funcionario cruzando el Excel con el visor publico
// no encontraba la actividad. Ambos consumen esta funcion.
//
// Decisiones de formato:
// - categorySeq nulo o indefinido (actividad que nunca paso por el flujo de
//   creacion del servicio, p. ej. datos de seed manuales) produce "EP-SN"
//   ("sin numero") en vez de inventar un 0 que se confundiria con una
//   secuencia real.
// - padStart(2, '0') solo agrega ceros a la izquierda, nunca trunca: una
//   secuencia de 3+ digitos (categorySeq >= 100) se ve como "EP-150", no como
//   "EP-50". Es una decision deliberada: preferimos un codigo mas largo de lo
//   habitual a uno que colisione con otra actividad por truncamiento.
export function codigoVisible(categorySeq: number | null | undefined): string {
  if (categorySeq === null || categorySeq === undefined) return 'EP-SN';
  return `EP-${String(categorySeq).padStart(2, '0')}`;
}
