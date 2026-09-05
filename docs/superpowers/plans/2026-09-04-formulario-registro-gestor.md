# Formulario de registro del gestor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar `CreateActivity.tsx` y `EditActivity.tsx` en secciones numeradas de un solo tema cada una (como en el hub), y reemplazar las dos paredes de casillas sueltas (entidades acompañantes, gestores acompañantes) por un combo desplegable con chips de seleccionados.

**Architecture:** Se crea un componente nuevo y reutilizable, `MultiSelectCombobox`, con estado de apertura propio (`useState`, no `<details>` nativo — más predecible en tests). Se usa en los dos formularios, que comparten exactamente la misma estructura de campos porque ambos llaman a `construirDtoActividad` (`src/pages/gestor/lib/activityForm.ts`). Ningún cambio toca esa librería ni el DTO: es puramente de presentación.

**Tech Stack:** React 18 + react-hook-form + Tailwind. Sin librerías nuevas.

**Spec:** Este documento. Referencia: pantallas actuales `frontend/src/pages/gestor/CreateActivity.tsx` y `frontend/src/pages/gestor/EditActivity.tsx`, comparadas por el usuario contra el formulario del hub (`gov-espacio-publico`), que las numera y separa por tema.

## Global Constraints

- Comentarios en español sin tildes. Commits de una línea. Sin menciones a IA.
- No tocar `activityForm.ts`, el DTO, ni ninguna regla de validación — solo JSX y un componente de presentación nuevo.
- Todos los tests existentes de `CreateActivity.test.tsx` y `EditActivity.test.tsx` deben seguir en verde; los que dependían de la estructura vieja de casillas se actualizan en este mismo plan.
- Windows/PowerShell: `;` para encadenar, nunca `&&`.

---

## Diagnóstico verificado

- `CreateActivity.tsx:311-439` y `EditActivity.tsx:396-520` meten fecha, entidad responsable, descripción, entidades acompañantes y "operativo en grupo" en una sola sección `"Datos del operativo"` — de ahí la sensación de pared de campos que describe el usuario.
- Las entidades acompañantes (20 opciones) y los gestores acompañantes se pintan como una fila de `<label>` con checkbox envueltos (`CreateActivity.tsx:357-386` y `:395-438`; espejo exacto en `EditActivity.tsx:440-469` y `:478-519`) — sin colapsar, ocupan media pantalla en móvil.
- Acta y fotos comparten una sección "Evidencia" aunque son dos obligaciones distintas (`CreateActivity.tsx:513-521`).
- Ningún test de `CreateActivity.test.tsx` ni `EditActivity.test.tsx` selecciona elementos por el texto del título de sección — todos usan `getByLabelText`/`getByRole`, así que reordenar secciones es seguro. Los únicos tests que hay que tocar son los que interactúan con las casillas de gestores acompañantes en `CreateActivity.test.tsx` (líneas 270-339): al pasar a un combo que abre bajo demanda, esos tests necesitan un clic extra para abrirlo antes de buscar la casilla por su label. `EditActivity.test.tsx` no tiene ningún test sobre gestores acompañantes (verificado con grep), así que ahí no hace falta tocar tests.

## File Structure

- Create: `frontend/src/components/MultiSelectCombobox.tsx`
- Create: `frontend/src/components/MultiSelectCombobox.test.tsx`
- Modify: `frontend/src/pages/gestor/CreateActivity.tsx`
- Modify: `frontend/src/pages/gestor/CreateActivity.test.tsx`
- Modify: `frontend/src/pages/gestor/EditActivity.tsx`

---

### Task 1: Componente `MultiSelectCombobox`

**Files:**
- Create: `frontend/src/components/MultiSelectCombobox.tsx`
- Test: `frontend/src/components/MultiSelectCombobox.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface ComboboxOption { value: string; label: string }
  export interface MultiSelectComboboxProps {
    legend: string;
    placeholder: string;
    options: ComboboxOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    disabled?: boolean;
    emptyMessage?: string;
  }
  export const MultiSelectCombobox: React.FC<MultiSelectComboboxProps>;
  ```
  Tareas 2 y 3 consumen exactamente esta firma.

- [ ] **Step 1: Escribir los tests que fallan**

`frontend/src/components/MultiSelectCombobox.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelectCombobox } from './MultiSelectCombobox';

const OPCIONES = [
  { value: 'a', label: 'UAESP' },
  { value: 'b', label: 'IVC' },
];

describe('MultiSelectCombobox', () => {
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
    expect(screen.getByText('UAESP')).toBeInTheDocument();
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
    expect(screen.getByText('No hay gestores del area')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /Seleccionar entidades/ })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico/frontend"
npx vitest run src/components/MultiSelectCombobox.test.tsx
```

