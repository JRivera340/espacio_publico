# Cronograma del equipo e informe de desempeño (validador y admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una pestaña "Cronograma del equipo" en Programación (validador), con el mismo calendario mensual del gestor pero filtrable por gestor y con indicadores de cumplimiento — individuales o de todo el equipo. La misma vista se reutiliza en solo lectura dentro de Administración. El botón "Descargar informe" gana filtros de fecha/periodo y de gestor, tanto en validador como en admin.

**Architecture:** Se extiende la librería pura `desempenoGestor.lib.ts` (creada en el plan anterior) con una función de agregado por gestor. Se construye un componente compartido `EquipoCronogramaPanel` que reutiliza `MonthCalendar` (plan anterior) y se monta igual en `ProgramacionPage` (validador) y `AdminDashboard` (admin, mismo componente — no hay versión "de solo lectura" distinta porque el panel ya es de solo lectura: no edita programación, solo la muestra). El informe de desempeño reutiliza el endpoint `GET /actividades/report-xlsx`, que el backend YA filtra por `desde`, `hasta` y `gestor` — no hace falta tocar el backend, solo exponer esos filtros en la pantalla.

**Tech Stack:** React 18, `date-fns`, Tailwind. Sin librerías nuevas, sin cambios de backend.

**Spec:** Este documento. Depende de `docs/superpowers/plans/2026-09-04-cronograma-perfil-gestor.md` (usa `MonthCalendar`, `calendar.lib.ts`, `desempenoGestor.lib.ts` de ese plan — ejecutarlo primero).

## Global Constraints

- Comentarios en español sin tildes. Commits de una línea. Sin menciones a IA.
- No modificar el backend: `GET /actividades` y `GET /actividades/report-xlsx` ya aceptan `gestor`, `desde`, `hasta` (verificado en `src/actividades/actividades.controller.ts:36-46` y `src/actividades/actividades.repository.typeorm.ts:346`). `GET /programacion` ya acepta los mismos filtros (`src/programacion/programacion.controller.ts:19-27`).
- Sin librería de gráficos — KPIs y tablas, igual que el resto del módulo.
- Windows/PowerShell: `;` para encadenar, nunca `&&`.

---

## Diagnóstico verificado

- `ProgramacionPage.tsx` (validador) solo tiene la carga de programación y la tabla plana de lo cargado — no hay forma de ver el cronograma de un gestor puntual ni comparar el equipo.
- `AdminDashboard.tsx` ya carga `actividades` (`activityService.listAll({ limit: 5000 })`) y `programacion` (`programacionService.listar()`) — Task 4 solo agrega la carga de `gestores`, que todavía no pide.
- `activity.service.ts:buildQuery` (línea 30) solo arma `desde`, `hasta`, `limit`, `offset` — le falta `gestor`, aunque el backend ya lo acepta. `ActividadFilters` (`frontend/src/types/index.ts:111`) tampoco lo declara.
- `DescargarInforme.tsx` no tiene ningún selector: descarga siempre con los `filtros` fijos que le pasa el padre (o ninguno). `ValidadorDashboard.tsx:74` y `AdminDashboard.tsx:201` lo usan sin filtros.

## File Structure

