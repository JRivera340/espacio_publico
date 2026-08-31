import { resolveActivityEnums } from '../../../config/areasCatalog';
import type { SurveyQuestion } from '../../../services/survey.service';
import type { CreateActividadDTO, OperativoSubtipo } from '../../../types';

// Logica pura del formulario de registro. Vive fuera del componente para poder
// probar las reglas sin montar un mapa ni una encuesta.

// Turno nocturno: 18:00 a 05:59.
export function esTurnoNocturno(dateTimeString: string): boolean {
  const hora = new Date(dateTimeString).getHours();
  return hora >= 18 || hora < 6;
}

export type VisibleIf = { name: string; value?: string; valueIn?: string[] };

// Evalua la condicion visibleIf de una pregunta. Si el valor del que depende
// todavia no existe NO se oculta, para no esconder campos por falta de dato.
export function campoVisible(
  visibleIf: VisibleIf | undefined,
  resolverPorNombre: (name: string) => unknown,
): boolean {
  if (!visibleIf) return true;
  const actual = resolverPorNombre(visibleIf.name);
  if (actual === undefined || actual === null || actual === '') return true;
  const valor = String(actual).toLowerCase();
  if (Array.isArray(visibleIf.valueIn)) {
    return visibleIf.valueIn.some((v) => String(v).toLowerCase() === valor);
  }
  if (visibleIf.value !== undefined) return valor === String(visibleIf.value).toLowerCase();
  return true;
}

// Nombres tecnicos que la pantalla captura con controles propios (fecha,
// ubicacion, barrio, fotos, acta, descripcion y entidades). No se delegan a la
// encuesta porque el acta y la entidad responsable son obligatorias siempre en
// esta area: si el formulario dinamico dejara de traerlas, no habria forma de
// cumplir la regla y el registro quedaria bloqueado sin explicacion.
export const NOMBRES_CAMPOS_FIJOS = [
  'fecha_operativo',
  'ubicacion_mapa',
  'barrio_detectado',
  'fotos_evidencia',
  'descripcion_general',
  'entidad_responsable',
  'entidades_acompanantes',
  'en_grupo',
];

// Identifica la pregunta del acta para sacarla del formulario dinamico: el acta
// tiene su propio control fijo y es obligatoria siempre.
//
// Se mira SOLO el nombre tecnico y la etiqueta. La version anterior tambien
// tomaba cualquier pregunta que aceptara PDF, y eso se lleva por delante a
// cualquier otro adjunto: la pregunta desaparece de la pantalla Y de la
// validacion de obligatorias, asi que un campo obligatorio dejaria de exigirse
// sin ninguna senal.
export function esPreguntaDeActa(q: SurveyQuestion): boolean {
  const nombre = (q.name || '').toLowerCase();
  const etiqueta = (q.label || '').toLowerCase();
  return nombre.includes('acta') || etiqueta.includes('acta');
}

// Preguntas que quedan para el formulario dinamico: las que no cubre ningun
// control fijo de la pantalla.
export function preguntasDinamicas(questions: SurveyQuestion[]): SurveyQuestion[] {
  return questions.filter(
    (q) => !NOMBRES_CAMPOS_FIJOS.includes(q.name || '') && !esPreguntaDeActa(q),
  );
}

export function preguntaPorNombre(
  questions: SurveyQuestion[],
  name: string,
): SurveyQuestion | undefined {
  return questions.find((q) => q.name === name);
}

export type FieldMeta = Record<
  string,
  { label: string; type: string; options?: Array<{ label: string; value: string }> }
>;

// Copia de la etiqueta, el tipo y las opciones de cada pregunta al momento de
// registrar. Sin esto, borrar una pregunta en el microservicio de encuestas
// dejaria las respuestas guardadas sin ningun texto que las explique.
export function buildFieldMeta(questions: SurveyQuestion[]): FieldMeta {
  return questions.reduce((acc: FieldMeta, q) => {
    acc[q.id] = {
      label: q.label || q.name || '',
      type: q.type,
      ...(q.options ? { options: q.options } : {}),
    };
    return acc;
  }, {});
}

function estaRespondida(q: SurveyQuestion, valor: any): boolean {
  if (valor === undefined || valor === null) return false;
  if (typeof valor === 'string') return valor.trim() !== '';
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === 'object') return Object.keys(valor).length > 0;
  return true; // numeros y booleanos validos
}

// Preguntas dinamicas marcadas como obligatorias en la encuesta, visibles con
// las respuestas actuales, y todavia sin responder.
export function faltantesObligatorias(
  questions: SurveyQuestion[],
  respuestas: Record<string, any>,
): SurveyQuestion[] {
  return preguntasDinamicas(questions).filter((q) => {
    if (!q.required) return false;
    if (String(q.type).toUpperCase() === 'SECTION_HEADER') return false;
    const visible = campoVisible(q.config?.visibleIf, (name) => {
      const objetivo = preguntaPorNombre(questions, name);
      return objetivo ? respuestas[objetivo.id] : undefined;
    });
    if (!visible) return false;
    return !estaRespondida(q, respuestas[q.id]);
  });
}

export interface EntradaFormularioActividad {
  /** Nombre de la subcategoria tal como la muestra el formulario. */
  subtipoDisplay: string;
  preguntas: SurveyQuestion[];
  /** Respuestas del formulario dinamico, indexadas por id de pregunta. */
  respuestas: Record<string, any>;
  lat: number | null;
  lng: number | null;
  barrio: string;
  /** Fecha y hora del operativo (valor de un input datetime-local o ISO). */
  fechaHora: string;
  descripcion: string;
  fotos: string[];
  actaUrl: string;
  entidadResponsable: string;
  entidadesAcompanantes: string[];
  enGrupo: boolean;
  /**
   * Ids de los gestores que acompanaron el operativo. Es obligatorio pasarlo
   * —aunque sea vacio— porque el backend usa esta lista para autorizar la
   * lectura de la actividad a quienes la hicieron juntos: si viaja vacia sin
   * que nadie lo note, los acompanantes no pueden abrir su propia actividad.
   */
  gestoresInvolucradosIds: string[];
}

