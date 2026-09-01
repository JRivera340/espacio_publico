import {
  ROLES_POR_DEFECTO,
  buscarIdPorEmail,
  construirPlantillas,
  extraerIdDeUsuarioCreado,
  resolverIdsDeSeed,
  validarPassword,
} from './usuarios-prueba';
import { TEST_IDENTITIES } from './test-identities';
import { Role } from '../common/enums/role.enum';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

describe('construirPlantillas', () => {
  it('usa el correo declarado en TEST_IDENTITIES para cada rol', () => {
    const plantillas = construirPlantillas([Role.GESTOR_ESPACIO_PUBLICO]);
    expect(plantillas).toEqual([
      {
        name: 'Gestor',
        lastname: 'De Prueba',
        email: TEST_IDENTITIES.GESTOR_ESPACIO_PUBLICO.email,
        role: Role.GESTOR_ESPACIO_PUBLICO,
      },
    ]);
  });

  it('no lleva id: el hub genera el suyo al crear el usuario', () => {
    const plantillas = construirPlantillas(ROLES_POR_DEFECTO);
    plantillas.forEach((p) => expect(p).not.toHaveProperty('id'));
  });

  it('por defecto no incluye ADMIN', () => {
    expect(ROLES_POR_DEFECTO).not.toContain(Role.ADMIN);
    expect(ROLES_POR_DEFECTO).toEqual([
      Role.GESTOR_ESPACIO_PUBLICO,
      Role.VALIDADOR_ESPACIO_PUBLICO,
    ]);
  });

  it('cubre los tres roles del modulo cuando se piden todos', () => {
    const plantillas = construirPlantillas(Object.values(Role));
    expect(plantillas.map((p) => p.role).sort()).toEqual(Object.values(Role).sort());
  });
});

describe('validarPassword', () => {
  it('rechaza menos de 8 caracteres, que es el minimo del hub', () => {
    expect(validarPassword('1234567')).toMatch(/8 caracteres/);
  });

  it('rechaza vacia o ausente', () => {
    expect(validarPassword('')).not.toBeNull();
    expect(validarPassword(undefined)).not.toBeNull();
  });

  it('acepta 8 caracteres exactos', () => {
    expect(validarPassword('12345678')).toBeNull();
  });
});

describe('extraerIdDeUsuarioCreado', () => {
  it('devuelve el id de la respuesta del hub', () => {
    expect(extraerIdDeUsuarioCreado({ id: UUID_A, email: 'x@y.com' })).toBe(UUID_A);
  });

  it('devuelve null si el id no es un uuid', () => {
    expect(extraerIdDeUsuarioCreado({ id: 'no-es-uuid' })).toBeNull();
    expect(extraerIdDeUsuarioCreado({ id: 42 })).toBeNull();
    expect(extraerIdDeUsuarioCreado(null)).toBeNull();
  });
});

describe('buscarIdPorEmail', () => {
  const cuerpo = {
    data: [
      { id: UUID_A, email: 'Gestor.Prueba@Ejemplo.com' },
      { id: UUID_B, email: 'otro@ejemplo.com' },
    ],
    total: 2,
  };

  it('encuentra el id ignorando mayusculas y espacios', () => {
    expect(buscarIdPorEmail(cuerpo, '  gestor.prueba@ejemplo.com ')).toBe(UUID_A);
  });

  it('devuelve null si el correo no esta en la lista', () => {
    expect(buscarIdPorEmail(cuerpo, 'nadie@ejemplo.com')).toBeNull();
  });

  it('devuelve null si la respuesta no trae data', () => {
    expect(buscarIdPorEmail({}, 'gestor.prueba@ejemplo.com')).toBeNull();
    expect(buscarIdPorEmail(null, 'gestor.prueba@ejemplo.com')).toBeNull();
  });
});

describe('resolverIdsDeSeed', () => {
  it('sin variables cae en los ids fijos de TEST_IDENTITIES', () => {
    expect(resolverIdsDeSeed({})).toEqual({
      gestorId: TEST_IDENTITIES.GESTOR_ESPACIO_PUBLICO.id,
      validadorId: TEST_IDENTITIES.VALIDADOR_ESPACIO_PUBLICO.id,
    });
  });

  it('usa los ids reales del hub cuando se pasan', () => {
    expect(resolverIdsDeSeed({ SEED_GESTOR_ID: UUID_A, SEED_VALIDADOR_ID: UUID_B })).toEqual({
      gestorId: UUID_A,
      validadorId: UUID_B,
    });
  });

  it('permite sobrescribir solo uno', () => {
    expect(resolverIdsDeSeed({ SEED_GESTOR_ID: UUID_A })).toEqual({
      gestorId: UUID_A,
      validadorId: TEST_IDENTITIES.VALIDADOR_ESPACIO_PUBLICO.id,
    });
  });

  it('falla si el id no es un uuid, para no borrar por un valor basura', () => {
    expect(() => resolverIdsDeSeed({ SEED_GESTOR_ID: 'gestor.prueba@ejemplo.com' }))
      .toThrow(/SEED_GESTOR_ID/);
  });

  it('falla si gestor y validador son el mismo id', () => {
    expect(() => resolverIdsDeSeed({ SEED_GESTOR_ID: UUID_A, SEED_VALIDADOR_ID: UUID_A }))
      .toThrow(/mismo id/);
  });
});
