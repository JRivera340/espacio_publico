import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { cifrasDe } from './operativoFields';

describe('cifrasDe', () => {
  it('no se cae con dynamicAnswers ausente o nulo', () => {
    expect(cifrasDe(undefined)).toEqual({});
    expect(cifrasDe(null)).toEqual({});
  });

  it('deja leer las cifras por nombre', () => {
    expect(cifrasDe({ cambuches: 3 }).cambuches).toBe(3);
  });
});

// Espejo con la lista de permitidos del backend: si alguien agrega una cifra
// de un solo lado, el visor publico y el frontend dejan de hablar del mismo
// conjunto y nadie se entera hasta que un numero no aparece en la pantalla.
describe('espejo con la lista de permitidos del visor publico', () => {
  it('los nombres coinciden campo a campo con public-fields.ts del backend', () => {
    const aca = dirname(fileURLToPath(import.meta.url));
    const backend = readFileSync(resolve(aca, '../../../src/publico/public-fields.ts'), 'utf-8');
    const permitidos = [...backend.matchAll(/^\s+'([a-zA-Z0-9]+)',$/gm)].map((m) => m[1]).sort();

    const propio = readFileSync(resolve(aca, 'operativoFields.ts'), 'utf-8');
    const declarados = [...propio.matchAll(/^\s{2}([a-zA-Z0-9]+)\?: number;$/gm)].map((m) => m[1]).sort();

    expect(permitidos.length).toBeGreaterThan(0);
    expect(declarados).toEqual(permitidos);
  });
});
