import { Role } from '../common/enums/role.enum';
import { TEST_IDENTITIES, type TestRole } from './test-identities';

/**
 * Definicion de las cuentas de prueba que se crean EN EL HUB.
 *
 * Este modulo no tiene tabla de usuarios: el hub es el unico proveedor de
 * identidad. Por eso las cuentas se crean alla via `POST /api/users` y aca solo
 * vive la plantilla (correo, nombre, rol) y la logica pura de leer la respuesta.
 *
 * El hub genera su propio uuid al crear un usuario (`users.service.ts` pasa
 * `id: ''` y lo resuelve el repo), asi que los ids fijos de TEST_IDENTITIES NO
 * sirven contra el hub: solo valen para tokens firmados a mano en local. El id
 * real hay que leerlo de la respuesta y pasarselo al seed.
 */

export type UsuarioPruebaPlantilla = {
  name: string;
  lastname: string;
  email: string;
  role: TestRole;
};

const NOMBRES: Record<TestRole, { name: string; lastname: string }> = {
  [Role.GESTOR_ESPACIO_PUBLICO]: { name: 'Gestor', lastname: 'De Prueba' },
  [Role.VALIDADOR_ESPACIO_PUBLICO]: { name: 'Validador', lastname: 'De Prueba' },
  [Role.ADMIN]: { name: 'Admin', lastname: 'De Prueba' },
};

// Por defecto solo se crean las dos cuentas operativas. ADMIN queda fuera a
// proposito: crear un administrador nuevo en el hub de produccion es entregar
// permisos sobre usuarios reales, y eso se pide explicito con --con-admin.
export const ROLES_POR_DEFECTO: TestRole[] = [
  Role.GESTOR_ESPACIO_PUBLICO,
  Role.VALIDADOR_ESPACIO_PUBLICO,
];

export function construirPlantillas(roles: TestRole[]): UsuarioPruebaPlantilla[] {
  return roles.map((role) => ({
    ...NOMBRES[role],
    email: TEST_IDENTITIES[role].email,
    role,
  }));
}

// El hub valida @MinLength(8) en CreateUserDto. Se chequea antes de salir a la
// red para no dejar la mitad de las cuentas creadas y la otra mitad en 400.
export function validarPassword(password: string | undefined): string | null {
  if (!password || password.length < 8) {
    return 'La contrasena de las cuentas de prueba necesita al menos 8 caracteres.';
  }
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function extraerIdDeUsuarioCreado(cuerpo: unknown): string | null {
  const id = (cuerpo as { id?: unknown } | null)?.id;
  return typeof id === 'string' && UUID.test(id) ? id : null;
}

// El hub responde `{ data: [...], total }` en GET /api/users. Se usa cuando la
// cuenta ya existia (409) y hay que recuperar el id que ya tiene.
export function buscarIdPorEmail(cuerpo: unknown, email: string): string | null {
  const data = (cuerpo as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return null;
  const buscado = email.trim().toLowerCase();
  const encontrado = data.find(
    (u) => typeof (u as { email?: unknown })?.email === 'string'
      && (u as { email: string }).email.trim().toLowerCase() === buscado,
  );
  return extraerIdDeUsuarioCreado(encontrado ?? null);
}

export type IdsDeSeed = { gestorId: string; validadorId: string };

/**
 * Ids que el seed va a usar como dueno de las actividades ficticias.
 *
 * Sin variables de entorno cae en los uuid fijos de TEST_IDENTITIES, que es lo
 * correcto en local con tokens firmados a mano. Contra una base donde la
 * identidad la emite el hub hay que pasar los ids REALES; si no, el gestor
 * entra y ve el panel vacio porque las actividades pertenecen a otro id.
 */
export function resolverIdsDeSeed(env: Record<string, string | undefined>): IdsDeSeed {
  const gestorId = leerId(env.SEED_GESTOR_ID, 'SEED_GESTOR_ID', TEST_IDENTITIES.GESTOR_ESPACIO_PUBLICO.id);
  const validadorId = leerId(env.SEED_VALIDADOR_ID, 'SEED_VALIDADOR_ID', TEST_IDENTITIES.VALIDADOR_ESPACIO_PUBLICO.id);
  if (gestorId === validadorId) {
    throw new Error('SEED_GESTOR_ID y SEED_VALIDADOR_ID no pueden ser el mismo id.');
  }
  return { gestorId, validadorId };
}

function leerId(valor: string | undefined, nombre: string, porDefecto: string): string {
  const limpio = valor?.trim();
  if (!limpio) return porDefecto;
  if (!UUID.test(limpio)) {
    throw new Error(`${nombre} no es un uuid valido: "${limpio}".`);
  }
  return limpio;
}
