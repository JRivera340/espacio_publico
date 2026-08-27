import path from 'path';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { getEnv } from './env';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  useFactory: () => {
    const env = getEnv();
    return {
      type: 'postgres' as const,
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
      // Fijo en false: no hay Postgres local en este proyecto, el .env de
      // desarrollo apunta a la base desplegada en Railway. Si esto dependiera
      // de NODE_ENV, arrancar la app en local le sincronizaria el schema a esa
      // base de verdad sin pasar por ninguna migracion. Las migraciones son el
      // unico camino para cambiar el schema.
      synchronize: false,
      autoLoadEntities: true,
      entities: [path.join(__dirname, '..', '**', '*.entity.{ts,js}')],
      migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
      // La base arranca vacia y sin nadie mas conectado: correr las
      // migraciones en cada boot es idempotente (TypeORM lleva su propia
      // tabla de aplicadas) y evita el paso manual que se olvida antes de un
      // despliegue con cambios de schema pendientes.
      migrationsRun: true,
      logging: env.NODE_ENV !== 'production',
      retryAttempts: 10,
      retryDelay: 3000,
    };
  },
};
