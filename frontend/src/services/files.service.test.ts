import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filesService } from './files.service';
import api from './api';

vi.mock('./api', () => ({ default: { post: vi.fn() } }));

const RESPUESTA = { data: { key: 'photos/abc.jpg', url: 'https://cdn.ejemplo.com/photos/abc.jpg' } };

function archivo() {
  return new File(['contenido'], 'evidencia.jpg', { type: 'image/jpeg' });
}

describe('filesService', () => {
  beforeEach(() => {
    (api.post as any).mockReset().mockResolvedValue(RESPUESTA);
  });

  // El backend usa FileInterceptor('file'). Con cualquier otro nombre de campo
  // multer no encuentra el archivo y responde 400 "No se proporciono ningun
  // archivo" - y como la foto es obligatoria, no se puede registrar nada.
  it('manda la foto en el campo que el backend espera', async () => {
    await filesService.uploadFoto(archivo());
    const [ruta, formData] = (api.post as any).mock.calls[0];
    expect(ruta).toBe('/files/upload');
    expect(formData.get('file')).toBeInstanceOf(File);
    expect(formData.get('files')).toBeNull();
  });

  it('manda el acta en el mismo campo', async () => {
    await filesService.uploadActa(new File(['x'], 'acta.pdf', { type: 'application/pdf' }));
    const [ruta, formData] = (api.post as any).mock.calls[0];
    expect(ruta).toBe('/files/upload-acta');
    expect(formData.get('file')).toBeInstanceOf(File);
  });

  it('devuelve la url que responde el backend', async () => {
    expect((await filesService.uploadFoto(archivo())).url).toBe(RESPUESTA.data.url);
  });

  // Fijar Content-Type a mano deja el multipart sin `boundary` y el backend no
  // puede separar las partes. Lo tiene que poner el navegador.
  it('no fija Content-Type a mano', async () => {
    await filesService.uploadFoto(archivo());
    const config = (api.post as any).mock.calls[0][2] ?? {};
    expect(config.headers?.['Content-Type']).toBeUndefined();
  });

  it('deja un timeout amplio para conexiones lentas en terreno', async () => {
    await filesService.uploadFoto(archivo());
    expect((api.post as any).mock.calls[0][2].timeout).toBeGreaterThanOrEqual(60_000);
  });
});
