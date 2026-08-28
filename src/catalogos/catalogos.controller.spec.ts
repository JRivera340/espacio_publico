import { CatalogosController } from './catalogos.controller';
import { BARRIOS } from './barrio.enum';

describe('CatalogosController', () => {
  const controller = new CatalogosController();

  it('devuelve los barrios de la localidad', () => {
    expect(controller.getBarrios()).toEqual({ barrios: BARRIOS });
  });

  it('incluye LA MACARENA entre los barrios', () => {
    expect(BARRIOS).toContain('LA MACARENA');
  });

  it('devuelve barrios y entidades juntos en all', () => {
    const todos = controller.getAll();
    expect(todos.barrios).toEqual(BARRIOS);
    expect(Array.isArray(todos.entidades)).toBe(true);
  });
});
