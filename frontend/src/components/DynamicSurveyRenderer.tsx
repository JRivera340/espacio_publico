import React, { useMemo } from 'react';
import type { SurveyQuestion } from '../services/survey.service';
import { campoVisible, preguntaPorNombre } from '../pages/gestor/lib/activityForm';
import { PhotosUpload } from './PhotosUpload';
import { MultiSelectCombobox } from './MultiSelectCombobox';

interface Props {
  /** Preguntas ya podadas de las que la pantalla captura con controles fijos. */
  questions: SurveyQuestion[];
  /** Todas las preguntas de la encuesta, para resolver condiciones visibleIf. */
  allQuestions?: SurveyQuestion[];
  values: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
  /** Entidades del catalogo, para las preguntas de tipo ENTITY_SELECT. */
  entidades?: string[];
  disabled?: boolean;
}

interface Grupo {
  header?: SurveyQuestion;
  questions: SurveyQuestion[];
}

const TIPOS_ANCHO_COMPLETO = ['FILE', 'TEXTAREA', 'MULTISELECT', 'ENTITY_SELECT'];

function agrupar(questions: SurveyQuestion[]): Grupo[] {
  const grupos: Grupo[] = [];
  let actual: Grupo = { questions: [] };

  [...questions]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach((q) => {
      if (String(q.type).toUpperCase() === 'SECTION_HEADER') {
        if (actual.questions.length > 0 || actual.header) grupos.push(actual);
        actual = { header: q, questions: [] };
      } else {
        actual.questions.push(q);
      }
    });

  if (actual.questions.length > 0 || actual.header) grupos.push(actual);
  return grupos;
}

