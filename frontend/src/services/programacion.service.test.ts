import { describe, it, expect, vi, beforeEach } from 'vitest';
import { programacionService } from './programacion.service';
import api from './api';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const ITEM = {
  id: 'p1',
  fecha: '2026-09-01T14:00:00.000Z',
  barrio: 'LA MACARENA',
  descripcion: 'Recuperacion de andenes',
  gestorUserId: 'g1',
  creadoPorUserId: 'v1',
  estado: 'PENDIENTE',
};

describe('programacionService', () => {
  beforeEach(() => {
    (api.get as any).mockReset().mockResolvedValue({ data: [ITEM] });
    (api.post as any).mockReset().mockResolvedValue({ data: [ITEM] });
    (api.patch as any).mockReset().mockResolvedValue({ data: ITEM });
    (api.delete as any).mockReset().mockResolvedValue({ data: null });
  });

  it('carga la programacion por lote, no de a una', async () => {
    await programacionService.crear([
      { fecha: '2026-09-01T14:00:00.000Z', descripcion: 'Una' },
      { fecha: '2026-09-02T14:00:00.000Z', descripcion: 'Otra' },
    ]);
    const [ruta, cuerpo] = (api.post as any).mock.calls[0];
    expect(ruta).toBe('/programacion');
    expect(Array.isArray(cuerpo)).toBe(true);
    expect(cuerpo).toHaveLength(2);
  });

  // El gestor pide SU cronograma por una ruta propia. El backend saca el gestor
  // del token: esta ruta no acepta pedir la programacion de otra persona.
  it('el cronograma del gestor no manda ningun identificador de gestor', async () => {
    await programacionService.mias({ desde: '2026-09-01' });
    const ruta = (api.get as any).mock.calls[0][0] as string;
    expect(ruta.startsWith('/programacion/mias')).toBe(true);
    expect(ruta).not.toContain('gestor=');
  });

  it('el listado del validador si puede filtrar por gestor', async () => {
    await programacionService.listar({ gestor: 'g1', estado: 'PENDIENTE' });
    const ruta = (api.get as any).mock.calls[0][0] as string;
    expect(ruta).toContain('gestor=g1');
    expect(ruta).toContain('estado=PENDIENTE');
  });

  it('tolera que el backend responda envuelto o plano', async () => {
    (api.get as any).mockResolvedValue({ data: { data: [ITEM], total: 1 } });
    expect(await programacionService.listar()).toHaveLength(1);

    (api.get as any).mockResolvedValue({ data: [ITEM] });
    expect(await programacionService.listar()).toHaveLength(1);
  });

  it('no se cae si la respuesta no es una lista', async () => {
    (api.get as any).mockResolvedValue({ data: null });
    expect(await programacionService.listar()).toEqual([]);
  });

  it('elimina por id', async () => {
    await programacionService.eliminar('p1');
    expect((api.delete as any).mock.calls[0][0]).toBe('/programacion/p1');
  });
});