Expected: FAIL — el módulo `./MultiSelectCombobox` no existe todavía.

- [ ] **Step 3: Implementar el componente**

`frontend/src/components/MultiSelectCombobox.tsx`:

```tsx
import React, { useId, useState } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface MultiSelectComboboxProps {
  legend: string;
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
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={listId}
          className="input-field w-full flex items-center justify-between text-left text-neutral-500"
        >
          <span>{placeholder}</span>
          <span aria-hidden="true">{abierto ? '\u25B2' : '\u25BC'}</span>
        </button>

        {abierto && (
          <div
            id={listId}
            className="mt-2 p-3 max-h-56 overflow-y-auto space-y-1 rounded-lg border border-neutral-200 bg-white shadow-md relative z-10"
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
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

```bash
npx vitest run src/components/MultiSelectCombobox.test.tsx
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/MultiSelectCombobox.tsx frontend/src/components/MultiSelectCombobox.test.tsx
git commit -m "feat: combobox desplegable multiseleccion reutilizable"
```

---

### Task 2: Reordenar y aplicar el combo en `CreateActivity.tsx`

**Files:**
- Modify: `frontend/src/pages/gestor/CreateActivity.tsx:311-544` (bloque `<form>...</form>`)
- Modify: `frontend/src/pages/gestor/CreateActivity.test.tsx:270-339`

**Interfaces:**
- Consumes: `MultiSelectCombobox` de la Task 1.
- No cambia ningún estado, handler ni el contrato con `activityForm.ts` — solo el JSX del render.

- [ ] **Step 1: Importar el combo**

En `frontend/src/pages/gestor/CreateActivity.tsx`, agregar junto a los otros imports de componentes:

```tsx
import { MultiSelectCombobox } from '../../components/MultiSelectCombobox';
```

- [ ] **Step 2: Reemplazar el bloque `<form>` completo**

Reemplazar desde `<form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>` (línea 311) hasta el `</form>` que le corresponde (línea 544) por:

```tsx
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">1. Fecha y hora</h2>
              <p className="card-subtitle">Todos los campos marcados con * son obligatorios</p>
            </div>
            <div>
              <label className="input-label font-semibold" htmlFor="fechaHora">
                Fecha y hora del operativo <span className="text-red-500">*</span>
              </label>
              <input id="fechaHora" type="datetime-local" className="input-field" {...register('fechaHora')} />
            </div>
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">2. Ubicacion</h2>
              <p className="card-subtitle">Toca el mapa o usa tu ubicacion actual. El barrio se detecta solo.</p>
            </div>

            <button
              type="button"
              onClick={usarMiUbicacion}
              disabled={ubicando}
              className="btn-secondary w-full justify-center"
            >
              {ubicando ? 'Buscando senal GPS...' : 'Usar mi ubicacion actual'}
            </button>

            {errorUbicacion && (
              <p className="text-xs text-red-600" role="alert">
                {errorUbicacion}
              </p>
            )}

            <div className="h-64 md:h-80 rounded-2xl overflow-hidden border border-neutral-200 relative">
              <MapContainer center={centroMapa} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapLayerControl
                  layerVisibility={layerVisibility}
                  onLayerVisibilityChange={(capa, visible) =>
                    setLayerVisibility((previo) => ({ ...previo, [capa]: visible }))
                  }
                />
                <BoundaryLayer color="#DC2626" fillOpacity={0.08} />
                <BarriosLayer visible={layerVisibility.barrios} fillOpacity={0.05} weight={1} />
                <CentrarVista center={centroMapa} />
                {lat !== null && lng !== null && <Marker position={[lat, lng]} icon={iconoMarcador} />}
                <CapturadorDeClicks onClick={aplicarCoordenada} />
              </MapContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="input-label font-semibold" htmlFor="latitud">
                  Latitud
                </label>
                <input id="latitud" className="input-field" value={lat !== null ? lat.toFixed(6) : ''} readOnly disabled />
              </div>
              <div>
                <label className="input-label font-semibold" htmlFor="longitud">
                  Longitud
                </label>
                <input id="longitud" className="input-field" value={lng !== null ? lng.toFixed(6) : ''} readOnly disabled />
              </div>
              <div>
                <label className="input-label font-semibold" htmlFor="barrio">
                  Barrio <span className="text-red-500">*</span>
                </label>
                <input
                  id="barrio"
                  className="input-field"
                  value={barrio}
                  readOnly
                  disabled
                  placeholder="Se detecta al marcar el mapa"
                />
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">3. Descripcion</h2>
            </div>
            <div>
              <label className="input-label font-semibold" htmlFor="descripcion">
                Descripcion de lo realizado <span className="text-red-500">*</span>
              </label>
              <textarea
                id="descripcion"
                rows={4}
                maxLength={MAX_DESCRIPCION}
                className="input-field"
                placeholder="Que se hizo, con quien y con que resultado"
                {...register('descripcion')}
              />
            </div>
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">4. Evidencia fotografica</h2>
              <p className="card-subtitle">Maximo 5 fotos en total, maximo 10MB cada una</p>
            </div>
            <PhotosUpload onUploadSuccess={setFotos} existingUrls={fotos} disabled={enviando} />
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">5. Acta del operativo</h2>
              <p className="card-subtitle">El acta del operativo es obligatoria</p>
            </div>
            <ActaUpload onUploadSuccess={setActaUrl} existingUrl={actaUrl || null} disabled={enviando} />
          </section>

          <section className="card space-y-5">
            <div className="card-header">
              <h2 className="card-title">6. Entidades</h2>
            </div>
            <div>
              <label className="input-label font-semibold" htmlFor="entidadResponsable">
                Entidad responsable <span className="text-red-500">*</span>
              </label>
              <select id="entidadResponsable" className="select-field" {...register('entidadResponsable')}>
                <option value="">Seleccionar entidad</option>
                {(catalogs?.entidades ?? []).map((entidad) => (
                  <option key={entidad} value={entidad}>
                    {entidad}
                  </option>
                ))}
              </select>
            </div>
            <MultiSelectCombobox
              legend="Entidades acompanantes"
              placeholder="Seleccionar entidades acompanantes..."
              options={(catalogs?.entidades ?? []).map((e) => ({ value: e, label: e }))}
              selected={entidadesAcompanantes}
              onChange={setEntidadesAcompanantes}
            />
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">7. Operativo en grupo</h2>
            </div>
            <div className="flex items-center gap-3">
              <input id="enGrupo" type="checkbox" className="checkbox-field" {...register('enGrupo')} />
              <label className="input-label mb-0" htmlFor="enGrupo">
                El operativo se realizo en grupo
              </label>
            </div>

            {enGrupo && (
              <div className="space-y-2">
                {errorGestores && (
                  <p className="text-xs text-amber-700" role="alert">
                    {errorGestores}
                  </p>
                )}
                <MultiSelectCombobox
                  legend="Gestores acompanantes"
                  placeholder="Seleccionar gestores acompanantes..."
                  options={posiblesAcompanantes.map((g) => ({ value: g.id, label: g.nombre }))}
                  selected={gestoresSeleccionados}
                  onChange={setGestoresSeleccionados}
                  emptyMessage="No hay otros gestores del area para seleccionar."
                />
              </div>
            )}
          </section>

          {schema && preguntasVisibles.length > 0 && (
            <section className="card space-y-5">
              <div className="card-header">
                <h2 className="card-title">8. {schema.title || 'Cifras del operativo'}</h2>
                {schema.description && <p className="card-subtitle">{schema.description}</p>}
              </div>

              <DynamicSurveyRenderer
                questions={preguntasVisibles}
                allQuestions={schema.questions}
                values={respuestas}
                onChange={(id, valor) => setRespuestas((previas) => ({ ...previas, [id]: valor }))}
                entidades={catalogs?.entidades ?? []}
                disabled={enviando}
              />
            </section>
          )}

          <button type="submit" disabled={enviando || !schema} className="btn-success btn-lg w-full justify-center">
            {enviando ? 'Guardando...' : 'Finalizar registro'}
          </button>
        </form>
