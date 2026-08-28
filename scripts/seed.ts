import 'dotenv/config';
import { AppDataSource } from '../src/config/data-source';
import { ActividadEntity } from '../src/actividades/entities/actividad.entity';
import { ActividadStatus } from '../src/actividades/enums/actividad-status.enum';
import { OperativoSubtipo } from '../src/actividades/enums/operativo-subtipo.enum';
import { Turno } from '../src/actividades/enums/turno.enum';
import { BARRIOS } from '../src/catalogos/barrio.enum';
import { TEST_IDENTITIES } from '../src/config/test-identities';
import { chequearSeedGuard } from '../src/config/seed-guard';

// Datos enteramente inventados para desarrollo local. Nunca un export de la
// base real: sin nombres de personas, sin cedulas, coordenadas y barrios
// dentro de la Localidad Santa Fe tomados de BARRIOS.
const GESTOR_ID = TEST_IDENTITIES.GESTOR_ESPACIO_PUBLICO.id;
const VALIDADOR_ID = TEST_IDENTITIES.VALIDADOR_ESPACIO_PUBLICO.id;

// Coordenadas aproximadas dentro de la Localidad Santa Fe (Bogota).
const PUNTOS: { barrio: string; lat: number; lng: number }[] = [
  { barrio: 'LAS NIEVES', lat: 4.6088, lng: -74.0721 },
  { barrio: 'LAS CRUCES', lat: 4.5972, lng: -74.0794 },
  { barrio: 'SAN BERNARDO', lat: 4.5959, lng: -74.0847 },
  { barrio: 'SAN DIEGO', lat: 4.6127, lng: -74.0699 },
  { barrio: 'LA PERSEVERANCIA', lat: 4.6109, lng: -74.0656 },
  { barrio: 'SAMPER', lat: 4.6047, lng: -74.0682 },
  { barrio: 'LA MACARENA', lat: 4.6144, lng: -74.0632 },
  { barrio: 'LOS LACHES', lat: 4.5905, lng: -74.0741 },
  { barrio: 'SAGRADO CORAZON', lat: 4.6135, lng: -74.0714 },
  { barrio: 'LA MERCED', lat: 4.6122, lng: -74.0710 },
  { barrio: 'SANTA INES', lat: 4.6019, lng: -74.0764 },
  { barrio: 'VERACRUZ', lat: 4.6004, lng: -74.0752 },
  { barrio: 'GIRARDOT', lat: 4.5980, lng: -74.0812 },
  { barrio: 'EL DORADO', lat: 4.5990, lng: -74.0870 },
];

const RESULTADOS_GENERICOS = [
  'Se realizo recorrido de control en el sector con acompanamiento institucional. Se recuperaron tramos de espacio publico ocupados por ventas informales.',
  'Operativo de recuperacion de espacio publico con retiro de estructuras no convencionales. Se socializo la normativa vigente a los ocupantes del sector.',
  'Jornada de sensibilizacion y control en anden y via peatonal. Se registraron comparendos por ocupacion indebida del espacio publico.',
  'Recorrido nocturno de control con retiro de cambuches y elementos abandonados en el espacio publico.',
  'Intervencion conjunta con entidades acompanantes para la recuperacion de un tramo peatonal ocupado.',
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

type Estado = 'BORRADOR' | 'ENVIADA' | 'RECHAZADA' | 'PUBLICADA';

// 14 actividades repartidas en los cuatro estados del flujo.
const PLAN: Estado[] = [
  'BORRADOR', 'BORRADOR', 'BORRADOR',
  'ENVIADA', 'ENVIADA', 'ENVIADA', 'ENVIADA',
  'RECHAZADA', 'RECHAZADA', 'RECHAZADA',
  'PUBLICADA', 'PUBLICADA', 'PUBLICADA', 'PUBLICADA',
];

async function seed() {
  const force = process.argv.includes('--force');
  const motivoAborto = chequearSeedGuard({
    nodeEnv: process.env.NODE_ENV,
    dbHost: process.env.DB_HOST,
    force,
  });
  if (motivoAborto) {
    console.error(`[SEED] ${motivoAborto}`);
    process.exit(1);
  }

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(ActividadEntity);

  // Idempotente: solo borra lo que este mismo seed crea (por createdByUserId
  // del gestor de prueba), nunca toca datos ajenos. No es un truncate de la
  // tabla ni reversion de migraciones.
  await repo.delete({ createdByUserId: GESTOR_ID });

  const ahora = Date.now();
  let categorySeq = 0;
  const filas: ActividadEntity[] = [];

  PLAN.forEach((estado, i) => {
    const punto = pick(PUNTOS, i);
    const diasAtras = (PLAN.length - i) * 2;
    const dateTime = new Date(ahora - diasAtras * 24 * 60 * 60 * 1000);

    const entity = repo.create({
      createdByUserId: GESTOR_ID,
      status: ActividadStatus[estado],
      dateTime,
      activityType: '1801 - Recuperacion de espacio publico',
      operativoSubtipo: OperativoSubtipo.ESPACIO_PUBLICO_1801,
      shift: i % 3 === 0 ? Turno.NOCTURNO : Turno.DIURNO,
      isNightShift: i % 3 === 0,
      lat: punto.lat,
      lng: punto.lng,
      barrio: punto.barrio,
      photos: [],
      results: pick(RESULTADOS_GENERICOS, i),
      incautacionLicores: i % 4,
      incautacionArmasBlancas: 0,
      personasTransladadas: i % 2,
      personasSensibilizadas: 3 + (i % 5),
      num_1801: 1 + (i % 3),
      entidadResponsable: 'Alcaldia Local de Santa Fe',
      entidadesAcompanantes: i % 2 === 0 ? ['Policia Metropolitana'] : [],
      isGroupOperativo: i % 2 === 0,
      gestoresInvolucradosIds: [],
      dynamicAnswers: {
        cambuches: (i % 3),
        comparendos: (i % 4),
        vendedoresInformalesRetirados: (i % 5),
        m2RecuperadosEspacioPublico: 10 + i * 3,
      },
    });

    if (estado === 'RECHAZADA') {
      entity.validatorUserId = VALIDADOR_ID;
      entity.validatedAt = new Date(dateTime.getTime() + 60 * 60 * 1000);
      entity.validationNotes = 'Faltan evidencias fotograficas del operativo. Corregir y reenviar.';
    }

    if (estado === 'PUBLICADA') {
      categorySeq += 1;
      entity.validatorUserId = VALIDADOR_ID;
      entity.validatedAt = new Date(dateTime.getTime() + 60 * 60 * 1000);
      entity.publishedAt = new Date(dateTime.getTime() + 2 * 60 * 60 * 1000);
      entity.categorySeq = categorySeq;
    }

    filas.push(entity);
  });

  await repo.save(filas);

  console.log(`[SEED] ${filas.length} actividades ficticias creadas para el gestor de prueba (${GESTOR_ID}).`);
  const conteo = PLAN.reduce<Record<string, number>>((acc, estado) => {
    acc[estado] = (acc[estado] ?? 0) + 1;
    return acc;
  }, {});
  console.log('[SEED] Por estado:', conteo);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('[SEED] Fallo el seed:', err);
  process.exit(1);
});
