# Espacio Publico — backend

Backend independiente (NestJS 11 + TypeORM + PostgreSQL) del modulo de
Espacio Publico (operativos 1801) de la Alcaldia Local de Santa Fe. Extraido
del hub `gov-espacio-publico`: guarda sus propias actividades en su propia
base de datos, con roles y flujo de validacion propios de esta area.

## Que hace este modulo

- Registro de operativos de recuperacion de espacio publico (1801): un
  gestor crea la actividad en `BORRADOR`, la envia a validacion (`ENVIADA`),
  un validador la aprueba (queda `PUBLICADA` y visible en el visor publico)
  o la rechaza (`RECHAZADA`, vuelve al gestor para corregir y reenviar).
- Catalogos de barrios y entidades de la Localidad Santa Fe.
- Subida de fotos y actas de operativo a Cloudflare R2 (mismo bucket que el
  hub y que el modulo ambiental).
- Reporte en XLSX de las actividades para el validador y el admin.
- Visor publico sin autenticacion: solo expone actividades `PUBLICADA`, con
  una lista de campos permitidos (`src/publico/public-fields.ts`) — nunca el
  JSONB crudo de respuestas del formulario.

## Sin login propio — la sesion llega del hub

**Este modulo no tiene pantalla de login ni tabla de usuarios propia, y no la
va a tener.** La identidad y los roles viven en el hub (`gov-espacio-publico`
en produccion). El flujo real es:

1. El usuario inicia sesion en el hub.
2. El hub hace un POST a `/api/handoff` de este backend con el JWT en el
   body de un form auto-submit.
3. `HandoffController` verifica la firma y expiracion del token contra
   `JWT_SECRET` (sin llamar de vuelta al hub) y redirige con **302** al
   frontend de este modulo, con el token en el fragmento de la URL
   (`/handoff#token=...`), que nunca llega al servidor.
4. Si el token falta o es invalido, tambien redirige con 302, a
   `/handoff?error=missing_token` o `/handoff?error=invalid_token`.

`/api/handoff` **nunca devuelve JSON de error** — solo lo consume una
navegacion de pagina completa, y un 400/401 crudo se veria como una pagina
rota a mitad de la redireccion. La causa real de cualquier fallo queda en el
log del servidor, nunca el token.

> ⚠️ **`JWT_SECRET` tiene que ser exactamente el mismo valor que usa el hub
> en produccion.** Si no coincide, el handoff no valida ningun token y nadie
> puede entrar al modulo, sin ningun error visible mas alla de la redireccion
> a `?error=invalid_token`.

El proxy de usuarios (`/api/users/*`) tampoco tiene tabla propia: reenvia la
peticion al hub (`HUB_API_URL`) con el mismo token del usuario que llamo,
server-to-server. Se usa para listar gestores y para resolver el nombre de
quien creo o valido una actividad.

## Levantar en local

Requiere Node 20+ y Docker (para Postgres local) o acceso a una base
PostgreSQL propia.

```bash
docker compose up -d          # levanta Postgres en localhost:5433
cp .env.example .env          # los valores por defecto ya apuntan a ese Postgres local
npm install
npm run migration:run         # aplica las migraciones de TypeORM
npm run seed                  # datos ficticios de desarrollo (ver abajo)
npm run start:dev
```

`.env.example` ya trae `DB_PORT=5433` a proposito: es el puerto que
`docker-compose.yml` mapea al host (el `5432` de adentro del contenedor no es
accesible directo). Con Docker levantado, `cp .env.example .env` alcanza sin
editar nada — solo hace falta tocar `JWT_SECRET` o `HUB_API_URL` si vas a
probar el handoff o el proxy de usuarios contra un hub real.

El servidor queda escuchando en `http://localhost:3002/api` (o el `PORT`
configurado). `GET /api/health` responde `{ "status": "ok" }` cuando esta
arriba y conectado a la base.

### Trabajar sin el hub — tokens de prueba

