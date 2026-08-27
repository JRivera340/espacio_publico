// APROBADA existe por compatibilidad con datos historicos del hub, pero el
// flujo de aprobacion NO la usa: aprobar publica directo (ver approve()).
export enum ActividadStatus {
  BORRADOR = 'BORRADOR',
  ENVIADA = 'ENVIADA',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  PUBLICADA = 'PUBLICADA',
}
