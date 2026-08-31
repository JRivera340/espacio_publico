import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getEnv } from './env';
import { ActividadEntity } from '../actividades/entities/actividad.entity';
import { ProgramacionItemEntity } from '../programacion/entities/programacion-item.entity';

const env = getEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  synchronize: false,
  entities: [ActividadEntity, ProgramacionItemEntity],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  logging: true,
});
