# Cronograma en calendario y perfil de desempeño del gestor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar "Mi cronograma" de una lista plana a un calendario mensual navegable (mes anterior/siguiente, hoy por defecto), y agregar una pestaña nueva "Mi perfil" con los indicadores de desempeño del gestor: cumplimiento de lo programado, pendientes y completadas del mes.

**Architecture:** Dos piezas puras y testeables primero (`calendar.lib.ts` para la grilla del mes, `desempenoGestor.lib.ts` para las métricas), después dos componentes de presentación (`MonthCalendar`, reutilizado en el plan siguiente por validador y admin) y dos pantallas (`CronogramaPage` reescrita, `PerfilGestorPage` nueva). Todo sobre los mismos endpoints que ya existen (`programacionService.mias`, `activityService.listMine`) — sin cambios de backend.

**Tech Stack:** React 18, `date-fns` (ya instalado, con locale `es`), Tailwind. Sin librería de gráficos: los indicadores se muestran con KPIs y barras de progreso en CSS, igual que `AdminDashboard.tsx` ya hace.

**Spec:** Este documento. Referencia: pantalla actual `frontend/src/pages/gestor/CronogramaPage.tsx`, endpoint `GET /programacion/mias` (`frontend/src/services/programacion.service.ts`), pedido del usuario de un calendario mensual navegable con pestaña de perfil debajo de "Mi cronograma".

## Global Constraints

- Comentarios en español sin tildes. Commits de una línea. Sin menciones a IA.
- Sin librerías nuevas (ni de calendario ni de gráficos).
- `frontend/src/App.tsx` y `frontend/src/utils/permissions.ts` son espejos (hay test que falla si divergen) — cualquier ruta nueva se agrega en los dos a la vez.
- El backend YA filtra por usuario del token en `/programacion/mias` y `/actividades/mine` — ningún cambio de este plan toca autorización, solo lectura de lo que esos endpoints ya devuelven.
- Windows/PowerShell: `;` para encadenar, nunca `&&`.

---

## Diagnóstico verificado

- `CronogramaPage.tsx` (167 líneas) pinta tres listas planas (vencidas, próximas, cerradas) sin ningún concepto de mes — con programación de varios meses cargada se vuelve una lista larga sin forma de ubicarse.
- `ProgramacionItemEntity` (`src/programacion/entities/programacion-item.entity.ts`) ya tiene todo lo necesario para un calendario: `fecha`, `estado` (`PENDIENTE` | `CUMPLIDA` | `CANCELADA`), `barrio`, `descripcion`, `actividadId`.
- `programacionService.mias()` (`frontend/src/services/programacion.service.ts:77`) acepta filtros `desde`/`hasta` — no hace falta pedirle nada nuevo al backend para acotar por mes, aunque para este plan alcanza con traer todo y filtrar en cliente (mismo patrón que `AdminDashboard.tsx` ya usa con `activityService.listAll({ limit: 5000 })`).
- No existe ningún componente de calendario en el repo — se construye desde cero, acotado a lo que este módulo necesita.

## File Structure

- Create: `frontend/src/lib/calendar.lib.ts` + `.test.ts`
- Create: `frontend/src/lib/desempenoGestor.lib.ts` + `.test.ts`
- Create: `frontend/src/components/MonthCalendar.tsx` + `.test.tsx`
- Modify: `frontend/src/pages/gestor/CronogramaPage.tsx` (+ test si lo hubiera — no existe hoy, se crea)
- Create: `frontend/src/pages/gestor/PerfilGestorPage.tsx` + `.test.tsx`
- Modify: `frontend/src/components/shell/navItems.ts`
- Modify: `frontend/src/utils/permissions.ts`
- Modify: `frontend/src/App.tsx`

---

### Task 1: `calendar.lib.ts` — grilla pura del mes

**Files:**
- Create: `frontend/src/lib/calendar.lib.ts`
- Test: `frontend/src/lib/calendar.lib.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface DiaCalendario { fecha: Date; enMes: boolean; esHoy: boolean }
  export function gridDelMes(mesRef: Date): DiaCalendario[]; // siempre 42 dias, lunes primero
  export function mesSiguiente(mesRef: Date): Date;
  export function mesAnterior(mesRef: Date): Date;
  export function tituloMes(mesRef: Date): string; // "Septiembre 2026"
  export function mismoDia(a: Date, b: Date): boolean;
  ```
  Consumida por `MonthCalendar` (Task 3) y `PerfilGestorPage` (Task 5).

- [ ] **Step 1: Escribir los tests que fallan**

