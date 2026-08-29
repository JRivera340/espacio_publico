import { describe, it, expect } from 'vitest';
import { getActivityCode } from './activityCode';

describe('getActivityCode', () => {
  it('rellena con cero a la izquierda por debajo de 10', () => {
    expect(getActivityCode({ categorySeq: 4 })).toBe('EP-04');
  });

  it('no rellena a partir de dos digitos', () => {
    expect(getActivityCode({ categorySeq: 23 })).toBe('EP-23');
  });

  it('no trunca al pasar de 99: crece en vez de perder digitos', () => {
    expect(getActivityCode({ categorySeq: 150 })).toBe('EP-150');
  });

  it('categorySeq nulo produce EP-SN, no EP-00', () => {
    expect(getActivityCode({ categorySeq: null })).toBe('EP-SN');
  });

  it('categorySeq indefinido produce EP-SN', () => {
    expect(getActivityCode({ categorySeq: undefined })).toBe('EP-SN');
  });

  it('categorySeq cero real se distingue de nulo', () => {
    expect(getActivityCode({ categorySeq: 0 })).toBe('EP-00');
  });
});
