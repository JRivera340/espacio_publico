import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activityService } from './activity.service';
import api from './api';

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('activityService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('crea contra la ruta nueva, no la del sistema original', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'a1' } });
    await activityService.create({ barrio: 'LA MACARENA' } as any);
    expect((api.post as any).mock.calls[0][0]).toBe('/actividades');
  });

  it('envia a validacion por la ruta del id', async () => {
    (api.post as any).mockResolvedValue({ data: {} });
    await activityService.send('a1');
    expect((api.post as any).mock.calls[0][0]).toBe('/actividades/a1/send');
  });

  it('lista solo las propias del gestor', async () => {
    (api.get as any).mockResolvedValue({ data: { data: [], total: 0 } });
    await activityService.listMine({});
    expect((api.get as any).mock.calls[0][0]).toContain('/actividades/mine');
  });
});
