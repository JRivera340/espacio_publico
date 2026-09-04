import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MultiSelectCombobox } from './MultiSelectCombobox';

const OPCIONES = [
  { value: 'a', label: 'UAESP' },
  { value: 'b', label: 'IVC' },
];

describe('MultiSelectCombobox', () => {
  afterEach(cleanup);
  it('esta cerrado por defecto y no muestra las casillas', () => {
    render(
      <MultiSelectCombobox
        legend="Entidades"
        placeholder="Seleccionar entidades..."
        options={OPCIONES}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('UAESP')).toBeNull();
  });

  it('al abrir muestra las opciones y marca una', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectCombobox
        legend="Entidades"
        placeholder="Seleccionar entidades..."
        options={OPCIONES}
        selected={[]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar entidades/ }));
    fireEvent.click(screen.getByLabelText('UAESP'));
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('desmarca una opcion ya seleccionada', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectCombobox
        legend="Entidades"
        placeholder="Seleccionar entidades..."
        options={OPCIONES}
        selected={['a', 'b']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar entidades/ }));
    fireEvent.click(screen.getByLabelText('UAESP'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('muestra las seleccionadas como chips y permite quitarlas sin abrir el desplegable', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectCombobox
        legend="Entidades"
        placeholder="Seleccionar entidades..."
        options={OPCIONES}
        selected={['a']}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('UAESP')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Quitar UAESP'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('muestra el mensaje vacio cuando no hay opciones', () => {
    render(
      <MultiSelectCombobox
        legend="Gestores"
        placeholder="Seleccionar gestores..."
        options={[]}
        selected={[]}
        onChange={vi.fn()}
        emptyMessage="No hay gestores del area"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar gestores/ }));
    expect(screen.getByText('No hay gestores del area')).toBeTruthy();
  });

  it('con disabled no se puede abrir ni marcar', () => {
    render(
      <MultiSelectCombobox
        legend="Entidades"
        placeholder="Seleccionar entidades..."
        options={OPCIONES}
        selected={[]}
        onChange={vi.fn()}
        disabled
      />,
    );
    const button = screen.getByRole('button', { name: /Seleccionar entidades/ });
    const fieldset = button.closest('fieldset');
    expect((fieldset as HTMLFieldSetElement).disabled).toBe(true);
  });
});
