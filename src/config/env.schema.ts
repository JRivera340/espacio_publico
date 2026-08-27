import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(3002),
  CORS_ORIGIN: z.string().default('http://localhost:5175'),
  // URL publica del frontend propio. Destino del redirect del handoff y
  // fallback del link en el reporte XLSX.
  FRONTEND_URL: z.string().default('http://localhost:5175'),

  JWT_SECRET: z.string(),

  // Backend del hub (gov-espacio-publico). Se comparte JWT_SECRET, asi que un
  // token valido aca lo es alla. Se usa para el proxy de usuarios: este modulo
  // no tiene tabla de usuarios propia.
  HUB_API_URL: z.string().default('https://backend-api-production-0ce4.up.railway.app'),

  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),

  // Cloudflare R2 (fotos y actas). Mismo bucket que el hub y que ambiental,
  // compartido a proposito: las fotos migradas apuntan a keys de ese bucket.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;
