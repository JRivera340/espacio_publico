import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  construirDtoActividad,
  esTurnoNocturno,
  campoVisible,
  preguntasDinamicas,
  faltantesObligatorias,
  buildFieldMeta,
  esPreguntaDeActa,
  aInputDatetimeLocal,
  respuestasDesdeActividad,
  type EntradaFormularioActividad,
} from './activityForm';
import type { SurveyQuestion } from '../../../services/survey.service';

const preguntaCifra: SurveyQuestion = {
  id: 'q-cifra',
  type: 'NUMBER',
  name: 'comparendos',
  label: 'Comparendos',
  required: true,
};

function entradaValida(cambios: Partial<EntradaFormularioActividad> = {}): EntradaFormularioActividad {
  return {
    subtipoDisplay: '1801',
    preguntas: [preguntaCifra],
    respuestas: { 'q-cifra': 3 },
    lat: 4.6156,
    lng: -74.0664,
    barrio: 'LA MACARENA',
    fechaHora: '2026-08-20T14:00',
    descripcion: 'Recuperacion de espacio publico en el sector',
    fotos: ['photos/uno.jpg'],
    actaUrl: 'https://archivos.example/acta.pdf',
    entidadResponsable: 'ALCALDIA LOCAL DE SANTA FE',
    entidadesAcompanantes: ['POLICIA NACIONAL'],
    enGrupo: false,
    gestoresInvolucradosIds: [],
    ...cambios,
  };
}

describe('esTurnoNocturno', () => {
  it('marca nocturno desde las 18:00', () => {
    expect(esTurnoNocturno('2026-08-20T19:30:00')).toBe(true);
  });

  it('marca nocturno antes de las 06:00', () => {
    expect(esTurnoNocturno('2026-08-20T03:00:00')).toBe(true);
  });

  it('marca diurno a media manana', () => {
    expect(esTurnoNocturno('2026-08-20T10:00:00')).toBe(false);
  });
});

describe('campoVisible', () => {
  it('muestra el campo cuando no hay condicion', () => {
    expect(campoVisible(undefined, () => undefined)).toBe(true);
  });

  it('oculta el campo cuando la condicion no se cumple', () => {
    expect(campoVisible({ name: 'tipo', value: 'A' }, () => 'B')).toBe(false);
  });

  it('no oculta el campo si el valor del que depende todavia no existe', () => {
    expect(campoVisible({ name: 'tipo', value: 'A' }, () => undefined)).toBe(true);
  });

  it('acepta la forma valueIn', () => {
    expect(campoVisible({ name: 'tipo', valueIn: ['A', 'B'] }, () => 'b')).toBe(true);
    expect(campoVisible({ name: 'tipo', valueIn: ['A', 'B'] }, () => 'c')).toBe(false);
  });
});

describe('preguntasDinamicas', () => {
  it('deja fuera las preguntas que la pantalla captura con controles fijos', () => {
    const preguntas: SurveyQuestion[] = [
      preguntaCifra,
      { id: 'q-fecha', type: 'DATE', name: 'fecha_operativo', label: 'Fecha' },
      { id: 'q-mapa', type: 'LOCATION', name: 'ubicacion_mapa', label: 'Ubicacion' },
      { id: 'q-entidad', type: 'ENTITY_SELECT', name: 'entidad_responsable', label: 'Entidad' },
      { id: 'q-acta', type: 'FILE', name: 'acta_pdf', label: 'Acta del operativo' },
    ];
    expect(preguntasDinamicas(preguntas).map((q) => q.id)).toEqual(['q-cifra']);
  });

  it('reconoce el acta tambien por la etiqueta', () => {
    const porEtiqueta: SurveyQuestion = { id: 'a1', type: 'FILE', name: 'documento', label: 'Acta firmada' };
    expect(preguntasDinamicas([porEtiqueta])).toEqual([]);
  });

  it('deja fuera los titulos de seccion para no repetir los pasos fijos de la pantalla', () => {
    const preguntas: SurveyQuestion[] = [
      preguntaCifra,
      { id: 'h1', type: 'SECTION_HEADER', name: '', label: '3. Fecha y Hora' },
      { id: 'h2', type: 'section_header', name: '', label: '4. Ubicacion' },
    ];
    expect(preguntasDinamicas(preguntas).map((q) => q.id)).toEqual(['q-cifra']);
  });
});

