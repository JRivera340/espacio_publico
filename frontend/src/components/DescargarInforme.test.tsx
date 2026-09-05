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

  it('con mostrarSelectorGestor pinta los campos de fecha y gestor', () => {
    render(<DescargarInforme mostrarSelectorGestor gestores={[{ id: 'g-1', nombre: 'Ana Perez' }]} />);
    expect(screen.getByLabelText('Desde')).toBeTruthy();
    expect(screen.getByLabelText('Hasta')).toBeTruthy();
    expect(screen.getByLabelText('Gestor')).toBeTruthy();
  });

  it('con mostrarSelectorGestor manda los filtros elegidos al pedir el informe', async () => {
    render(<DescargarInforme mostrarSelectorGestor gestores={[{ id: 'g-1', nombre: 'Ana Perez' }]} />);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByLabelText('Gestor'), { target: { value: 'g-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Descargar informe/i }));

    await waitFor(() =>
      expect(activityService.descargarInforme).toHaveBeenCalledWith({
        desde: '2026-09-01', hasta: '2026-09-30', gestor: 'g-1',
      }),
    );
  });

  it('sin mostrarSelectorGestor no pinta ningun campo (comportamiento previo intacto)', () => {
    render(<DescargarInforme filtros={{ desde: '2026-08-01', hasta: '2026-08-31' }} />);
    expect(screen.queryByLabelText('Gestor')).toBeNull();
  });
});
