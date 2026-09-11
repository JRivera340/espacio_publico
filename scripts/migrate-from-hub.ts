import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { getEnv } from '../src/config/env';
import { ActividadEntity } from '../src/actividades/entities/actividad.entity';
import {
  HubActivityRow,
  mapHubRowToActividad,
  omitirPublishedPhotosParaReconciliacion,
} from './migrate-from-hub.lib';

// Migracion/reconciliacion RE-CORRIBLE desde el hub (gov-espacio-publico)
// hacia la base propia de espacio publico. Sigue el mismo patron probado que
// gov_ambiental/scripts/migrate-from-legacy.ts, escrito para la extraccion
// hermana del dominio ambiental. Lecciones de esa historia que se replican
// aca a proposito:
//   1. Filtrar por "operativoCategoria = 'ESPACIO_PUBLICO'", NUNCA por
//      "operativoSubtipo" — un filtro por subtipo descarta en silencio filas
//      con subtipo vacio o distinto.
//   2. Idempotente: correr de nuevo no debe abortar ni duplicar. Upsert por
//      id, siempre.
//   3. No migrar solo la tabla principal: activity_gestores (join
//      muchos-a-muchos activities<->users) tambien hace falta, mapeada aca a
//      gestoresInvolucradosIds.
//
// Este modulo NO tiene tabla de usuarios propia (auth compartida con el hub,
// mismo JWT_SECRET) — no hace falta remapear ningun id de usuario
// (createdByUserId, validatorUserId, gestoresInvolucradosIds): los uuid del
// hub ya son validos aca tal cual.
//
// Lee del hub en SOLO LECTURA. Escribe unicamente en la base de espacio
// publico. No modifica ni borra nada en el hub. Upsert por id — correr de
// nuevo trae solo lo nuevo/cambiado, sin duplicar ni pisar nada por error.
//
// CASO ESPECIAL — publishedPhotos tiene DOS caminos distintos a proposito:
// esa columna es un subconjunto de "photos" que un validador curo a mano al
// aprobar una actividad (ver comentario en actividad.entity.ts). Un
// Repository.upsert() de TypeORM sobrescribe TODAS las columnas del conflicto
// por default, asi que si este script se corre dos veces (reconciliacion:
// trae actividades nuevas del hub sin tocar las que ya migraron) recalcularia
// publishedPhotos desde cero para cada fila ya existente, pisando en silencio
// cualquier curaduria que un validador haya hecho en este modulo despues de
// la primera corrida — republicando fotos que alguien eligio retirar. Por
// eso:
//   - Fila NUEVA (primer insert, no existe aun en destino): se incluye
//     publishedPhotos con la regla de backfill de mapHubRowToActividad.
//   - Fila que YA EXISTE en destino (reconciliacion): se omite
//     publishedPhotos del payload antes del upsert, para que TypeORM no la
//     incluya en el DO UPDATE SET y el valor ya curado en destino quede
//     intacto.
// TypeORM 0.3.x no tiene una opcion en Repository#upsert para excluir una
// columna puntual del UPDATE SET (UpsertOptions solo trae conflictPaths,
// skipUpdateIfNoValuesChanged, upsertType, returning, indexPredicate) — la
// unica forma de lograrlo es que la propiedad este ausente del objeto que se
// pasa a upsert(), por eso se resuelve consultando primero que ids ya existen
// y separando el lote en dos llamadas a upsert().
//
// Variables esperadas en .env.migration (credenciales de SOLO LECTURA del
// hub, nunca commiteadas):
//   OLD_DB_HOST / OLD_DB_PORT / OLD_DB_USERNAME / OLD_DB_PASSWORD /
//   OLD_DB_DATABASE / OLD_DB_SSL
const migrationEnvPath = path.join(__dirname, '..', '.env.migration');
if (fs.existsSync(migrationEnvPath)) {
  for (const line of fs.readFileSync(migrationEnvPath, 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

async function migrate() {
  const requiredOldVars = ['OLD_DB_HOST', 'OLD_DB_USERNAME', 'OLD_DB_PASSWORD', 'OLD_DB_DATABASE'];
  for (const key of requiredOldVars) {
    if (!process.env[key]) {
      throw new Error(`Falta ${key} — completa .env.migration antes de correr esta migracion.`);
    }
  }

  const env = getEnv();

  // Conexion de SOLO LECTURA a la BD del hub — este cliente nunca ejecuta
  // INSERT/UPDATE/DELETE, solo los SELECT de abajo.
  const oldDbSsl = process.env.OLD_DB_SSL !== 'false';
  const oldClient = new Client({
    host: process.env.OLD_DB_HOST,
    port: Number(process.env.OLD_DB_PORT || 5432),
    user: process.env.OLD_DB_USERNAME,
    password: process.env.OLD_DB_PASSWORD,
    database: process.env.OLD_DB_DATABASE,
    ssl: oldDbSsl ? { rejectUnauthorized: false } : undefined,
  });
  await oldClient.connect();

  const dbInfo = await oldClient.query('SELECT current_database()');
  console.log(`[MIGRACION] Conectado (solo lectura) a la BD del hub: ${dbInfo.rows[0].current_database}`);

  const { rows } = await oldClient.query<HubActivityRow>(`
    SELECT
      id, "createdByUserId", status, "dateTime", "activityType", shift,
      lat, lng, barrio, photos, results,
      "incautacionLicores", "incautacionArmasBlancas", "personasTransladadas",
      "personasSensibilizadas", "num_1801", "actaOperativo", "actaPdfUrl",
      "entidadResponsable", "entidadesAcompanantes", "isGroupOperativo",
      "validatorUserId", "validatedAt", "validationNotes", "publishedAt",
      "dynamicAnswers", "categorySeq", "createdAt", "updatedAt"
    FROM activities
    WHERE "operativoCategoria" = 'ESPACIO_PUBLICO'
    ORDER BY "createdAt" ASC
  `);
  console.log(`[MIGRACION] ${rows.length} actividades de espacio publico encontradas en el hub.`);

  const gestoresRes = await oldClient.query<{ activityId: string; userId: string }>(`
    SELECT ag."activityId", ag."userId"
    FROM activity_gestores ag
    JOIN activities a ON a.id = ag."activityId"
    WHERE a."operativoCategoria" = 'ESPACIO_PUBLICO'
  `);
  console.log(`[MIGRACION] ${gestoresRes.rows.length} vinculos de gestores encontrados para actividades de espacio publico.`);

  await oldClient.end();

  const gestoresPorActividad = new Map<string, string[]>();
  for (const g of gestoresRes.rows) {
    const lista = gestoresPorActividad.get(g.activityId) || [];
    lista.push(g.userId);
    gestoresPorActividad.set(g.activityId, lista);
  }

  // synchronize: false — la base de espacio publico YA tiene el schema
  // (creado por migraciones); este script solo escribe filas, nunca toca el
  // schema.
  const dataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    synchronize: false,
    entities: [ActividadEntity],
  });
  await dataSource.initialize();

  const actividadesRepo = dataSource.getRepository(ActividadEntity);

  // Ids que YA existen en destino, consultados una sola vez antes del lote —
  // determina que fila toma el camino de "primer insert" (publishedPhotos con
  // backfill) y cual el de "reconciliacion" (publishedPhotos preservado). Ver
  // comentario de cabecera.
  const existingIds = new Set<string>();
  if (rows.length > 0) {
    const idsExistentes = await dataSource.query<{ id: string }[]>(
      'SELECT id FROM actividades WHERE id = ANY($1::uuid[])',
      [rows.map((r) => r.id)],
    );
    for (const fila of idsExistentes) {
      existingIds.add(fila.id);
    }
  }
  console.log(`[MIGRACION] ${existingIds.size} actividades ya existian en destino (reconciliacion), ${rows.length - existingIds.size} son primer insert.`);

  // Idempotencia POR REGISTRO (upsert por id) — correr de nuevo retoma sin
  // duplicar ni requerir limpiar nada primero.
  const BATCH_SIZE = 25;
  let migradas = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const lote = rows.slice(i, i + BATCH_SIZE);
    const nuevas: any[] = [];
    const existentes: any[] = [];
    for (const row of lote) {
      const gestoresInvolucradosIds = gestoresPorActividad.get(row.id) || [];
      const actividad = mapHubRowToActividad(row, gestoresInvolucradosIds);
      if (existingIds.has(row.id)) {
        existentes.push(omitirPublishedPhotosParaReconciliacion(actividad));
      } else {
        nuevas.push(actividad);
      }
      migradas++;
    }
    // Dos llamadas separadas a proposito: TypeORM calcula que columnas van en
    // el DO UPDATE SET mirando todo el arreglo de entidades de ESA llamada,
    // asi que mezclar en un solo upsert() filas con y sin publishedPhotos
    // haria que la presencia en una fila arrastre la columna al SET de todas.
    if (nuevas.length > 0) {
      await actividadesRepo.upsert(nuevas, ['id']);
    }
    if (existentes.length > 0) {
      await actividadesRepo.upsert(existentes, ['id']);
    }
    console.log(`[MIGRACION] [progreso] actividades: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log('[MIGRACION] Resumen:');
  console.log(`  actividades: ${migradas} (origen: ${rows.length})`);
  console.log(`  vinculos gestor-actividad: ${gestoresRes.rows.length}`);

  await dataSource.destroy();
}

migrate().catch((err) => {
  console.error('[MIGRACION] Error:', err);
  process.exit(1);
});