describe('faltantesObligatorias', () => {
  it('reporta una obligatoria sin responder', () => {
    expect(faltantesObligatorias([preguntaCifra], {}).map((q) => q.label)).toEqual(['Comparendos']);
  });

  it('acepta el cero como respuesta valida', () => {
    expect(faltantesObligatorias([preguntaCifra], { 'q-cifra': 0 })).toEqual([]);
  });

  it('no exige una obligatoria que esta oculta por su condicion', () => {
    const condicionada: SurveyQuestion = {
      id: 'q-detalle',
      type: 'TEXT',
      name: 'detalle',
      label: 'Detalle',
      required: true,
      config: { visibleIf: { name: 'comparendos', value: '9' } },
    };
    expect(faltantesObligatorias([preguntaCifra, condicionada], { 'q-cifra': 3 })).toEqual([]);
  });
});

describe('buildFieldMeta', () => {
  it('guarda etiqueta, tipo y opciones de cada pregunta', () => {
    const meta = buildFieldMeta([
      { id: 'q1', type: 'SELECT', label: 'Zona', options: [{ label: 'Norte', value: 'N' }] },
    ]);
    expect(meta.q1).toEqual({ type: 'SELECT', label: 'Zona', options: [{ label: 'Norte', value: 'N' }] });
  });
});

