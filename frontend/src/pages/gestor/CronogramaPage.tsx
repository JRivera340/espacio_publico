import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { programacionService, type ProgramacionItem } from '../../services/programacion.service';
import { usersService, type GestorResumen } from '../../services/users.service';
import { useAuthStore } from '../../store/authStore';
import { mensajeDeError } from '../../utils/errorMessage';
import { mismoDia } from '../../lib/calendar.lib';
import { MonthCalendar } from '../../components/MonthCalendar';
import { Loading } from '../../components/Loading';

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CUMPLIDA: 'Cumplida',
  CANCELADA: 'Cancelada',
};

export const CronogramaPage = () => {
  const idUsuarioActual = useAuthStore((s) => s.user?.id);
  const [items, setItems] = useState<ProgramacionItem[]>([]);
  const [gestores, setGestores] = useState<GestorResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(() => new Date());

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    Promise.all([programacionService.mias(), usersService.listarGestores()])
      .then(([lista, listaGestores]) => {
        if (!vigente) return;
        setItems(lista);
        setGestores(listaGestores);
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

  // Nombres de los companeros con los que se comparte una tarea (todos los
  // gestorUserIds menos el propio gestor que esta mirando la pantalla): sin
  // esto la tarea compartida se ve igual que una individual.
  const companerosDe = (item: ProgramacionItem): string[] =>
    (item.gestorUserIds ?? [])
      .filter((id) => id !== idUsuarioActual)
      .map((id) => gestores.find((g) => g.id === id)?.nombre ?? 'Gestor del area');

  // Las vencidas se calculan sobre TODO lo cargado, no solo el mes visible en
  // el calendario: son la alerta mas importante de la pantalla y no pueden
  // desaparecer solo porque el gestor esta mirando otro mes.
  const vencidas = useMemo(() => {
    const hoy = startOfDay(new Date());
    return items.filter((item) => item.estado === 'PENDIENTE' && isBefore(new Date(item.fecha), hoy));
  }, [items]);

  const itemsDelDiaSeleccionado = useMemo(
    () => (diaSeleccionado ? items.filter((item) => mismoDia(new Date(item.fecha), diaSeleccionado)) : []),
    [items, diaSeleccionado],
  );

  if (cargando) return <Loading />;

  const Fila = ({ item }: { item: ProgramacionItem }) => {
    const companeros = companerosDe(item);
    return (
      <div className="p-4 rounded-2xl border border-neutral-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-neutral-800">{item.descripcion}</p>
            <p className="text-sm text-neutral-500">
              {format(new Date(item.fecha), 'HH:mm', { locale: es })}
              {item.barrio ? ` - ${item.barrio}` : ''}
            </p>
            {companeros.length > 0 && (
              <p className="text-xs text-neutral-500 mt-1">
                Compartida con: {companeros.join(', ')}. Si cualquiera registra el operativo, se cumple para todos.
              </p>
            )}
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
  };

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
        ) : (
          <>
            {vencidas.length > 0 && (
              <section className="card border border-red-200 bg-red-50">
                <div className="card-header border-red-100">
                  <h2 className="card-title text-red-700">Vencidas sin registrar</h2>
                  <p className="card-subtitle">{vencidas.length} actividades pasaron de fecha</p>
                </div>
                <div className="space-y-3">
                  {vencidas.map((item) => (
                    <Fila key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Calendario y detalle del dia lado a lado en escritorio: elegir
                un dia y ver que toca hacer es una sola accion, no una que
                obligue a bajar la pagina para llegar a la respuesta. */}
            <section className="card">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
                <MonthCalendar
                  mes={mes}
                  onMesChange={setMes}
                  items={items}
                  diaSeleccionado={diaSeleccionado}
                  onSeleccionarDia={setDiaSeleccionado}
                />

                <div className="lg:sticky lg:top-4 lg:border-l lg:border-neutral-100 lg:pl-6">
                  <h2 className="card-title">
                    {diaSeleccionado
                      ? format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })
                      : 'Selecciona un dia'}
                  </h2>
                  <p className="card-subtitle mb-4">{itemsDelDiaSeleccionado.length} actividades programadas ese dia</p>

                  {itemsDelDiaSeleccionado.length === 0 ? (
                    items.length === 0 ? (
                      <div className="empty-state !py-6">
                        <p className="empty-state-title">No tenes actividades programadas</p>
                        <p className="empty-state-description">
                          Cuando el area cargue la programacion, tus actividades aparecen aca.
                        </p>
                        <Link to="/gestor/dashboard" className="btn-secondary mt-4 inline-flex">
                          Ir a mis actividades
                        </Link>
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-sm">Ningun operativo programado para este dia.</p>
                    )
                  ) : (
                    <div className="space-y-3">
                      {itemsDelDiaSeleccionado.map((item) => (
                        <Fila key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
