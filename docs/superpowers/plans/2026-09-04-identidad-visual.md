# Identidad visual institucional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el módulo use los logos e imágenes reales de la Alcaldía/Bogotaneidad (los mismos del hub) en vez del favicon roto y el placeholder de texto "EP", y que el `AppShell` se sienta como parte de la misma identidad que `bogotaneidapp.com`.

**Architecture:** Los assets no existen en este repo — se copian tal cual desde `gov-espacio-publico/packages/frontend/public/images/` (repo hermano, solo lectura) a `frontend/public/images/` de este repo. Se reemplaza el favicon roto en `index.html` y el badge de texto en `InstitutionalHeader.tsx` por un `<img>`. Sin librerías nuevas.

**Tech Stack:** React 18 + Vite, Tailwind (ya configurado con paleta institucional en `tailwind.config.js`).

**Spec:** Este mismo documento — no hay spec separada, el pedido es puntual: "el diseño de la pagina esta muy basico, tampoco tiene colores y no estan los logos ni las imagenes que estan en el HUB".

## Global Constraints

- Comentarios en español sin tildes. Commits de una línea. Sin menciones a IA.
- No modificar nada en `gov-espacio-publico` (es producción) — solo se lee de ahí para copiar assets estáticos.
- Windows/PowerShell: encadenar comandos con `;`, nunca `&&`.
- No agregar dependencias nuevas.

---

## Diagnóstico verificado

- `frontend/index.html:5` referencia `href="/images/bogotaneidad.jpeg"` como favicon, pero `frontend/public/images/` **no existe** — el ícono del navegador está roto ahora mismo.
- `frontend/src/components/shell/InstitutionalHeader.tsx:14-16` pinta un cuadrado naranja `bg-[#F97316]` con las letras "EP" en vez de un logo — es un placeholder que nunca se reemplazó.
- El hub (`gov-espacio-publico/packages/frontend/public/images/`) sí tiene los assets reales: `alcaldialocalsantafe-sinfondo.png` (logo con fondo transparente, sirve para el header), `favicon-256.png` (ícono cuadrado 256x256), `bogotaneidapp_sinfondo.png` y `og-bogotaneidapp.png`. También hay `gov-espacio-publico/packages/frontend/public/icons/EspacioPublico.png`, el ícono específico de este módulo dentro del hub.
- La paleta de color **ya existe** y es rica (`frontend/tailwind.config.js`: rojo institucional `#ff1f3d`, éxito, estados, neutros) — el problema no es falta de tokens de color, es que no se usan logos reales y el header se ve genérico.

## File Structure

- Create: `frontend/public/images/alcaldialocalsantafe-sinfondo.png` (copiado)
- Create: `frontend/public/images/favicon-256.png` (copiado)
- Create: `frontend/public/images/espacio-publico-icono.png` (copiado desde `icons/EspacioPublico.png` del hub, renombrado para que el nombre diga qué es)
- Modify: `frontend/index.html` — favicon
- Modify: `frontend/src/components/shell/InstitutionalHeader.tsx` — logo real en vez del badge "EP"
- Modify: `frontend/src/components/shell/InstitutionalHeader.test.tsx` (no existe hoy — se crea) o el test cubierto en `AppShell.test.tsx` si ya monta el header

---

### Task 1: Copiar assets del hub

**Files:**
- Create: `frontend/public/images/alcaldialocalsantafe-sinfondo.png`
- Create: `frontend/public/images/favicon-256.png`
- Create: `frontend/public/images/espacio-publico-icono.png`

**Interfaces:** Ninguna — son archivos estáticos servidos por Vite desde `public/`.

- [ ] **Step 1: Copiar los tres archivos**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe"
mkdir -p espacio_publico/frontend/public/images
cp "gov-espacio-publico/packages/frontend/public/images/alcaldialocalsantafe-sinfondo.png" \
   "espacio_publico/frontend/public/images/alcaldialocalsantafe-sinfondo.png"
cp "gov-espacio-publico/packages/frontend/public/images/favicon-256.png" \
   "espacio_publico/frontend/public/images/favicon-256.png"
cp "gov-espacio-publico/packages/frontend/public/icons/EspacioPublico.png" \
   "espacio_publico/frontend/public/images/espacio-publico-icono.png"
```

- [ ] **Step 2: Confirmar que gov-espacio-publico quedo intacto (es produccion)**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/gov-espacio-publico"
git status --porcelain
```

Expected: sin salida (ningún cambio — solo se leyó, nunca se escribió ahí).

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico"
git add frontend/public/images
git commit -m "assets: logos institucionales del hub"
```

---

### Task 2: Favicon real

**Files:**
- Modify: `frontend/index.html:5`

**Interfaces:** Ninguna.

- [ ] **Step 1: Reemplazar el link del favicon**

En `frontend/index.html`, cambiar:

```html
<link rel="icon" type="image/png" href="/images/bogotaneidad.jpeg" />
```

por:

```html
<link rel="icon" type="image/png" href="/images/favicon-256.png" />
```

- [ ] **Step 2: Verificar en dev**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico/frontend"
npm run dev
```

