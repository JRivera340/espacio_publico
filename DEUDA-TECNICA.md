# Deuda tecnica — modulo Espacio Publico

Inventario de problemas conocidos que no corresponde arreglar en el momento en que se
encontraron. No es un plan de trabajo: nada se arregla solo por estar escrito aca.

Cada entrada dice que es, donde esta, que impacto tiene y cuanto costaria.

---

## Abierta — `detectarBarrio` mezcla tres motivos distintos en un solo mensaje

**Donde:** `frontend/src/utils/boundaryValidation.ts` y `frontend/src/pages/gestor/CreateActivity.tsx`

Devuelve `null` por tres caminos que no significan lo mismo: la coordenada esta en otra
localidad, esta fuera de Santa Fe, o esta dentro pero no cae en ningun poligono de barrio. La
pantalla los colapsa en un solo texto.

**Impacto:** un punto legitimo que caiga en un hueco del mapa de barrios se rechaza diciendo
"esta fuera de la localidad", y como ademas se descarta la coordenada, el gestor **no tiene
forma de registrar ese operativo**. El mensaje ademas lo manda a buscar el error donde no esta.

**Esfuerzo:** bajo. Que `detectarBarrio` devuelva el motivo y que la pantalla distinga al menos
el tercer caso.

---

## Abierta — el acta no queda espejada en `dynamicAnswers`

**Donde:** `frontend/src/pages/gestor/lib/activityForm.ts`

Los demas controles fijos (fecha, ubicacion, barrio, fotos, descripcion, entidades) se guardan
tambien dentro de `dynamicAnswers` bajo su nombre tecnico, "para que el detalle y la
exportacion las encuentren donde esperan". El acta es la unica excepcion: viaja solo en
`actaPdfUrl`.

**Impacto:** si el detalle o el informe reconstruyen el formulario desde `dynamicAnswers`, la
casilla del acta va a aparecer vacia aunque el PDF exista.

**Esfuerzo:** bajo. O se agrega al espejo, o se documenta por que es la excepcion. Conviene
resolverlo al construir el detalle de actividad, que es quien lo va a sufrir.

---

## Abierta — divergencia de estetica entre el plan y el sistema de estilos

**Donde:** `frontend/src/index.css`, `frontend/tailwind.config.js`

Los planes piden glassmorphism (`bg-white/95 backdrop-blur-md`), `rounded-2xl` y naranja
`#F97316`. El sistema de estilos que quedo del Plan 2A define `primary: #ff1f3d` y una `.card`
plana de 16px sin `backdrop-blur`; `#F97316` no aparece en ningun lado del repo.

**Impacto:** ninguno funcional. Pero el modulo nuevo no se va a ver igual que el viejo, y eso
se nota el dia que conviven.

**Esfuerzo:** medio si se decide alinear. **Es una decision del usuario**, no algo que se
arregle por inercia.

---

## Heredada del hub — el mismo defecto de claves por identificador

**Donde:** `packages/frontend/src/pages/gestor/CreateActivity.tsx` del hub (NO de este repo)

El hub indexa las respuestas del formulario dinamico por `q.id` (uuid), mientras su
`public-fields.ts` busca por nombre tecnico. Las cifras que hoy se ven en su visor publico
tienen claves por nombre, o sea que **vienen de datos sembrados, no de actividades registradas
por el formulario**.

**Impacto:** las actividades reales del hub probablemente se publican sin una sola cifra, y
nadie lo noto porque no falla nada: el saneamiento devuelve null en silencio.

**Esfuerzo:** bajo, pero **es produccion y no es este repo**. Se anota para avisarle al usuario,
no para arreglarlo desde aca. En el modulo nuevo ya esta corregido y con test de regresion.
