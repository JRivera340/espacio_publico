import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersService } from './users.service';
import api from './api';

vi.mock('./api', () => ({ default: { get: vi.fn() } }));

describe('usersService.listarGestores', () => {
  beforeEach(() => vi.clearAllMocks());

  // La ruta exacta la define el proxy de usuarios del backend
  // (`@Controller('users')` + `@Get('gestores/list')`). Si cambia de un lado y
  // no del otro, la lista llega vacia sin ningun error visible.
  it('pide la ruta del proxy de usuarios', async () => {
    (api.get as any).mockResolvedValue({ data: [] });
    await usersService.listarGestores();
    expect((api.get as any).mock.calls[0][0]).toBe('/users/gestores/list');
  });

  // El hub responde un arreglo plano de usuarios completos.
  it('arma nombre y id a partir del usuario del hub', async () => {
    (api.get as any).mockResolvedValue({
      data: [
        { id: 'u1', name: 'Ana', lastname: 'Perez', email: 'ana@ejemplo.gov', role: 'GESTOR_ESPACIO_PUBLICO' },
      ],
    });
    expect(await usersService.listarGestores()).toEqual([{ id: 'u1', nombre: 'Ana Perez' }]);
  });

  // Saneamiento: la pantalla solo necesita a quien mostrar y que id enviar.
  it('no arrastra a la pantalla campos que no se usan', async () => {
    (api.get as any).mockResolvedValue({
      data: [{ id: 'u1', name: 'Ana', lastname: 'Perez', email: 'ana@ejemplo.gov', role: 'GESTOR_ESPACIO_PUBLICO' }],
    });
    const [gestor] = await usersService.listarGestores();
    expect(Object.keys(gestor).sort()).toEqual(['id', 'nombre']);
  });

  it('descarta entradas sin identificador utilizable', async () => {
    (api.get as any).mockResolvedValue({ data: [null, { name: 'Sin id' }, { id: 'u2', name: 'Luis' }] });
    expect(await usersService.listarGestores()).toEqual([{ id: 'u2', nombre: 'Luis' }]);
  });

  // Si el hub responde algo que no es una lista, la pantalla recibe una lista
  // vacia en vez de reventar al mapear.
  it('devuelve lista vacia si la respuesta no es un arreglo', async () => {
    (api.get as any).mockResolvedValue({ data: { message: 'No se pudo contactar al hub de usuarios' } });
    expect(await usersService.listarGestores()).toEqual([]);
  });

  // El fallo se propaga a proposito: es quien llama el que decide seguir sin
  // acompanantes. Ver CreateActivity.test.tsx, donde se comprueba que el
  // registro no queda bloqueado por esto.
  it('propaga el fallo del proxy para que la pantalla decida', async () => {
    (api.get as any).mockRejectedValue(new Error('502'));
    await expect(usersService.listarGestores()).rejects.toThrow();
  });
});