Como no hay login propio, para probar el backend sin levantar el hub entero
se usa `scripts/mint-test-token.ts`, que firma un JWT valido con las
identidades fijas de `src/config/test-identities.ts`:

```bash
npm run token:test GESTOR_ESPACIO_PUBLICO
npm run token:test VALIDADOR_ESPACIO_PUBLICO
npm run token:test ADMIN
```

Cada comando imprime un JWT firmado con el `JWT_SECRET` local, listo para usar
como `Authorization: Bearer <token>`. Los mismos `id` de esas identidades son
los que usa `npm run seed` como `createdByUserId`, asi que el token de
`GESTOR_ESPACIO_PUBLICO` ve exactamente lo sembrado en `/api/actividades/mine`.

### `npm run seed`

Genera entre 12 y 15 actividades ficticias repartidas en los cuatro estados
(`BORRADOR`, `ENVIADA`, `RECHAZADA`, `PUBLICADA`), todas creadas por el
gestor de prueba. **Datos enteramente inventados**: coordenadas dentro de la
Localidad Santa Fe, barrios tomados del catalogo (`BARRIOS`), y textos de
resultados genericos sin nombres de personas ni cedulas. Nunca es, ni debe
convertirse en, un export de datos reales.

El seed es idempotente: antes de insertar borra solo las filas que el propio
seed crea (`createdByUserId` = gestor de prueba), nunca toca datos ajenos ni
trunca la tabla.

### Control de calidad — `seed:qa`, `qa:inventario`, `qa:verificar`

Tres scripts para el control de calidad previo a la migracion. No sustituyen el
recorrido en el navegador (`docs/qa/guion-circuitos.md`): cubren solo lo que se
puede verificar sin pantalla.

```bash
npm run qa:inventario          # solo lee: cuenta que hay en la base, por estado y por gestor
npm run seed:qa                # siembra el terreno de prueba (destructivo y estrecho)
npm run qa:verificar           # aislamiento, fuga de datos, listado sin limite, zona horaria
```

`seed:qa` siembra **pocas filas elegidas**, no volumen: cada una existe para que
un chequeo concreto pueda fallar (dos gestores distintos, una actividad a las
23:40 hora Bogota, una con coordenada fuera del poligono, una publicada sin
fotos). Todo el texto libre lleva nombres, cedulas y correos **inventados** con
el prefijo `ZZTEST`, que son la carnada que `qa:verificar` busca con `grep`
sobre la respuesta cruda de los endpoints publicos.

Pasa por la misma guarda que `seed`: contra una base que no sea local aborta sin
`--force`. El borrado es estrecho — solo las filas que el propio script escribe
(las que llevan la marca `[QA-PLAN4]`) y todo lo del gestor B de prueba. **No
toca lo que sembro `seed.ts`** aunque comparta el `createdByUserId`.

`qa:verificar` apunta al backend local por defecto; con `QA_API_URL` se corre
contra el desplegado. Firma sus propios tokens con `JWT_SECRET`, igual que
`token:test`. Sale con codigo distinto de cero si encuentra un hallazgo
bloqueante.

## Correr los tests

```bash
npm test
```

> ⚠️ **En Windows, en algunas maquinas `npm test` puede quedarse sin memoria**
> por el numero de workers que Jest levanta por defecto. Este repo ya fija
> `maxWorkers: 2` en la config de Jest (`package.json`) para evitarlo. Si aun
> asi da problemas en tu maquina, corre `npx jest --runInBand` como
> alternativa (un solo proceso, mas lento pero sin margen para el error).

18 suites / 111 tests, sin base de datos real: los repositorios se prueban
con mocks o con un repositorio en memoria.

## Variables de entorno

