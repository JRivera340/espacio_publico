import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { getEnv } from '../src/config/env';
import { Role } from '../src/common/enums/role.enum';
import { resolverIdsDeSeed } from '../src/config/usuarios-prueba';
import {
  CARNADAS_QA,
  DIA_BOGOTA_MEDIANOCHE,
  DIA_UTC_MEDIANOCHE,
  FECHA_MEDIANOCHE_QA,
  MARCA_QA,
  resolverGestorB,
} from '../src/config/qa-fixtures';

/**
 * Chequeos automatizables del control de calidad (Plan 4, Task 3).
 *
 * Cubre las trampas que se pueden verificar sin navegador: aislamiento entre
 * gestores, fuga de datos personales por los endpoints publicos, el listado
 * publico sin limite y la zona horaria en los filtros por fecha. Los siete
 * circuitos y la prueba con funcionarios NO se pueden automatizar: incluyen la
 * pantalla y a la persona.
 *
 * **Las verificaciones de exposicion se hacen sobre el texto CRUDO de la
 * respuesta, nunca sobre el objeto parseado.** Una clave anidada que nadie
 * mira en la pantalla igual viaja en el JSON, y `JSON.parse` no la delata.
 *
 * Requiere haber corrido `npm run seed:qa` contra la misma base a la que
 * apunta el backend que se esta probando.
 *
 * Uso:
 *   npm run qa:verificar                                  (backend local)
 *   QA_API_URL=https://<host>/api npm run qa:verificar     (desplegado)
 */

const env = getEnv();
const BASE = (process.env.QA_API_URL ?? `http://localhost:${process.env.PORT ?? 3002}/api`).replace(/\/$/, '');

const { gestorId: GESTOR_A, validadorId: VALIDADOR } = resolverIdsDeSeed(process.env);
const GESTOR_B = resolverGestorB(process.env, [GESTOR_A, VALIDADOR]);

