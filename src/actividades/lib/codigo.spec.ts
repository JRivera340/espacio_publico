import { codigoVisible } from './codigo';

describe('codigoVisible', () => {
  it('rellena con cero a la izquierda por debajo de 10', () => {
    expect(codigoVisible(4)).toBe('EP-04');
  });

  it('no rellena a partir de dos digitos', () => {
    expect(codigoVisible(23)).toBe('EP-23');
  });

  it('no trunca al pasar de 99: crece en vez de perder digitos', () => {
    expect(codigoVisible(150)).toBe('EP-150');
  });

  it('categorySeq nulo produce EP-SN, no EP-00', () => {
    expect(codigoVisible(null)).toBe('EP-SN');
  });

  it('categorySeq indefinido produce EP-SN', () => {
    expect(codigoVisible(undefined)).toBe('EP-SN');
  });

  it('categorySeq cero real se distingue de nulo', () => {
    expect(codigoVisible(0)).toBe('EP-00');
  });
});