| Variable | Obligatoria | Proposito |
|---|---|---|
| `NODE_ENV` | No | `production` activa comportamientos de produccion (helmet, logs) |
| `PORT` | No (default `3002`) | Puerto del servidor |
| `CORS_ORIGIN` | No (default `http://localhost:5175`) | Origenes permitidos, separados por coma. Nunca `*` en produccion |
| `FRONTEND_URL` | No (default `http://localhost:5175`) | Destino del redirect del handoff y del enlace publico en el XLSX |
| `JWT_SECRET` | **Si** | Clave de firma/verificacion de los JWT. **Debe coincidir con el `JWT_SECRET` del hub en produccion**, o el handoff no valida ningun token |
| `HUB_API_URL` | No (tiene default) | Backend del hub, usado por el proxy de usuarios |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | **Si** | Conexion a PostgreSQL |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | No | Cloudflare R2 para fotos y actas. Opcional en local |

`.env.example` trae la plantilla completa. El `.env` real nunca se commitea
(esta en `.gitignore`).

`.env.migration.example` es la plantilla para la Fase B (`npm run
migrate:legacy`, migracion de historicos desde la base del hub). Solo
placeholders; el `.env.migration` real tampoco se commitea.

## Endpoints

Todas las rutas van bajo el prefijo `/api`.

### Publicos (sin autenticacion)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/health` | Estado del servicio |
| `POST` | `/handoff` | Recibe el JWT del hub, valida y redirige (302) al frontend |
| `GET` | `/publico/actividades` | Actividades `PUBLICADA`, con cifras saneadas |
| `GET` | `/publico/actividades/:id` | Detalle publico de una actividad publicada |
| `GET` | `/publico/cifras` | Cifras agregadas del operativo |

### Autenticados (JWT del hub)

| Metodo | Ruta | Roles | Descripcion |
|---|---|---|---|
| `POST` | `/actividades` | Gestor | Crear actividad (`BORRADOR`) |
| `GET` | `/actividades/mine` | Gestor | Actividades propias |
| `GET` | `/actividades/mine/stats` | Gestor | Estadisticas propias |
| `GET` | `/actividades/pending` | Validador, Admin | Pendientes de validacion |
| `GET` | `/actividades/my-validations` | Validador, Admin | Validadas por el usuario actual |
| `GET` | `/actividades/all-ids` | Gestor, Validador, Admin | Ids segun filtros |
| `GET` | `/actividades/stats/gestores` | Admin | Estadisticas por gestor |
| `GET` | `/actividades/stats/barrios` | Admin | Estadisticas por barrio |
| `GET` | `/actividades` | Validador, Admin | Todas las actividades |
| `GET` | `/actividades/report-xlsx` | Validador, Admin | Reporte en XLSX |
| `GET` | `/actividades/:id` | Gestor, Validador, Admin | Detalle |
| `PATCH` | `/actividades/:id` | Gestor, Validador, Admin | Editar |
| `POST` | `/actividades/:id/send` | Gestor, Admin | Enviar a validacion |
| `POST` | `/actividades/:id/approve` | Validador, Admin | Aprobar (publica) |
| `POST` | `/actividades/:id/reject` | Validador, Admin | Rechazar |
| `DELETE` | `/actividades/:id` | Admin | Borrar |
| `POST` | `/actividades/bulk-delete` | Admin | Borrado masivo |
| `GET` | `/catalogos/barrios` | Cualquier usuario autenticado | Barrios de la Localidad Santa Fe |
| `GET` | `/catalogos/entidades` | Cualquier usuario autenticado | Entidades acompanantes |
| `GET` | `/catalogos/all` | Cualquier usuario autenticado | Ambos catalogos |
| `POST` | `/files/upload` | Gestor, Validador, Admin | Sube una foto a R2 |
| `POST` | `/files/upload-acta` | Gestor, Validador, Admin | Sube un acta PDF a R2 |
| `GET` | `/users/gestores/list` | Cualquier usuario autenticado | Proxy al hub: lista de gestores |
| `GET` | `/users/:id` | Cualquier usuario autenticado | Proxy al hub: datos de un usuario |

"Gestor" y "Validador" en la tabla se refieren siempre a los roles propios de
esta area: `GESTOR_ESPACIO_PUBLICO` y `VALIDADOR_ESPACIO_PUBLICO`. Este modulo
no conoce ni usa roles de IVC, PYBA, Ambiental ni Deportes.