// Los tokens se firman con el JWT_SECRET compartido con el hub, igual que
// `mint-test-token.ts`. Es la unica forma de llamar al API sin pasar por el
// navegador, y es tambien la razon por la que este script nunca debe correrse
// con el secreto de produccion desde una maquina que no sea de confianza.
function firmar(sub: string, role: Role, email: string): string {
  return jwt.sign({ sub, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
}

const TOKEN_GESTOR_A = firmar(GESTOR_A, Role.GESTOR_ESPACIO_PUBLICO, 'gestor.a.qa@ejemplo.test');
const TOKEN_VALIDADOR = firmar(VALIDADOR, Role.VALIDADOR_ESPACIO_PUBLICO, 'validador.qa@ejemplo.test');

type Severidad = 'BLOQUEANTE' | 'IMPORTANTE' | 'MENOR' | 'OK' | 'INFO';

type Hallazgo = {
  chequeo: string;
  severidad: Severidad;
  que: string;
  esperado: string;
  paso: string;
};

const hallazgos: Hallazgo[] = [];

function anotar(h: Hallazgo) {
  hallazgos.push(h);
  const marca = h.severidad === 'OK' ? 'ok  ' : h.severidad === 'INFO' ? 'info' : 'FALL';
  console.log(`[${marca}] ${h.chequeo}: ${h.paso}`);
}

type Respuesta = { status: number; texto: string; json: any };

async function pedir(ruta: string, token?: string): Promise<Respuesta> {
  const res = await fetch(`${BASE}${ruta}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const texto = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // Puede no ser JSON (el xlsx, o una pagina de error del proxy). El texto
    // crudo igual sirve para buscar carnadas.
  }
  return { status: res.status, texto, json };
}

// ---------------------------------------------------------------------------
// Nada personal en el visor publico
// ---------------------------------------------------------------------------

const CORREO = /[\w.+-]+@[\w-]+\.[\w.]+/g;
// Corridas largas de digitos que podrian ser un documento. Las fechas ISO y
// las coordenadas no caen aca porque llevan separadores.
const DIGITOS_LARGOS = /\b\d{7,}\b/g;

function buscarFugas(chequeo: string, respuesta: Respuesta) {
  const texto = respuesta.texto;

  for (const [nombre, carnada] of Object.entries(CARNADAS_QA)) {
    if (texto.includes(carnada)) {
      anotar({
        chequeo,
        severidad: 'BLOQUEANTE',
        que: `Se busco la carnada "${carnada}" en la respuesta cruda`,
        esperado: 'Cero coincidencias: es un dato personal sembrado en texto libre',
        paso: `APARECE la carnada ${nombre} ("${carnada}") en la respuesta`,
      });
    }
  }

  if (texto.includes(MARCA_QA)) {
    anotar({
      chequeo,
      severidad: 'BLOQUEANTE',
      que: `Se busco la marca ${MARCA_QA} (va dentro de "results", campo interno)`,
      esperado: 'Cero coincidencias: "results" no es un campo publico',
      paso: `APARECE ${MARCA_QA}, o sea que el texto interno de resultados esta saliendo`,
    });
  }

  for (const [nombre, id] of Object.entries({ gestorA: GESTOR_A, gestorB: GESTOR_B, validador: VALIDADOR })) {
    if (texto.toLowerCase().includes(id.toLowerCase())) {
      anotar({
        chequeo,
        severidad: 'BLOQUEANTE',
        que: `Se busco el uuid del ${nombre} en la respuesta cruda`,
        esperado: 'Cero coincidencias: el visor publico no identifica funcionarios',
        paso: `APARECE el uuid del ${nombre} (${id})`,
      });
    }
  }

  const correos = [...new Set(texto.match(CORREO) ?? [])];
  if (correos.length > 0) {
    anotar({
      chequeo,
      severidad: 'BLOQUEANTE',
      que: 'Se busco cualquier cosa con forma de correo',
      esperado: 'Cero correos en una respuesta sin autenticacion',
      paso: `APARECEN correos: ${correos.join(', ')}`,
    });
  }

  const digitos = [...new Set(texto.match(DIGITOS_LARGOS) ?? [])];
  if (digitos.length > 0) {
    // No es un fallo por si mismo (un timestamp en milisegundos entra aca):
    // se reporta para que una persona lo mire, que es lo que pide el plan.
    anotar({
      chequeo,
      severidad: 'INFO',
      que: 'Se buscaron corridas de 7 o mas digitos, que podrian ser documentos',
      esperado: 'Revisar a mano que ninguna sea un numero de documento',
      paso: `Numeros largos a revisar: ${digitos.slice(0, 12).join(', ')}`,
    });
  }
}

async function chequearVisorPublico() {
  const listado = await pedir('/publico/actividades');
  if (listado.status !== 200) {
    anotar({
      chequeo: 'visor publico / listado',
      severidad: 'BLOQUEANTE',
      que: 'GET /publico/actividades sin autenticacion',
      esperado: '200 con las actividades publicadas',
      paso: `${listado.status}: ${listado.texto.slice(0, 200)}`,
    });
    return [] as any[];
  }
  buscarFugas('visor publico / listado', listado);

  const cifras = await pedir('/publico/cifras');
  buscarFugas('visor publico / cifras', cifras);

  const publicadas: any[] = Array.isArray(listado.json?.data) ? listado.json.data : [];

  // El detalle es el que mas riesgo tiene: es el unico que devuelve una
  // actividad entera, y es donde vive el texto libre.
  for (const actividad of publicadas) {
    const detalle = await pedir(`/publico/actividades/${actividad.id}`);
    buscarFugas(`visor publico / detalle ${actividad.id.slice(0, 8)}`, detalle);
  }

  if (publicadas.length > 0) {
    anotar({
      chequeo: 'visor publico',
      severidad: 'OK',
      que: `Se recorrieron el listado, las cifras y ${publicadas.length} detalles`,
      esperado: 'Cero carnadas, cero uuid de funcionarios, cero correos',
      paso: 'Sin coincidencias de carnadas en ninguno de los tres endpoints',
    });
  }

  return publicadas;
}

// ---------------------------------------------------------------------------
// El listado publico sin limite
// ---------------------------------------------------------------------------

async function chequearListadoSinLimite(publicadas: any[]) {
  const conLimite = await pedir('/publico/actividades?limit=1');
  const devueltas = Array.isArray(conLimite.json?.data) ? conLimite.json.data.length : -1;

  if (devueltas > 1) {
    anotar({
      chequeo: 'listado publico sin limite',
      severidad: 'IMPORTANTE',
      que: 'GET /publico/actividades?limit=1',
      esperado: 'Una fila, o al menos algun tope del lado del servidor',
      paso: `Devuelve ${devueltas} filas: el endpoint publico ignora limit y offset y siempre manda todo (hoy ${publicadas.length} publicadas)`,
    });
  } else {
    anotar({
      chequeo: 'listado publico sin limite',
      severidad: 'OK',
      que: 'GET /publico/actividades?limit=1',
      esperado: 'El servidor respeta un tope',
      paso: `Devuelve ${devueltas} fila(s)`,
    });
  }
}

// ---------------------------------------------------------------------------
// Aislamiento entre gestores
// ---------------------------------------------------------------------------

async function chequearAislamiento() {
  const idsDeB = await idsDelGestorB();

  const mias = await pedir('/actividades/mine', TOKEN_GESTOR_A);
  const filas: any[] = Array.isArray(mias.json?.data) ? mias.json.data : [];
  const ajenas = filas.filter((a) => a.createdByUserId && a.createdByUserId !== GESTOR_A);

  if (mias.status !== 200) {
    anotar({
      chequeo: 'aislamiento / listado propio',
      severidad: 'BLOQUEANTE',
      que: 'GET /actividades/mine con el token del gestor A',
      esperado: '200 con sus actividades',
      paso: `${mias.status}: ${mias.texto.slice(0, 200)}`,
    });
  } else if (ajenas.length > 0) {
    anotar({
      chequeo: 'aislamiento / listado propio',
      severidad: 'BLOQUEANTE',
      que: 'GET /actividades/mine con el token del gestor A',
      esperado: 'Solo actividades cuyo createdByUserId es el gestor A',
      paso: `${ajenas.length} filas de otro gestor: ${ajenas.map((a) => a.id).join(', ')}`,
    });
  } else {
    anotar({
      chequeo: 'aislamiento / listado propio',
      severidad: 'OK',
      que: 'GET /actividades/mine con el token del gestor A',
      esperado: 'Solo lo del gestor A',
      paso: `${filas.length} filas, todas del gestor A`,
    });
  }

  // Por el detalle, con un id conocido del otro gestor. Es el camino que ya
  // se rompio una vez en este proyecto.
  for (const id of idsDeB) {
    const detalle = await pedir(`/actividades/${id}`, TOKEN_GESTOR_A);
    if (detalle.status === 200) {
      anotar({
        chequeo: 'aislamiento / detalle ajeno',
        severidad: 'BLOQUEANTE',
        que: `GET /actividades/${id} (del gestor B) con el token del gestor A`,
        esperado: '403 o 404: no es suya',
        paso: `200 y devuelve la actividad completa: ${detalle.texto.slice(0, 160)}`,
      });
    } else {
      anotar({
        chequeo: 'aislamiento / detalle ajeno',
        severidad: 'OK',
        que: `GET /actividades/${id} (del gestor B) con el token del gestor A`,
        esperado: '403 o 404',
        paso: `${detalle.status}`,
      });
    }
  }

  // Por el listado de ids, que es el que alimenta la navegacion entre fichas.
  const todosLosIds = await pedir('/actividades/all-ids', TOKEN_GESTOR_A);
  const filtrados: string[] = Array.isArray(todosLosIds.json)
    ? todosLosIds.json
    : (todosLosIds.json?.ids ?? todosLosIds.json?.data ?? []);
  const fugados = idsDeB.filter((id) => filtrados.includes(id) || todosLosIds.texto.includes(id));

  if (fugados.length > 0) {
    anotar({
      chequeo: 'aislamiento / listado de ids',
      severidad: 'BLOQUEANTE',
      que: 'GET /actividades/all-ids con el token del gestor A',
      esperado: 'Solo ids del gestor A',
      paso: `Incluye ids del gestor B: ${fugados.join(', ')}`,
    });
  } else {
    anotar({
      chequeo: 'aislamiento / listado de ids',
      severidad: 'OK',
      que: 'GET /actividades/all-ids con el token del gestor A',
      esperado: 'Solo ids del gestor A',
      paso: `${filtrados.length} ids, ninguno del gestor B`,
    });
  }

  // Rutas de otro rol con el token del gestor: las cierra RolesGuard, no el
  // filtro por dueno, y son un camino alterno al mismo dato.
  for (const ruta of ['/actividades', '/actividades/pending', '/actividades/stats/gestores']) {
    const res = await pedir(ruta, TOKEN_GESTOR_A);
    const cerrado = res.status === 403 || res.status === 401;
    anotar({
      chequeo: 'aislamiento / ruta de otro rol',
      severidad: cerrado ? 'OK' : 'BLOQUEANTE',
      que: `GET ${ruta} con el token del gestor A`,
      esperado: '403: es una ruta de validador o admin',
      paso: `${res.status}${cerrado ? '' : ` y devuelve datos: ${res.texto.slice(0, 160)}`}`,
    });
  }
}

async function idsDelGestorB(): Promise<string[]> {
  // El validador si puede ver todo: es la forma de saber que ids sembro el
  // seed para el gestor B sin abrir la base.
  const todas = await pedir('/actividades?limit=500', TOKEN_VALIDADOR);
  const filas: any[] = Array.isArray(todas.json?.data) ? todas.json.data : [];
  const ids = filas.filter((a) => a.createdByUserId === GESTOR_B).map((a) => a.id);

  if (ids.length === 0) {
    anotar({
      chequeo: 'preparacion',
      severidad: 'BLOQUEANTE',
      que: 'Se buscaron las actividades del gestor B para probar el aislamiento',
      esperado: 'Al menos una: las siembra `npm run seed:qa`',
      paso: `Ninguna. Sin datos del gestor B el aislamiento no se puede probar (status ${todas.status}, ${filas.length} filas visibles para el validador)`,
    });
  }

  return ids;
}

// ---------------------------------------------------------------------------
// Zona horaria en los filtros por fecha
// ---------------------------------------------------------------------------

async function chequearZonaHoraria() {
  const idMedianoche = await buscarIdDeMedianoche();
  if (!idMedianoche) return;

  const dias = [DIA_BOGOTA_MEDIANOCHE, DIA_UTC_MEDIANOCHE];
  const fuentes: { nombre: string; ruta: (d: string) => string; token?: string }[] = [
    { nombre: 'visor publico', ruta: (d) => `/publico/actividades?desde=${d}&hasta=${d}` },
    { nombre: 'panel del gestor', ruta: (d) => `/actividades/mine?desde=${d}&hasta=${d}`, token: TOKEN_GESTOR_A },
    // El Excel se arma con exactamente esta consulta (`listarTodas` con los
    // mismos filtros), asi que comparar contra ella mide lo mismo sin tener
    // que abrir el archivo.
    { nombre: 'listado del validador (el mismo que arma el Excel)', ruta: (d) => `/actividades?desde=${d}&hasta=${d}`, token: TOKEN_VALIDADOR },
  ];

  for (const dia of dias) {
    const incluyen: string[] = [];
    const excluyen: string[] = [];

    for (const fuente of fuentes) {
      const res = await pedir(fuente.ruta(dia), fuente.token);
      const contiene = res.texto.includes(idMedianoche);
      (contiene ? incluyen : excluyen).push(fuente.nombre);
    }

    if (incluyen.length > 0 && excluyen.length > 0) {
      anotar({
        chequeo: `zona horaria / filtro por el dia ${dia}`,
        severidad: 'IMPORTANTE',
        que: `Se filtro por desde=hasta=${dia} la actividad de ${FECHA_MEDIANOCHE_QA} en las tres fuentes`,
        esperado: 'Las tres la incluyen o las tres la excluyen',
        paso: `La incluyen: ${incluyen.join(', ')}. La excluyen: ${excluyen.join(', ')}`,
      });
    } else {
      anotar({
        chequeo: `zona horaria / filtro por el dia ${dia}`,
        severidad: 'OK',
        que: `Se filtro por desde=hasta=${dia} en las tres fuentes`,
        esperado: 'Las tres coinciden',
        paso: incluyen.length > 0 ? 'Las tres la incluyen' : 'Las tres la excluyen',
      });
    }
  }
}

async function buscarIdDeMedianoche(): Promise<string | null> {
  const esperado = new Date(FECHA_MEDIANOCHE_QA).getTime();
  const todas = await pedir('/actividades?limit=500', TOKEN_VALIDADOR);
  const filas: any[] = Array.isArray(todas.json?.data) ? todas.json.data : [];
  const fila = filas.find((a) => a.dateTime && new Date(a.dateTime).getTime() === esperado);

  if (!fila) {
    anotar({
      chequeo: 'preparacion',
      severidad: 'BLOQUEANTE',
      que: `Se busco la actividad sembrada en ${FECHA_MEDIANOCHE_QA}`,
      esperado: 'Existe: la siembra `npm run seed:qa`',
      paso: `No esta entre las ${filas.length} filas visibles para el validador (status ${todas.status})`,
    });
    return null;
  }

  return fila.id;
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`[QA] Backend: ${BASE}`);
  console.log(`[QA] Gestor A: ${GESTOR_A} | Gestor B: ${GESTOR_B} | Validador: ${VALIDADOR}`);
  console.log('');

  const publicadas = await chequearVisorPublico();
  await chequearListadoSinLimite(publicadas);
  await chequearAislamiento();
  await chequearZonaHoraria();

  const fallos = hallazgos.filter((h) => h.severidad !== 'OK' && h.severidad !== 'INFO');
  const bloqueantes = fallos.filter((h) => h.severidad === 'BLOQUEANTE');

  console.log('');
  console.log('--- Para pegar en la bitacora ---');
  for (const h of fallos) {
    console.log('');
    console.log(`### ${h.severidad} — ${h.chequeo}`);
    console.log(`- **Que se hizo:** ${h.que}`);
    console.log(`- **Que se esperaba:** ${h.esperado}`);
    console.log(`- **Que paso:** ${h.paso}`);
  }
  console.log('');
  console.log(`[QA] ${hallazgos.filter((h) => h.severidad === 'OK').length} chequeos en verde, ${fallos.length} hallazgos (${bloqueantes.length} bloqueantes).`);

  // Un bloqueante corta con codigo distinto de cero: si esto corre en una
  // cadena, un hallazgo que expone datos no puede pasar como exito.
  if (bloqueantes.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[QA] Fallo la verificacion:', err);
  process.exit(1);
});
