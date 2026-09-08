import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstitutionalHeader } from './InstitutionalHeader';

describe('InstitutionalHeader', () => {
  it('muestra el logo institucional en vez de un placeholder de texto', () => {
    render(<InstitutionalHeader email="gestor@ejemplo.com" onCerrarSesion={vi.fn()} />);
    const logo = screen.getByAltText('Alcaldia Local de Santa Fe');
    expect(logo.tagName).toBe('IMG');
    expect(logo.getAttribute('src')).toBe('/images/alcaldialocalsantafe.jpeg');
  });

  it('sigue mostrando el correo del usuario y el boton de salida', () => {
    render(<InstitutionalHeader email="gestor@ejemplo.com" onCerrarSesion={vi.fn()} />);
    expect(screen.getAllByText('gestor@ejemplo.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cerrar sesion').length).toBeGreaterThan(0);
  });
});
