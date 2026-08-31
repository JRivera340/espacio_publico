import { describe, it, expect } from 'vitest';
import { esReferenciaDeArchivo, resolverActa, ubicacionDe, etiquetaDePregunta } from './activityDetail';

describe('esReferenciaDeArchivo', () => {
  it('rechaza vacios y el marcador de pendiente', () => {
    expect(esReferenciaDeArchivo(null)).toBe(false);
    expect(esReferenciaDeArchivo('')).toBe(false);
    expect(esReferenciaDeArchivo('   ')).toBe(false);
    expect(esReferenciaDeArchivo('PENDIENTE')).toBe(false);
    expect(esReferenciaDeArchivo('pendiente')).toBe(false);
  });

  it('acepta una referencia real', () => {
    expect(esReferenciaDeArchivo('actas/abc.pdf')).toBe(true);
  });
});

describe('resolverActa', () => {
  it('prefiere el campo dedicado', () => {
    expect(resolverActa({ actaPdfUrl: 'actas/uno.pdf', actaOperativo: 'actas/dos.pdf' })).toBe('actas/uno.pdf');
  });

  it('cae a actaOperativo cuando la url no sirve', () => {
    expect(resolverActa({ actaPdfUrl: 'PENDIENTE', actaOperativo: 'actas/dos.pdf' })).toBe('actas/dos.pdf');
  });

  // Recupera actas que el gestor subio pero que quedaron guardadas solo como
  // respuesta del formulario. Sin este respaldo, el acta existe en el deposito
  // y la pantalla dice que nunca se cargo.
  it('busca dentro de las respuestas del formulario', () => {
    expect(
      resolverActa({ dynamicAnswers: { acta_operativo: 'actas/tres.pdf', comparendos: 2 } }),
    ).toBe('actas/tres.pdf');
  });

  it('encuentra el acta aunque la clave no se llame acta', () => {
    expect(resolverActa({ dynamicAnswers: { soporte: 'actas/cuatro.pdf' } })).toBe('actas/cuatro.pdf');
  });

  it('devuelve null cuando no hay ninguna', () => {
    expect(resolverActa({ dynamicAnswers: { comparendos: 3 } })).toBeNull();
    expect(resolverActa(null)).toBeNull();
  });
});

describe('ubicacionDe', () => {
  it('devuelve null sin coordenadas usables', () => {
    expect(ubicacionDe(null)).toBeNull();
    expect(ubicacionDe({ lat: undefined as any, lng: -74 })).toBeNull();
    expect(ubicacionDe({ lat: Number.NaN, lng: -74 })).toBeNull();
  });

  it('devuelve las coordenadas cuando son numeros', () => {
    expect(ubicacionDe({ lat: 4.6, lng: -74.07 })).toEqual({ lat: 4.6, lng: -74.07 });
  });
});

describe('etiquetaDePregunta', () => {
  it('usa la etiqueta guardada al registrar', () => {
    const respuestas = { __fieldMeta: { comparendos: { label: 'Comparendos impuestos' } } };
    expect(etiquetaDePregunta(respuestas, 'comparendos')).toBe('Comparendos impuestos');
  });

  it('devuelve null si no hay retrato guardado', () => {
    expect(etiquetaDePregunta({}, 'comparendos')).toBeNull();
    expect(etiquetaDePregunta(null, 'comparendos')).toBeNull();
  });
});
