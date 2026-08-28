// Guarda contra correr el seed (destructivo: borra y reemplaza actividades de
// prueba) sobre una base que no sea la local de desarrollo. `data-source.ts`
// lee el mismo .env que usa la app contra la Postgres desplegada, asi que sin
// esto "npm run seed" corre por defecto contra datos reales en cuanto existan.
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1']);

export type SeedGuardInput = {
  nodeEnv?: string;
  dbHost?: string;
  force?: boolean;
};

// Devuelve un mensaje de error si el seed debe abortar, o null si puede
// continuar. Pura y sin efectos secundarios para poder testearla sin tocar
// una base de datos real.
export function chequearSeedGuard(input: SeedGuardInput): string | null {
  if (input.force) return null;

  if (input.nodeEnv === 'production') {
    return `Abortado: NODE_ENV=production. El seed borra y reemplaza actividades de prueba; nunca corre contra produccion. Host destino: ${input.dbHost ?? '(sin definir)'}. Usa --force si de verdad quieres continuar.`;
  }

  const host = (input.dbHost ?? '').trim().toLowerCase();
  if (!HOSTS_LOCALES.has(host)) {
    return `Abortado: DB_HOST ("${input.dbHost ?? '(sin definir)'}") no es una base local (localhost/127.0.0.1). El seed es destructivo y no corre contra una base remota sin --force.`;
  }

  return null;
}
