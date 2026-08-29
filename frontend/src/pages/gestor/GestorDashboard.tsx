import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../../services/activity.service';
import { Loading } from '../../components/Loading';
import { Pagination } from '../../components/Pagination';
import type { Actividad, ActividadStatus } from '../../types';
import { getActivityCode } from '../../utils/activityCode';
import { filterActividades, barriosUnicos, esEditable, inicioDeMes, finDeMes } from './lib/dashboardFilters';

const ITEMS_PER_PAGE = 10;

const BADGE_POR_ESTADO: Record<ActividadStatus, string> = {
  BORRADOR: 'badge-borrador',
  ENVIADA: 'badge-enviada',
  APROBADA: 'badge-aprobada',
  RECHAZADA: 'badge-rechazada',
  PUBLICADA: 'badge-publicada',
};

const ETIQUETA_POR_ESTADO: Record<ActividadStatus, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'En validacion',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PUBLICADA: 'Publicada',
};

// Panel del gestor de espacio publico: sus propias actividades, nada mas.
// El area es fija (1801 - Espacio Publico), asi que a diferencia del
// original del hub no hay categoria por parametro ni configuracion por
// modulo - las rutas y etiquetas van directas.
export const GestorDashboard: React.FC = () => {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ enviada: 0, aprobada: 0, rechazada: 0 });

  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ActividadStatus | ''>('');
  const [barrioFilter, setBarrioFilter] = useState('');
  const [turnoFilter, setTurnoFilter] = useState<'' | 'DIURNO' | 'NOCTURNO'>('');
  const [desdeFilter, setDesdeFilter] = useState(inicioDeMes());
  const [hastaFilter, setHastaFilter] = useState(finDeMes());

  // listMine ya filtra por el gestor autenticado del lado del servidor - esta
  // pantalla no ofrece ninguna forma de pedir actividades de otro gestor.
  useEffect(() => {
    let vigente = true;
    setLoading(true);
    activityService
      .listMine({
        desde: desdeFilter,
        hasta: hastaFilter,
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      })
      .then((respuesta) => {
        if (!vigente) return;
        setActividades(respuesta.data || []);
        setTotal(respuesta.total || 0);
      })
      .catch(() => {
        if (!vigente) return;
        setActividades([]);
        setTotal(0);
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });
    return () => {
      vigente = false;
    };
  }, [desdeFilter, hastaFilter, currentPage]);

  useEffect(() => {
    let vigente = true;
    activityService
      .misEstadisticas({ desde: desdeFilter, hasta: hastaFilter })
      .then((respuesta) => {
        if (vigente) setStats(respuesta);
      })
      .catch(() => {
        if (vigente) setStats({ enviada: 0, aprobada: 0, rechazada: 0 });
      });
    return () => {
      vigente = false;
    };
  }, [desdeFilter, hastaFilter]);

  const barrios = useMemo(() => barriosUnicos(actividades), [actividades]);
  const totalPaginas = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const actividadesFiltradas = useMemo(
    () => filterActividades(actividades, { status: statusFilter, barrio: barrioFilter, turno: turnoFilter }),
    [actividades, statusFilter, barrioFilter, turnoFilter],
  );

  const hayFiltrosActivos = Boolean(
    statusFilter || barrioFilter || turnoFilter || desdeFilter !== inicioDeMes() || hastaFilter !== finDeMes(),
  );

  const limpiarFiltros = () => {
    setStatusFilter('');
    setBarrioFilter('');
    setTurnoFilter('');
    setDesdeFilter(inicioDeMes());
    setHastaFilter(finDeMes());
    setCurrentPage(1);
  };

  if (loading) return <Loading />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Panel del gestor</h1>
          <p className="page-subtitle">Espacio publico - actividades del articulo 1801</p>
        </div>
      </div>

      <main className="page-content">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="card-subtitle">En validacion</p>
            <p className="text-2xl font-bold text-primary">{stats.enviada}</p>
          </div>
          <div className="card">
            <p className="card-subtitle">Aprobadas</p>
            <p className="text-2xl font-bold text-success">{stats.aprobada}</p>
          </div>
          <div className="card">
            <p className="card-subtitle">Rechazadas</p>
            <p className="text-2xl font-bold text-red-600">{stats.rechazada}</p>
          </div>
        </div>

        <div className="mb-6">
          <Link to="/gestor/crear-actividad" className="btn-success btn-lg w-full sm:w-auto">
            Registrar nueva actividad
          </Link>
        </div>

        <div className="filters-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-700">Filtros</h3>
            {hayFiltrosActivos && (
              <button onClick={limpiarFiltros} className="btn-ghost btn-sm text-neutral-500">
                Limpiar
              </button>
            )}
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label className="input-label">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ActividadStatus | '')}
                className="select-field"
              >
                <option value="">Todos los estados</option>
                <option value="ENVIADA">En validacion</option>
                <option value="PUBLICADA">Publicadas</option>
                <option value="RECHAZADA">Rechazadas</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="input-label">Barrio</label>
              <select value={barrioFilter} onChange={(e) => setBarrioFilter(e.target.value)} className="select-field">
                <option value="">Todos los barrios</option>
                {barrios.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="input-label">Turno</label>
              <select
                value={turnoFilter}
                onChange={(e) => setTurnoFilter(e.target.value as '' | 'DIURNO' | 'NOCTURNO')}
                className="select-field"
              >
                <option value="">Todos los turnos</option>
                <option value="DIURNO">Diurno</option>
                <option value="NOCTURNO">Nocturno</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="input-label">Desde</label>
              <input
                type="date"
                className="input-field"
                value={desdeFilter}
                onChange={(e) => {
                  setDesdeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="filter-group">
              <label className="input-label">Hasta</label>
              <input
                type="date"
                className="input-field"
                value={hastaFilter}
                onChange={(e) => {
                  setHastaFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {actividadesFiltradas.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPaginas}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={total}
          />
        )}

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="card-title">Mis actividades</h2>
              <p className="card-subtitle">
                {actividadesFiltradas.length} de {total} registros
              </p>
            </div>
          </div>

          {actividadesFiltradas.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">
                {actividades.length === 0 ? 'Aun no tienes actividades registradas' : 'Sin resultados para estos filtros'}
              </p>
              <p className="empty-state-description">
                {actividades.length === 0
                  ? 'Registra tu primer operativo de espacio publico'
                  : 'Ajusta los filtros para ver mas actividades'}
              </p>
              {actividades.length === 0 && (
                <Link to="/gestor/crear-actividad" className="btn-success mt-4 inline-flex">
                  Registrar actividad
                </Link>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Codigo</th>
                    <th className="table-header-cell">Fecha</th>
                    <th className="table-header-cell">Barrio</th>
                    <th className="table-header-cell">Turno</th>
                    <th className="table-header-cell">Estado</th>
                    <th className="table-header-cell text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {actividadesFiltradas.map((a) => (
                    <tr key={a.id} className="table-row">
                      <td className="table-cell font-bold text-amber-700">{getActivityCode(a)}</td>
                      <td className="table-cell">{format(new Date(a.dateTime), 'dd MMM yyyy, HH:mm', { locale: es })}</td>
                      <td className="table-cell">{a.barrio}</td>
                      <td className="table-cell">{a.isNightShift ? 'Nocturno' : 'Diurno'}</td>
                      <td className="table-cell">
                        <span className={BADGE_POR_ESTADO[a.status]}>{ETIQUETA_POR_ESTADO[a.status]}</span>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/gestor/actividad/${a.id}`} className="btn-ghost btn-sm">
                            Ver
                          </Link>
                          {esEditable(a) && (
                            <Link to={`/gestor/editar-actividad/${a.id}`} className="btn-success btn-sm">
                              Editar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {actividadesFiltradas.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPaginas}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={total}
            />
          )}
        </div>
      </main>
    </div>
  );
};
