# Roadmap: mejoras de UX, desempeño y diseño institucional

> Este documento es el índice. Cada fase tiene su propio plan ejecutable en
> este mismo directorio, con el detalle de archivos, interfaces y pasos
> TDD. Ejecutar en el orden listado: cada fase depende de la anterior.

## Por qué se dividió en varios planes

El pedido cruza subsistemas independientes (identidad visual, formulario de
registro, cronograma de gestor, vista de validador, informes de admin). Cada
uno produce software probado y usable por sí solo, así que van en planes
separados en vez de uno monolítico de miles de líneas.

## Fases

| # | Plan | Qué resuelve | Depende de |
|---|---|---|---|
| 0 | [2026-09-04-identidad-visual.md](2026-09-04-identidad-visual.md) | Logos reales del hub, header institucional, favicon | — |
| 1 | [2026-09-04-formulario-registro-gestor.md](2026-09-04-formulario-registro-gestor.md) | Reordenar el formulario de registro en secciones numeradas, reemplazar las listas de casillas de entidades/gestores por un combobox desplegable | — |
| 2 | [2026-09-04-cronograma-perfil-gestor.md](2026-09-04-cronograma-perfil-gestor.md) | Mi cronograma como calendario mensual navegable, nueva pestaña Mi perfil con indicadores de desempeño | 1 (reutiliza `MultiSelectCombobox` para nada, pero sí el patrón de tabs) |
| 3 | [2026-09-04-cronograma-validador-admin.md](2026-09-04-cronograma-validador-admin.md) | Pestaña "Cronograma del equipo" en Programación (validador) con filtro por gestor/mes e insights; misma vista en solo-lectura para Admin; informe de desempeño XLSX por periodo y por gestor | 2 (reutiliza el componente de calendario y la librería de insights) |

## Decisiones transversales (aplican a todas las fases)

- **Sin librería de gráficos nueva.** El proyecto no tiene `recharts` ni
  similar. Los indicadores de desempeño (fase 2 y 3) se resuelven con barras
  de progreso y KPIs en CSS/Tailwind, igual que `AdminDashboard.tsx` ya hace
  con "Por barrio". Si más adelante hace falta un gráfico real, se evalúa
  aparte — no se agrega una dependencia nueva dentro de este roadmap.
- **Sin `dayjs` ni `moment`.** Se usa `date-fns` (ya instalado) para todo
  cálculo de mes/semana.
- **Estilo de comentarios y nombres:** español sin tildes, siguiendo el
  resto del código. Commits de una línea.
- **Windows/PowerShell:** los comandos de los planes usan `;` para
  encadenar, nunca `&&`.
- **Ningún plan toca el hub (`gov-espacio-publico`).** Todo el trabajo vive
  en este repo (`espacio_publico`, backend en la raíz + `frontend/`).

## Cómo ejecutar

Cada plan trae su propio checklist. Opciones de ejecución (ver cada archivo
al final):

1. **Subagent-driven** (recomendado): un subagente fresco por tarea, con
   revisión entre tareas.
2. **Inline**: ejecución por lotes en la sesión actual con puntos de
   revisión.
