import { BadRequestException } from '@nestjs/common';
import { parseFilters } from './actividades.controller';

describe('parseFilters', () => {
  it('rechaza limit no numerico', () => {
    expect(() => parseFilters({ limit: 'abc' })).toThrow(BadRequestException);
  });

  it('rechaza offset negativo', () => {
    expect(() => parseFilters({ offset: '-5' })).toThrow(BadRequestException);
  });

  it('rechaza limit decimal', () => {
    expect(() => parseFilters({ limit: '1.5' })).toThrow(BadRequestException);
  });

  it('ignora limit vacio en vez de convertirlo en 0', () => {
    const filters = parseFilters({ limit: '' });
    expect(filters.limit).toBeUndefined();
  });

  it('acepta limit y offset validos', () => {
    const filters = parseFilters({ limit: '10', offset: '5' });
    expect(filters.limit).toBe(10);
    expect(filters.offset).toBe(5);
  });

  it('deja limit y offset sin definir cuando no vienen en la query', () => {
    const filters = parseFilters({});
    expect(filters.limit).toBeUndefined();
    expect(filters.offset).toBeUndefined();
  });
});