```

- [ ] **Step 3: Actualizar los tests que interactuan con gestores acompanantes**

En `frontend/src/pages/gestor/CreateActivity.test.tsx`, el combo ahora exige abrirlo antes de que las casillas existan en el DOM. Reemplazar los tres tests siguientes:

Reemplazar (líneas ~270-284):

```tsx
  it('lleva al DTO los gestores acompanantes seleccionados', async () => {
    renderPantalla();
    await completarFormulario();

    fireEvent.click(screen.getByLabelText(/El operativo se realizo en grupo/));
    fireEvent.click(await screen.findByLabelText('Ana Perez'));
    fireEvent.click(screen.getByLabelText('Luis Mora'));

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await waitFor(() => expect(activityService.create).toHaveBeenCalledTimes(1));
    const dto = (activityService.create as any).mock.calls[0][0];
    expect(dto.isGroupOperativo).toBe(true);
    expect(dto.gestoresInvolucradosIds).toEqual(['g-2', 'g-3']);
  });
```

por:

```tsx
  it('lleva al DTO los gestores acompanantes seleccionados', async () => {
    renderPantalla();
    await completarFormulario();

    fireEvent.click(screen.getByLabelText(/El operativo se realizo en grupo/));
    fireEvent.click(await screen.findByRole('button', { name: /Seleccionar gestores acompanantes/ }));
    fireEvent.click(await screen.findByLabelText('Ana Perez'));
    fireEvent.click(screen.getByLabelText('Luis Mora'));

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await waitFor(() => expect(activityService.create).toHaveBeenCalledTimes(1));
    const dto = (activityService.create as any).mock.calls[0][0];
    expect(dto.isGroupOperativo).toBe(true);
    expect(dto.gestoresInvolucradosIds).toEqual(['g-2', 'g-3']);
  });
