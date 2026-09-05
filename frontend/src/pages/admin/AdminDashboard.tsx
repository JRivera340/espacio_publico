import { useEffect, useMemo, useState } from 'react';
import { activityService } from '../../services/activity.service';
import { programacionService, type ProgramacionItem } from '../../services/programacion.service';
import { mensajeDeError } from '../../utils/errorMessage';
import { totalYRitmo, porBarrio, eventosOperativos, type ActOperativo } from '../../lib/indicadoresOperativos.lib';
import { detectarReincidencia } from '../../lib/reincidencia.lib';
import { DescargarInforme } from '../../components/DescargarInforme';
import { Loading } from '../../components/Loading';
import { usersService, type GestorResumen } from '../../services/users.service';
import { EquipoCronogramaPanel } from '../../components/EquipoCronogramaPanel';
import type { Actividad } from '../../types';

const KPI = ({ etiqueta, valor }: { etiqueta: string; valor: string | number }) => (
  <div className="card">
    <p className="card-subtitle">{etiqueta}</p>
    <p className="text-2xl font-bold text-neutral-800">{valor}</p>
  </div>
);

export const AdminDashboard = () => {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [programacion, setProgramacion] = useState<ProgramacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [gestores, setGestores] = useState<GestorResumen[]>([]);
  const [vista, setVista] = useState<'indicadores' | 'cronograma'>('indicadores');

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    activityService
      .listAll({ limit: 5000 })
      .then((respuesta) => {
        if (!vigente) return;
        setActividades(respuesta.data);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setActividades([]);
        setError(mensajeDeError(err) ?? 'No se pudo cargar la informacion');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  // La programacion va aparte: si falla, los indicadores de actividades se
  // siguen viendo. Es informacion complementaria, no puede tumbar la pantalla.
  useEffect(() => {
    let vigente = true;
    programacionService
      .listar()
      .then((lista) => vigente && setProgramacion(lista))
      .catch(() => vigente && setProgramacion([]));
    return () => {
      vigente = false;
    };
  }, [intento]);

  useEffect(() => {
    let vigente = true;
    usersService
      .listarGestores()
      .then((lista) => vigente && setGestores(lista))
      .catch(() => vigente && setGestores([]));
    return () => {
      vigente = false;
    };
  }, []);

  // Las librerias de indicadores esperan esta forma. En este modulo todo es
  // Espacio Publico, asi que el agrupado por subtipo no separa nada y se omite.
  const paraIndicadores: ActOperativo[] = useMemo(
    () =>
      actividades.map((a) => ({
        id: a.id,
        operativoSubtipo: a.operativoSubtipo,
        barrio: a.barrio,
        lat: a.lat,
        lng: a.lng,
        dateTime: a.dateTime,
      })),
    [actividades],
  );

  const ritmo = useMemo(() => totalYRitmo(paraIndicadores, Date.now()), [paraIndicadores]);
  const barrios = useMemo(() => porBarrio(paraIndicadores), [paraIndicadores]);
  const reincidentes = useMemo(
    () => detectarReincidencia(eventosOperativos(paraIndicadores), 50, 3),
    [paraIndicadores],
  );
  const maxBarrio = Math.max(1, ...barrios.map((b) => b.total));

  const porEstado = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const a of actividades) acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, [actividades]);

  const programadasPendientes = programacion.filter((p) => p.estado === 'PENDIENTE').length;

  if (cargando) return <Loading />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Administracion</h1>
          <p className="page-subtitle">Espacio publico - indicadores del area</p>
        </div>
      </div>

      <main className="page-content space-y-6">
        <div className="nav-tabs mb-2">
          <button type="button" className={vista === 'indicadores' ? 'nav-tab-active' : 'nav-tab'} onClick={() => setVista('indicadores')}>
            Indicadores
          </button>
          <button type="button" className={vista === 'cronograma' ? 'nav-tab-active' : 'nav-tab'} onClick={() => setVista('cronograma')}>
            Cronograma del equipo
          </button>
        </div>

        {vista === 'cronograma' && !error && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Cronograma del equipo</h2>
              <p className="card-subtitle">Filtra por gestor para ver su cronograma y su cumplimiento del mes</p>
            </div>
            <EquipoCronogramaPanel programacion={programacion} actividades={actividades} gestores={gestores} />
          </section>
        )}

        {error ? (
          <div className="card empty-state" role="alert">
            <p className="empty-state-title text-red-700">No se pudo cargar la informacion</p>
            <p className="empty-state-description">{error}</p>
            <button type="button" className="btn-success mt-4" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        ) : (
          vista === 'indicadores' && (
            actividades.length === 0 ? (
              <div className="card empty-state">
                <p className="empty-state-title">Todavia no hay actividades registradas</p>
                <p className="empty-state-description">Los indicadores aparecen cuando los gestores empiecen a registrar.</p>
              </div>
            ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <KPI etiqueta="Total de operativos" valor={ritmo.total} />
              <KPI etiqueta="Ultimos 20 dias" valor={ritmo.ultimos20d} />
              <KPI etiqueta="Esta semana" valor={ritmo.estaSemana} />
              <KPI etiqueta="Programadas pendientes" valor={programadasPendientes} />
            </div>

            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Por estado</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(porEstado).map(([estado, total]) => (
                  <span key={estado} className="px-3 py-1 rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">
                    {estado}: {total}
                  </span>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Por barrio</h2>
                <p className="card-subtitle">{barrios.length} barrios con actividad</p>
              </div>
              <div className="space-y-2">
                {barrios.slice(0, 15).map((b) => (
                  <div key={b.barrio} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-sm text-neutral-700 truncate">{b.barrio}</span>
                    <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.round((b.total / maxBarrio) * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-bold text-neutral-800">{b.total}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Puntos donde se volvio a intervenir varias veces: no es lo mismo
                hacer tres operativos en tres lugares que tres en la misma esquina. */}
            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Puntos con intervencion repetida</h2>
                <p className="card-subtitle">
                  Lugares con 3 o mas operativos a menos de 50 metros entre si
                </p>
              </div>
              {reincidentes.length === 0 ? (
                <p className="text-neutral-500">Todavia no hay puntos con intervencion repetida.</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Barrio</th>
                        <th className="table-header-cell">Operativos</th>
                        <th className="table-header-cell">Ubicacion</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {reincidentes.slice(0, 10).map((c, i) => (
                        <tr key={i} className="table-row">
                          <td className="table-cell">{c.barrio}</td>
                          <td className="table-cell font-bold">{c.eventos}</td>
                          <td className="table-cell text-neutral-500">
                            {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Informe</h2>
              </div>
              <DescargarInforme mostrarSelectorGestor gestores={gestores} />
            </section>
          </>
            )
          )
        )}
      </main>
    </div>
  );
};
