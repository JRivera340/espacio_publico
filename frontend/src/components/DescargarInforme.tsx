import { useState } from 'react';
import { activityService } from '../services/activity.service';
import { mensajeDeError } from '../utils/errorMessage';
import type { ActividadFilters } from '../types';

interface Props {
  filtros?: ActividadFilters;
  className?: string;
}

/**
 * Descarga el informe del area en Excel.
 *
 * Solo lo usan validador y administracion: el endpoint le responde 403 a un
 * gestor, asi que el boton no debe aparecerle.
 */
export const DescargarInforme = ({ filtros, className }: Props) => {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descargar = async () => {
    setDescargando(true);
    setError(null);
    let url: string | null = null;
    try {
      const blob = await activityService.descargarInforme(filtros);
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
