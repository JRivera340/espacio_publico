import { NotFoundException } from '@nestjs/common';
import { ProgramacionService } from './programacion.service';
import { InMemoryProgramacionRepository } from './programacion.repository.memory';
import { ProgramacionEstado } from './enums/programacion-estado.enum';

const VALIDADOR = '00000000-0000-0000-0000-000000000001';
const GESTOR_A = '00000000-0000-0000-0000-000000000002';
const GESTOR_B = '00000000-0000-0000-0000-000000000003';

const item = (over: Partial<{ fecha: string; barrio: string; descripcion: string; gestorUserId: string }> = {}) => ({
  fecha: '2026-09-01T14:00:00.000Z',
  barrio: 'LA MACARENA',
  descripcion: 'Recorrido de control de espacio publico',
  gestorUserId: GESTOR_A,
  ...over,
});

describe('ProgramacionService', () => {
  let repo: InMemoryProgramacionRepository;
  let service: ProgramacionService;

  beforeEach(() => {
    repo = new InMemoryProgramacionRepository();
    service = new ProgramacionService(repo);
  });

  it('crear acepta un lote y devuelve todos los creados', async () => {
    const creadas = await service.crear(VALIDADOR, [
      item({ descripcion: 'Item uno' }),
      item({ descripcion: 'Item dos', gestorUserId: GESTOR_B }),
    ]);

    expect(creadas).toHaveLength(2);
    expect(creadas[0].creadoPorUserId).toBe(VALIDADOR);
    expect(creadas[0].estado).toBe(ProgramacionEstado.PENDIENTE);
    expect(creadas[1].gestorUserId).toBe(GESTOR_B);
  });

  describe('listarMias — aislamiento entre gestores', () => {
    it('devuelve solo la programacion del gestor autenticado', async () => {
      await service.crear(VALIDADOR, [
        item({ descripcion: 'Para A' , gestorUserId: GESTOR_A }),
        item({ descripcion: 'Para B', gestorUserId: GESTOR_B }),
        item({ descripcion: 'Otra para A', gestorUserId: GESTOR_A }),
      ]);

      const deA = await service.listarMias(GESTOR_A);
      expect(deA.total).toBe(2);
      expect(deA.data.every((d) => d.gestorUserId === GESTOR_A)).toBe(true);

      const deB = await service.listarMias(GESTOR_B);
      expect(deB.total).toBe(1);
      expect(deB.data[0].descripcion).toBe('Para B');
    });
  });

  it('el PATCH castea la fecha a partir de un string ISO sin romper', async () => {
    const [creada] = await service.crear(VALIDADOR, [item()]);
    const editada = await service.editar(creada.id, { fecha: '2026-09-15T09:00:00.000Z' });
    expect(editada.fecha).toBe('2026-09-15T09:00:00.000Z');
  });

  it('editar un item marcandolo CUMPLIDA con la actividad que lo cumplio', async () => {
    const [creada] = await service.crear(VALIDADOR, [item()]);
    const actividadId = '00000000-0000-0000-0000-0000000000aa';
    const editada = await service.editar(creada.id, { estado: ProgramacionEstado.CUMPLIDA, actividadId });
    expect(editada.estado).toBe(ProgramacionEstado.CUMPLIDA);
    expect(editada.actividadId).toBe(actividadId);
  });

  it('un id inexistente en el PATCH da 404 con mensaje legible', async () => {
    await expect(service.editar('id-que-no-existe', { descripcion: 'x' }))
      .rejects.toThrow(NotFoundException);
    await expect(service.editar('id-que-no-existe', { descripcion: 'x' }))
      .rejects.toThrow('Programacion no encontrada');
  });

  it('un id inexistente al borrar da 404 con mensaje legible', async () => {
    await expect(service.borrar('id-que-no-existe')).rejects.toThrow(NotFoundException);
  });

  it('borrar elimina el item', async () => {
    const [creada] = await service.crear(VALIDADOR, [item()]);
    await service.borrar(creada.id);
    await expect(service.editar(creada.id, { descripcion: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('listarTodas no filtra por gestor', async () => {
    await service.crear(VALIDADOR, [
      item({ gestorUserId: GESTOR_A }),
      item({ gestorUserId: GESTOR_B }),
    ]);
    const todas = await service.listarTodas();
    expect(todas.total).toBe(2);
  });

  it('listarTodas filtra por estado', async () => {
    const [a, b] = await service.crear(VALIDADOR, [item(), item()]);
    await service.editar(a.id, { estado: ProgramacionEstado.CANCELADA });
    const canceladas = await service.listarTodas({ estado: ProgramacionEstado.CANCELADA });
    expect(canceladas.total).toBe(1);
    expect(canceladas.data[0].id).toBe(a.id);
    void b;
  });
});
