import { BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';

describe('FilesService', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'secreto';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';
    process.env.R2_ACCOUNT_ID = 'cuenta';
    process.env.R2_ACCESS_KEY_ID = 'llave';
    process.env.R2_SECRET_ACCESS_KEY = 'secreta';
    process.env.R2_BUCKET_NAME = 'gov-espacio-publico-files';
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
  });

  it('genera una key unica que conserva la extension original', () => {
    const service = new FilesService();
    const primera = (service as any).buildKey('acta escaneada.PDF', 'actas');
    const segunda = (service as any).buildKey('acta escaneada.PDF', 'actas');
    expect(primera).toMatch(/^actas\/[0-9a-f-]{36}\.pdf$/);
    expect(primera).not.toBe(segunda);
  });

  it('rechaza un archivo vacio', async () => {
    const service = new FilesService();
    await expect(service.uploadFile(Buffer.alloc(0), 'foto.jpg', 'photos'))
      .rejects.toThrow(BadRequestException);
  });

  it('construye la url publica a partir de R2_PUBLIC_URL', () => {
    const service = new FilesService();
    expect((service as any).buildUrl('photos/abc.jpg')).toBe('https://cdn.example.com/photos/abc.jpg');
  });
});
