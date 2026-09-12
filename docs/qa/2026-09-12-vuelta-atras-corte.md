# Vuelta atras del corte (Plan 6)

Escrita ANTES de cortar, como exige el plan. El corte todavia no paso — esto
queda listo para cuando el usuario decida ejecutarlo, y sirve para revertirlo
si algo sale mal.

## Que hay que revertir, y en que orden

El corte es un solo commit en el repo del hub (`gov-espacio-publico`),
titulado `refactor: elimina del hub las pantallas y rutas de espacio publico`
(Plan 6, Task 2). Revertirlo es un solo `git revert <hash>` de ese commit —
no hay commits intermedios que desenredar porque el plan exige que todo el
corte vaya junto.

Antes del corte, ya estan en produccion (aditivos, no se revierten con esto):
- `1c6d2eed` — puerta de entrada `/espacio-publico` en el hub
- `4f2ed325` — pestana "Espacio Publico (nuevo)" en Administracion

Esos dos se quedan aunque se revierta el corte — son aditivos, no rompen
nada de lo que ya funcionaba antes de ellos.

## Variables de entorno a restaurar

Ninguna se borra en el corte — `ALL_ROLE_DASHBOARDS` es codigo, no
configuracion. Las unicas variables tocadas en todo este proyecto son:

| Variable | Servicio | Valor actual (2026-09-11) |
|---|---|---|
| `VITE_ESPACIO_PUBLICO_API_URL` | hub, servicio `frontend` | `https://espaciopublico-backend-production.up.railway.app` (temporal, hasta que el dominio propio del backend deje de dar 502) |
| `VITE_ESPACIO_PUBLICO_URL` | hub, servicio `frontend` | `https://espaciopublico-frontend-production.up.railway.app` |
| `CORS_ORIGIN` | `espaciopublico-backend` | incluye `espaciopublico.bogotaneidapp.com`, `bogotaneidapp.com`, y el dominio `*.up.railway.app` del frontend |

Revertir el corte no requiere tocar estas — siguen siendo correctas para la
puerta de entrada, que sigue viva.

## Donde queda el respaldo del Plan 5, y como se restaura

**Pendiente** — el respaldo (`pg_dump` de la base del hub, verificado por
restauracion, guardado fuera de Railway) todavia no se hizo. Este documento
se actualiza con la ubicacion exacta y el procedimiento de restauracion en
cuanto el Plan 5 lo genere. No cortar sin esa fila llena.

## Cuanto tarda, medido

**Pendiente de medir en el momento del corte real.** Como referencia de esta
sesion: el deploy del backend tarda 1-2 min, el del frontend 2-4 min, la
verificacion de dominios custom puede tardar hasta 10-15 min si hay que
recrearlos. Un revert de un solo commit + push es inmediato del lado de git;
lo que tarda es el redeploy que dispara.

## Que NO se revierte nunca

- Los datos ya migrados en la base del modulo nuevo (Plan 5) — revertir el
  corte solo cambia a donde aterrizan los usuarios, no borra lo migrado.
- El catalogo de areas y los valores de enum del hub, que conservan Espacio
  Publico para que las filas historicas sigan legibles ahi — el corte nunca
  los toca, revertirlo tampoco.
- `pages/gestor/` y `pages/validador/` del hub (nucleo compartido con IVC y
  PYBA) — el corte nunca los borra, solo los envoltorios de seis lineas del
  area.

## Estado previo (para comparar tras revertir)

Anotado el 2026-09-11, antes de cualquier corte:
- `ALL_ROLE_DASHBOARDS` en el hub: gestores/validadores de Espacio Publico
  aterrizan en `/gestor-espacio-publico/dashboard` y
  `/validador-espacio-publico/dashboard` (pantallas legacy del hub).
- Commit del hub en `main`: `1c6d2eed` (puerta de entrada + pestana nueva).
- Servicios Railway activos: `espaciopublico-backend`, `espaciopublico-frontend`,
  `frontend` (el hub), `Postgres-Ji0K` (base del modulo).
