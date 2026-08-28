import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateActividadDto } from './create-actividad.dto';

function validar(payload: Record<string, any>) {
  return validateSync(plainToInstance(CreateActividadDto, payload));
}

const base = {
  dateTime: '2026-08-20T14:00:00.000Z',
  activityType: 'ESPACIO_PUBLICO - 1801',
  lat: 4.6,
  lng: -74.07,
  barrio: 'LA MACARENA',
  results: 'Recuperacion de anden sobre la carrera quinta',
};

describe('CreateActividadDto', () => {
  it('acepta el payload minimo valido', () => {
    expect(validar(base)).toHaveLength(0);
  });

  it('rechaza una fecha que no es ISO 8601', () => {
    const errores = validar({ ...base, dateTime: '20 de agosto' });
    expect(errores.map((e) => e.property)).toContain('dateTime');
  });

  it('rechaza cifras negativas', () => {
    const errores = validar({ ...base, personasSensibilizadas: -1 });
    expect(errores.map((e) => e.property)).toContain('personasSensibilizadas');
  });

  it('rechaza results vacio', () => {
    const errores = validar({ ...base, results: '' });
    expect(errores.map((e) => e.property)).toContain('results');
  });

  it('acepta gestoresInvolucradosIds como arreglo de strings', () => {
    expect(validar({ ...base, isGroupOperativo: true, gestoresInvolucradosIds: ['a', 'b'] })).toHaveLength(0);
  });
});
