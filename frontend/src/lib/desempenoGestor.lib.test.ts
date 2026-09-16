import { describe, it, expect } from 'vitest';
import { resumenDelMes, resumenPorGestor, actividadesDelGestor } from './desempenoGestor.lib';
import type { ProgramacionItem } from '../services/programacion.service';
import type { Actividad } from '../types';
import type { GestorResumen } from '../services/users.service';

const AHORA = new Date(2026, 8, 20, 12); // 20 de septiembre 2026, mediodia

function item(fecha: string, estado: ProgramacionItem['estado']): ProgramacionItem {
  return {
    id: fecha + estado, fecha, descripcion: 'x', estado, creadoPorUserId: 'v-1', gestorUserIds: [],
  };
}

function actividad(dateTime: string): Actividad {
  return { id: dateTime, dateTime } as Actividad;
}

describe('desempenoGestor.lib', () => {
  it('cuenta programadas, cumplidas, pendientes y vencidas solo del mes de referencia', () => {
    const programacion: ProgramacionItem[] = [
      item('2026-09-05T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-10T10:00:00.000Z', 'PENDIENTE'), // ya paso, vencida
      item('2026-09-25T10:00:00.000Z', 'PENDIENTE'), // todavia no llega
      item('2026-08-15T10:00:00.000Z', 'CUMPLIDA'), // mes distinto, no cuenta
    ];

    const resumen = resumenDelMes(programacion, [], new Date(2026, 8, 1), AHORA);

    expect(resumen.programadasMes).toBe(3);
    expect(resumen.cumplidasMes).toBe(1);
    expect(resumen.vencidasMes).toBe(1);
    expect(resumen.pendientesMes).toBe(1);
  });

  it('el cumplimiento es cumplidas sobre cumplidas mas vencidas, sin contar lo que todavia no vence', () => {
    const programacion: ProgramacionItem[] = [
      item('2026-09-05T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-06T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-10T10:00:00.000Z', 'PENDIENTE'), // vencida
      item('2026-09-25T10:00:00.000Z', 'PENDIENTE'), // no vence todavia
    ];

    const resumen = resumenDelMes(programacion, [], new Date(2026, 8, 1), AHORA);

    // 2 cumplidas / (2 cumplidas + 1 vencida) = 66.67% -> redondeado 67
    expect(resumen.porcentajeCumplimiento).toBe(67);
  });

  it('sin cumplidas ni vencidas el cumplimiento es 100 (el mes no tuvo incumplimientos)', () => {
    const resumen = resumenDelMes([], [], new Date(2026, 8, 1), AHORA);
    expect(resumen.porcentajeCumplimiento).toBe(100);
  });

  it('cuenta las actividades registradas en el mes, sin importar su estado de programacion', () => {
    const actividades: Actividad[] = [
      actividad('2026-09-03T10:00:00.000Z'),
      actividad('2026-09-18T10:00:00.000Z'),
      actividad('2026-08-30T10:00:00.000Z'), // otro mes
    ];
    const resumen = resumenDelMes([], actividades, new Date(2026, 8, 1), AHORA);
    expect(resumen.actividadesRegistradasMes).toBe(2);
  });

  it('resumenPorGestor agrupa cada gestor con lo suyo y ordena por cumplimiento descendente', () => {
    const gestores = [{ id: 'g-1', nombre: 'Ana Perez' }, { id: 'g-2', nombre: 'Luis Mora' }];
    const programacion: ProgramacionItem[] = [
      item('2026-09-05T10:00:00.000Z', 'CUMPLIDA'), // sin gestorUserIds, no cuenta para ninguno
    ];

    const conGestor = (fecha: string, estado: ProgramacionItem['estado'], gestorUserId: string): ProgramacionItem => ({
      ...item(fecha, estado), gestorUserIds: [gestorUserId],
    });

    const lista: ProgramacionItem[] = [
      conGestor('2026-09-05T10:00:00.000Z', 'CUMPLIDA', 'g-1'),
      conGestor('2026-09-06T10:00:00.000Z', 'CUMPLIDA', 'g-1'),
      conGestor('2026-09-07T10:00:00.000Z', 'PENDIENTE', 'g-2'), // vencida
    ];

    const resumen = resumenPorGestor(lista, [], new Date(2026, 8, 1), AHORA, gestores);

    expect(resumen).toHaveLength(2);
    expect(resumen[0].nombre).toBe('Ana Perez');
    expect(resumen[0].porcentajeCumplimiento).toBe(100);
    expect(resumen[1].nombre).toBe('Luis Mora');
    expect(resumen[1].porcentajeCumplimiento).toBe(0);
  });

  it('un gestor sin nada asignado (100% por defecto) no supera en el orden a uno que si cumplio algo', () => {
    const gestores = [{ id: 'g-1', nombre: 'Ana Perez' }, { id: 'g-2', nombre: 'Luis Mora' }];

    const conGestor = (fecha: string, estado: ProgramacionItem['estado'], gestorUserId: string): ProgramacionItem => ({
      ...item(fecha, estado), gestorUserIds: [gestorUserId],
    });

    // Ana no tiene nada programado este mes (base 0, cumplimiento 100 por defecto).
    // Luis cumplio 9 de 10, un cumplimiento real del 90%.
    const lista: ProgramacionItem[] = [
      ...Array.from({ length: 9 }, (_, i) => conGestor(`2026-09-0${i + 1}T10:00:00.000Z`, 'CUMPLIDA', 'g-2')),
      conGestor('2026-09-10T10:00:00.000Z', 'PENDIENTE', 'g-2'), // vencida
    ];

    const resumen = resumenPorGestor(lista, [], new Date(2026, 8, 1), AHORA, gestores);

    expect(resumen).toHaveLength(2);
    expect(resumen[0].nombre).toBe('Luis Mora');
    expect(resumen[0].porcentajeCumplimiento).toBe(90);
    expect(resumen[1].nombre).toBe('Ana Perez');
    expect(resumen[1].porcentajeCumplimiento).toBe(100);
  });

  it('actividadesDelGestor da credito al acompanante, no solo al que la creo', () => {
    const actividades: Actividad[] = [
      { id: '1', createdByUserId: 'g-2', gestoresInvolucradosIds: ['g-1'] } as Actividad,
      { id: '2', createdByUserId: 'g-3', gestoresInvolucradosIds: [] } as Actividad,
    ];
    expect(actividadesDelGestor(actividades, 'g-1').map((a) => a.id)).toEqual(['1']);
  });

  it('resumenPorGestor cuenta como registrada la actividad de un companero de equipo', () => {
    const gestores = [{ id: 'g-1', nombre: 'Ana Perez' }];
    const actividades: Actividad[] = [
      { id: '1', dateTime: '2026-09-05T10:00:00.000Z', createdByUserId: 'g-2', gestoresInvolucradosIds: ['g-1'] } as Actividad,
    ];
    const resumen = resumenPorGestor([], actividades, new Date(2026, 8, 1), AHORA, gestores);
    expect(resumen[0].actividadesRegistradasMes).toBe(1);
  });

  it('distingue tareas compartidas (varios gestores) de individuales', () => {
    const programacion: ProgramacionItem[] = [
      { id: '1', fecha: '2026-09-05T10:00:00.000Z', descripcion: 'x', estado: 'PENDIENTE', gestorUserIds: ['g-1', 'g-2'], creadoPorUserId: 'v-1' },
      { id: '2', fecha: '2026-09-06T10:00:00.000Z', descripcion: 'x', estado: 'PENDIENTE', gestorUserIds: ['g-1'], creadoPorUserId: 'v-1' },
    ];
    const resumen = resumenDelMes(programacion, [], new Date(2026, 8, 1), AHORA);
    expect(resumen.compartidasMes).toBe(1);
    expect(resumen.individualesMes).toBe(1);
  });

  it('resumenDelMes cuenta una tarea con varios gestores para cualquiera de ellos', () => {
    const programacion: ProgramacionItem[] = [
      { id: '1', fecha: '2026-09-05T10:00:00.000Z', descripcion: 'x', estado: 'CUMPLIDA', gestorUserIds: ['g-1', 'g-2'], creadoPorUserId: 'v-1' },
    ];
    const resumenA = resumenDelMes(programacion.filter((p) => p.gestorUserIds.includes('g-1')), [], new Date(2026, 8, 1), new Date());
    const resumenB = resumenDelMes(programacion.filter((p) => p.gestorUserIds.includes('g-2')), [], new Date(2026, 8, 1), new Date());
    expect(resumenA.cumplidasMes).toBe(1);
    expect(resumenB.cumplidasMes).toBe(1);
  });
});