`frontend/src/lib/calendar.lib.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { gridDelMes, mesSiguiente, mesAnterior, tituloMes, mismoDia } from './calendar.lib';

describe('calendar.lib', () => {
  it('genera una grilla de 42 dias que empieza en lunes', () => {
    const grid = gridDelMes(new Date(2026, 8, 15)); // septiembre 2026
    expect(grid).toHaveLength(42);
    expect(grid[0].fecha.getDay()).toBe(1);
  });

  it('marca los dias que pertenecen al mes de referencia', () => {
    const grid = gridDelMes(new Date(2026, 8, 15));
    const enMes = grid.filter((d) => d.enMes);
    expect(enMes).toHaveLength(30);
    expect(enMes[0].fecha.getDate()).toBe(1);
    expect(enMes[29].fecha.getDate()).toBe(30);
  });

  it('mesSiguiente y mesAnterior mueven exactamente un mes', () => {
    const base = new Date(2026, 8, 15);
    expect(mesSiguiente(base).getMonth()).toBe(9);
    expect(mesAnterior(base).getMonth()).toBe(7);
  });

  it('tituloMes devuelve el nombre en espanol capitalizado', () => {
    expect(tituloMes(new Date(2026, 8, 1))).toBe('Septiembre 2026');
  });

  it('mismoDia compara solo la fecha, no la hora', () => {
    expect(mismoDia(new Date(2026, 8, 15, 3), new Date(2026, 8, 15, 22))).toBe(true);
    expect(mismoDia(new Date(2026, 8, 15), new Date(2026, 8, 16))).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico/frontend"
npx vitest run src/lib/calendar.lib.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

`frontend/src/lib/calendar.lib.ts`:

```ts
import {
  startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, format,
} from 'date-fns';
import { es } from 'date-fns/locale';

export interface DiaCalendario {
  fecha: Date;
  enMes: boolean;
  esHoy: boolean;
}

// Grilla de 6 semanas (42 dias) que cubre el mes completo, siempre empezando
// en lunes. Fija en 6 semanas aunque el mes quepa en 5: una grilla de alto
// variable hace saltar el layout al cambiar de mes.
export function gridDelMes(mesRef: Date): DiaCalendario[] {
  const inicio = startOfWeek(startOfMonth(mesRef), { weekStartsOn: 1 });
  const dias: DiaCalendario[] = [];
  for (let i = 0; i < 42; i++) {
    const fecha = addDays(inicio, i);
    dias.push({ fecha, enMes: isSameMonth(fecha, mesRef), esHoy: isToday(fecha) });
  }
  return dias;
}

export function mesSiguiente(mesRef: Date): Date {
  return addMonths(mesRef, 1);
}

export function mesAnterior(mesRef: Date): Date {
  return subMonths(mesRef, 1);
}

