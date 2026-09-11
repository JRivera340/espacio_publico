import { BadRequestException } from '@nestjs/common';
import { parseFilters } from './publico.controller';

describe('parseFilters (publico)', () => {
  it('aplica el limite por defecto cuando no viene limit en la query', () => {
    const filters = parseFilters({});
    expect(filters.limit).toBe(25);
  });

  it('respeta un limit valido por debajo del tope', () => {
    const filters = parseFilters({ limit: '1' });
    expect(filters.limit).toBe(1);
  });

  it('recorta un limit que pide mas del tope maximo', () => {
    const filters = parseFilters({ limit: '9999' });
    expect(filters.limit).toBe(500);
  });

  it('rechaza limit no numerico', () => {
    expect(() => parseFilters({ limit: 'abc' })).toThrow(BadRequestException);
  });

  it('acepta offset valido', () => {
    const filters = parseFilters({ offset: '5' });
    expect(filters.offset).toBe(5);
  });

  it('rechaza offset negativo', () => {
    expect(() => parseFilters({ offset: '-1' })).toThrow(BadRequestException);
  });
});