export interface ResultadoFormularioActividad {
  errores: string[];
  dto: CreateActividadDTO | null;
}

// Arma el DTO que espera la API a partir de lo que el gestor cargo, o la lista
// de lo que falta. Nunca devuelve las dos cosas: si hay un error, no hay DTO.
export function construirDtoActividad(
  entrada: EntradaFormularioActividad,
): ResultadoFormularioActividad {
  const errores: string[] = [];

  if (entrada.lat === null || entrada.lng === null) {
    errores.push('Marca la ubicacion del operativo en el mapa');
  }
  if (!entrada.barrio.trim()) {
    errores.push('No se pudo detectar el barrio: mueve el marcador dentro de la localidad');
  }
  if (!entrada.fechaHora.trim()) {
    errores.push('Indica la fecha y hora del operativo');
  }
  if (!entrada.descripcion.trim()) {
    errores.push('Describe lo realizado en el operativo');
  }
  if (entrada.fotos.length === 0) {
    errores.push('Sube al menos una foto de evidencia');
  }

  // Estas dos reglas venian del sistema original escritas con una excepcion
  // para un caso que pertenecia a otra area. Ese caso no existe aca, asi que
  // la regla queda SIEMPRE activa: no se cae junto con el condicional que la
  // envolvia.
  if (!entrada.actaUrl.trim()) {
    errores.push('Debe subir el acta del operativo');
  }
  if (!entrada.entidadResponsable.trim()) {
    errores.push('Debe indicar la entidad responsable');
  }

  const faltantes = faltantesObligatorias(entrada.preguntas, entrada.respuestas);
  if (faltantes.length > 0) {
    errores.push(`Faltan campos obligatorios: ${faltantes.map((q) => q.label).join(', ')}`);
  }

  if (errores.length > 0) return { errores, dto: null };

  // El desplegable muestra el nombre de la subcategoria del microservicio de
  // encuestas; el backend valida contra su enum. Convertir aca, siempre, es lo
  // que evita el 400 al finalizar el registro.
  const { technicalSubtipo, activityType } = resolveActivityEnums(entrada.subtipoDisplay);

  const fechaISO = new Date(entrada.fechaHora).toISOString();

  // Las respuestas de los controles fijos se guardan tambien en dynamicAnswers,
  // bajo el id de su pregunta cuando la encuesta la trae, para que el detalle y
  // la exportacion las encuentren donde esperan.
  const respuestasFijas: Record<string, any> = {
    fecha_operativo: fechaISO,
    ubicacion_mapa: { lat: entrada.lat, lng: entrada.lng },
    barrio_detectado: entrada.barrio,
    fotos_evidencia: entrada.fotos,
    descripcion_general: entrada.descripcion,
    entidad_responsable: entrada.entidadResponsable,
    entidades_acompanantes: entrada.entidadesAcompanantes,
    en_grupo: entrada.enGrupo,
  };
  // Ya estan bajo su nombre tecnico, que es como los busca el visor publico y
  // como los espera la exportacion.

  // Las respuestas se indexan por el NOMBRE TECNICO de cada pregunta, no por su
  // id. El id es un uuid del microservicio de encuestas; la lista de permitidos
  // del visor publico (public-fields.ts del backend) busca por nombre tecnico,
  // asi que guardar por id publica CERO cifras: el saneamiento no encuentra
  // ninguna clave y devuelve null, sin error visible en ningun lado.
  // Verificado 2026-08-29 contra el microservicio: la pregunta trae `id` uuid y
  // `name` con el nombre tecnico ('comparendos', 'cambuches', ...).
  const respuestasPorNombre: Record<string, any> = {};
  for (const pregunta of entrada.preguntas) {
    const valor = entrada.respuestas[pregunta.id];
    if (valor === undefined) continue;
    respuestasPorNombre[pregunta.name || pregunta.id] = valor;
  }

  const dto: CreateActividadDTO = {
    dateTime: fechaISO,
    activityType,
    operativoSubtipo: technicalSubtipo as OperativoSubtipo,
    lat: entrada.lat as number,
    lng: entrada.lng as number,
    barrio: entrada.barrio,
    photos: entrada.fotos,
    results: entrada.descripcion,
    isNightShift: esTurnoNocturno(fechaISO),
    shift: esTurnoNocturno(fechaISO) ? 'NOCTURNO' : 'DIURNO',
    isGroupOperativo: entrada.enGrupo,
    // Sin operativo en grupo no hay acompanantes: la lista viaja vacia aunque
    // haya quedado una seleccion previa en pantalla.
    gestoresInvolucradosIds: entrada.enGrupo ? [...new Set(entrada.gestoresInvolucradosIds)] : [],
    actaPdfUrl: entrada.actaUrl,
    actaOperativo: `ACTA_${technicalSubtipo}`,
    entidadResponsable: entrada.entidadResponsable,
    entidadesAcompanantes: entrada.entidadesAcompanantes,
    dynamicAnswers: {
      tipo: technicalSubtipo,
      ...respuestasPorNombre,
      ...respuestasFijas,
      __fieldMeta: buildFieldMeta(entrada.preguntas),
    },
  };

  return { errores: [], dto };
}