// Render del formulario dinamico que sirve el microservicio de encuestas. No
// conoce ninguna regla del area: solo dibuja las preguntas que le pasan y avisa
// los cambios. Quien decide que es obligatorio es lib/activityForm.
export const DynamicSurveyRenderer: React.FC<Props> = ({
  questions,
  allQuestions,
  values,
  onChange,
  entidades = [],
  disabled,
}) => {
  const grupos = useMemo(() => agrupar(questions), [questions]);
  const universo = allQuestions ?? questions;

  const visible = (q: SurveyQuestion) =>
    campoVisible(q.config?.visibleIf, (name) => {
      const objetivo = preguntaPorNombre(universo, name);
      return objetivo ? values[objetivo.id] : undefined;
    });

  const etiquetaDe = (q: SurveyQuestion) => (
    <>
      {q.label} {q.required && <span className="text-red-500">*</span>}
    </>
  );

  // Combobox desplegable para preguntas de seleccion multiple: mismo
  // componente que ya usa CreateActivity para entidades y gestores
  // acompanantes, en vez de la pared de checkboxes que traia antes.
  const renderCombobox = (q: SurveyQuestion, opciones: Array<{ value: string; label: string }>) => {
    const seleccion: string[] = Array.isArray(values[q.id]) ? values[q.id] : [];
    return (
      <MultiSelectCombobox
        legend={etiquetaDe(q)}
        placeholder={q.placeholder || 'Seleccionar...'}
        options={opciones}
        selected={seleccion}
        onChange={(sel) => onChange(q.id, sel)}
        disabled={disabled}
      />
    );
  };

  const renderControl = (q: SurveyQuestion) => {
    const tipo = String(q.type).toUpperCase();
    const valor = values[q.id];

    if (tipo === 'NUMBER') {
      return (
        <input
          id={q.id}
          type="number"
          min="0"
          step="any"
          disabled={disabled}
          value={valor ?? ''}
          onChange={(e) => onChange(q.id, e.target.value === '' ? undefined : Number(e.target.value))}
          className="input-field"
          placeholder={q.placeholder || '0'}
        />
      );
    }

    if (tipo === 'TEXTAREA' || tipo === 'TEXT') {
      return (
        <textarea
          id={q.id}
          rows={tipo === 'TEXTAREA' ? 4 : 2}
          disabled={disabled}
          value={valor ?? ''}
          onChange={(e) => onChange(q.id, e.target.value || undefined)}
          className="input-field"
          placeholder={q.placeholder || ''}
        />
      );
    }

    if (tipo === 'DATE') {
      return (
        <input
          id={q.id}
          type="datetime-local"
          disabled={disabled}
          value={valor ?? ''}
          onChange={(e) => onChange(q.id, e.target.value)}
          className="input-field"
        />
      );
    }

    if (tipo === 'SELECT') {
      return (
        <select
          id={q.id}
          disabled={disabled}
          value={valor ?? ''}
          onChange={(e) => onChange(q.id, e.target.value || undefined)}
          className="select-field"
        >
          <option value="">Seleccionar</option>
          {(q.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    if (tipo === 'ENTITY_SELECT') {
      const opciones = q.options?.length ? q.options : entidades.map((e) => ({ value: e, label: e }));
      const multiple = Boolean(q.config?.multiple);
      if (!multiple) {
        return (
          <select
            id={q.id}
            disabled={disabled}
            value={valor ?? ''}
            onChange={(e) => onChange(q.id, e.target.value || undefined)}
            className="select-field"
          >
            <option value="">Seleccionar</option>
            {opciones.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      }
      return renderCombobox(q, opciones);
    }

    if (tipo === 'MULTISELECT' || tipo === 'CHECKBOX') {
      return renderCombobox(q, q.options || []);
    }

    if (tipo === 'RADIO') {
      const opciones = q.options || [];
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {opciones.map((o) => {
            const marcada = String(valor ?? '') === o.value;
            return (
              <label
                key={o.value}
                htmlFor={`${q.id}-${o.value}`}
                className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${
                  marcada ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-neutral-100 hover:border-neutral-200'
                }`}
              >
                <input
                  id={`${q.id}-${o.value}`}
                  type="radio"
                  name={q.id}
                  value={o.value}
                  disabled={disabled}
                  checked={marcada}
                  onChange={() => onChange(q.id, o.value)}
                  className="w-4 h-4"
                />
                <span className={`text-sm ${marcada ? 'text-primary font-bold' : 'text-neutral-600'}`}>{o.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (tipo === 'FILE') {
      return (
        <PhotosUpload
          onUploadSuccess={(urls) => onChange(q.id, urls)}
          existingUrls={Array.isArray(valor) ? valor : []}
          disabled={disabled}
        />
      );
    }

    if (tipo === 'BOOLEAN') {
      return (
        <div className="flex items-center gap-3">
          <input
            id={q.id}
            type="checkbox"
            disabled={disabled}
            checked={Boolean(valor)}
            onChange={(e) => onChange(q.id, e.target.checked)}
            className="checkbox-field"
          />
          <span className="text-sm text-neutral-600">Confirmar</span>
        </div>
      );
    }

    return (
      <input
        id={q.id}
        type="text"
        disabled={disabled}
        value={valor ?? ''}
        onChange={(e) => onChange(q.id, e.target.value || undefined)}
        className="input-field"
      />
    );
  };

  // Los grupos de opciones (radio, archivos) no pueden colgar de un <label
  // htmlFor>: no hay un unico control al que apuntar. Van con fieldset/legend.
  const esGrupoDeOpciones = (q: SurveyQuestion) => {
    const tipo = String(q.type).toUpperCase();
    return tipo === 'RADIO' || tipo === 'FILE';
  };

  // El combobox de seleccion multiple ya trae su propio fieldset/legend
  // (MultiSelectCombobox), asi que no se envuelve en otro label ni fieldset
  // aca: eso duplicaria el texto de la pregunta en pantalla.
  const esComboboxPropio = (q: SurveyQuestion) => {
    const tipo = String(q.type).toUpperCase();
    if (tipo === 'MULTISELECT' || tipo === 'CHECKBOX') return true;
    return tipo === 'ENTITY_SELECT' && Boolean(q.config?.multiple);
  };

  return (
    <div className="space-y-8">
      {grupos.map((grupo, indice) => (
        <div key={grupo.header?.id ?? `grupo-${indice}`} className="space-y-5">
          {grupo.header && (
            <div className="border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-800">{grupo.header.label}</h3>
              {grupo.header.placeholder && (
                <p className="text-xs text-neutral-500 mt-1">{grupo.header.placeholder}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {grupo.questions.map((q) => {
              if (!visible(q)) return null;
              const anchoCompleto = TIPOS_ANCHO_COMPLETO.includes(String(q.type).toUpperCase());
              const etiqueta = (
                <>
                  {q.label} {q.required && <span className="text-red-500">*</span>}
                </>
              );

              return (
                <div key={q.id} className={`${anchoCompleto ? 'md:col-span-2' : ''} space-y-1.5`}>
                  {esComboboxPropio(q) ? (
                    renderControl(q)
                  ) : esGrupoDeOpciones(q) ? (
                    <fieldset disabled={disabled} className="space-y-1.5">
                      <legend className="input-label font-semibold">{etiqueta}</legend>
                      {renderControl(q)}
                    </fieldset>
                  ) : (
                    <>
                      <label className="input-label font-semibold" htmlFor={q.id}>
                        {etiqueta}
                      </label>
                      {renderControl(q)}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
