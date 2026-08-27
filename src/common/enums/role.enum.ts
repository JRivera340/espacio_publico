// Solo los roles que entran a este modulo. Cualquier otro rol emitido por el
// hub pasa la verificacion de firma pero no supera ningun RolesGuard.
export enum Role {
  GESTOR_ESPACIO_PUBLICO = 'GESTOR_ESPACIO_PUBLICO',
  VALIDADOR_ESPACIO_PUBLICO = 'VALIDADOR_ESPACIO_PUBLICO',
  ADMIN = 'ADMIN',
}
