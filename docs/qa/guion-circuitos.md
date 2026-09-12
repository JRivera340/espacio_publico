# Guion de los siete circuitos

Task 2 del Plan 4. **Se recorren en el navegador, enteros, como lo haria la persona.** No se
sustituyen por llamadas al API: lo que se esta probando incluye la pantalla. Los chequeos que
si se pueden hacer sin navegador estan en `npm run qa:verificar` y son la Task 3.

Los hallazgos van a `2026-09-03-hallazgos.md`, con las tres lineas: que se hizo, que se
esperaba, que paso.

## Antes de empezar

1. `npm run qa:inventario` — anotar el punto de partida en la bitacora.
2. `npm run seed:qa -- --force` — siembra el terreno. Imprime los ids de cada caso y los
   ids de los dos gestores: **guardar esa salida**, es lo que permite volver sobre una fila
   concreta cuando algo falle.
3. Tener a mano las dos cuentas del hub (`GESTOR_ESPACIO_PUBLICO` y
   `VALIDADOR_ESPACIO_PUBLICO`). El gestor B no inicia sesion nunca: existe solo para que el
   gestor A intente ver lo que no es suyo.

**Todo lo sembrado lleva nombres, cedulas y correos inventados con el prefijo `ZZTEST`.** Si
alguno de esos aparece en una pantalla publica, es un hallazgo bloqueante.

---

## Circuito 1 — el gestor registra

Entrar **desde el hub** (no por la url del modulo), registrar un operativo con fotos y acta,
enviarlo a validacion, y confirmar que quedo como enviado.

Verificar ademas:
- [ ] El barrio se detecto solo por las coordenadas y **no se puede editar a mano**.
- [ ] El formulario se recorre entero en pantalla chica y **se llega al boton de guardar**.
- [ ] El acta y la entidad responsable se exigen **siempre**. Intentar guardar sin acta tiene
      que fallar con un mensaje claro, no dejar pasar. (Esta regla ya se perdio una vez al
      podar la rama de puntos de acumulacion.)

---

## Circuito 2 — el validador rechaza

Verlo en sus pendientes y rechazarlo con una nota escrita a mano, larga, con varias frases.

- [ ] Aparece en pendientes sin recargar a mano.
- [ ] Se puede escribir una nota de mas de una linea.

---

## Circuito 3 — el gestor corrige

- [ ] El gestor ve el rechazo **con la nota completa** que escribio el validador. Que llegue
      entera importa: es lo unico que le dice que arreglar.
- [ ] Corrige y reenvia. Vuelve a estado enviado.
- [ ] Se puede **guardar una correccion sin reenviarla** todavia.

---

## Circuito 4 — el validador aprueba

Aprobar **eligiendo que fotos se publican**: dejar al menos una afuera.

- [ ] Las fotos que NO eligio no aparecen en el visor publico.
- [ ] **Ojo con el hallazgo 2 de la bitacora:** aprobar reemplaza el arreglo de fotos, asi que
      las no elegidas se pierden tambien del detalle y del informe. Confirmar en pantalla si
      eso es lo que se quiere.

---

## Circuito 5 — aparece en el visor publico

- [ ] La actividad aparece en `/publico`, en el mapa y en la vista de jornada.
- [ ] **Ninguno de sus datos internos.** Esta verificacion se hace sobre la respuesta cruda
      del API, no sobre la pantalla: la corre `npm run qa:verificar`. Lo que no se ve en la
      interfaz igual viaja en el JSON.
- [ ] Las cifras del operativo se ven con numeros, no vacias. Si salen en cero, revisar que
      `dynamicAnswers` este indexado por el **nombre tecnico** de la pregunta y no por su
      uuid: ese es el defecto que el hub tiene hoy y publica cero cifras en silencio.
- [ ] La actividad sembrada con coordenada **fuera del poligono** de la localidad: ver donde
      la pone el mapa y decidir si eso es aceptable.

---

## Circuito 6 — el informe en Excel

El validador lo descarga y **lo abre**.

- [ ] Las cifras coinciden con lo registrado y con lo que muestra la pantalla.
- [ ] El enlace publico del archivo apunta al frontend del modulo, no a un dominio ajeno.
- [ ] Filtrar por el dia `2026-09-01` y por `2026-09-02`: la actividad de las 23:40 tiene que
      caer del mismo lado que en el panel y en el visor. `npm run qa:verificar` lo mide sobre
      la consulta que arma el Excel; en el archivo hay que confirmarlo a ojo.

---

## Circuito 7 — el administrador

Entrar por su pestana **"Espacio Publico (nuevo)"** y ver los indicadores.

- [ ] Ritmo, por barrio y puntos con intervencion repetida muestran datos.
- [ ] **La pestana vieja sigue existiendo y sigue mostrando el modulo del hub.** Es la que usa
      la gente hoy; si se rompio, es bloqueante y del lado del hub, que es produccion.

---

## Lo que queda para la Task 4 (funcionarios reales)

No se salta y no lo puede hacer quien construyo el modulo:

- Cuentas de prueba con los roles reales, sobre datos ficticios, y que **nadie pueda creer que
  esta trabajando en el sistema de verdad**.
- Se los deja trabajar y se observa donde dudan. **Una pantalla que necesita explicacion es un
  hallazgo, aunque funcione.**
- Se anota todo, incluidas las quejas de forma. Si dicen que es mas lento que el viejo, se
  anota y se mide.
