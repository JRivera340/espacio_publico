import 'dotenv/config';
import { AppDataSource } from '../src/config/data-source';
import { ActividadEntity } from '../src/actividades/entities/actividad.entity';
import { ActividadStatus } from '../src/actividades/enums/actividad-status.enum';
import { OperativoSubtipo } from '../src/actividades/enums/operativo-subtipo.enum';
import { Turno } from '../src/actividades/enums/turno.enum';
import { resolverIdsDeSeed } from '../src/config/usuarios-prueba';
import { chequearSeedGuard } from '../src/config/seed-guard';
import {
  MARCA_QA,
  CARNADAS_QA,
  FECHA_MEDIANOCHE_QA,
  GESTOR_B_POR_DEFECTO,
  resolverGestorB,
} from '../src/config/qa-fixtures';

/**
 * Siembra el terreno de prueba del control de calidad.
 *
 * A diferencia de `seed.ts`, que genera volumen parejo para ver las pantallas
 * llenas, este siembra POCAS filas elegidas: cada una existe para que un
 * chequeo concreto del control de calidad pueda fallar. Si una fila no prueba
 * nada, no va.
 *
 * Todo el texto libre lleva nombres, cedulas y correos INVENTADOS y marcados
 * con `ZZTEST`, para poder buscarlos con grep sobre la respuesta cruda de los
 * endpoints publicos sin falsos positivos. Nada de esto sale de una base real.
 *
 * Idempotente y estrecho: antes de insertar borra solo las filas que este
 * script crea (las que llevan la marca en `results`, mas todo lo del gestor B
 * de prueba). Nunca borra lo que sembro `seed.ts` ni datos ajenos.
 */

// Gestor A es el mismo del seed normal: tiene que ser el id REAL de la cuenta
// del hub con la que se va a entrar por el navegador, o el panel sale vacio.
const { gestorId: GESTOR_A, validadorId: VALIDADOR } = resolverIdsDeSeed(process.env);

// Gestor B nunca inicia sesion: existe solo para que el gestor A intente ver
// lo que no es suyo. Por eso alcanza con un uuid fijo y no una cuenta del hub.
const GESTOR_B = resolverGestorB(process.env, [GESTOR_A, VALIDADOR]);

// Dentro de la Localidad Santa Fe.
const DENTRO = [
  { barrio: 'LAS NIEVES', lat: 4.6088, lng: -74.0721 },
  { barrio: 'LAS CRUCES', lat: 4.5972, lng: -74.0794 },
  { barrio: 'SAN BERNARDO', lat: 4.5959, lng: -74.0847 },
  { barrio: 'LA MACARENA', lat: 4.6144, lng: -74.0632 },
  { barrio: 'SANTA INES', lat: 4.6019, lng: -74.0764 },
  { barrio: 'SAN DIEGO', lat: 4.6127, lng: -74.0699 },
  { barrio: 'LOS LACHES', lat: 4.5905, lng: -74.0741 },
];

// Fuera del poligono de la localidad (esto cae en Suba). Sirve para ver que
// hace el visor publico y el mapa con un punto que no deberia haber entrado.
const FUERA = { barrio: 'LAS NIEVES', lat: 4.7503, lng: -74.0821 };

const FOTOS = [
  'https://ejemplo.test/qa/foto-elegida-1.jpg',
  'https://ejemplo.test/qa/foto-elegida-2.jpg',
  'https://ejemplo.test/qa/foto-descartada.jpg',
];

const ACTA = 'https://ejemplo.test/qa/acta-operativo.pdf';

// Cerca de la medianoche en hora de Bogota (UTC-5): en UTC ya es el dia
// siguiente. Es la fila con la que se mide el alcance del problema de zona
// horaria en los filtros por fecha del panel, del visor y del Excel.
const MEDIANOCHE = new Date(FECHA_MEDIANOCHE_QA);

function dia(offsetDias: number, hora = 10): Date {
  const d = new Date('2026-09-01T00:00:00-05:00');
  d.setDate(d.getDate() + offsetDias);
  d.setHours(hora, 0, 0, 0);
  return d;
}

