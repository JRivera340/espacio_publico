import { useEffect, useState } from 'react';
import { startOfMonth } from 'date-fns';
import { programacionService, type ProgramacionItem } from '../../services/programacion.service';
import { activityService } from '../../services/activity.service';
import { resumenDelMes } from '../../lib/desempenoGestor.lib';
import { tituloMes } from '../../lib/calendar.lib';
import { mensajeDeError } from '../../utils/errorMessage';
import { Loading } from '../../components/Loading';
import type { Actividad } from '../../types';

const KPI = ({ etiqueta, valor }: { etiqueta: string; valor: string | number }) => (
  <div className="card">
    <p className="card-subtitle">{etiqueta}</p>
    <p className="text-2xl font-bold text-neutral-800">{valor}</p>
  </div>
);

// Indicadores de desempeño propios del gestor: lo que le toco cumplir este
// mes y como le fue. Vive aparte de "Mi cronograma" porque responde una
// pregunta distinta - no "que tengo que hacer" sino "como voy".
export const PerfilGestorPage = () => {
  const [programacion, setProgramacion] = useState<ProgramacionItem[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mes = startOfMonth(new Date());

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    Promise.all([programacionService.mias(), activityService.listMine({ limit: 500 })])
      .then(([listaProgramacion, respuestaActividades]) => {
        if (!vigente) return;
        setProgramacion(listaProgramacion);
        setActividades(respuestaActividades.data);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(mensajeDeError(err) ?? 'No se pudo cargar tu perfil');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  if (cargando) return <Loading />;

  const resumen = resumenDelMes(programacion, actividades, mes, new Date());

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Mi perfil</h1>
          <p className="page-subtitle">Tu desempeno en {tituloMes(mes)}</p>
        </div>
      </div>

      <main className="page-content space-y-6">
        {error ? (
          <div className="card empty-state" role="alert">
            <p className="empty-state-title text-red-700">No se pudo cargar tu perfil</p>
            <p className="empty-state-description">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI etiqueta="Programadas este mes" valor={resumen.programadasMes} />
              <KPI etiqueta="Cumplidas" valor={resumen.cumplidasMes} />
              <KPI etiqueta="Pendientes" valor={resumen.pendientesMes} />
              <KPI etiqueta="Actividades registradas" valor={resumen.actividadesRegistradasMes} />
            </div>

            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Cumplimiento del mes</h2>
                <p className="card-subtitle">
                  Cumplidas sobre lo que ya debia estar resuelto (cumplidas + vencidas)
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className={`h-full ${resumen.porcentajeCumplimiento >= 80 ? 'bg-success' : resumen.porcentajeCumplimiento >= 50 ? 'bg-amber-500' : 'bg-status-rechazada'}`}
                    style={{ width: `${resumen.porcentajeCumplimiento}%` }}
                  />
                </div>
                <span className="text-2xl font-bold text-neutral-800">{resumen.porcentajeCumplimiento}%</span>
              </div>
              {resumen.vencidasMes > 0 && (
                <p className="text-sm text-red-600 mt-3">
                  {resumen.vencidasMes} actividad{resumen.vencidasMes === 1 ? '' : 'es'} programada
                  {resumen.vencidasMes === 1 ? '' : 's'} paso{resumen.vencidasMes === 1 ? '' : 'aron'} de fecha sin registrarse.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};
