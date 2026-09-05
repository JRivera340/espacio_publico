import { useState } from 'react';
import { activityService } from '../services/activity.service';
import { mensajeDeError } from '../utils/errorMessage';
import type { ActividadFilters } from '../types';
import type { GestorResumen } from '../services/users.service';

interface Props {
  filtros?: ActividadFilters;
  className?: string;
  /** Pinta los campos de fecha y gestor y los suma a `filtros` al descargar. */
  mostrarSelectorGestor?: boolean;
  gestores?: GestorResumen[];
}

/**
 * Descarga el informe del area en Excel.
 *
 * Solo lo usan validador y administracion: el endpoint le responde 403 a un
 * gestor, asi que el boton no debe aparecerle.
 */
export const DescargarInforme = ({ filtros, className, mostrarSelectorGestor, gestores = [] }: Props) => {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [gestorId, setGestorId] = useState('');

  const descargar = async () => {
    setDescargando(true);
    setError(null);
    let url: string | null = null;
    try {
      const filtrosAEnviar: ActividadFilters = {
        ...filtros,
        ...(mostrarSelectorGestor && desde ? { desde } : {}),
        ...(mostrarSelectorGestor && hasta ? { hasta } : {}),
        ...(mostrarSelectorGestor && gestorId ? { gestor: gestorId } : {}),
      };
      const blob = await activityService.descargarInforme(filtrosAEnviar);
      url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'espacio-publico.xlsx';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (err) {
      const motivo = mensajeDeError(err);
      if (motivo) setError(motivo);
    } finally {
      // Liberar el objeto: sin esto el archivo queda en memoria del navegador
      // hasta que se cierre la pestana.
      if (url) URL.revokeObjectURL(url);
      setDescargando(false);
    }
  };

  return (
    <div className={className}>
      {mostrarSelectorGestor && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="input-label" htmlFor="informeDesde">
              Desde
            </label>
            <input id="informeDesde" type="date" className="input-field" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="input-label" htmlFor="informeHasta">
              Hasta
            </label>
            <input id="informeHasta" type="date" className="input-field" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div>
            <label className="input-label" htmlFor="informeGestor">
              Gestor
            </label>
            <select id="informeGestor" className="select-field" value={gestorId} onChange={(e) => setGestorId(e.target.value)}>
              <option value="">Todos los gestores</option>
              {gestores.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button type="button" className="btn-secondary btn-sm w-full justify-center" disabled={descargando} onClick={descargar}>
        {descargando ? 'Preparando...' : 'Descargar informe en Excel'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
};