describe('construirDtoActividad', () => {
  it('arma el DTO cuando esta todo cargado', () => {
    const { errores, dto } = construirDtoActividad(entradaValida());
    expect(errores).toEqual([]);
    expect(dto).not.toBeNull();
    expect(dto!.barrio).toBe('LA MACARENA');
    expect(dto!.results).toBe('Recuperacion de espacio publico en el sector');
    expect(dto!.photos).toEqual(['photos/uno.jpg']);
  });

  // El desplegable muestra el nombre de la subcategoria del microservicio de
  // encuestas; el backend valida contra su enum. Sin esta conversion el
  // registro termina en un 400 al finalizar, que es un fallo ya visto en
  // produccion en el sistema original.
  it('convierte el nombre que muestra el formulario al enum del backend', () => {
    const { dto } = construirDtoActividad(entradaValida());
    expect(dto!.operativoSubtipo).toBe('ESPACIO_PUBLICO_1801');
    expect(dto!.activityType).toBe('ESPACIO_PUBLICO - 1801');
  });

  it('nunca manda al backend el nombre que se muestra en pantalla', () => {
    const { dto } = construirDtoActividad(entradaValida());
    expect(dto!.operativoSubtipo).not.toBe('1801');
  });

  // Regla heredada del sistema original, donde estaba escrita con una
  // excepcion para un caso de otra area. Ese caso no existe aca, asi que la
  // regla queda siempre activa.
  it('exige el acta del operativo, siempre', () => {
    const { errores, dto } = construirDtoActividad(entradaValida({ actaUrl: '' }));
    expect(dto).toBeNull();
    expect(errores).toContain('Debe subir el acta del operativo');
  });

  it('no acepta un acta que sea solo espacios', () => {
    const { dto } = construirDtoActividad(entradaValida({ actaUrl: '   ' }));
    expect(dto).toBeNull();
  });

  it('exige la entidad responsable, siempre', () => {
    const { errores, dto } = construirDtoActividad(entradaValida({ entidadResponsable: '' }));
    expect(dto).toBeNull();
    expect(errores).toContain('Debe indicar la entidad responsable');
  });

  it('no rellena la entidad responsable con un valor de relleno', () => {
    const { dto } = construirDtoActividad(entradaValida({ entidadResponsable: '' }));
    expect(dto).toBeNull();
  });

  it('exige la ubicacion marcada en el mapa', () => {
    const { errores, dto } = construirDtoActividad(entradaValida({ lat: null, lng: null }));
    expect(dto).toBeNull();
    expect(errores.some((e) => e.includes('ubicacion'))).toBe(true);
  });

  it('exige el barrio detectado', () => {
    const { errores, dto } = construirDtoActividad(entradaValida({ barrio: '' }));
    expect(dto).toBeNull();
    expect(errores.some((e) => e.includes('barrio'))).toBe(true);
  });

  it('exige al menos una foto de evidencia', () => {
    const { errores, dto } = construirDtoActividad(entradaValida({ fotos: [] }));
    expect(dto).toBeNull();
    expect(errores).toContain('Sube al menos una foto de evidencia');
  });

  it('exige la descripcion del operativo', () => {
    const { dto } = construirDtoActividad(entradaValida({ descripcion: '  ' }));
    expect(dto).toBeNull();
  });

  it('exige las obligatorias que declara la encuesta', () => {
    const { errores, dto } = construirDtoActividad(entradaValida({ respuestas: {} }));
    expect(dto).toBeNull();
    expect(errores.some((e) => e.includes('Comparendos'))).toBe(true);
  });

  it('junta todo lo que falta en un solo intento', () => {
    const { errores } = construirDtoActividad(
      entradaValida({ actaUrl: '', entidadResponsable: '', fotos: [] }),
    );
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });

  it('manda la fecha en formato ISO', () => {
    const { dto } = construirDtoActividad(entradaValida());
    expect(dto!.dateTime).toBe(new Date('2026-08-20T14:00').toISOString());
  });

  it('deriva el turno de la hora del operativo', () => {
    const diurno = construirDtoActividad(entradaValida({ fechaHora: '2026-08-20T10:00' })).dto!;
    const nocturno = construirDtoActividad(entradaValida({ fechaHora: '2026-08-20T21:00' })).dto!;
    expect(diurno.isNightShift).toBe(false);
    expect(diurno.shift).toBe('DIURNO');
    expect(nocturno.isNightShift).toBe(true);
    expect(nocturno.shift).toBe('NOCTURNO');
  });

  // El backend guarda el formulario dinamico bajo `dynamicAnswers` y su DTO
  // corre con forbidNonWhitelisted: cualquier otro nombre devuelve 400.
  // El id de la pregunta es un uuid del microservicio de encuestas; el visor
  // publico busca por NOMBRE TECNICO. Guardar por id publica cero cifras: el
  // saneamiento no encuentra ninguna clave y devuelve null, sin error visible.
  it('indexa las respuestas por el nombre tecnico de la pregunta, no por su id', () => {
    const { dto } = construirDtoActividad(entradaValida());
    expect(dto!.dynamicAnswers!.comparendos).toBe(3);
    expect(dto!.dynamicAnswers!['q-cifra']).toBeUndefined();
    expect(Object.keys(dto!)).not.toContain('operativoData');
  });

  it('cae al id solo cuando la pregunta no trae nombre tecnico', () => {
    const sinNombre: SurveyQuestion = { id: 'q-sin-nombre', type: 'NUMBER', label: 'Sin nombre' };
    const { dto } = construirDtoActividad(
      entradaValida({ preguntas: [sinNombre], respuestas: { 'q-sin-nombre': 7 } }),
    );
    expect(dto!.dynamicAnswers!['q-sin-nombre']).toBe(7);
  });

  it('guarda en dynamicAnswers una copia de las etiquetas de la encuesta', () => {
    const { dto } = construirDtoActividad(entradaValida());
    expect(dto!.dynamicAnswers!.__fieldMeta['q-cifra'].label).toBe('Comparendos');
  });

  it('guarda las respuestas de los controles fijos bajo su nombre tecnico', () => {
    const preguntaEntidad: SurveyQuestion = {
      id: 'q-entidad',
      type: 'ENTITY_SELECT',
      name: 'entidad_responsable',
      label: 'Entidad responsable',
    };
    const { dto } = construirDtoActividad(
      entradaValida({ preguntas: [preguntaCifra, preguntaEntidad] }),
    );
    expect(dto!.dynamicAnswers!.entidad_responsable).toBe('ALCALDIA LOCAL DE SANTA FE');
    expect(dto!.dynamicAnswers!['q-entidad']).toBeUndefined();
  });

  // El backend usa gestoresInvolucradosIds para autorizar la lectura de la
  // actividad a los gestores que la hicieron juntos. Si la lista viaja vacia,
  // esa regla existe y nadie la alimenta.
  it('lleva al DTO los gestores acompanantes de un operativo en grupo', () => {
    const { dto } = construirDtoActividad(
      entradaValida({ enGrupo: true, gestoresInvolucradosIds: ['u1', 'u2'] }),
    );
    expect(dto!.isGroupOperativo).toBe(true);
    expect(dto!.gestoresInvolucradosIds).toEqual(['u1', 'u2']);
  });

  it('deja la lista de acompanantes vacia si el operativo no fue en grupo', () => {
    const { dto } = construirDtoActividad(
      entradaValida({ enGrupo: false, gestoresInvolucradosIds: ['u1'] }),
    );
    expect(dto!.isGroupOperativo).toBe(false);
    expect(dto!.gestoresInvolucradosIds).toEqual([]);
  });

  it('no repite un mismo gestor en la lista', () => {
    const { dto } = construirDtoActividad(
      entradaValida({ enGrupo: true, gestoresInvolucradosIds: ['u1', 'u1', 'u2'] }),
    );
    expect(dto!.gestoresInvolucradosIds).toEqual(['u1', 'u2']);
  });
});

