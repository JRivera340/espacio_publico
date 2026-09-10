import { PublicoService } from './publico.service';
import { ActividadesService } from '../actividades/actividades.service';
import { InMemoryActividadesRepository } from '../actividades/actividades.repository.memory';
import { ProgramacionService } from '../programacion/programacion.service';

const GESTOR = '00000000-0000-0000-0000-000000000001';
const VALIDADOR = '00000000-0000-0000-0000-000000000002';

const base = {
  dateTime: '2026-08-20T14:00:00.000Z',
  activityType: 'ESPACIO_PUBLICO - 1801',
  lat: 4.6,
  lng: -74.07,
  barrio: 'LA MACARENA',
  results: 'Texto interno del operativo que no debe publicarse',
};

describe('PublicoService', () => {
  let repo: InMemoryActividadesRepository;
  let publico: PublicoService;
  let actividades: ActividadesService;

  beforeEach(() => {
    repo = new InMemoryActividadesRepository();
    const programacion = { completarCoincidentes: jest.fn().mockResolvedValue(undefined) } as unknown as ProgramacionService;
    actividades = new ActividadesService(repo, programacion);
    publico = new PublicoService(actividades);
  });

  it('solo publica actividades en estado PUBLICADA', async () => {
    const a = await actividades.crear(GESTOR, base);
    await actividades.crear(GESTOR, base);
    await actividades.aprobar(a.id, VALIDADOR);
    const listado = await publico.listar();
    expect(listado.total).toBe(1);
  });

  it('no expone el identificador del gestor ni las notas de validacion', async () => {
    const a = await actividades.crear(GESTOR, base);
    await actividades.aprobar(a.id, VALIDADOR, 'nota interna');
    const [item] = (await publico.listar()).data;
    expect(item).not.toHaveProperty('createdByUserId');
    expect(item).not.toHaveProperty('validationNotes');
    expect(item).not.toHaveProperty('validatorUserId');
    expect(item).not.toHaveProperty('results');
  });

  it('publica solo las cifras saneadas de dynamicAnswers', async () => {
    const a = await actividades.crear(GESTOR, {
      ...base,
      dynamicAnswers: { cambuches: 3, observaciones: 'datos de una persona' },
    });
    await actividades.aprobar(a.id, VALIDADOR);
    const [item] = (await publico.listar()).data;
    expect(item.cifras).toEqual({ cambuches: 3 });
  });
});