```

Reemplazar (líneas ~286-294):

```tsx
  it('no ofrece al propio gestor como acompanante: ya es el autor', async () => {
    renderPantalla();
    await screen.findByLabelText(/Fecha y hora/);

    fireEvent.click(screen.getByLabelText(/El operativo se realizo en grupo/));

    await screen.findByLabelText('Ana Perez');
    expect(screen.queryByLabelText('Rosa Diaz')).toBeNull();
  });
```

por:

```tsx
  it('no ofrece al propio gestor como acompanante: ya es el autor', async () => {
    renderPantalla();
    await screen.findByLabelText(/Fecha y hora/);

    fireEvent.click(screen.getByLabelText(/El operativo se realizo en grupo/));
    fireEvent.click(await screen.findByRole('button', { name: /Seleccionar gestores acompanantes/ }));

    await screen.findByLabelText('Ana Perez');
    expect(screen.queryByLabelText('Rosa Diaz')).toBeNull();
  });
```

Reemplazar (líneas ~324-339):

```tsx
  it('al desmarcar el operativo en grupo limpia los acompanantes elegidos', async () => {
    renderPantalla();
    await completarFormulario();

    const casillaGrupo = screen.getByLabelText(/en grupo/i);
    fireEvent.click(casillaGrupo);
    const gestor = await screen.findByLabelText(/Ana Perez/i);
    fireEvent.click(gestor);
    expect((gestor as HTMLInputElement).checked).toBe(true);

    fireEvent.click(casillaGrupo);
    fireEvent.click(casillaGrupo);

    const deNuevo = await screen.findByLabelText(/Ana Perez/i);
    expect((deNuevo as HTMLInputElement).checked).toBe(false);
  });
```

por:

```tsx
  it('al desmarcar el operativo en grupo limpia los acompanantes elegidos', async () => {
    renderPantalla();
    await completarFormulario();

    const casillaGrupo = screen.getByLabelText(/en grupo/i);
    fireEvent.click(casillaGrupo);
    fireEvent.click(await screen.findByRole('button', { name: /Seleccionar gestores acompanantes/ }));
    const gestor = await screen.findByLabelText(/Ana Perez/i);
    fireEvent.click(gestor);
    expect((gestor as HTMLInputElement).checked).toBe(true);

    fireEvent.click(casillaGrupo);
    fireEvent.click(casillaGrupo);
    fireEvent.click(await screen.findByRole('button', { name: /Seleccionar gestores acompanantes/ }));

    const deNuevo = await screen.findByLabelText(/Ana Perez/i);
    expect((deNuevo as HTMLInputElement).checked).toBe(false);
  });
```

El test `'deja registrar sin acompanantes si el proxy de usuarios esta caido'` (líneas ~310-323) NO se toca: solo verifica el texto de `errorGestores`, que sigue siendo un párrafo siempre visible fuera del combo (no quedo adentro del panel colapsado a propósito, para que este mismo test siga pasando sin abrir nada).

- [ ] **Step 4: Correr toda la suite de CreateActivity**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico/frontend"
npx vitest run src/pages/gestor/CreateActivity.test.tsx
```

