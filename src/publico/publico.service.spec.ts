import { PublicoService } from './publico.service';
import { parseFilters } from './publico.controller';
import { ActividadesService } from '../actividades/actividades.service';
import { InMemoryActividadesRepository } from '../actividades/actividades.repository.memory';
import { ProgramacionService } from '../programacion/programacion.service';
import { ReporteService } from '../reporte/reporte.service';

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
    const reporte = { generarPazYSalvoPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake')) } as unknown as ReporteService;
    actividades = new ActividadesService(repo, programacion, reporte);
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

  it('muestra publishedPhotos, no el set completo de photos', async () => {
    const a = await actividades.crear(GESTOR, {
      ...base,
      photos: ['operativo-1.jpg', 'operativo-2.jpg', 'operativo-3.jpg'],
    });
    await actividades.aprobar(a.id, VALIDADOR, undefined, ['operativo-2.jpg']);
    const [item] = (await publico.listar()).data;
    expect(item.photos).toEqual(['operativo-2.jpg']);
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

  it('respeta limit: pedir 1 fila devuelve exactamente 1 aunque haya mas publicadas', async () => {
    for (let i = 0; i < 3; i++) {
      const a = await actividades.crear(GESTOR, base);
      await actividades.aprobar(a.id, VALIDADOR);
    }
    const listado = await publico.listar({ limit: 1 });
    expect(listado.data).toHaveLength(1);
    expect(listado.total).toBe(3);
  });

  it('sin limit en la query, el tope por defecto del controlador evita traer todo', async () => {
    for (let i = 0; i < 30; i++) {
      const a = await actividades.crear(GESTOR, base);
      await actividades.aprobar(a.id, VALIDADOR);
    }
    const listado = await publico.listar(parseFilters({}));
    expect(listado.data).toHaveLength(25);
    expect(listado.total).toBe(30);
  });

  it('cifras no se limita: suma sobre todas las publicadas aunque llegue un limit', async () => {
    for (let i = 0; i < 3; i++) {
      const a = await actividades.crear(GESTOR, {
        ...base,
        dynamicAnswers: { cambuches: 1 },
      });
      await actividades.aprobar(a.id, VALIDADOR);
    }
    const cifras = await publico.cifras({ limit: 1, offset: 0 });
    expect(cifras.total).toBe(3);
    expect(cifras.cifras).toEqual({ cambuches: 3 });
  });
});
