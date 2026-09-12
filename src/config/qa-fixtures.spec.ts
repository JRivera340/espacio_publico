import { CARNADAS_QA, GESTOR_B_POR_DEFECTO, MARCA_QA, resolverGestorB } from './qa-fixtures';

const GESTOR_A = '11111111-1111-4111-8111-111111111111';
const VALIDADOR = '22222222-2222-4222-8222-222222222222';

describe('resolverGestorB', () => {
  it('sin variable de entorno usa el uuid fijo de prueba', () => {
    expect(resolverGestorB({}, [GESTOR_A, VALIDADOR])).toBe(GESTOR_B_POR_DEFECTO);
  });

  it('toma el id de SEED_GESTOR_B_ID', () => {
    const id = '33333333-3333-4333-8333-333333333333';
    expect(resolverGestorB({ SEED_GESTOR_B_ID: id }, [GESTOR_A])).toBe(id);
  });

  it('recorta los espacios alrededor del id', () => {
    const id = '33333333-3333-4333-8333-333333333333';
    expect(resolverGestorB({ SEED_GESTOR_B_ID: `  ${id}  ` }, [])).toBe(id);
  });

  it('una variable vacia cae en el uuid por defecto y no revienta', () => {
    expect(resolverGestorB({ SEED_GESTOR_B_ID: '   ' }, [])).toBe(GESTOR_B_POR_DEFECTO);
  });

  it('rechaza un id que no es uuid', () => {
    expect(() => resolverGestorB({ SEED_GESTOR_B_ID: 'gestor-b' }, []))
      .toThrow(/no es un uuid valido/);
  });

  // El punto de todo el chequeo: si el gestor B fuera el gestor A, este veria
  // "lo del otro" porque seria lo propio, y la prueba de aislamiento pasaria
  // en verde sin haber probado nada.
  it('rechaza que el gestor B sea el gestor A', () => {
    expect(() => resolverGestorB({ SEED_GESTOR_B_ID: GESTOR_A }, [GESTOR_A, VALIDADOR]))
      .toThrow(/aislamiento/);
  });

  it('rechaza que el gestor B sea el validador', () => {
    expect(() => resolverGestorB({ SEED_GESTOR_B_ID: VALIDADOR }, [GESTOR_A, VALIDADOR]))
      .toThrow(/aislamiento/);
  });

  it('compara los ids ignorando mayusculas', () => {
    expect(() => resolverGestorB({ SEED_GESTOR_B_ID: GESTOR_A.toUpperCase() }, [GESTOR_A]))
      .toThrow(/aislamiento/);
  });
});

describe('carnadas del control de calidad', () => {
  // Se buscan con grep sobre la respuesta cruda: sin un prefijo improbable, un
  // nombre comun daria falsos positivos y el chequeo no diria nada.
  it('todas las carnadas llevan el prefijo ZZTEST', () => {
    // Insensible a mayusculas: el correo es intencionalmente minuscula (asi
    // se escriben en la practica) y el grep que las busca tambien lo es.
    for (const valor of Object.values(CARNADAS_QA)) {
      expect(valor).toMatch(/ZZTEST/i);
    }
  });

  it('la marca de las filas no puede confundirse con texto de una persona', () => {
    expect(MARCA_QA).toBe('[QA-PLAN4]');
  });
});