Abrir `http://localhost:5175` y confirmar en el inspector de red que `/images/favicon-256.png` responde 200 (antes era 404 porque `bogotaneidad.jpeg` no existía en este repo). Detener el servidor.

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "fix: favicon roto, apuntaba a un archivo que no existe en este repo"
```

---

### Task 3: Logo real en el header institucional

**Files:**
- Modify: `frontend/src/components/shell/InstitutionalHeader.tsx`
- Test: `frontend/src/components/shell/InstitutionalHeader.test.tsx` (nuevo)

**Interfaces:**
- Consumes: nada nuevo — el componente ya recibe `email: string` y `onCerrarSesion: () => void`.
- Produces: mismo export `InstitutionalHeader`, mismo contrato — no rompe a `AppShell.tsx` que lo monta.

- [ ] **Step 1: Escribir el test que falla**

`frontend/src/components/shell/InstitutionalHeader.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstitutionalHeader } from './InstitutionalHeader';

describe('InstitutionalHeader', () => {
  it('muestra el logo institucional en vez de un placeholder de texto', () => {
    render(<InstitutionalHeader email="gestor@ejemplo.com" onCerrarSesion={vi.fn()} />);
    const logo = screen.getByAltText('Alcaldia Local de Santa Fe');
    expect(logo.tagName).toBe('IMG');
    expect(logo).toHaveAttribute('src', '/images/alcaldialocalsantafe-sinfondo.png');
  });

  it('sigue mostrando el correo del usuario y el boton de salida', () => {
    render(<InstitutionalHeader email="gestor@ejemplo.com" onCerrarSesion={vi.fn()} />);
    expect(screen.getByText('gestor@ejemplo.com')).toBeInTheDocument();
    expect(screen.getByText('Cerrar sesion')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

```bash
cd "C:/Users/river/Desktop/Workspace Alcaldia de Santa Fe/espacio_publico/frontend"
npx vitest run src/components/shell/InstitutionalHeader.test.tsx
```

Expected: FAIL — `getByAltText('Alcaldia Local de Santa Fe')` no encuentra nada, porque hoy el header renderiza un `<div>` con texto "EP".

- [ ] **Step 3: Reemplazar el badge de texto por el logo**

En `frontend/src/components/shell/InstitutionalHeader.tsx`, cambiar:

```tsx
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-2xl bg-[#F97316] shrink-0 flex items-center justify-center text-white font-black text-sm">
        EP
      </div>
      <div className="min-w-0">
        <h1 className="text-base font-black text-neutral-900 tracking-tight truncate">Espacio Publico</h1>
        <p className="text-[11px] text-neutral-400 font-medium truncate">Alcaldia Local de Santa Fe</p>
      </div>
    </div>
```

por:

```tsx
    <div className="flex items-center gap-3 min-w-0">
      <img
        src="/images/alcaldialocalsantafe-sinfondo.png"
        alt="Alcaldia Local de Santa Fe"
        className="w-10 h-10 object-contain shrink-0"
      />
      <div className="min-w-0">
        <h1 className="text-base font-black text-neutral-900 tracking-tight truncate">Espacio Publico</h1>
        <p className="text-[11px] text-neutral-400 font-medium truncate">Alcaldia Local de Santa Fe</p>
      </div>
    </div>
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

```bash
npx vitest run src/components/shell/InstitutionalHeader.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Correr la suite completa de shell para descartar roturas**

```bash
npx vitest run src/components/shell
```

Expected: PASS — incluye `AppShell.test.tsx` y `SideNav.test.tsx`, que montan `InstitutionalHeader` indirectamente.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/shell/InstitutionalHeader.tsx frontend/src/components/shell/InstitutionalHeader.test.tsx
git commit -m "feat: logo institucional real en el header, reemplaza el placeholder EP"
```

---

## Self-Review

**Spec coverage:** "no estan los logos ni las imagenes que estan en el HUB" → Task 1 los trae, Task 2 arregla el favicon roto, Task 3 arregla el header. "no tiene colores" → verificado que la paleta ya existe en `tailwind.config.js`; no hay tarea de color porque no hay nada que corregir ahí (se deja anotado en el diagnóstico para que quien ejecute no lo repita).

**Placeholder scan:** sin TBD/TODO, cada step tiene comando o código real.

**Type consistency:** `InstitutionalHeader` mantiene su firma `{ email, onCerrarSesion }` — no rompe `AppShell.tsx:28`.

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-09-04-identidad-visual.md`. Dos opciones de ejecución:

1. **Subagent-Driven (recomendado)** — un subagente fresco por tarea, revisión entre tareas.
2. **Inline** — ejecución en esta sesión, por lotes, con checkpoints.
