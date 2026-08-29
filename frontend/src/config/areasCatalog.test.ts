import { describe, it, expect } from 'vitest';
import { AREAS_CATALOG, SUBTYPE_MAPPING, SUBCATEGORY_MAPPING, resolveActivityEnums } from './areasCatalog';

describe('areasCatalog', () => {
  it('tiene exactamente un area', () => {
    expect(AREAS_CATALOG).toHaveLength(1);
    expect(AREAS_CATALOG[0].subtipos).toHaveLength(1);
  });

  it('mapea el nombre que muestra el formulario al valor del enum', () => {
    expect(SUBTYPE_MAPPING['1801']).toBe('ESPACIO_PUBLICO_1801');
  });

  it('mapea tambien el propio enum, para que convertir sea idempotente', () => {
    expect(SUBTYPE_MAPPING['ESPACIO_PUBLICO_1801']).toBe('ESPACIO_PUBLICO_1801');
  });

  it('mapea el enum al nombre de la subcategoria en el microservicio de encuestas', () => {
    expect(SUBCATEGORY_MAPPING['ESPACIO_PUBLICO_1801']).toBe('1801');
  });

  it('resuelve los enums tecnicos a partir del nombre que muestra el formulario', () => {
    const r = resolveActivityEnums('1801');
    expect(r.technicalSubtipo).toBe('ESPACIO_PUBLICO_1801');
    expect(r.activityType).toBe('ESPACIO_PUBLICO - 1801');
  });
});