// Regresion atada al dato real: las claves que escribe el formulario tienen que
// ser las que el visor publico sabe leer. Si divergen, la actividad se publica
// sin una sola cifra y no falla nada en el camino.
describe('las claves que se escriben son las que el visor publico permite', () => {
  it('una cifra del formulario cae dentro de la lista de permitidos del backend', () => {
    const aca = dirname(fileURLToPath(import.meta.url));
    const permitidos = readFileSync(resolve(aca, '../../../../../src/publico/public-fields.ts'), 'utf-8');

    const { dto } = construirDtoActividad(entradaValida());
    const claves = Object.keys(dto!.dynamicAnswers!).filter((k) => k !== 'tipo' && k !== '__fieldMeta');
    const cifras = claves.filter((k) => typeof dto!.dynamicAnswers![k] === 'number');

    expect(cifras.length).toBeGreaterThan(0);
    for (const clave of cifras) {
      expect(permitidos, `${clave} no esta en la lista de permitidos del visor publico`).toContain(`'${clave}'`);
    }
  });
});

// Un adjunto PDF que no sea el acta tiene que seguir en el formulario. Si se lo
// oculta, ademas de no poder cargarlo, deja de exigirse aunque sea obligatorio.
describe('la pregunta del acta no se lleva por delante otros adjuntos', () => {
  const otroAdjunto: SurveyQuestion = {
    id: 'q-anexo',
    type: 'FILE',
    name: 'anexo_tecnico',
    label: 'Anexo tecnico',
    required: true,
    config: { accept: '.pdf' },
  };

  it('reconoce el acta por su nombre o etiqueta', () => {
    expect(esPreguntaDeActa({ id: 'a', type: 'FILE', name: 'acta_operativo', label: 'x' })).toBe(true);
    expect(esPreguntaDeActa({ id: 'b', type: 'FILE', name: 'x', label: 'Acta del operativo' })).toBe(true);
  });

  it('no confunde con el acta a otro adjunto PDF', () => {
    expect(esPreguntaDeActa(otroAdjunto)).toBe(false);
    expect(preguntasDinamicas([otroAdjunto]).map((q) => q.id)).toEqual(['q-anexo']);
  });

  it('ese otro adjunto sigue exigiendose si es obligatorio', () => {
    const { errores } = construirDtoActividad(entradaValida({ preguntas: [otroAdjunto], respuestas: {} }));
    expect(errores.join(' ')).toMatch(/Anexo tecnico/i);
  });
});

describe('aInputDatetimeLocal', () => {
  it('devuelve la hora local, no la UTC', () => {
    const iso = new Date(2026, 7, 20, 15, 30).toISOString();
    expect(aInputDatetimeLocal(iso)).toBe('2026-08-20T15:30');
  });

  it('devuelve vacio ante una fecha invalida en vez de romper la pantalla', () => {
    expect(aInputDatetimeLocal('no es una fecha')).toBe('');
  });
});

describe('respuestasDesdeActividad', () => {
  const preguntas: SurveyQuestion[] = [
    { id: 'uuid-1', type: 'NUMBER', name: 'comparendos', label: 'Comparendos' },
    { id: 'uuid-2', type: 'NUMBER', name: 'cambuches', label: 'Cambuches' },
  ];

  it('reindexa por id lo que estaba guardado por nombre tecnico', () => {
    expect(respuestasDesdeActividad(preguntas, { comparendos: 7, cambuches: 0 })).toEqual({
      'uuid-1': 7,
      'uuid-2': 0,
    });
  });

  it('ignora las claves que no corresponden a ninguna pregunta', () => {
    const respuestas = respuestasDesdeActividad(preguntas, { comparendos: 7, tipo: 'ESPACIO_PUBLICO_1801' });
    expect(respuestas).toEqual({ 'uuid-1': 7 });
  });

  it('sin respuestas guardadas devuelve un objeto vacio', () => {
    expect(respuestasDesdeActividad(preguntas, null)).toEqual({});
  });
});