// Cifras del operativo. Las claves son los NOMBRES TECNICOS de las preguntas
// (nunca el uuid del microservicio de encuestas): asi las busca la allowlist
// de public-fields.ts. Indexar por id publica cero cifras, en silencio.
function cifras(i: number): Record<string, unknown> {
  return {
    cambuches: i % 3,
    comparendos: i % 4,
    vendedoresInformalesRetirados: i % 5,
    m2RecuperadosEspacioPublico: 10 + i * 3,
    personasSensibilizadas: 3 + (i % 5),
    // Llega como texto, tal como lo devuelve el formulario dinamico: la
    // allowlist tiene que aceptarlo como numero.
    estructurasNoConvencionales: String(i % 2),
    // Carnada: claves que NO estan en la allowlist. Si alguna aparece en la
    // respuesta publica, el saneamiento se rompio.
    observaciones: CARNADAS_QA.textoLibre,
    nombreIntervenido: CARNADAS_QA.nombre,
    documentoIntervenido: CARNADAS_QA.documento,
    correoContacto: CARNADAS_QA.correo,
    // Carnada de tipo: clave permitida con texto que no es un numero. No
    // puede salir, ni como texto ni como NaN.
    kgMercanciaIncautada: `12 bultos de ${CARNADAS_QA.nombre}`,
  };
}

type Caso = {
  nota: string;
  gestor: string;
  status: ActividadStatus;
  punto: { barrio: string; lat: number; lng: number };
  dateTime: Date;
  fotos: string[];
  acta: string | null;
};

// Cada caso lleva escrito para que existe. Es lo que se lee en la bitacora
// cuando algo falla y hay que saber que fila lo provoco.
const CASOS: Caso[] = [
  {
    nota: 'borrador sin fotos ni acta: el operativo que todavia no tiene evidencia',
    gestor: GESTOR_A,
    status: ActividadStatus.BORRADOR,
    punto: DENTRO[0],
    dateTime: dia(1),
    fotos: [],
    acta: null,
  },
  {
    nota: 'enviada con fotos y acta: la que el validador tiene que ver en pendientes',
    gestor: GESTOR_A,
    status: ActividadStatus.ENVIADA,
    punto: DENTRO[1],
    dateTime: dia(2),
    fotos: FOTOS,
    acta: ACTA,
  },
  {
    nota: 'rechazada con nota: el gestor tiene que leer el motivo completo',
    gestor: GESTOR_A,
    status: ActividadStatus.RECHAZADA,
    punto: DENTRO[2],
    dateTime: dia(3),
    fotos: [FOTOS[0]],
    acta: ACTA,
  },
  {
    nota: 'publicada con fotos: la que se busca en el visor publico',
    gestor: GESTOR_A,
    status: ActividadStatus.PUBLICADA,
    punto: DENTRO[3],
    dateTime: dia(4),
    fotos: [FOTOS[0], FOTOS[1]],
    acta: ACTA,
  },
  {
    nota: 'publicada sin fotos ni acta: el visor no puede romperse sin imagenes',
    gestor: GESTOR_A,
    status: ActividadStatus.PUBLICADA,
    punto: DENTRO[4],
    dateTime: dia(5),
    fotos: [],
    acta: null,
  },
  {
    nota: 'publicada 23:40 hora Bogota: en UTC cae al dia siguiente (zona horaria)',
    gestor: GESTOR_A,
    status: ActividadStatus.PUBLICADA,
    punto: DENTRO[5],
    dateTime: MEDIANOCHE,
    fotos: [FOTOS[0]],
    acta: ACTA,
  },
  {
    nota: 'publicada con coordenada FUERA del poligono de la localidad',
    gestor: GESTOR_A,
    status: ActividadStatus.PUBLICADA,
    punto: FUERA,
    dateTime: dia(6),
    fotos: [],
    acta: ACTA,
  },
  {
    nota: 'gestor B borrador: el gestor A no puede verla ni listarla',
    gestor: GESTOR_B,
    status: ActividadStatus.BORRADOR,
    punto: DENTRO[6],
    dateTime: dia(2),
    fotos: [],
    acta: null,
  },
  {
    nota: 'gestor B enviada: aparece en pendientes del validador, no en el panel de A',
    gestor: GESTOR_B,
    status: ActividadStatus.ENVIADA,
    punto: DENTRO[0],
    dateTime: dia(3),
    fotos: [FOTOS[0]],
    acta: ACTA,
  },
  {
    nota: 'gestor B publicada: en el visor publico si, con el detalle de A nunca',
    gestor: GESTOR_B,
    status: ActividadStatus.PUBLICADA,
    punto: DENTRO[1],
    dateTime: dia(4),
    fotos: [FOTOS[1]],
    acta: ACTA,
  },
];

