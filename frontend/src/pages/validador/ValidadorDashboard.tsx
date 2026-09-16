import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { activityService } from '../../services/activity.service';
import { mensajeDeError } from '../../utils/errorMessage';
import { getActivityCode } from '../../utils/activityCode';
import { StatusBadge } from '../../components/StatusBadge';
import { Loading } from '../../components/Loading';
import { DescargarInforme } from '../../components/DescargarInforme';
import { StatCard } from '../../components/StatCard';
import { filterActividades, barriosUnicos, type DashboardFilters } from '../gestor/lib/dashboardFilters';
import type { Actividad, ActividadStatus } from '../../types';

type Pestana = 'pendientes' | 'historial';

export const ValidadorDashboard = () => {
  const [pestana, setPestana] = useState<Pestana>('pendientes');
  const [pendientes, setPendientes] = useState<Actividad[]>([]);
  const [validadas, setValidadas] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [statusFilter, setStatusFilter] = useState<ActividadStatus | ''>('');
  const [barrioFilter, setBarrioFilter] = useState('');
  const [turnoFilter, setTurnoFilter] = useState<DashboardFilters['turno']>('');
  const [desdeFilter, setDesdeFilter] = useState('');
  const [hastaFilter, setHastaFilter] = useState('');

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    Promise.all([activityService.listPending({ limit: 200 }), activityService.listMyValidations({ limit: 200 })])
      .then(([sinValidar, hechas]) => {
        if (!vigente) return;
        setPendientes(sinValidar.data);
        setValidadas(hechas.data);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setPendientes([]);
        setValidadas([]);
        setError(mensajeDeError(err) ?? 'No se pudo cargar la informacion');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const listaBase = pestana === 'pendientes' ? pendientes : validadas;

  const lista = filterActividades(listaBase, {
    status: statusFilter,
    barrio: barrioFilter,
    turno: turnoFilter,
  }).filter((a) => {
    const fecha = a.dateTime.slice(0, 10);
    if (desdeFilter && fecha < desdeFilter) return false;
    if (hastaFilter && fecha > hastaFilter) return false;
    return true;
  });

  const barrios = barriosUnicos(listaBase);
  const hayFiltrosActivos = Boolean(statusFilter || barrioFilter || turnoFilter || desdeFilter || hastaFilter);
  const limpiarFiltros = () => {
    setStatusFilter('');
    setBarrioFilter('');
    setTurnoFilter('');
    setDesdeFilter('');
    setHastaFilter('');
  };

  if (cargando) return <Loading />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Validacion</h1>
          <p className="page-subtitle">Espacio publico - actividades del articulo 1801</p>
        </div>
      </div>

      <main className="page-content">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard icon={ClipboardList} tone="primary" label="Esperando validacion" value={pendientes.length} />
          <StatCard icon={CheckCircle2} tone="success" label="Validadas por mi" value={validadas.length} />
          <div className="card flex flex-col justify-center gap-2">
            <Link to="/validador/programacion" className="btn-success btn-sm w-full justify-center">
              Cargar programacion
            </Link>
            <DescargarInforme />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setPestana('pendientes')}
            className={pestana === 'pendientes' ? 'btn-success btn-sm' : 'btn-ghost btn-sm'}
          >
            Pendientes
          </button>
          <button
            type="button"
            onClick={() => setPestana('historial')}
            className={pestana === 'historial' ? 'btn-success btn-sm' : 'btn-ghost btn-sm'}
          >
            Historial
          </button>
        </div>

        <div className="filters-container mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-700">Filtros</h3>
            {hayFiltrosActivos && (
              <button type="button" onClick={limpiarFiltros} className="btn-ghost btn-sm text-neutral-500">
                Limpiar
              </button>
            )}
          </div>
          <div className="filters-grid">
            {pestana === 'historial' && (
              <div className="filter-group">
                <label className="input-label" htmlFor="filtro-estado">
                  Estado
                </label>
                <select
                  id="filtro-estado"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ActividadStatus | '')}
                  className="select-field"
                >
                  <option value="">Todos los estados</option>
                  <option value="PUBLICADA">Publicadas</option>
                  <option value="RECHAZADA">Rechazadas</option>
                </select>
              </div>
            )}
            <div className="filter-group">
              <label className="input-label" htmlFor="filtro-barrio">
                Barrio
              </label>
              <select
                id="filtro-barrio"
                value={barrioFilter}
                onChange={(e) => setBarrioFilter(e.target.value)}
                className="select-field"
              >
                <option value="">Todos los barrios</option>
                {barrios.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="input-label" htmlFor="filtro-turno">
                Turno
              </label>
              <select
                id="filtro-turno"
                value={turnoFilter}
                onChange={(e) => setTurnoFilter(e.target.value as DashboardFilters['turno'])}
                className="select-field"
              >
                <option value="">Todos los turnos</option>
                <option value="DIURNO">Diurno</option>
                <option value="NOCTURNO">Nocturno</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="input-label" htmlFor="filtro-desde">
                Desde
              </label>
              <input
                id="filtro-desde"
                type="date"
                className="input-field"
                value={desdeFilter}
                onChange={(e) => setDesdeFilter(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label className="input-label" htmlFor="filtro-hasta">
                Hasta
              </label>
              <input
                id="filtro-hasta"
                type="date"
                className="input-field"
                value={hastaFilter}
                onChange={(e) => setHastaFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{pestana === 'pendientes' ? 'Esperando validacion' : 'Historial'}</h2>
            <p className="card-subtitle">{lista.length} actividades</p>
          </div>

          {error ? (
            <div className="empty-state" role="alert">
              <p className="empty-state-title text-red-700">No se pudo cargar la informacion</p>
              <p className="empty-state-description">{error}</p>
              <button type="button" className="btn-success mt-4" onClick={() => setIntento((n) => n + 1)}>
                Reintentar
              </button>
            </div>
          ) : lista.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">
                {hayFiltrosActivos
                  ? 'Ningun resultado con estos filtros'
                  : pestana === 'pendientes'
                    ? 'No hay actividades esperando validacion'
                    : 'Todavia no validaste ninguna'}
              </p>
              <p className="empty-state-description">
                {hayFiltrosActivos
                  ? 'Proba quitando algun filtro.'
                  : pestana === 'pendientes'
                    ? 'Cuando un gestor envie una actividad, aparece aca.'
                    : 'Las actividades que apruebes o rechaces quedan en esta lista.'}
              </p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3" data-testid="lista-movil">
                {lista.map((a) => (
                  <Link
                    key={a.id}
                    to={`/validador/actividad/${a.id}`}
                    className="block p-4 rounded-2xl border border-neutral-100 hover:shadow-card transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-bold text-amber-700">{getActivityCode(a)}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="font-semibold text-neutral-800">{a.barrio}</p>
                    <p className="text-sm text-neutral-500">
                      {format(new Date(a.dateTime), 'dd MMM yyyy, HH:mm', { locale: es })}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="hidden md:block table-container">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Codigo</th>
                      <th className="table-header-cell">Fecha</th>
                      <th className="table-header-cell">Barrio</th>
                      <th className="table-header-cell">Estado</th>
                      <th className="table-header-cell text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {lista.map((a) => (
                      <tr key={a.id} className="table-row">
                        <td className="table-cell font-bold text-amber-700">{getActivityCode(a)}</td>
                        <td className="table-cell">
                          {format(new Date(a.dateTime), 'dd MMM yyyy, HH:mm', { locale: es })}
                        </td>
                        <td className="table-cell">{a.barrio}</td>
                        <td className="table-cell">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="table-cell text-right">
                          <Link to={`/validador/actividad/${a.id}`} className="btn-success btn-sm">
                            {pestana === 'pendientes' ? 'Revisar' : 'Ver'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
