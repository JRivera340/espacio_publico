# Espacio Publico — contexto para retomar

## Que es esto

Extraccion del modulo **Espacio Publico** del monolito `gov-espacio-publico`
(`bogotaneidapp.com`) a un repo independiente, siguiendo el patron que ya se uso con
`gov_ambiental`. **Migrar lo que ya existe, no inventar nada nuevo.**

## Estado: funcionando y desplegado

| Que | URL |
|---|---|
| Frontend del modulo | https://espaciopublico-frontend-production.up.railway.app |
| Backend del modulo | https://espaciopublico-backend-production.up.railway.app |
| Hub (produccion, con gente usandolo) | https://bogotaneidapp.com |

- Repo modulo: `github.com/JRivera340/espacio_publico`, rama `main`. Backend en la raiz
  (NestJS), frontend en `frontend/` (React+Vite).
- Repo hub: `github.com/JRivera340/gov-espacio-publico`. **Es produccion.**
- Railway: proyecto `gov-espacio-publico` (`0abe7458-ac1f-47ee-950b-804109751d75`),
  servicios `espaciopublico-backend`, `espaciopublico-frontend`, `frontend` (el hub),
  `Postgres-Ji0K` (base del modulo).
- Tests: **236 frontend** (vitest), **156 backend** (jest). Todos en verde.

## Pantallas listas

Gestor: panel, registro de actividad, correccion de rechazadas, detalle, **Mi cronograma**.
Validador: pendientes/validadas, **validar** (aprobar o rechazar, eligiendo que fotos se
publican), **Programacion**.
Admin: indicadores (ritmo, por barrio, puntos con intervencion repetida) + descarga XLSX.
Publico: `/publico`, `/publico/mapa`, `/publico/jornada/:id`.

**Programacion** es lo unico nuevo que se agrego a pedido: el validador carga lo que los
gestores tienen que hacer (planeacion), y el gestor lo ve en su cronograma. Tabla propia
`programacion_items`, NO es una actividad.

## Como se entra (importante)

El modulo **no tiene usuarios propios ni login propio, y no debe tenerlos.** El hub es el
unico proveedor de identidad.

- **Hoy (temporal, para pruebas):** `/` es `IngresoPage`. El backend
  (`src/auth/ingreso.controller.ts`) reenvia las credenciales al hub via `HUB_API_URL` y
  devuelve el mismo token que el hub emite. Como el `JWT_SECRET` es compartido, los guardias
  del modulo lo aceptan. **Cuando la entrada por el hub este lista, esto se borra.**
- **Definitivo:** handoff. El hub hace POST del token a `/api/handoff` y el modulo redirige
  con el token en el fragmento de URL (`#token=`), que nunca llega a un servidor.
- En el hub ya existe la pestana **"Espacio Publico (nuevo)"** en Administracion, que abre
  este modulo en otra ventana. La pestana vieja sigue intacta y es la que usa la gente.

**Para probar hacen falta cuentas del hub** con rol `GESTOR_ESPACIO_PUBLICO` o
`VALIDADOR_ESPACIO_PUBLICO`. Se crean en `bogotaneidapp.com` → Administracion → Usuarios.
No hay usuario de prueba en produccion a proposito: el `admin@test.com` del repo esta
bloqueado por codigo cuando `NODE_ENV=production`.

## Reglas que no se pueden romper

1. **El hub es produccion.** Leerlo, si. Escribirlo, solo aditivo y verificado
   (`git diff --numstat` tiene que dar `N 0`). Pushear al hub despliega produccion.
2. **Acta y entidad responsable son obligatorias SIEMPRE.** En el original decian "salvo en
   puntos de acumulacion", que es de otra area. Al podar esa rama es facil borrar la regla
   junto con el condicional. Ya paso.
3. **`dynamicAnswers` se indexa por el NOMBRE TECNICO de la pregunta (`q.name`), nunca por su
   `id`.** El id es un uuid del microservicio de encuestas; la lista de permitidos del visor
   publico (`src/publico/public-fields.ts`) busca por nombre. Indexar por id publica cero
   cifras, en silencio. Hay test de regresion atado a esa lista.
4. **PATCH en TypeORM:** `findOneOrFail` → castear fechas con `new Date()` → `Object.assign`
   → `save()`. Nunca `repo.update(id, dto)`.
5. **Un fallo nunca puede verse como un estado vacio ni como un exito.** Usar
   `utils/errorMessage.ts` (`mensajeDeError`), que devuelve `null` en 401 porque ahi el
   interceptor ya redirige.
6. **Aislamiento entre gestores:** un gestor solo ve lo suyo. El backend filtra por el id del
   token, nunca por un parametro.
7. **Nada de datos personales en lo publico.** `public-fields.ts` es lista de permitidos y
   solo deja pasar numeros y booleanos.
8. `App.tsx` y `utils/permissions.ts` son espejos; hay un test que falla si divergen.
9. Comentarios en espanol **sin tildes**. Sin menciones a IA. Commits de una linea.
10. Windows + PowerShell: encadenar con `;`, nunca con `&&`.

## Metodo que funciono

- **Prueba de mutacion obligatoria:** despues de escribir un test, romper a proposito la linea
  que deberia cubrir y confirmar que se pone rojo. En este proyecto apareceron **seis** tests
  verdes que no probaban nada; asi se atrapan.
- **Nunca `git checkout <archivo>` para revertir una mutacion**: se lleva por delante el
  trabajo sin commitear. Copiar el archivo antes y restaurar desde la copia. Ya paso dos veces.
- No leer completos archivos de mas de ~400 lineas: ubicar con `grep -n`, leer el rango con
  `sed -n`.

## Que falta

1. **Control de calidad** con funcionarios reales — `docs/superpowers/plans/` del hub,
   plan 4. Es el que decide si se migra.
2. **Migracion de datos** — plan 5. Respaldo verificado por restauracion ANTES de tocar nada.
   Dos decisiones pendientes: si `shift` e `isNightShift` se unifican, y cual zona horaria
   manda en los filtros por fecha.
3. **Corte** — plan 6. Primer cambio no aditivo del proyecto.
4. Deuda anotada en `DEUDA-TECNICA.md`.

## Defectos del hub encontrados de paso (NO tocados, es produccion)

- **Zona horaria:** al editar una actividad, el hub prellena la fecha con
  `toISOString().slice(0,16)`, lo que corre la hora 5 h en Bogota. Todo lo editado alla queda
  con la hora mal. En el modulo nuevo esta corregido.
- **Cifras publicas:** el hub indexa `dynamicAnswers` por `q.id` pero su visor publico busca
  por nombre tecnico. Las cifras que hoy se ven vienen de datos sembrados; las actividades
  reales probablemente se publican sin una sola cifra y nadie lo noto.
