import { envSchema } from './env.schema';

const baseEnv = {
  PORT: '3002',
  CORS_ORIGIN: 'http://localhost:5175',
  FRONTEND_URL: 'http://localhost:5175',
  JWT_SECRET: 'secreto-de-prueba',
  HUB_API_URL: 'https://hub.example.com',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'espaciopublico',
  DB_PASSWORD: 'espaciopublico',
  DB_DATABASE: 'espaciopublico',
};

describe('envSchema', () => {
  it('acepta un entorno completo y castea los numericos', () => {
    const parsed = envSchema.parse(baseEnv);
    expect(parsed.PORT).toBe(3002);
    expect(parsed.DB_PORT).toBe(5432);
  });

  it('rechaza el entorno cuando falta JWT_SECRET', () => {
    const { JWT_SECRET, ...sinSecreto } = baseEnv;
    const result = envSchema.safeParse(sinSecreto);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.error.flatten().fieldErrors)).toContain('JWT_SECRET');
    }
  });

  it('aplica el puerto por defecto cuando no viene', () => {
    const { PORT, ...sinPuerto } = baseEnv;
    expect(envSchema.parse(sinPuerto).PORT).toBe(3002);
  });
});
