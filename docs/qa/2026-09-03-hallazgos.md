# Control de calidad — bitacora de hallazgos

Plan 4 (`gov-espacio-publico/docs/superpowers/plans/2026-08-29-espacio-publico-plan-4-control-de-calidad.md`).
Abierta el 2026-09-03. Se llena durante todo el plan.

Cada entrada dice **que se hizo**, **que se esperaba** y **que paso**. Sin las tres no es
reproducible y no cuenta como hallazgo.

**Severidad:**
- `BLOQUEANTE` — impide migrar. El plan no se aprueba con uno abierto.
- `IMPORTANTE` — se arregla antes del corte.
- `MENOR` — pasa a `DEUDA-TECNICA.md`.

**Origen:** `lectura` (se vio en el codigo, todavia no se ejecuto), `automatico`
(`npm run qa:verificar`), `navegador` (circuito recorrido a mano), `funcionario`
(prueba con gente del area).

---

## Punto de partida

Inventario de la base del modulo antes de sembrar (`npm run qa:inventario`):

| Que | Cuanto |
|---|---|
| Actividades en total | 28 |
| Por estado | BORRADOR 6, ENVIADA 8, RECHAZADA 6, PUBLICADA 8 |
| Por gestor | 1fe2ff87-fa9f-404c-a0fa-b95d51f81ea0: 14 (2026-09-01); 00000000-0000-0000-0000-000000000001: 14 (2026-08-28) |
| Items de programacion | 2 |
| Con marca [QA-PLAN4] | 0 — las 28 son de siembras/verificaciones manuales previas, ninguna trae la marca que borra seed-qa |

Se completa con la salida del comando y no se borra nada de lo que no sembro un script
hasta haberlo mirado.

---

## Hallazgo 1 — el listado publico ignora `limit` y `offset`

- **Severidad:** IMPORTANTE
- **Origen:** lectura (`src/publico/publico.controller.ts:9-15`)
- **Estado:** cerrado - 2026-09-11 - `parseFilters` del visor publico ahora parsea limit/offset con tope 100 y default 25; cifras sigue forzando limit undefined

**Que se hizo:** se leyo `parseFilters` del controlador publico y se comparo con el del
controlador autenticado (`src/actividades/actividades.controller.ts:36-49`).

**Que se esperaba:** que el endpoint publico acepte un tope de filas, o que imponga uno del
lado del servidor.

**Que paso:** el `parseFilters` del visor publico solo copia `desde`, `hasta` y `barrio`. No
mira `limit` ni `offset`, asi que `GET /publico/actividades` devuelve **todas** las
actividades publicadas en cada llamada, y `?limit=1` no cambia nada. `GET /publico/cifras`
ademas fuerza `limit: undefined` a proposito, que ahi si es correcto porque tiene que sumar
sobre todo.

Hoy no muerde porque hay pocas actividades publicadas. Muerde cuando entren los historicos
del hub en el Plan 5: la portada publica va a traer la tabla entera en cada visita.

**Confirmacion en ejecucion:** `npm run qa:verificar` lo mide y reporta cuantas filas
devuelve con `?limit=1`.

---

## Hallazgo 2 — aprobar con fotos elegidas BORRA las que no se eligieron

- **Severidad:** por decidir con el usuario (candidato a IMPORTANTE)
- **Origen:** lectura (`src/actividades/actividades.repository.typeorm.ts:210-229`)
- **Estado:** cerrado - 2026-09-11 - se separo `publishedPhotos` de `photos`; approve() ya no pisa el set completo

**Que se hizo:** se leyo `approve` en el repositorio de TypeORM, que es quien persiste la
eleccion de fotos del validador.

**Que se esperaba:** que la eleccion del validador decida **que se publica**, y que las fotos
no elegidas sigan existiendo en la actividad como evidencia interna del operativo.

**Que paso:** `if (Array.isArray(selectedPhotos)) entity.photos = selectedPhotos;` — reemplaza
el arreglo completo. Las fotos que el validador no eligio se pierden de la fila: no quedan
ocultas, quedan borradas. El archivo sigue en R2, pero ya nada en la base lo referencia.

El circuito 4 del plan pide verificar que las fotos no elegidas **no aparezcan en el visor
publico**, y eso se cumple. Lo que hay que decidir es si tambien se querian perder para el
gestor, el detalle y el informe. Si la respuesta es no, hace falta separar "las fotos del
operativo" de "las fotos publicadas", que es un campo nuevo.

---

## Hallazgos del recorrido

_Se agregan aca, en orden, a medida que aparecen._

---

## Chequeos en verde

Un chequeo que paso tambien se anota: es lo que dice que se probo y no que se olvido.

| Chequeo | Origen | Resultado |
|---|---|---|
| _pendiente_ | | |
