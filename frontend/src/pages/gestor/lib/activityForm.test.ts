import { describe, it, expect } from 'vitest';
import {
  construirDtoActividad,
  esTurnoNocturno,
  campoVisible,
  preguntasDinamicas,
  faltantesObligatorias,
  buildFieldMeta,
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

  it('reconoce el acta tambien por la etiqueta y por el tipo de archivo aceptado', () => {
    const porEtiqueta: SurveyQuestion = { id: 'a1', type: 'FILE', name: 'documento', label: 'Acta firmada' };
    const porAccept: SurveyQuestion = { id: 'a2', type: 'FILE', name: 'documento', label: 'Soporte', config: { accept: '.pdf' } };
    expect(preguntasDinamicas([porEtiqueta, porAccept])).toEqual([]);
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
  it('manda las respuestas del formulario dinamico bajo dynamicAnswers', () => {
    const { dto } = construirDtoActividad(entradaValida());
    expect(dto!.dynamicAnswers!['q-cifra']).toBe(3);
    expect(Object.keys(dto!)).not.toContain('operativoData');
  });

  it('guarda en dynamicAnswers una copia de las etiquetas de la encuesta', () => {
    const { dto } = construirDtoActividad(entradaValida());
    expect(dto!.dynamicAnswers!.__fieldMeta['q-cifra'].label).toBe('Comparendos');
  });

  it('guarda las respuestas de los controles fijos bajo el id de su pregunta', () => {
    const preguntaEntidad: SurveyQuestion = {
      id: 'q-entidad',
      type: 'ENTITY_SELECT',
      name: 'entidad_responsable',
      label: 'Entidad responsable',
    };
    const { dto } = construirDtoActividad(
      entradaValida({ preguntas: [preguntaCifra, preguntaEntidad] }),
    );
    expect(dto!.dynamicAnswers!['q-entidad']).toBe('ALCALDIA LOCAL DE SANTA FE');
    expect(dto!.dynamicAnswers!.entidad_responsable).toBe('ALCALDIA LOCAL DE SANTA FE');
  });
});
