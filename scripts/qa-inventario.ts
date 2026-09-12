import 'dotenv/config';
import { AppDataSource } from '../src/config/data-source';
import { ActividadEntity } from '../src/actividades/entities/actividad.entity';
import { ProgramacionItemEntity } from '../src/programacion/entities/programacion-item.entity';
import { MARCA_QA } from '../src/config/qa-fixtures';

/**
 * Inventario de lo que hay en la base antes de tocar nada.
 *
 * Es el punto de partida contra el que se comparan los conteos despues de
 * sembrar y de recorrer los circuitos. Solo LEE: no borra, no escribe, y por
 * eso no pasa por la guarda del seed.
 *
 * Distingue tres origenes, porque no se borran igual: lo que sembro `seed.ts`,
 * lo que sembro `seed-qa.ts` (lleva la marca) y lo que quedo de las
 * verificaciones manuales, que es lo unico que hay que mirar a mano antes de
 * decidir si se va.
 */
async function inventario() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(ActividadEntity);

  const total = await repo.count();
  console.log(`[INV] Base: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
  console.log(`[INV] Actividades en total: ${total}`);

  const porEstado = await repo
    .createQueryBuilder('a')
    .select('a.status', 'status')
    .addSelect('COUNT(*)', 'n')
    .groupBy('a.status')
    .orderBy('a.status')
    .getRawMany();
  console.log('[INV] Por estado:');
  for (const fila of porEstado) console.log(`  ${String(fila.status).padEnd(12)} ${fila.n}`);

  const porGestor = await repo
    .createQueryBuilder('a')
    .select('a.createdByUserId', 'gestor')
    .addSelect('COUNT(*)', 'n')
    .addSelect(`SUM(CASE WHEN a.results LIKE :marca THEN 1 ELSE 0 END)`, 'conMarca')
    .addSelect('MIN(a.createdAt)', 'primera')
    .addSelect('MAX(a.createdAt)', 'ultima')
    .setParameter('marca', `%${MARCA_QA}%`)
    .groupBy('a.createdByUserId')
    .orderBy('n', 'DESC')
    .getRawMany();

  console.log('[INV] Por gestor (createdByUserId):');
  for (const fila of porGestor) {
    console.log(
      `  ${fila.gestor}  total=${String(fila.n).padStart(3)}  conMarca=${String(fila.conMarca).padStart(3)}  ` +
      `desde=${new Date(fila.primera).toISOString().slice(0, 10)}  hasta=${new Date(fila.ultima).toISOString().slice(0, 10)}`,
    );
  }

  const conMarca = await repo
    .createQueryBuilder('a')
    .where('a.results LIKE :marca', { marca: `%${MARCA_QA}%` })
    .getCount();
  console.log(`[INV] Con la marca ${MARCA_QA} (las borra y reemplaza seed-qa): ${conMarca}`);
  console.log(`[INV] Sin la marca: ${total - conMarca} — de estas, lo que no sembro seed.ts hay que mirarlo a mano antes de borrar.`);

  const programacion = await AppDataSource.getRepository(ProgramacionItemEntity).count();
  console.log(`[INV] Items de programacion: ${programacion}`);

  await AppDataSource.destroy();
}

inventario().catch((err) => {
  console.error('[INV] Fallo el inventario:', err);
  process.exit(1);
});
