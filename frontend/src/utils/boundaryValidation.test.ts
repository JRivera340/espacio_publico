import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { detectarBarrio } from './boundaryValidation';

// Los tests mockean fetch para servir los archivos reales de frontend/public/boundaries
// desde disco, sin depender de red ni de un servidor estatico levantado.
const BOUNDARIES_DIR = path.resolve(__dirname, '../../public/boundaries');

function fakeResponse(buffer: Buffer): Response {
  return {
    ok: true,
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    text: async () => buffer.toString('utf-8'),
  } as unknown as Response;
}

// happy-dom (entorno de test) no soporta secciones CDATA al parsear XML: aborta
// el documento entero con "invalid element name" apenas encuentra una, aunque
// sea en un campo que ni siquiera se necesita para esta prueba. Un navegador
// real las parsea sin problema. Se parchea DOMParser solo en el test para
// des-envolver el CDATA en texto plano equivalente (mismo textContent),
// sin tocar boundaryValidation.ts ni su comportamiento en produccion.
function unwrapCdata(match: string, inner: string): string {
  return inner.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

describe('boundaryValidation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('KMZ_Sectores_Catastrales_SF_2026.kmz')) {
        return fakeResponse(readFileSync(path.join(BOUNDARIES_DIR, 'KMZ_Sectores_Catastrales_SF_2026.kmz')));
      }
      if (url.includes('doc.kml')) {
        return fakeResponse(readFileSync(path.join(BOUNDARIES_DIR, 'doc.kml')));
      }

      return { ok: false } as Response;
    }));

    const RealDOMParser = DOMParser;
    class PatchedDOMParser extends RealDOMParser {
      parseFromString(str: string, type: DOMParserSupportedType) {
        const patched = str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, unwrapCdata);
        return super.parseFromString(patched, type);
      }
    }
    vi.stubGlobal('DOMParser', PatchedDOMParser);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detecta un barrio dentro de la localidad', async () => {
    // Coordenada dentro de La Macarena, Localidad Santa Fe
    await expect(detectarBarrio(4.6156, -74.0664)).resolves.toBeTruthy();
  });

  it('devuelve null fuera de la localidad', async () => {
    // Coordenada en otro pais (Madrid, Espana)
    await expect(detectarBarrio(40.4168, -3.7038)).resolves.toBeNull();
  });
});
