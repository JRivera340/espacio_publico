import React, { useId, useState } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface MultiSelectComboboxProps {
  legend: React.ReactNode;
  placeholder: string;
  options: ComboboxOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

// Reemplaza la pared de casillas sueltas que se usaba para entidades y
// gestores acompanantes: un boton que despliega la lista bajo demanda, con las
// elegidas mostradas como chips arriba. El estado de apertura es propio del
// componente (useState en vez de <details> nativo): asi el panel solo existe
// en el DOM cuando esta abierto, sin depender de que el entorno de pruebas
// aplique el CSS que oculta el contenido cerrado de un <details>.
export const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
  legend,
  placeholder,
  options,
  selected,
  onChange,
  disabled,
  emptyMessage = 'No hay opciones para seleccionar.',
}) => {
  const [abierto, setAbierto] = useState(false);
  const listId = useId();

  const alternar = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const quitar = (value: string) => onChange(selected.filter((v) => v !== value));

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="input-label font-semibold">{legend}</legend>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((value) => {
            const opcion = options.find((o) => o.value === value);
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary text-primary"
              >
                {opcion?.label ?? value}
                <button
                  type="button"
                  onClick={() => quitar(value)}
                  aria-label={`Quitar ${opcion?.label ?? value}`}
                  className="hover:text-primary-dark"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={abierto ? listId : undefined}
          className="input-field w-full flex items-center justify-between text-left text-neutral-500"
        >
          <span>{placeholder}</span>
          <span aria-hidden="true">{abierto ? '▲' : '▼'}</span>
        </button>

        {abierto && (
          <div
            id={listId}
            className="absolute left-0 right-0 top-full mt-2 p-3 max-h-56 overflow-y-auto space-y-1 rounded-lg border border-neutral-200 bg-white shadow-lg z-20"
          >
            {options.length === 0 ? (
              <p className="text-xs text-neutral-500 py-2">{emptyMessage}</p>
            ) : (
              options.map((opcion) => {
                const marcada = selected.includes(opcion.value);
                return (
                  <label
                    key={opcion.value}
                    htmlFor={`${listId}-${opcion.value}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 cursor-pointer text-sm text-neutral-700"
                  >
                    <input
                      id={`${listId}-${opcion.value}`}
                      type="checkbox"
                      checked={marcada}
                      onChange={() => alternar(opcion.value)}
                      className="w-3.5 h-3.5"
                    />
                    {opcion.label}
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>
    </fieldset>
  );
};