async function seedQa() {
  const force = process.argv.includes('--force');
  const motivoAborto = chequearSeedGuard({
    nodeEnv: process.env.NODE_ENV,
    dbHost: process.env.DB_HOST,
    force,
  });
  if (motivoAborto) {
    console.error(`[SEED-QA] ${motivoAborto}`);
    process.exit(1);
  }

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(ActividadEntity);

  // Borrado estrecho: solo lo de este script. Las filas de `seed.ts` comparten
  // el createdByUserId del gestor A, asi que borrar por gestor se las llevaria
  // por delante; se borra por la marca, que solo este script escribe.
  const borradasPorMarca = await repo
    .createQueryBuilder()
    .delete()
    .where('results LIKE :marca', { marca: `%${MARCA_QA}%` })
    .execute();
  const borradasDeB = await repo.delete({ createdByUserId: GESTOR_B });

  const filas = CASOS.map((caso, i) => {
    const entity = repo.create({
      createdByUserId: caso.gestor,
      status: caso.status,
      dateTime: caso.dateTime,
      activityType: '1801 - Recuperacion de espacio publico',
      operativoSubtipo: OperativoSubtipo.ESPACIO_PUBLICO_1801,
      shift: caso.dateTime === MEDIANOCHE ? Turno.NOCTURNO : Turno.DIURNO,
      isNightShift: caso.dateTime === MEDIANOCHE,
      lat: caso.punto.lat,
      lng: caso.punto.lng,
      barrio: caso.punto.barrio,
      photos: caso.fotos,
      // La marca va en `results` porque es el campo por el que se borra, y de
      // paso deja la carnada en texto libre autenticado: si aparece en una
      // respuesta publica, el saneamiento no esta cortando por ahi.
      results: `${MARCA_QA} ${caso.nota}. Interviene ${CARNADAS_QA.nombre}, documento ${CARNADAS_QA.documento}, contacto ${CARNADAS_QA.correo}.`,
      incautacionLicores: i % 4,
      incautacionArmasBlancas: i % 2,
      personasTransladadas: i % 2,
      personasSensibilizadas: 3 + (i % 5),
      num_1801: 1 + (i % 3),
      actaPdfUrl: caso.acta,
      entidadResponsable: 'Alcaldia Local de Santa Fe',
      entidadesAcompanantes: i % 2 === 0 ? ['Policia Metropolitana'] : [],
      isGroupOperativo: i % 2 === 0,
      gestoresInvolucradosIds: caso.gestor === GESTOR_A && i % 3 === 0 ? [GESTOR_B] : [],
      dynamicAnswers: cifras(i),
    });

    if (caso.status === ActividadStatus.RECHAZADA) {
      entity.validatorUserId = VALIDADOR;
      entity.validatedAt = new Date(caso.dateTime.getTime() + 60 * 60 * 1000);
      entity.validationNotes = `${MARCA_QA} Faltan las fotos del antes y el acta esta ilegible en la pagina 2. Corregir ambas cosas y reenviar.`;
    }

    if (caso.status === ActividadStatus.PUBLICADA) {
      entity.validatorUserId = VALIDADOR;
      entity.validatedAt = new Date(caso.dateTime.getTime() + 60 * 60 * 1000);
      entity.publishedAt = new Date(caso.dateTime.getTime() + 2 * 60 * 60 * 1000);
    }

    return entity;
  });

  const guardadas = await repo.save(filas);

  // La numeracion visible es correlativa sobre lo publicado, asi que se asigna
  // despues de guardar y en orden de publicacion, no por posicion en el array.
  const publicadas = guardadas
    .filter((a) => a.status === ActividadStatus.PUBLICADA)
    .sort((a, b) => (a.publishedAt!.getTime() - b.publishedAt!.getTime()));
  let seq = 0;
  for (const actividad of publicadas) {
    seq += 1;
    actividad.categorySeq = seq;
  }
  await repo.save(publicadas);

  console.log(`[SEED-QA] Borradas: ${borradasPorMarca.affected ?? 0} por marca, ${borradasDeB.affected ?? 0} del gestor B.`);
  console.log(`[SEED-QA] Creadas: ${guardadas.length} actividades.`);
  console.log(`[SEED-QA] Gestor A (entra por el hub): ${GESTOR_A}`);
  console.log(`[SEED-QA] Gestor B (nunca inicia sesion): ${GESTOR_B}`);
  console.log(`[SEED-QA] Validador: ${VALIDADOR}`);
  console.log('[SEED-QA] Ids por caso:');
  for (const a of guardadas) {
    console.log(`  ${a.id}  ${a.status.padEnd(10)}  ${a.createdByUserId === GESTOR_B ? 'gestor B' : 'gestor A'}  ${a.dateTime.toISOString()}`);
  }
  console.log(`[SEED-QA] Carnadas para grep: ${Object.values(CARNADAS_QA).join(' | ')}`);
  if (GESTOR_B === GESTOR_B_POR_DEFECTO) {
    console.log('[SEED-QA] Gestor B es el uuid fijo de prueba. Se puede cambiar con SEED_GESTOR_B_ID.');
  }

  await AppDataSource.destroy();
}

seedQa().catch((err) => {
  console.error('[SEED-QA] Fallo el seed de control de calidad:', err);
  process.exit(1);
});
