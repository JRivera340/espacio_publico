import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { DescargarInforme } from './DescargarInforme';
import { activityService } from '../services/activity.service';

vi.mock('../services/activity.service', () => ({
  activityService: { descargarInforme: vi.fn() },
}));

describe('DescargarInforme', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (activityService.descargarInforme as any).mockReset().mockResolvedValue(new Blob(['x']));
    // happy-dom no trae estas dos; sin ellas la descarga no se puede ejercitar.
    (URL as any).createObjectURL = vi.fn(() => 'blob:fake');
    (URL as any).revokeObjectURL = vi.fn();
  });

  it('pide el informe con los filtros que recibe', async () => {
    render(<DescargarInforme filtros={{ desde: '2026-08-01', hasta: '2026-08-31' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Descargar informe/i }));

    await waitFor(() =>
      expect(activityService.descargarInforme).toHaveBeenCalledWith({ desde: '2026-08-01', hasta: '2026-08-31' }),
    );
  });

  // Un objeto que no se libera queda en memoria del navegador hasta cerrar la
  // pestana. En una pantalla que se usa varias veces al dia, se acumula.
  it('libera el archivo despues de descargarlo', async () => {
    render(<DescargarInforme />);
    fireEvent.click(screen.getByRole('button', { name: /Descargar informe/i }));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake'));
  });

  it('avisa cuando la descarga falla, en vez de no hacer nada', async () => {
    (activityService.descargarInforme as any).mockRejectedValue(new Error('boom'));
    render(<DescargarInforme />);
    fireEvent.click(screen.getByRole('button', { name: /Descargar informe/i }));

    expect(await screen.findByRole('alert')).toBeDefined();
  });
});
