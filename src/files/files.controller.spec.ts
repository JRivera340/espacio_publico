import { FilesController } from './files.controller';

describe('FilesController', () => {
  it('devuelve la url publica configurada', () => {
    const service = { getPublicUrl: () => 'https://cdn.example.com' } as any;
    const controller = new FilesController(service);
    expect(controller.getPublicUrlConfig()).toEqual({ publicUrl: 'https://cdn.example.com' });
  });

  it('devuelve null cuando R2 no esta configurado', () => {
    const service = { getPublicUrl: () => null } as any;
    const controller = new FilesController(service);
    expect(controller.getPublicUrlConfig()).toEqual({ publicUrl: null });
  });
});
