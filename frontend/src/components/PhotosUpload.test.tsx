import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { PhotosUpload } from './PhotosUpload';
import { filesService } from '../services/files.service';

vi.mock('../services/files.service', () => ({
  filesService: { uploadFoto: vi.fn(), uploadActa: vi.fn() },
}));

const URL_SUBIDA = 'https://cdn.ejemplo.com/photos/abc.jpg';

function seleccionarArchivo() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['x'], 'evidencia.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('PhotosUpload', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (filesService.uploadFoto as any).mockReset().mockResolvedValue({ key: 'photos/abc.jpg', url: URL_SUBIDA });
  });

  // El backend responde { key, url }. Si el componente lee otra forma, la foto
  // se sube pero la actividad se queda sin evidencia - y la foto es obligatoria,
  // asi que el registro se traba sin explicacion.
  it('agrega la url que devuelve el backend a las que ya habia', async () => {
    const onUploadSuccess = vi.fn();
    render(<PhotosUpload onUploadSuccess={onUploadSuccess} existingUrls={['https://cdn.ejemplo.com/previa.jpg']} />);

    seleccionarArchivo();

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalled());
    expect(onUploadSuccess).toHaveBeenCalledWith(['https://cdn.ejemplo.com/previa.jpg', URL_SUBIDA]);
  });

  it('sube el archivo elegido, uno por peticion', async () => {
    render(<PhotosUpload onUploadSuccess={vi.fn()} />);
    seleccionarArchivo();

    await waitFor(() => expect(filesService.uploadFoto).toHaveBeenCalledTimes(1));
    expect((filesService.uploadFoto as any).mock.calls[0][0]).toBeInstanceOf(File);
  });

  it('avisa cuando la subida falla, en vez de quedarse callado', async () => {
    (filesService.uploadFoto as any).mockRejectedValue({ response: { data: { message: 'R2 no configurado' } } });
    const onUploadSuccess = vi.fn();
    render(<PhotosUpload onUploadSuccess={onUploadSuccess} />);

    seleccionarArchivo();

    await waitFor(() => expect(screen.getByText(/R2 no configurado/)).toBeDefined());
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('no deja pasar un archivo que no es imagen', async () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    render(<PhotosUpload onUploadSuccess={vi.fn()} />);
    const real = input ?? (document.querySelector('input[type="file"]') as HTMLInputElement);
    fireEvent.change(real, { target: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] } });

    await waitFor(() => expect(screen.getByText(/JPG, PNG o WebP/i)).toBeDefined());
    expect(filesService.uploadFoto).not.toHaveBeenCalled();
  });
});
