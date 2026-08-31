import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { programacionService, type ProgramacionItem } from '../../services/programacion.service';
import { mensajeDeError } from '../../utils/errorMessage';
import { Loading } from '../../components/Loading';

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CUMPLIDA: 'Cumplida',
  CANCELADA: 'Cancelada',
};

export const CronogramaPage = () => {
  const [items, setItems] = useState<ProgramacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    programacionService
      .mias()
      .then((lista) => {
        if (!vigente) return;
        setItems(lista);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setItems([]);
        setError(mensajeDeError(err) ?? 'No se pudo cargar el cronograma');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const { pendientes, vencidas, cerradas } = useMemo(() => {
    const hoy = startOfDay(new Date());
    const pendientes: ProgramacionItem[] = [];
    const vencidas: ProgramacionItem[] = [];
    const cerradas: ProgramacionItem[] = [];
    for (const item of items) {
      if (item.estado !== 'PENDIENTE') {
        cerradas.push(item);
      } else if (isBefore(new Date(item.fecha), hoy)) {
        vencidas.push(item);
      } else {
        pendientes.push(item);
      }
    }
    return { pendientes, vencidas, cerradas };
  }, [items]);

  if (cargando) return <Loading />;

  const Fila = ({ item, atrasada }: { item: ProgramacionItem; atrasada?: boolean }) => (
    <div
      className={`p-4 rounded-2xl border ${atrasada ? 'border-red-200 bg-red-50' : 'border-neutral-100'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-800">{item.descripcion}</p>
          <p className="text-sm text-neutral-500">
            {format(new Date(item.fecha), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
            {item.barrio ? ` - ${item.barrio}` : ''}
          </p>
        </div>
        <span className="text-xs font-semibold text-neutral-500 shrink-0">
          {ETIQUETA_ESTADO[item.estado] ?? item.estado}
        </span>
      </div>
      {item.estado === 'PENDIENTE' && (
        <Link to="/gestor/crear-actividad" className="btn-success btn-sm mt-3 inline-flex">
          Registrar esta actividad
        </Link>
      )}
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Mi cronograma</h1>
          <p className="page-subtitle">Las actividades que tenes programadas por el area</p>
        </div>
      </div>

      <main className="page-content space-y-6">
        {error ? (
          <div className="card empty-state" role="alert">
            <p className="empty-state-title text-red-700">No se pudo cargar el cronograma</p>
            <p className="empty-state-description">{error}</p>
            <button type="button" className="btn-success mt-4" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state-title">No tenes actividades programadas</p>
            <p className="empty-state-description">
              Cuando el area cargue la programacion, tus actividades aparecen aca.
            </p>
            <Link to="/gestor/dashboard" className="btn-secondary mt-4 inline-flex">
              Ir a mis actividades
            </Link>
          </div>
        ) : (
          <>
            {/* Las vencidas van primero: son las que ya se pasaron de fecha y
                todavia nadie registro. Enterrarlas al final es como no tenerlas. */}
            {vencidas.length > 0 && (
              <section className="card">
                <div className="card-header">
                  <h2 className="card-title text-red-700">Vencidas sin registrar</h2>
                  <p className="card-subtitle">{vencidas.length} actividades pasaron de fecha</p>
                </div>
                <div className="space-y-3">
                  {vencidas.map((item) => (
                    <Fila key={item.id} item={item} atrasada />
                  ))}
                </div>
              </section>
            )}

            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Proximas</h2>
                <p className="card-subtitle">{pendientes.length} actividades por hacer</p>
              </div>
              {pendientes.length === 0 ? (
                <p className="text-neutral-500">No tenes actividades proximas.</p>
              ) : (
                <div className="space-y-3">
                  {pendientes.map((item) => (
                    <Fila key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>

            {cerradas.length > 0 && (
              <section className="card">
                <div className="card-header">
                  <h2 className="card-title">Cerradas</h2>
                  <p className="card-subtitle">{cerradas.length} actividades</p>
                </div>
                <div className="space-y-3">
                  {cerradas.map((item) => (
                    <Fila key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};
