import { describe, it, expect } from 'vitest';
import { filterActividades, barriosUnicos, esEditable, puedeEditar, inicioDeMes, finDeMes } from './dashboardFilters';
import type { Actividad } from '../../../types';

function actividad(overrides: Partial<Actividad> = {}): Actividad {
  return {
    id: '1',
    createdByUserId: 'u1',
    status: 'ENVIADA',
    dateTime: '2026-08-20T14:00:00.000Z',
    activityType: 'ESPACIO_PUBLICO_1801',
    operativoSubtipo: 'ESPACIO_PUBLICO_1801',
    lat: 4.6,
    lng: -74.06,
    barrio: 'LA MACARENA',
    photos: [],
    results: '',
    incautacionLicores: 0,
    incautacionArmasBlancas: 0,
    personasTransladadas: 0,
    personasSensibilizadas: 0,
    entidadResponsable: '',
    entidadesAcompanantes: [],
    createdAt: '2026-08-20T14:00:00.000Z',
    updatedAt: '2026-08-20T14:00:00.000Z',
    ...overrides,
  };
}

describe('filterActividades', () => {
  it('sin filtros devuelve todo igual', () => {
    const lista = [actividad(), actividad({ id: '2', barrio: 'SANTA BARBARA' })];
    expect(filterActividades(lista, {})).toHaveLength(2);
  });

  it('filtra por estado', () => {
    const lista = [actividad({ status: 'ENVIADA' }), actividad({ id: '2', status: 'PUBLICADA' })];
    expect(filterActividades(lista, { status: 'PUBLICADA' })).toEqual([lista[1]]);
  });

  it('filtra por barrio', () => {
    const lista = [actividad({ barrio: 'LA MACARENA' }), actividad({ id: '2', barrio: 'SANTA BARBARA' })];
    expect(filterActividades(lista, { barrio: 'SANTA BARBARA' })).toEqual([lista[1]]);
  });

  it('filtra por turno diurno', () => {
    const lista = [actividad({ isNightShift: true }), actividad({ id: '2', isNightShift: false })];
    expect(filterActividades(lista, { turno: 'DIURNO' })).toEqual([lista[1]]);
  });

  it('filtra por turno nocturno', () => {
    const lista = [actividad({ isNightShift: true }), actividad({ id: '2', isNightShift: false })];
    expect(filterActividades(lista, { turno: 'NOCTURNO' })).toEqual([lista[0]]);
  });
});

describe('barriosUnicos', () => {
  it('devuelve barrios sin repetir y ordenados', () => {
    const lista = [
      actividad({ barrio: 'SANTA BARBARA' }),
      actividad({ id: '2', barrio: 'LA MACARENA' }),
      actividad({ id: '3', barrio: 'LA MACARENA' }),
    ];
    expect(barriosUnicos(lista)).toEqual(['LA MACARENA', 'SANTA BARBARA']);
  });
});

describe('esEditable', () => {
  it('solo una actividad rechazada es editable', () => {
    expect(esEditable({ status: 'RECHAZADA' })).toBe(true);
    expect(esEditable({ status: 'ENVIADA' })).toBe(false);
    expect(esEditable({ status: 'PUBLICADA' })).toBe(false);
  });
});

describe('inicioDeMes / finDeMes', () => {
  it('calcula el primer y ultimo dia del mes dado', () => {
    const fecha = new Date(2026, 7, 15); // 15 de agosto de 2026
    expect(inicioDeMes(fecha)).toBe('2026-08-01');
    expect(finDeMes(fecha)).toBe('2026-08-31');
  });
});

describe('puedeEditar', () => {
  it('solo el autor puede corregir su actividad rechazada', () => {
    expect(puedeEditar({ status: 'RECHAZADA', createdByUserId: 'g1' }, 'g1')).toBe(true);
    expect(puedeEditar({ status: 'RECHAZADA', createdByUserId: 'g2' }, 'g1')).toBe(false);
  });

  it('ningun otro estado se corrige, ni siquiera siendo el autor', () => {
    expect(puedeEditar({ status: 'ENVIADA', createdByUserId: 'g1' }, 'g1')).toBe(false);
    expect(puedeEditar({ status: 'APROBADA', createdByUserId: 'g1' }, 'g1')).toBe(false);
    expect(puedeEditar({ status: 'BORRADOR', createdByUserId: 'g1' }, 'g1')).toBe(false);
  });

  it('sin usuario identificado no se corrige nada', () => {
    expect(puedeEditar({ status: 'RECHAZADA', createdByUserId: 'g1' }, undefined)).toBe(false);
  });

  it('un gestor acompanante puede editar la actividad rechazada, no solo el dueno', () => {
    const actividad = {
      status: 'RECHAZADA' as const,
      createdByUserId: 'gestor-dueno',
      gestoresInvolucradosIds: ['gestor-acompanante'],
    };
    expect(puedeEditar(actividad, 'gestor-acompanante')).toBe(true);
  });

  it('un gestor que no es dueno ni acompanante no puede editar', () => {
    const actividad = {
      status: 'RECHAZADA' as const,
      createdByUserId: 'gestor-dueno',
      gestoresInvolucradosIds: ['gestor-acompanante'],
    };
    expect(puedeEditar(actividad, 'gestor-ajeno')).toBe(false);
  });
});