Expected: PASS — todos los tests, incluidos los tres editados.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/gestor/CreateActivity.tsx frontend/src/pages/gestor/CreateActivity.test.tsx
git commit -m "feat: formulario de registro reordenado en secciones numeradas con combobox"
```

---

### Task 3: Mismo reorden y combo en `EditActivity.tsx`

**Files:**
- Modify: `frontend/src/pages/gestor/EditActivity.tsx:396-644` (bloque `<form>...</form>`)

**Interfaces:**
- Consumes: `MultiSelectCombobox` de la Task 1.
- Ningún test de `EditActivity.test.tsx` interactúa con las casillas de gestores acompañantes ni de entidades acompañantes (verificado por grep antes de escribir este plan) — no hace falta tocar el archivo de test.

- [ ] **Step 1: Importar el combo**

```tsx
import { MultiSelectCombobox } from '../../components/MultiSelectCombobox';
```

- [ ] **Step 2: Reemplazar el bloque `<form>` completo**

Reemplazar desde `<form onSubmit={handleSubmit((data) => guardar(data, true))} className="space-y-6" noValidate>` (línea 396) hasta su `</form>` (línea 644) por la misma estructura de ocho secciones de la Task 2, con estas tres diferencias respecto a `CreateActivity.tsx` (todo lo demás es idéntico, campo por campo):

1. `ActaUpload` lleva la prop extra `activityId={actividad.id}` (ya la tenía):
   ```tsx
   <ActaUpload
     onUploadSuccess={setActaUrl}
     existingUrl={actaUrl || null}
     activityId={actividad.id}
     disabled={guardando}
   />
   ```
2. Todas las props `disabled={enviando}` de `CreateActivity.tsx` pasan a ser `disabled={guardando}` (el nombre del estado en este archivo).
3. El botón final no es uno solo — son los dos que ya existían, sin cambios, después de la sección 8:
   ```tsx
   <div className="flex flex-col sm:flex-row gap-3">
     <button type="submit" disabled={guardando || !schema} className="btn-success btn-lg flex-1 justify-center">
       {guardando ? 'Guardando...' : 'Guardar y reenviar a validacion'}
     </button>
     <button
       type="button"
       disabled={guardando || !schema}
       onClick={handleSubmit((data) => guardar(data, false))}
       className="btn-secondary btn-lg flex-1 justify-center"
     >
       Guardar sin reenviar
     </button>
   </div>
   ```

Los títulos numerados de sección son los mismos: "1. Fecha y hora", "2. Ubicacion", "3. Descripcion", "4. Evidencia fotografica", "5. Acta del operativo", "6. Entidades", "7. Operativo en grupo", "8. {schema.title}". Los combos:

```tsx
<MultiSelectCombobox
  legend="Entidades acompanantes"
  placeholder="Seleccionar entidades acompanantes..."
  options={(catalogs?.entidades ?? []).map((e) => ({ value: e, label: e }))}
  selected={entidadesAcompanantes}
  onChange={setEntidadesAcompanantes}
/>
```

```tsx
{enGrupo && (
  <div className="space-y-2">
    {errorGestores && (
      <p className="text-xs text-amber-700" role="alert">
        {errorGestores}
      </p>
    )}
    <MultiSelectCombobox
      legend="Gestores acompanantes"
      placeholder="Seleccionar gestores acompanantes..."
      options={posiblesAcompanantes.map((g) => ({ value: g.id, label: g.nombre }))}
      selected={gestoresSeleccionados}
      onChange={setGestoresSeleccionados}
      emptyMessage="No hay otros gestores del area para seleccionar."
    />
  </div>
)}
```

El alert rojo de observaciones del validador (líneas 380-387) y el de "Formulario no disponible" (líneas 389-394) van igual que antes, **antes** del `<form>` — no se tocan.

- [ ] **Step 3: Correr toda la suite de EditActivity**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico/frontend"
npx vitest run src/pages/gestor/EditActivity.test.tsx
```

Expected: PASS — sin cambios de test, todo por label/role.

- [ ] **Step 4: Correr toda la suite de frontend para descartar roturas cruzadas**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/gestor/EditActivity.tsx
git commit -m "feat: correccion de actividad con el mismo orden y combobox del registro"
```

---

## Self-Review

**Spec coverage:**
- "se puede mejorar y hacer mas eficiente" / secciones numeradas como el hub → Task 2 y 3, ocho secciones de un solo tema cada una.
- "los espacios en los que uno da clic y se despliega una lista" para acompañantes/entidades → `MultiSelectCombobox` (Task 1), aplicado a ambos formularios.
- Acta como obligación propia, no mezclada con fotos → sección 5 separada de la 4.

**Placeholder scan:** sin TBD — cada step trae código completo o el diff exacto a aplicar.

**Type consistency:** `MultiSelectCombobox` usa siempre `{ value, label }[]` y `selected: string[]` / `onChange: (string[]) => void` en las tres integraciones (Task 1 test, Task 2, Task 3) — mismo nombre de props en todos lados.

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-09-04-formulario-registro-gestor.md`. Dos opciones de ejecución:

1. **Subagent-Driven (recomendado)** — un subagente fresco por tarea, revisión entre tareas.
2. **Inline** — ejecución en esta sesión, por lotes, con checkpoints.
