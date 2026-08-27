import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getEnv } from './config/env';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name, version } = require('../package.json');

function parseCorsOrigins(corsOrigin: string): string[] {
  return corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
}

async function bootstrap() {
  const env = getEnv();
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const origins = parseCorsOrigins(env.CORS_ORIGIN);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Un origen no listado NUNCA debe lanzar: `cors` propaga cualquier Error
      // por Express/Nest como excepcion no manejada (500 generico en TODA la
      // app, no solo en la ruta probada). callback(null, false) omite las
      // cabeceras CORS, que ya basta para que el navegador bloquee la lectura.
      if (!origin) return callback(null, true);
      if (origins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  });

  // Respuesta en la raiz real (fuera del prefijo /api) para quien entre por
  // error a la URL del backend sin saber que es una API.
  app.getHttpAdapter().get('/', (_req, res) => {
    res.json({ service: name, version, status: 'ok' });
  });

  app.setGlobalPrefix('api');
  await app.listen(env.PORT, '0.0.0.0');
  console.log(`[ESPACIO PUBLICO] Corriendo en http://0.0.0.0:${env.PORT}/api`);
}

bootstrap();
