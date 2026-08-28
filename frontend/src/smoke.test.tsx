import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Se envuelve en MemoryRouter desde ahora aunque App todavia no tenga rutas:
// en la Task 4 las va a tener, y asi este test no hay que reescribirlo.
describe('App', () => {
  it('monta sin romper', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText('Espacio Publico')).toBeDefined();
  });
});