export function tituloMes(mesRef: Date): string {
  const texto = format(mesRef, 'LLLL yyyy', { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function mismoDia(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

// Reexportado para quien necesite el limite superior del mes sin reimplementarlo.
export function finDeMes(mesRef: Date): Date {
  return endOfMonth(mesRef);
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

```bash
npx vitest run src/lib/calendar.lib.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/calendar.lib.ts frontend/src/lib/calendar.lib.test.ts
git commit -m "feat: libreria pura de grilla mensual para el calendario"
```

---

### Task 2: `desempenoGestor.lib.ts` — métricas del mes

**Files:**
- Create: `frontend/src/lib/desempenoGestor.lib.ts`
- Test: `frontend/src/lib/desempenoGestor.lib.test.ts`

**Interfaces:**
- Consumes: `ProgramacionItem` de `frontend/src/services/programacion.service.ts`, `Actividad` de `frontend/src/types`.
- Produces:
  ```ts
  export interface ResumenDesempeno {
    programadasMes: number;
    cumplidasMes: number;
    pendientesMes: number;
    vencidasMes: number;
    porcentajeCumplimiento: number; // 0-100
    actividadesRegistradasMes: number;
  }
  export function resumenDelMes(
    programacion: ProgramacionItem[],
    actividades: Actividad[],
    mesRef: Date,
    ahora: Date,
  ): ResumenDesempeno;
  ```
  Consumida por `PerfilGestorPage` (Task 5).

- [ ] **Step 1: Escribir los tests que fallan**

`frontend/src/lib/desempenoGestor.lib.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resumenDelMes } from './desempenoGestor.lib';
import type { ProgramacionItem } from '../services/programacion.service';
import type { Actividad } from '../types';

const AHORA = new Date(2026, 8, 20, 12); // 20 de septiembre 2026, mediodia

function item(fecha: string, estado: ProgramacionItem['estado']): ProgramacionItem {
  return {
    id: fecha + estado, fecha, descripcion: 'x', estado, creadoPorUserId: 'v-1',
  };
}

function actividad(dateTime: string): Actividad {
  return { id: dateTime, dateTime } as Actividad;
}

describe('desempenoGestor.lib', () => {
  it('cuenta programadas, cumplidas, pendientes y vencidas solo del mes de referencia', () => {
    const programacion: ProgramacionItem[] = [
      item('2026-09-05T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-10T10:00:00.000Z', 'PENDIENTE'), // ya paso, vencida
      item('2026-09-25T10:00:00.000Z', 'PENDIENTE'), // todavia no llega
      item('2026-08-15T10:00:00.000Z', 'CUMPLIDA'), // mes distinto, no cuenta
    ];

    const resumen = resumenDelMes(programacion, [], new Date(2026, 8, 1), AHORA);

    expect(resumen.programadasMes).toBe(3);
    expect(resumen.cumplidasMes).toBe(1);
    expect(resumen.vencidasMes).toBe(1);
    expect(resumen.pendientesMes).toBe(1);
  });

  it('el cumplimiento es cumplidas sobre cumplidas mas vencidas, sin contar lo que todavia no vence', () => {
    const programacion: ProgramacionItem[] = [
      item('2026-09-05T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-06T10:00:00.000Z', 'CUMPLIDA'),
      item('2026-09-10T10:00:00.000Z', 'PENDIENTE'), // vencida
      item('2026-09-25T10:00:00.000Z', 'PENDIENTE'), // no vence todavia
    ];

    const resumen = resumenDelMes(programacion, [], new Date(2026, 8, 1), AHORA);

    // 2 cumplidas / (2 cumplidas + 1 vencida) = 66.67% -> redondeado 67
    expect(resumen.porcentajeCumplimiento).toBe(67);
  });

  it('sin cumplidas ni vencidas el cumplimiento es 100 (el mes no tuvo incumplimientos)', () => {
    const resumen = resumenDelMes([], [], new Date(2026, 8, 1), AHORA);
    expect(resumen.porcentajeCumplimiento).toBe(100);
  });

  it('cuenta las actividades registradas en el mes, sin importar su estado de programacion', () => {
    const actividades: Actividad[] = [
      actividad('2026-09-03T10:00:00.000Z'),
      actividad('2026-09-18T10:00:00.000Z'),
      actividad('2026-08-30T10:00:00.000Z'), // otro mes
    ];
    const resumen = resumenDelMes([], actividades, new Date(2026, 8, 1), AHORA);
    expect(resumen.actividadesRegistradasMes).toBe(2);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

```bash
npx vitest run src/lib/desempenoGestor.lib.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

`frontend/src/lib/desempenoGestor.lib.ts`:

```ts
import type { ProgramacionItem } from '../services/programacion.service';
import type { Actividad } from '../types';

export interface ResumenDesempeno {
  programadasMes: number;
  cumplidasMes: number;
  pendientesMes: number;
  vencidasMes: number;
  porcentajeCumplimiento: number;
  actividadesRegistradasMes: number;
}

function delMismoMes(fechaIso: string, mesRef: Date): boolean {
  const f = new Date(fechaIso);
  return f.getFullYear() === mesRef.getFullYear() && f.getMonth() === mesRef.getMonth();
}

// El cumplimiento se mide contra lo que YA debia estar resuelto (cumplidas +
// vencidas). Lo pendiente que todavia no llego a su fecha no cuenta ni a
// favor ni en contra: el mes no termino, no hay como haber incumplido algo
// que todavia no vence.
export function resumenDelMes(
  programacion: ProgramacionItem[],
  actividades: Actividad[],
  mesRef: Date,
  ahora: Date,
): ResumenDesempeno {
  const delMes = programacion.filter((p) => delMismoMes(p.fecha, mesRef));

  const cumplidasMes = delMes.filter((p) => p.estado === 'CUMPLIDA').length;
  const vencidasMes = delMes.filter((p) => p.estado === 'PENDIENTE' && new Date(p.fecha) < ahora).length;
  const pendientesMes = delMes.filter((p) => p.estado === 'PENDIENTE' && new Date(p.fecha) >= ahora).length;

  const base = cumplidasMes + vencidasMes;
  const porcentajeCumplimiento = base === 0 ? 100 : Math.round((cumplidasMes / base) * 100);

  const actividadesRegistradasMes = actividades.filter((a) => delMismoMes(a.dateTime, mesRef)).length;

  return { programadasMes: delMes.length, cumplidasMes, pendientesMes, vencidasMes, porcentajeCumplimiento, actividadesRegistradasMes };
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

```bash
npx vitest run src/lib/desempenoGestor.lib.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/desempenoGestor.lib.ts frontend/src/lib/desempenoGestor.lib.test.ts
git commit -m "feat: libreria pura de indicadores de desempeno mensual del gestor"
```

---

### Task 3: Componente `MonthCalendar`

**Files:**
- Create: `frontend/src/components/MonthCalendar.tsx`
- Test: `frontend/src/components/MonthCalendar.test.tsx`

**Interfaces:**
- Consumes: `gridDelMes`, `mesSiguiente`, `mesAnterior`, `tituloMes`, `mismoDia` de `calendar.lib.ts` (Task 1); `ProgramacionItem` de `programacion.service.ts`.
- Produces:
  ```ts
  export interface MonthCalendarProps {
    mes: Date;
    onMesChange: (mes: Date) => void;
    items: ProgramacionItem[];
    diaSeleccionado: Date | null;
    onSeleccionarDia: (fecha: Date) => void;
  }
  export const MonthCalendar: React.FC<MonthCalendarProps>;
  ```
  Consumida por `CronogramaPage` (Task 4) y por el plan de validador/admin (fase 3 del roadmap).

- [ ] **Step 1: Escribir los tests que fallan**

`frontend/src/components/MonthCalendar.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthCalendar } from './MonthCalendar';
import type { ProgramacionItem } from '../services/programacion.service';

const ITEMS: ProgramacionItem[] = [
  { id: '1', fecha: '2026-09-15T10:00:00.000Z', descripcion: 'Operativo A', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
  { id: '2', fecha: '2026-09-15T14:00:00.000Z', descripcion: 'Operativo B', estado: 'CUMPLIDA', creadoPorUserId: 'v-1' },
];

describe('MonthCalendar', () => {
  it('muestra el titulo del mes recibido', () => {
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={vi.fn()} items={[]} diaSeleccionado={null} onSeleccionarDia={vi.fn()} />,
    );
    expect(screen.getByText('Septiembre 2026')).toBeTruthy();
  });

  it('el boton de mes siguiente avanza un mes exacto', () => {
    const onMesChange = vi.fn();
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={onMesChange} items={[]} diaSeleccionado={null} onSeleccionarDia={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText('Mes siguiente'));
    const llamado: Date = onMesChange.mock.calls[0][0];
    expect(llamado.getMonth()).toBe(9);
  });

  it('el boton de mes anterior retrocede un mes exacto', () => {
    const onMesChange = vi.fn();
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={onMesChange} items={[]} diaSeleccionado={null} onSeleccionarDia={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText('Mes anterior'));
    const llamado: Date = onMesChange.mock.calls[0][0];
    expect(llamado.getMonth()).toBe(7);
  });

  it('avisa al hacer clic en un dia', () => {
    const onSeleccionarDia = vi.fn();
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={vi.fn()} items={ITEMS} diaSeleccionado={null} onSeleccionarDia={onSeleccionarDia} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));
    expect(onSeleccionarDia).toHaveBeenCalledTimes(1);
    const fecha: Date = onSeleccionarDia.mock.calls[0][0];
    expect(fecha.getDate()).toBe(15);
  });

  it('el dia con items muestra un indicador por cada uno', () => {
    render(
      <MonthCalendar mes={new Date(2026, 8, 1)} onMesChange={vi.fn()} items={ITEMS} diaSeleccionado={null} onSeleccionarDia={vi.fn()} />,
    );
    const dia15 = screen.getByRole('button', { name: /15 de septiembre/i });
    expect(dia15.querySelectorAll('[data-indicador-estado]')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

```bash
npx vitest run src/components/MonthCalendar.test.tsx
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

`frontend/src/components/MonthCalendar.tsx`:

```tsx
import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { gridDelMes, mesSiguiente, mesAnterior, tituloMes, mismoDia } from '../lib/calendar.lib';
import type { ProgramacionItem } from '../services/programacion.service';

export interface MonthCalendarProps {
  mes: Date;
  onMesChange: (mes: Date) => void;
  items: ProgramacionItem[];
  diaSeleccionado: Date | null;
  onSeleccionarDia: (fecha: Date) => void;
}

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-amber-500',
  CUMPLIDA: 'bg-success',
  CANCELADA: 'bg-neutral-400',
};

const DIAS_SEMANA = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

// Calendario de un mes con indicadores por dia. No sabe nada de "cronograma"
// ni de roles: solo pinta ProgramacionItem[] contra una grilla de fechas y
// avisa clics. Lo reutilizan el gestor (su propio cronograma), el validador
// (cronograma por gestor) y el admin (el mismo, en solo lectura).
export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  mes, onMesChange, items, diaSeleccionado, onSeleccionarDia,
}) => {
  const dias = gridDelMes(mes);
  const itemsDelDia = (fecha: Date) => items.filter((item) => mismoDia(new Date(item.fecha), fecha));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button type="button" className="btn-ghost btn-sm" aria-label="Mes anterior" onClick={() => onMesChange(mesAnterior(mes))}>
          &lsaquo;
        </button>
        <h3 className="font-bold text-neutral-800">{tituloMes(mes)}</h3>
        <button type="button" className="btn-ghost btn-sm" aria-label="Mes siguiente" onClick={() => onMesChange(mesSiguiente(mes))}>
          &rsaquo;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400 mb-1">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dias.map(({ fecha, enMes, esHoy }) => {
          const delDia = itemsDelDia(fecha);
          const seleccionado = diaSeleccionado !== null && mismoDia(fecha, diaSeleccionado);
          const etiqueta = format(fecha, "d 'de' MMMM", { locale: es });
          return (
            <button
              key={fecha.toISOString()}
              type="button"
              onClick={() => onSeleccionarDia(fecha)}
              aria-pressed={seleccionado}
              aria-label={etiqueta}
              className={[
                'aspect-square rounded-lg p-1 text-xs flex flex-col items-center justify-start gap-0.5 border transition-colors',
                enMes ? 'text-neutral-700' : 'text-neutral-300',
                esHoy ? 'border-primary font-bold' : 'border-transparent',
                seleccionado ? 'bg-primary/10 border-primary' : 'hover:bg-neutral-50',
              ].join(' ')}
            >
              <span>{fecha.getDate()}</span>
              {delDia.length > 0 && (
                <span className="flex gap-0.5 flex-wrap justify-center">
                  {delDia.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      data-indicador-estado={item.estado}
                      className={`w-1.5 h-1.5 rounded-full ${COLOR_ESTADO[item.estado] ?? 'bg-neutral-400'}`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

```bash
npx vitest run src/components/MonthCalendar.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/MonthCalendar.tsx frontend/src/components/MonthCalendar.test.tsx
git commit -m "feat: componente de calendario mensual reutilizable"
```

---

### Task 4: `CronogramaPage.tsx` con el calendario

**Files:**
- Modify: `frontend/src/pages/gestor/CronogramaPage.tsx`
- Test: `frontend/src/pages/gestor/CronogramaPage.test.tsx` (nuevo — la pantalla no tenía test propio)

**Interfaces:**
- Consumes: `MonthCalendar` (Task 3), `programacionService.mias()` (ya existente).
- Mantiene el aviso de "vencidas sin registrar" que ya existía, ahora arriba del calendario.

- [ ] **Step 1: Escribir el test que falla**

`frontend/src/pages/gestor/CronogramaPage.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CronogramaPage } from './CronogramaPage';
import { programacionService } from '../../services/programacion.service';

vi.mock('../../services/programacion.service', () => ({
  programacionService: { mias: vi.fn() },
}));

afterEach(cleanup);

function conFechaFija(fechaIso: string, fn: () => void) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(fechaIso));
  try {
    fn();
  } finally {
    vi.useRealTimers();
  }
}

describe('CronogramaPage', () => {
  it('muestra el mes actual con el dia de una actividad programada marcado', async () => {
    (programacionService.mias as any).mockResolvedValue([
      { id: '1', fecha: '2026-09-15T15:00:00.000Z', descripcion: 'Operativo andenes', barrio: 'LAS CRUCES', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
    ]);

    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<MemoryRouter><CronogramaPage /></MemoryRouter>);
    });

    expect(await screen.findByText('Septiembre 2026')).toBeTruthy();
    expect(screen.getByText('Operativo andenes')).toBeTruthy();
  });

  it('al hacer clic en un dia muestra el detalle de lo programado ese dia', async () => {
    (programacionService.mias as any).mockResolvedValue([
      { id: '1', fecha: '2026-09-15T15:00:00.000Z', descripcion: 'Operativo andenes', barrio: 'LAS CRUCES', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
      { id: '2', fecha: '2026-09-20T15:00:00.000Z', descripcion: 'Operativo cachivacheros', barrio: 'SAN DIEGO', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
    ]);

    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<MemoryRouter><CronogramaPage /></MemoryRouter>);
    });

    await screen.findByText('Septiembre 2026');
    fireEvent.click(screen.getByRole('button', { name: /15 de septiembre/i }));

    expect(screen.getByText('Operativo andenes')).toBeTruthy();
    expect(screen.queryByText('Operativo cachivacheros')).toBeNull();
  });

  it('sin programacion muestra el estado vacio, con el calendario igual visible', async () => {
    (programacionService.mias as any).mockResolvedValue([]);

    conFechaFija('2026-09-01T12:00:00.000Z', () => {
      render(<MemoryRouter><CronogramaPage /></MemoryRouter>);
    });

    expect(await screen.findByText('Septiembre 2026')).toBeTruthy();
    expect(screen.getByText(/Cuando el area cargue la programacion/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

```bash
npx vitest run src/pages/gestor/CronogramaPage.test.tsx
```

Expected: FAIL — la pantalla actual no tiene calendario ni título de mes.

- [ ] **Step 3: Reescribir la pantalla**

Reemplazar el contenido completo de `frontend/src/pages/gestor/CronogramaPage.tsx` por:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { programacionService, type ProgramacionItem } from '../../services/programacion.service';
import { mensajeDeError } from '../../utils/errorMessage';
import { mismoDia } from '../../lib/calendar.lib';
import { MonthCalendar } from '../../components/MonthCalendar';
import { Loading } from '../../components/Loading';

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CUMPLIDA: 'Cumplida',
  CANCELADA: 'Cancelada',
};

export const CronogramaPage = () => {
  const [items, setItems] = useState<ProgramacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(() => new Date());

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    programacionService
      .mias()
      .then((lista) => {
        if (!vigente) return;
        setItems(lista);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setItems([]);
        setError(mensajeDeError(err) ?? 'No se pudo cargar el cronograma');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  // Las vencidas se calculan sobre TODO lo cargado, no solo el mes visible en
  // el calendario: son la alerta mas importante de la pantalla y no pueden
  // desaparecer solo porque el gestor esta mirando otro mes.
  const vencidas = useMemo(() => {
    const hoy = startOfDay(new Date());
    return items.filter((item) => item.estado === 'PENDIENTE' && isBefore(new Date(item.fecha), hoy));
  }, [items]);

  const itemsDelDiaSeleccionado = useMemo(
    () => (diaSeleccionado ? items.filter((item) => mismoDia(new Date(item.fecha), diaSeleccionado)) : []),
    [items, diaSeleccionado],
  );

  if (cargando) return <Loading />;

  const Fila = ({ item }: { item: ProgramacionItem }) => (
    <div className="p-4 rounded-2xl border border-neutral-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-800">{item.descripcion}</p>
          <p className="text-sm text-neutral-500">
            {format(new Date(item.fecha), 'HH:mm', { locale: es })}
            {item.barrio ? ` - ${item.barrio}` : ''}
          </p>
        </div>
        <span className="text-xs font-semibold text-neutral-500 shrink-0">
          {ETIQUETA_ESTADO[item.estado] ?? item.estado}
        </span>
      </div>
      {item.estado === 'PENDIENTE' && (
        <Link to="/gestor/crear-actividad" className="btn-success btn-sm mt-3 inline-flex">
          Registrar esta actividad
        </Link>
      )}
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Mi cronograma</h1>
          <p className="page-subtitle">Las actividades que tenes programadas por el area</p>
        </div>
      </div>

      <main className="page-content space-y-6">
        {error ? (
          <div className="card empty-state" role="alert">
            <p className="empty-state-title text-red-700">No se pudo cargar el cronograma</p>
            <p className="empty-state-description">{error}</p>
            <button type="button" className="btn-success mt-4" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {vencidas.length > 0 && (
              <section className="card border border-red-200 bg-red-50">
                <div className="card-header border-red-100">
                  <h2 className="card-title text-red-700">Vencidas sin registrar</h2>
                  <p className="card-subtitle">{vencidas.length} actividades pasaron de fecha</p>
                </div>
                <div className="space-y-3">
                  {vencidas.map((item) => (
                    <Fila key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            <section className="card">
              <MonthCalendar
                mes={mes}
                onMesChange={setMes}
                items={items}
                diaSeleccionado={diaSeleccionado}
                onSeleccionarDia={setDiaSeleccionado}
              />
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="card-title">
                  {diaSeleccionado
                    ? format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })
                    : 'Selecciona un dia'}
                </h2>
                <p className="card-subtitle">{itemsDelDiaSeleccionado.length} actividades programadas ese dia</p>
              </div>
              {itemsDelDiaSeleccionado.length === 0 ? (
                items.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state-title">No tenes actividades programadas</p>
                    <p className="empty-state-description">
                      Cuando el area cargue la programacion, tus actividades aparecen aca.
                    </p>
                    <Link to="/gestor/dashboard" className="btn-secondary mt-4 inline-flex">
                      Ir a mis actividades
                    </Link>
                  </div>
                ) : (
                  <p className="text-neutral-500">Ningun operativo programado para este dia.</p>
                )
              ) : (
                <div className="space-y-3">
                  {itemsDelDiaSeleccionado.map((item) => (
                    <Fila key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

```bash
npx vitest run src/pages/gestor/CronogramaPage.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/gestor/CronogramaPage.tsx frontend/src/pages/gestor/CronogramaPage.test.tsx
git commit -m "feat: mi cronograma como calendario mensual navegable"
```

---

### Task 5: Pestaña "Mi perfil" con indicadores de desempeño

**Files:**
- Create: `frontend/src/pages/gestor/PerfilGestorPage.tsx`
- Test: `frontend/src/pages/gestor/PerfilGestorPage.test.tsx`
- Modify: `frontend/src/components/shell/navItems.ts`
- Modify: `frontend/src/utils/permissions.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `resumenDelMes` (Task 2), `programacionService.mias()`, `activityService.listMine()` (ya existente).

- [ ] **Step 1: Escribir el test que falla**

`frontend/src/pages/gestor/PerfilGestorPage.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PerfilGestorPage } from './PerfilGestorPage';
import { programacionService } from '../../services/programacion.service';
import { activityService } from '../../services/activity.service';

vi.mock('../../services/programacion.service', () => ({
  programacionService: { mias: vi.fn() },
}));
vi.mock('../../services/activity.service', () => ({
  activityService: { listMine: vi.fn() },
}));

afterEach(cleanup);

function conFechaFija(fechaIso: string, fn: () => void) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(fechaIso));
  try {
    fn();
  } finally {
    vi.useRealTimers();
  }
}

describe('PerfilGestorPage', () => {
  it('muestra el porcentaje de cumplimiento del mes actual', async () => {
    (programacionService.mias as any).mockResolvedValue([
      { id: '1', fecha: '2026-09-05T10:00:00.000Z', descripcion: 'x', estado: 'CUMPLIDA', creadoPorUserId: 'v-1' },
      { id: '2', fecha: '2026-09-10T10:00:00.000Z', descripcion: 'y', estado: 'PENDIENTE', creadoPorUserId: 'v-1' },
    ]);
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });

    conFechaFija('2026-09-20T12:00:00.000Z', () => {
      render(<MemoryRouter><PerfilGestorPage /></MemoryRouter>);
    });

    expect(await screen.findByText('Mi perfil')).toBeTruthy();
    expect(await screen.findByText('0%')).toBeTruthy(); // 0 cumplidas / (0 cumplidas + 1 vencida)
  });

  it('muestra las actividades registradas en el mes', async () => {
    (programacionService.mias as any).mockResolvedValue([]);
    (activityService.listMine as any).mockResolvedValue({
      data: [{ id: 'a1', dateTime: '2026-09-03T10:00:00.000Z' }, { id: 'a2', dateTime: '2026-08-01T10:00:00.000Z' }],
      total: 2,
    });

    conFechaFija('2026-09-20T12:00:00.000Z', () => {
      render(<MemoryRouter><PerfilGestorPage /></MemoryRouter>);
    });

    expect(await screen.findByText('1')).toBeTruthy(); // solo la de septiembre
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

```bash
npx vitest run src/pages/gestor/PerfilGestorPage.test.tsx
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar la pantalla**

`frontend/src/pages/gestor/PerfilGestorPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { startOfMonth } from 'date-fns';
import { programacionService, type ProgramacionItem } from '../../services/programacion.service';
import { activityService } from '../../services/activity.service';
import { resumenDelMes } from '../../lib/desempenoGestor.lib';
import { tituloMes } from '../../lib/calendar.lib';
import { mensajeDeError } from '../../utils/errorMessage';
import { Loading } from '../../components/Loading';
import type { Actividad } from '../../types';

const KPI = ({ etiqueta, valor }: { etiqueta: string; valor: string | number }) => (
  <div className="card">
    <p className="card-subtitle">{etiqueta}</p>
    <p className="text-2xl font-bold text-neutral-800">{valor}</p>
  </div>
);

// Indicadores de desempeño propios del gestor: lo que le toco cumplir este
// mes y como le fue. Vive aparte de "Mi cronograma" porque responde una
// pregunta distinta - no "que tengo que hacer" sino "como voy".
export const PerfilGestorPage = () => {
  const [programacion, setProgramacion] = useState<ProgramacionItem[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mes = startOfMonth(new Date());

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    Promise.all([programacionService.mias(), activityService.listMine({ limit: 500 })])
      .then(([listaProgramacion, respuestaActividades]) => {
        if (!vigente) return;
        setProgramacion(listaProgramacion);
        setActividades(respuestaActividades.data);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(mensajeDeError(err) ?? 'No se pudo cargar tu perfil');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  if (cargando) return <Loading />;

  const resumen = resumenDelMes(programacion, actividades, mes, new Date());

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Mi perfil</h1>
          <p className="page-subtitle">Tu desempeno en {tituloMes(mes)}</p>
        </div>
      </div>

      <main className="page-content space-y-6">
        {error ? (
          <div className="card empty-state" role="alert">
            <p className="empty-state-title text-red-700">No se pudo cargar tu perfil</p>
            <p className="empty-state-description">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI etiqueta="Programadas este mes" valor={resumen.programadasMes} />
              <KPI etiqueta="Cumplidas" valor={resumen.cumplidasMes} />
              <KPI etiqueta="Pendientes" valor={resumen.pendientesMes} />
              <KPI etiqueta="Actividades registradas" valor={resumen.actividadesRegistradasMes} />
            </div>

            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Cumplimiento del mes</h2>
                <p className="card-subtitle">
                  Cumplidas sobre lo que ya debia estar resuelto (cumplidas + vencidas)
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className={`h-full ${resumen.porcentajeCumplimiento >= 80 ? 'bg-success' : resumen.porcentajeCumplimiento >= 50 ? 'bg-amber-500' : 'bg-status-rechazada'}`}
                    style={{ width: `${resumen.porcentajeCumplimiento}%` }}
                  />
                </div>
                <span className="text-2xl font-bold text-neutral-800">{resumen.porcentajeCumplimiento}%</span>
              </div>
              {resumen.vencidasMes > 0 && (
                <p className="text-sm text-red-600 mt-3">
                  {resumen.vencidasMes} actividad{resumen.vencidasMes === 1 ? '' : 'es'} programada
                  {resumen.vencidasMes === 1 ? '' : 's'} paso{resumen.vencidasMes === 1 ? '' : 'aron'} de fecha sin registrarse.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};
```

- [ ] **Step 4: Agregar la ruta y el item de navegacion**

En `frontend/src/utils/permissions.ts`, agregar dentro de `ROUTE_ACCESS`:

```ts
  '/gestor/perfil': ['GESTOR_ESPACIO_PUBLICO'],
```

(inmediatamente después de la línea `'/gestor/cronograma': ['GESTOR_ESPACIO_PUBLICO'],`).

En `frontend/src/App.tsx`, agregar el import:

```tsx
import { PerfilGestorPage } from './pages/gestor/PerfilGestorPage';
```

y la ruta, después del bloque de `/gestor/cronograma`:

```tsx
        <Route
          path="/gestor/perfil"
          element={<RutaProtegida roles={ROUTE_ACCESS['/gestor/perfil']}><PerfilGestorPage /></RutaProtegida>}
        />
```

En `frontend/src/components/shell/navItems.ts`, agregar junto a `CRONOGRAMA_ITEM`:

```ts
const PERFIL_ITEM: NavItem = { key: 'perfil', label: 'Mi perfil', icon: 'user', to: '/gestor/perfil' };
```

y en el `case 'GESTOR_ESPACIO_PUBLICO':`, cambiar:

```ts
      return [GESTOR_ITEM, CRONOGRAMA_ITEM];
```

por:

```ts
      return [GESTOR_ITEM, CRONOGRAMA_ITEM, PERFIL_ITEM];
```

(`'user'` ya es un `NavIconName` válido — lo usa `ADMIN_ITEM` en el mismo archivo.)

- [ ] **Step 5: Correr el test de la pantalla y confirmar que pasa**

```bash
npx vitest run src/pages/gestor/PerfilGestorPage.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 6: Correr `navItems.test.ts`, `permissions.test.ts` y la suite completa**

```bash
npx vitest run src/components/shell/navItems.test.ts src/utils/permissions.test.ts
npx vitest run
```

Expected: PASS en todo — en particular el test que exige que `App.tsx` y `permissions.ts` no diverjan.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/gestor/PerfilGestorPage.tsx frontend/src/pages/gestor/PerfilGestorPage.test.tsx frontend/src/utils/permissions.ts frontend/src/App.tsx frontend/src/components/shell/navItems.ts
git commit -m "feat: pestana Mi perfil con indicadores de desempeno del gestor"
```

---

## Self-Review

**Spec coverage:**
- "calendario del mes, donde se puede ir entre meses... al entrar estariamos en el mes actual" → Task 3 y 4.
- "ver cada actividad asignada al gestor" → panel de detalle del día seleccionado en `CronogramaPage`.
- "nuevo tab debajo de mi cronograma... Mi perfil... graficos, zona para tareas pendientes... completadas" → Task 5 (sin gráficos de librería nueva, con KPIs y barra de cumplimiento, siguiendo la decisión transversal del roadmap).

**Placeholder scan:** sin TBD — cada task trae código completo.

**Type consistency:** `MonthCalendarProps` usa `ProgramacionItem[]` y `Date | null` de forma idéntica en Task 3 (definición), Task 4 (`CronogramaPage`) y quedará igual en el plan de validador/admin que reutiliza este mismo componente.

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-09-04-cronograma-perfil-gestor.md`. Dos opciones de ejecución:

1. **Subagent-Driven (recomendado)** — un subagente fresco por tarea, revisión entre tareas.
2. **Inline** — ejecución en esta sesión, por lotes, con checkpoints.