- Modify: `frontend/src/lib/desempenoGestor.lib.ts` (+ test) — agrega `resumenPorGestor`
- Create: `frontend/src/components/EquipoCronogramaPanel.tsx` + `.test.tsx`
- Modify: `frontend/src/pages/validador/ProgramacionPage.tsx`
- Modify: `frontend/src/types/index.ts` — `ActividadFilters.gestor`
- Modify: `frontend/src/services/activity.service.ts` — `buildQuery` con `gestor`
- Modify: `frontend/src/components/DescargarInforme.tsx` (+ test) — selector de fecha y gestor
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx` (+ test)

---

### Task 1: `resumenPorGestor` en la librería de desempeño

**Files:**
- Modify: `frontend/src/lib/desempenoGestor.lib.ts`
- Modify: `frontend/src/lib/desempenoGestor.lib.test.ts`

**Interfaces:**
- Consumes: `resumenDelMes` (ya existente en el mismo archivo), `GestorResumen` de `frontend/src/services/users.service.ts`.
- Produces:
  ```ts
  export interface ResumenPorGestor extends ResumenDesempeno {
    gestorId: string;
    nombre: string;
  }
  export function resumenPorGestor(
    programacion: ProgramacionItem[],
    actividades: Actividad[],
    mesRef: Date,
    ahora: Date,
    gestores: GestorResumen[],
  ): ResumenPorGestor[]; // ordenado de mayor a menor cumplimiento
  ```
  Consumida por `EquipoCronogramaPanel` (Task 2).

- [ ] **Step 1: Agregar el test que falla**

Agregar al final de `frontend/src/lib/desempenoGestor.lib.test.ts` (dentro del mismo `describe`, antes del cierre):

```ts
  it('resumenPorGestor agrupa cada gestor con lo suyo y ordena por cumplimiento descendente', () => {
    const gestores = [{ id: 'g-1', nombre: 'Ana Perez' }, { id: 'g-2', nombre: 'Luis Mora' }];
    const programacion: ProgramacionItem[] = [
      item('2026-09-05T10:00:00.000Z', 'CUMPLIDA'), // sin gestorUserId, no cuenta para ninguno
    ];
    (programacion[0] as any).gestorUserId = undefined;

    const conGestor = (fecha: string, estado: ProgramacionItem['estado'], gestorUserId: string): ProgramacionItem => ({
      ...item(fecha, estado), gestorUserId,
    });

    const lista: ProgramacionItem[] = [
      conGestor('2026-09-05T10:00:00.000Z', 'CUMPLIDA', 'g-1'),
      conGestor('2026-09-06T10:00:00.000Z', 'CUMPLIDA', 'g-1'),
      conGestor('2026-09-07T10:00:00.000Z', 'PENDIENTE', 'g-2'), // vencida
    ];

    const resumen = resumenPorGestor(lista, [], new Date(2026, 8, 1), AHORA, gestores);

    expect(resumen).toHaveLength(2);
    expect(resumen[0].nombre).toBe('Ana Perez');
    expect(resumen[0].porcentajeCumplimiento).toBe(100);
    expect(resumen[1].nombre).toBe('Luis Mora');
    expect(resumen[1].porcentajeCumplimiento).toBe(0);
  });
```

- [ ] **Step 2: Correr el test y confirmar que falla**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico/frontend"
npx vitest run src/lib/desempenoGestor.lib.test.ts
```

Expected: FAIL — `resumenPorGestor` no existe.

- [ ] **Step 3: Implementar**

En `frontend/src/lib/desempenoGestor.lib.ts`, agregar el import y la función al final del archivo:

```ts
import type { GestorResumen } from '../services/users.service';
```

(agregar junto a los imports existentes de `ProgramacionItem` y `Actividad`)

```ts
export interface ResumenPorGestor extends ResumenDesempeno {
  gestorId: string;
  nombre: string;
}

// Un resumen por cada gestor del area, ordenado del que mejor cumple al que
// peor. Sirve tanto para "todos los gestores" en el cronograma del equipo
// como para el informe de desempeno: misma cuenta, un solo lugar que la hace.
export function resumenPorGestor(
  programacion: ProgramacionItem[],
  actividades: Actividad[],
  mesRef: Date,
  ahora: Date,
  gestores: GestorResumen[],
): ResumenPorGestor[] {
  return gestores
    .map((g) => {
      const resumen = resumenDelMes(
        programacion.filter((p) => p.gestorUserId === g.id),
        actividades.filter((a) => a.createdByUserId === g.id),
        mesRef,
        ahora,
      );
      return { gestorId: g.id, nombre: g.nombre, ...resumen };
    })
    .sort((a, b) => b.porcentajeCumplimiento - a.porcentajeCumplimiento);
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

```bash
npx vitest run src/lib/desempenoGestor.lib.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/desempenoGestor.lib.ts frontend/src/lib/desempenoGestor.lib.test.ts
git commit -m "feat: resumen de cumplimiento agrupado por gestor"
```

---

### Task 2: Componente compartido `EquipoCronogramaPanel`

**Files:**
- Create: `frontend/src/components/EquipoCronogramaPanel.tsx`
- Test: `frontend/src/components/EquipoCronogramaPanel.test.tsx`

**Interfaces:**
- Consumes: `MonthCalendar`, `mismoDia`, `tituloMes` (plan anterior), `resumenDelMes`, `resumenPorGestor` (Task 1), `GestorResumen`, `ProgramacionItem`, `Actividad`.
- Produces:
  ```ts
  export interface EquipoCronogramaPanelProps {
    programacion: ProgramacionItem[];
    actividades: Actividad[];
    gestores: GestorResumen[];
  }
  export const EquipoCronogramaPanel: React.FC<EquipoCronogramaPanelProps>;
  ```
  Consumida por `ProgramacionPage` (Task 3) y `AdminDashboard` (Task 4) — el mismo componente, sin variante "solo lectura": no tiene ningún control de edición.

- [ ] **Step 1: Escribir los tests que fallan**

`frontend/src/components/EquipoCronogramaPanel.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { EquipoCronogramaPanel } from './EquipoCronogramaPanel';
import type { ProgramacionItem } from '../services/programacion.service';
import type { Actividad } from '../types';

