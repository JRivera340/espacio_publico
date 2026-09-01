import 'dotenv/config';
import {
  ROLES_POR_DEFECTO,
  buscarIdPorEmail,
  construirPlantillas,
  extraerIdDeUsuarioCreado,
  validarPassword,
  type UsuarioPruebaPlantilla,
} from '../src/config/usuarios-prueba';
import { Role } from '../src/common/enums/role.enum';
import { extraerTokenDelHub } from '../src/auth/lib/token-del-hub';
import type { TestRole } from '../src/config/test-identities';

/**
 * Crea las cuentas de prueba EN EL HUB, que es el unico proveedor de identidad
 * de este modulo.
 *
 * Es una escritura contra la base de usuarios del hub, que en produccion tiene
 * gente trabajando. Por eso: solo agrega filas nuevas, nunca modifica ni borra
 * usuarios existentes, y no escribe nada sin --confirmar.
 *
 * Uso (PowerShell):
 *   $env:HUB_ADMIN_EMAIL="..."; $env:HUB_ADMIN_PASSWORD="..."
 *   npm run usuarios:hub              # solo verifica credenciales, no escribe
 *   npm run usuarios:hub -- --confirmar
 */

const HUB = (process.env.HUB_API_URL ?? '').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.HUB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.HUB_ADMIN_PASSWORD;
const PASSWORD_PRUEBA = process.env.PASSWORD_PRUEBA ?? 'Prueba2026*';

const confirmar = process.argv.includes('--confirmar');
const conAdmin = process.argv.includes('--con-admin');

async function main() {
  if (!HUB) abortar('Falta HUB_API_URL.');
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    abortar('Faltan HUB_ADMIN_EMAIL y HUB_ADMIN_PASSWORD (no se guardan en ningun archivo del repo).');
  }
  const problema = validarPassword(PASSWORD_PRUEBA);
  if (problema) abortar(problema);

  const roles: TestRole[] = conAdmin
    ? [...ROLES_POR_DEFECTO, Role.ADMIN]
    : ROLES_POR_DEFECTO;
  const plantillas = construirPlantillas(roles);

  console.log(`[HUB] ${HUB}`);
  console.log(`[HUB] Cuentas a crear: ${plantillas.map((p) => `${p.email} (${p.role})`).join(', ')}`);
  if (conAdmin) {
    console.log('[HUB] ATENCION: --con-admin crea un ADMIN nuevo, con permiso sobre los usuarios reales del hub.');
  }

  const { token, rol } = await iniciarSesion();
  console.log(`[HUB] Sesion iniciada como ${ADMIN_EMAIL} (rol ${rol ?? 'desconocido'}).`);
  if (rol && rol !== Role.ADMIN) {
    abortar(`La cuenta ${ADMIN_EMAIL} tiene rol ${rol}; crear usuarios exige ADMIN.`);
  }

  if (!confirmar) {
    console.log('[HUB] Simulacion: credenciales validas. No se escribio nada. Repetir con --confirmar para crear.');
    return;
  }

  const ids: Partial<Record<TestRole, string>> = {};
  for (const plantilla of plantillas) {
    ids[plantilla.role] = await crearORecuperar(plantilla, token);
  }

  console.log('\n[HUB] Resultado:');
  plantillas.forEach((p) => {
    console.log(`  ${p.role.padEnd(26)} ${p.email.padEnd(32)} ${ids[p.role] ?? '(sin id)'}`);
  });
  console.log(`\n[HUB] Contrasena de todas las cuentas de prueba: ${PASSWORD_PRUEBA}`);

  const gestorId = ids[Role.GESTOR_ESPACIO_PUBLICO];
  const validadorId = ids[Role.VALIDADOR_ESPACIO_PUBLICO];
  if (gestorId && validadorId) {
    console.log('\n[HUB] Para sembrar actividades a nombre de estas cuentas (PowerShell):');
    console.log(`  $env:SEED_GESTOR_ID="${gestorId}"; $env:SEED_VALIDADOR_ID="${validadorId}"; npm run seed -- --force`);
  }
}

async function iniciarSesion(): Promise<{ token: string; rol: string | null }> {
  const res = await pedir(`${HUB}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    abortar(
      res.status === 401
        ? `El hub rechazo las credenciales de ${ADMIN_EMAIL} (401). Esa cuenta no existe o la contrasena no es esa.`
        : `El hub respondio ${res.status} al iniciar sesion: ${JSON.stringify(cuerpo)}`,
    );
  }
  const token = extraerTokenDelHub(cuerpo);
  if (!token) abortar('El hub inicio sesion pero no devolvio token.');
  return { token, rol: (cuerpo as any)?.user?.role ?? null };
}

async function crearORecuperar(plantilla: UsuarioPruebaPlantilla, token: string): Promise<string> {
  const res = await pedir(`${HUB}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...plantilla, password: PASSWORD_PRUEBA }),
  });
  const cuerpo = await res.json().catch(() => null);

  if (res.status === 409) {
    console.log(`[HUB] ${plantilla.email} ya existia; se recupera su id sin modificarla.`);
    return await buscarId(plantilla.email, token);
  }
  if (!res.ok) {
    abortar(`El hub respondio ${res.status} al crear ${plantilla.email}: ${JSON.stringify(cuerpo)}`);
  }

  const id = extraerIdDeUsuarioCreado(cuerpo);
  if (!id) abortar(`El hub creo ${plantilla.email} pero no devolvio un id utilizable: ${JSON.stringify(cuerpo)}`);
  console.log(`[HUB] Creada ${plantilla.email} -> ${id}`);
  return id;
}

async function buscarId(email: string, token: string): Promise<string> {
  const res = await pedir(
    `${HUB}/api/users?search=${encodeURIComponent(email)}&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) abortar(`El hub respondio ${res.status} al buscar ${email}.`);
  const id = buscarIdPorEmail(cuerpo, email);
  if (!id) abortar(`${email} existe pero no aparecio en la busqueda del hub. Buscarlo a mano en Administracion > Usuarios.`);
  return id;
}

async function pedir(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    abortar(`No se pudo contactar al hub (${url}): ${(err as Error).message}`);
  }
}

function abortar(mensaje: string): never {
  console.error(`[HUB] ${mensaje}`);
  process.exit(1);
}

main().catch((err) => {
  console.error('[HUB] Fallo la creacion de usuarios:', err);
  process.exit(1);
});