afterEach(cleanup);

const GESTORES = [{ id: 'g-1', nombre: 'Ana Perez' }, { id: 'g-2', nombre: 'Luis Mora' }];

const PROGRAMACION: ProgramacionItem[] = [
  { id: '1', fecha: '2026-09-15T15:00:00.000Z', descripcion: 'Operativo andenes', barrio: 'LAS CRUCES', estado: 'PENDIENTE', gestorUserId: 'g-1', creadoPorUserId: 'v-1' },
  { id: '2', fecha: '2026-09-16T15:00:00.000Z', descripcion: 'Operativo cachivacheros', barrio: 'SAN DIEGO', estado: 'CUMPLIDA', gestorUserId: 'g-2', creadoPorUserId: 'v-1' },
];

function conFechaFija(fechaIso: string, fn: () => void) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(fechaIso));
  try {
    fn();
  } finally {
    vi.useRealTimers();
  }
}

describe('EquipoCronogramaPanel', () => {
  it('sin filtrar por gestor muestra la tabla de cumplimiento de todo el equipo', () => {
    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<EquipoCronogramaPanel programacion={PROGRAMACION} actividades={[]} gestores={GESTORES} />);
    });
    expect(screen.getByText('Ana Perez')).toBeTruthy();
    expect(screen.getByText('Luis Mora')).toBeTruthy();
  });

  it('al elegir un gestor el calendario solo marca lo suyo y aparecen sus KPIs individuales', () => {
    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<EquipoCronogramaPanel programacion={PROGRAMACION} actividades={[]} gestores={GESTORES} />);
    });

    fireEvent.change(screen.getByLabelText('Gestor'), { target: { value: 'g-1' } });

    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));
    expect(screen.getByText('Operativo andenes')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /16 de septiembre/i }));
    expect(screen.queryByText('Operativo cachivacheros')).toBeNull();
  });

  it('la lista del dia seleccionado muestra a que gestor le corresponde cada item', () => {
    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<EquipoCronogramaPanel programacion={PROGRAMACION} actividades={[]} gestores={GESTORES} />);
    });
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));
    expect(screen.getByText(/Ana Perez/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

```bash
npx vitest run src/components/EquipoCronogramaPanel.test.tsx
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

`frontend/src/components/EquipoCronogramaPanel.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { startOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MonthCalendar } from './MonthCalendar';
import { mismoDia } from '../lib/calendar.lib';
import { resumenDelMes, resumenPorGestor } from '../lib/desempenoGestor.lib';
import type { ProgramacionItem } from '../services/programacion.service';
import type { GestorResumen } from '../services/users.service';
import type { Actividad } from '../types';

export interface EquipoCronogramaPanelProps {
  programacion: ProgramacionItem[];
  actividades: Actividad[];
  gestores: GestorResumen[];
}

// Cronograma del equipo: mismo calendario que usa el gestor para el suyo,
// filtrable por gestor puntual o con la tabla comparativa de todos. Sin
// controles de edicion: la carga de programacion sigue siendo la pestana de
// al lado. Se monta igual en Programacion (validador) y en Administracion.
export const EquipoCronogramaPanel: React.FC<EquipoCronogramaPanelProps> = ({
  programacion, actividades, gestores,
}) => {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [gestorId, setGestorId] = useState('');
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(() => new Date());

  const programacionFiltrada = useMemo(
    () => (gestorId ? programacion.filter((p) => p.gestorUserId === gestorId) : programacion),
    [programacion, gestorId],
  );

  const nombreDeGestor = (id?: string | null) =>
    id ? gestores.find((g) => g.id === id)?.nombre ?? 'Gestor del area' : 'Sin asignar';

  const itemsDelDia = useMemo(
    () => (diaSeleccionado ? programacionFiltrada.filter((p) => mismoDia(new Date(p.fecha), diaSeleccionado)) : []),
    [programacionFiltrada, diaSeleccionado],
  );

  const resumenIndividual = gestorId
    ? resumenDelMes(
        programacionFiltrada,
        actividades.filter((a) => a.createdByUserId === gestorId),
        mes,
        new Date(),
      )
    : null;

  const resumenEquipo = gestorId ? [] : resumenPorGestor(programacion, actividades, mes, new Date(), gestores);

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <label className="input-label" htmlFor="filtroGestorCronograma">
          Gestor
        </label>
        <select
          id="filtroGestorCronograma"
          className="select-field"
          value={gestorId}
          onChange={(e) => setGestorId(e.target.value)}
        >
          <option value="">Todos los gestores</option>
          {gestores.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      </div>

      <MonthCalendar
        mes={mes}
        onMesChange={setMes}
        items={programacionFiltrada}
        diaSeleccionado={diaSeleccionado}
        onSeleccionarDia={setDiaSeleccionado}
      />

      <div>
        <h3 className="font-bold text-neutral-800 mb-2">
          {diaSeleccionado ? format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un dia'}
        </h3>
        {itemsDelDia.length === 0 ? (
          <p className="text-neutral-500">Nada programado este dia{gestorId ? ' para este gestor' : ''}.</p>
        ) : (
          <div className="space-y-2">
            {itemsDelDia.map((item) => (
              <div key={item.id} className="p-3 rounded-xl border border-neutral-100 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-800">{item.descripcion}</p>
                  <p className="text-xs text-neutral-500">
                    {nombreDeGestor(item.gestorUserId)}
                    {item.barrio ? ` - ${item.barrio}` : ''}
                  </p>
                </div>
                <span className="text-xs font-semibold text-neutral-500 shrink-0">{item.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {resumenIndividual && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card">
            <p className="card-subtitle">Programadas</p>
            <p className="text-xl font-bold text-neutral-800">{resumenIndividual.programadasMes}</p>
          </div>
          <div className="card">
            <p className="card-subtitle">Cumplidas</p>
            <p className="text-xl font-bold text-neutral-800">{resumenIndividual.cumplidasMes}</p>
          </div>
          <div className="card">
            <p className="card-subtitle">Vencidas</p>
            <p className="text-xl font-bold text-red-600">{resumenIndividual.vencidasMes}</p>
          </div>
          <div className="card">
            <p className="card-subtitle">Cumplimiento</p>
            <p className="text-xl font-bold text-neutral-800">{resumenIndividual.porcentajeCumplimiento}%</p>
          </div>
        </div>
      )}

      {resumenEquipo.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Gestor</th>
                <th className="table-header-cell">Programadas</th>
                <th className="table-header-cell">Cumplidas</th>
                <th className="table-header-cell">Vencidas</th>
                <th className="table-header-cell">Cumplimiento</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {resumenEquipo.map((fila) => (
                <tr key={fila.gestorId} className="table-row">
                  <td className="table-cell font-semibold">{fila.nombre}</td>
                  <td className="table-cell">{fila.programadasMes}</td>
                  <td className="table-cell">{fila.cumplidasMes}</td>
                  <td className="table-cell text-red-600">{fila.vencidasMes}</td>
                  <td className="table-cell font-bold">{fila.porcentajeCumplimiento}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

```bash
npx vitest run src/components/EquipoCronogramaPanel.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/EquipoCronogramaPanel.tsx frontend/src/components/EquipoCronogramaPanel.test.tsx
git commit -m "feat: panel de cronograma del equipo, filtrable por gestor"
```

---

### Task 3: Pestañas en `ProgramacionPage.tsx` (validador)

**Files:**
- Modify: `frontend/src/pages/validador/ProgramacionPage.tsx`

**Interfaces:**
- Consumes: `EquipoCronogramaPanel` (Task 2). Reutiliza `items` (ya cargado como la programación completa) y `gestores` (ya cargado) — agrega una carga de `actividades` que hoy no existe en esta pantalla.

- [ ] **Step 1: Agregar la carga de actividades y el estado de pestaña**

En `frontend/src/pages/validador/ProgramacionPage.tsx`, agregar el import:

```tsx
import { activityService } from '../../services/activity.service';
import { EquipoCronogramaPanel } from '../../components/EquipoCronogramaPanel';
import type { Actividad } from '../../types';
```

Agregar, junto a los demás `useState` del componente:

```tsx
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [vista, setVista] = useState<'cargar' | 'cronograma'>('cargar');
```

Agregar, junto al `useEffect` que carga gestores y barrios:

```tsx
  // Solo para los KPIs de la pestana de cronograma del equipo: si falla, esa
  // pestana muestra ceros en vez de romper la carga de programacion.
  useEffect(() => {
    let vigente = true;
    activityService
      .listAll({ limit: 5000 })
      .then((respuesta) => vigente && setActividades(respuesta.data))
      .catch(() => vigente && setActividades([]));
    return () => {
      vigente = false;
    };
  }, []);
```

- [ ] **Step 2: Agregar las pestañas y envolver el contenido existente**

Inmediatamente después de:

```tsx
      <main className="page-content space-y-6">
```

agregar:

```tsx
        <div className="nav-tabs mb-2">
          <button type="button" className={vista === 'cargar' ? 'nav-tab-active' : 'nav-tab'} onClick={() => setVista('cargar')}>
            Cargar programacion
          </button>
          <button type="button" className={vista === 'cronograma' ? 'nav-tab-active' : 'nav-tab'} onClick={() => setVista('cronograma')}>
            Cronograma del equipo
          </button>
        </div>

        {vista === 'cronograma' && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Cronograma del equipo</h2>
              <p className="card-subtitle">Filtra por gestor para ver su cronograma y su cumplimiento del mes</p>
            </div>
            <EquipoCronogramaPanel programacion={items} actividades={actividades} gestores={gestores} />
          </section>
        )}
```

Envolver el resto del contenido existente de `<main>` (la sección "Cargar programacion", la sección "Programacion cargada" y el `<Link>` de "Volver a validacion") en `{vista === 'cargar' && (<>...</>)}`. Es decir, todo lo que hoy va entre el bloque agregado arriba y el cierre de `</main>` queda como:

```tsx
        {vista === 'cargar' && (
          <>
            <section className="card">
              {/* ... contenido existente de "Cargar programacion", sin cambios ... */}
            </section>

            <section className="card">
              {/* ... contenido existente de "Programacion cargada", sin cambios ... */}
            </section>

            <Link to="/validador/dashboard" className="btn-secondary inline-flex">
              Volver a validacion
            </Link>
          </>
        )}
```

- [ ] **Step 3: Correr la suite de la pantalla**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico/frontend"
npx vitest run src/pages/validador
```

Expected: PASS — no había test propio de `ProgramacionPage.tsx` antes de este plan; si al ejecutar existe uno y falla por la pestaña nueva, ajustar sus selectores para que abran la pestaña "Cargar programacion" antes de buscar los campos del formulario (está seleccionada por defecto, así que un test que no toca pestañas no debería verse afectado).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/validador/ProgramacionPage.tsx
git commit -m "feat: pestana de cronograma del equipo en programacion"
```

---

### Task 4: Filtros de fecha y gestor en el informe, y cronograma del equipo en Admin

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/activity.service.ts`
- Modify: `frontend/src/components/DescargarInforme.tsx`
- Modify: `frontend/src/components/DescargarInforme.test.tsx`
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx`
- Modify: `frontend/src/pages/admin/AdminDashboard.test.tsx`

**Interfaces:**
- Consumes: `EquipoCronogramaPanel` (Task 2). El backend ya acepta `gestor` en `/actividades` y `/actividades/report-xlsx` — no se toca.

- [ ] **Step 1: Declarar el filtro `gestor` en el tipo y en el servicio**

En `frontend/src/types/index.ts`, dentro de `ActividadFilters`:

```ts
export interface ActividadFilters {
  desde?: string;
  hasta?: string;
  gestor?: string;
  limit?: number;
  offset?: number;
}
```

En `frontend/src/services/activity.service.ts`, dentro de `buildQuery`:

```ts
function buildQuery(filters?: ActividadFilters): string {
  const params = new URLSearchParams();
  if (filters?.desde) params.append('desde', filters.desde);
  if (filters?.hasta) params.append('hasta', filters.hasta);
  if (filters?.gestor) params.append('gestor', filters.gestor);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}
```

- [ ] **Step 2: Escribir los tests que fallan para `DescargarInforme`**

Agregar a `frontend/src/components/DescargarInforme.test.tsx`, dentro del `describe` existente:

```tsx
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
```

- [ ] **Step 3: Correr los tests y confirmar que fallan**

```bash
npx vitest run src/components/DescargarInforme.test.tsx
```

Expected: FAIL — el componente todavía no acepta `mostrarSelectorGestor` ni `gestores`.

- [ ] **Step 4: Implementar el selector en `DescargarInforme.tsx`**

Reemplazar el archivo completo por:

```tsx
import { useState } from 'react';
import { activityService } from '../services/activity.service';
import { mensajeDeError } from '../utils/errorMessage';
import type { ActividadFilters } from '../types';
import type { GestorResumen } from '../services/users.service';

interface Props {
  filtros?: ActividadFilters;
  className?: string;
  /** Pinta los campos de fecha y gestor y los suma a `filtros` al descargar. */
  mostrarSelectorGestor?: boolean;
  gestores?: GestorResumen[];
}

/**
 * Descarga el informe del area en Excel.
 *
 * Solo lo usan validador y administracion: el endpoint le responde 403 a un
 * gestor, asi que el boton no debe aparecerle.
 */
export const DescargarInforme = ({ filtros, className, mostrarSelectorGestor, gestores = [] }: Props) => {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [gestorId, setGestorId] = useState('');

  const descargar = async () => {
    setDescargando(true);
    setError(null);
    let url: string | null = null;
    try {
      const filtrosAEnviar: ActividadFilters = {
        ...filtros,
        ...(mostrarSelectorGestor && desde ? { desde } : {}),
        ...(mostrarSelectorGestor && hasta ? { hasta } : {}),
        ...(mostrarSelectorGestor && gestorId ? { gestor: gestorId } : {}),
      };
      const blob = await activityService.descargarInforme(filtrosAEnviar);
      url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'espacio-publico.xlsx';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (err) {
      const motivo = mensajeDeError(err);
      if (motivo) setError(motivo);
    } finally {
      if (url) URL.revokeObjectURL(url);
      setDescargando(false);
    }
  };

  return (
    <div className={className}>
      {mostrarSelectorGestor && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="input-label" htmlFor="informeDesde">
              Desde
            </label>
            <input id="informeDesde" type="date" className="input-field" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="input-label" htmlFor="informeHasta">
              Hasta
            </label>
            <input id="informeHasta" type="date" className="input-field" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div>
            <label className="input-label" htmlFor="informeGestor">
              Gestor
            </label>
            <select id="informeGestor" className="select-field" value={gestorId} onChange={(e) => setGestorId(e.target.value)}>
              <option value="">Todos los gestores</option>
              {gestores.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button type="button" className="btn-secondary btn-sm w-full justify-center" disabled={descargando} onClick={descargar}>
        {descargando ? 'Preparando...' : 'Descargar informe en Excel'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
};
```

- [ ] **Step 5: Correr los tests de `DescargarInforme` y confirmar que pasan**

```bash
npx vitest run src/components/DescargarInforme.test.tsx
```

Expected: PASS (6 tests — los 3 previos siguen intactos porque `mostrarSelectorGestor` es `undefined` por defecto).

- [ ] **Step 6: Cargar gestores y agregar pestañas en `AdminDashboard.tsx`**

En `frontend/src/pages/admin/AdminDashboard.tsx`, agregar los imports:

```tsx
import { usersService, type GestorResumen } from '../../services/users.service';
import { EquipoCronogramaPanel } from '../../components/EquipoCronogramaPanel';
```

Agregar, junto a los demás `useState`:

```tsx
  const [gestores, setGestores] = useState<GestorResumen[]>([]);
  const [vista, setVista] = useState<'indicadores' | 'cronograma'>('indicadores');
```

Agregar, junto al `useEffect` que carga `programacion`:

```tsx
  useEffect(() => {
    let vigente = true;
    usersService
      .listarGestores()
      .then((lista) => vigente && setGestores(lista))
      .catch(() => vigente && setGestores([]));
    return () => {
      vigente = false;
    };
  }, []);
```

Inmediatamente después de:

```tsx
      <main className="page-content space-y-6">
```

agregar las pestañas:

```tsx
        <div className="nav-tabs mb-2">
          <button type="button" className={vista === 'indicadores' ? 'nav-tab-active' : 'nav-tab'} onClick={() => setVista('indicadores')}>
            Indicadores
          </button>
          <button type="button" className={vista === 'cronograma' ? 'nav-tab-active' : 'nav-tab'} onClick={() => setVista('cronograma')}>
            Cronograma del equipo
          </button>
        </div>

        {vista === 'cronograma' && !error && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Cronograma del equipo</h2>
              <p className="card-subtitle">Filtra por gestor para ver su cronograma y su cumplimiento del mes</p>
            </div>
            <EquipoCronogramaPanel programacion={programacion} actividades={actividades} gestores={gestores} />
          </section>
        )}
```

Envolver todo el contenido que hoy sigue (el bloque `{error ? (...) : actividades.length === 0 ? (...) : (<>...KPIs, por estado, por barrio, reincidencia, informe...</>)}`) en `{vista === 'indicadores' && (<>...</>)}`, dejando el bloque `error ? (...)` **fuera** de esa condición (el error de carga tiene que verse en cualquier pestaña, no solo en "Indicadores") — es decir, el `error ? (...)` queda como estaba, y el `: actividades.length === 0 ? (...) : (<>...</>)` completo se envuelve en `vista === 'indicadores' &&`.

Por último, dentro de la sección "Informe" (donde hoy está `<DescargarInforme />`), reemplazar por:

```tsx
              <DescargarInforme mostrarSelectorGestor gestores={gestores} />
```

- [ ] **Step 7: Correr la suite de `AdminDashboard`**

```bash
npx vitest run src/pages/admin/AdminDashboard.test.tsx
```

Expected: PASS. Si `AdminDashboard.test.tsx` ya monta el dashboard y busca texto de la pestaña "Indicadores" por defecto (que es la que queda seleccionada al montar), ningún test existente debería necesitar tocarse — están todos dentro de esa pestaña. Si alguno falla por no encontrar contenido que ahora vive detrás de `vista === 'indicadores'`, confirmar que `vista` arranca en `'indicadores'` (Step 6) antes de investigar más.

- [ ] **Step 8: Correr toda la suite de frontend**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/activity.service.ts frontend/src/components/DescargarInforme.tsx frontend/src/components/DescargarInforme.test.tsx frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "feat: informe filtrable por fecha y gestor, cronograma del equipo en admin"
```

---

## Self-Review

**Spec coverage:**
- Validador: "poder ver el cronograma de cada gestor... tab debajo de programacion... filtrar por mes, por gestor... insights" → Task 2 y 3.
- Admin: "lo mismo del validador pero solo la parte de cronograma/filtros/insights" → Task 4, mismo `EquipoCronogramaPanel`, sin controles de carga.
- Admin: "informe de desempeño... seleccionar fecha o periodo... un gestor o todos" → Task 4, `DescargarInforme` con `mostrarSelectorGestor`, sobre un endpoint que ya soporta esos filtros en el backend.

**Placeholder scan:** sin TBD — cada task trae código completo o el diff exacto.

**Type consistency:** `EquipoCronogramaPanelProps` usa `ProgramacionItem[]`, `Actividad[]`, `GestorResumen[]` igual en Task 2 (definición), Task 3 (`ProgramacionPage`) y Task 4 (`AdminDashboard`). `ResumenPorGestor` extiende `ResumenDesempeno` del plan anterior sin redefinir ningún campo.

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-09-04-cronograma-validador-admin.md`. Dos opciones de ejecución:

1. **Subagent-Driven (recomendado)** — un subagente fresco por tarea, revisión entre tareas.
2. **Inline** — ejecución en esta sesión, por lotes, con checkpoints.
