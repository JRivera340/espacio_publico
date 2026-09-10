import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  programacionService,
  type ProgramacionItem,
  type NuevoProgramacionItem,
} from '../../services/programacion.service';
import { usersService, type GestorResumen } from '../../services/users.service';
import { catalogService } from '../../services/catalog.service';
import { activityService } from '../../services/activity.service';
import { mensajeDeError } from '../../utils/errorMessage';
import { Loading } from '../../components/Loading';
import { Toast } from '../../components/Toast';
import { EquipoCronogramaPanel } from '../../components/EquipoCronogramaPanel';
import { MultiSelectCombobox } from '../../components/MultiSelectCombobox';
import type { Actividad } from '../../types';

interface FilaNueva {
  fecha: string;
  barrio: string;
  descripcion: string;
  gestoresIds: string[];
}

const FILA_VACIA: FilaNueva = { fecha: '', barrio: '', descripcion: '', gestoresIds: [] };

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CUMPLIDA: 'Cumplida',
  CANCELADA: 'Cancelada',
};

export const ProgramacionPage = () => {
  const [items, setItems] = useState<ProgramacionItem[]>([]);
  const [gestores, setGestores] = useState<GestorResumen[]>([]);
  const [barrios, setBarrios] = useState<string[]>([]);
  const [filas, setFilas] = useState<FilaNueva[]>([{ ...FILA_VACIA }]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [vista, setVista] = useState<'cargar' | 'cronograma'>('cargar');

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    programacionService
      .listar()
      .then((lista) => {
        if (!vigente) return;
        setItems(lista);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setItems([]);
        setError(mensajeDeError(err) ?? 'No se pudo cargar la programacion');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  // Gestores y barrios se piden aparte: si alguno falla, la programacion se
  // sigue pudiendo cargar. Un catalogo caido no puede frenar la planeacion.
  useEffect(() => {
    let vigente = true;
    usersService
      .listarGestores()
      .then((lista) => vigente && setGestores(lista))
      .catch(() => vigente && setGestores([]));
    catalogService
      .getBarrios()
      .then((lista) => vigente && setBarrios(lista ?? []))
      .catch(() => vigente && setBarrios([]));
    return () => {
      vigente = false;
    };
  }, []);

  // Solo para los KPIs de la pestana de cronograma del equipo: si falla, esa
  // pestana muestra ceros en vez de romper la carga de programacion. Se pide
  // recien cuando se entra a esa pestana, no en cada carga de la pagina.
  useEffect(() => {
    if (vista !== 'cronograma') return;
    let vigente = true;
    activityService
      .listAll({ limit: 5000 })
      .then((respuesta) => vigente && setActividades(respuesta.data))
      .catch(() => vigente && setActividades([]));
    return () => {
      vigente = false;
    };
  }, [vista]);

  const cambiarFila = (indice: number, campo: Exclude<keyof FilaNueva, 'gestoresIds'>, valor: string) => {
    setFilas((previas) => previas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  };

  const cambiarFilaGestores = (indice: number, gestoresIds: string[]) => {
    setFilas((previas) => previas.map((f, i) => (i === indice ? { ...f, gestoresIds } : f)));
  };

  const agregarFila = () => setFilas((previas) => [...previas, { ...FILA_VACIA }]);
  const quitarFila = (indice: number) =>
    setFilas((previas) => (previas.length === 1 ? previas : previas.filter((_, i) => i !== indice)));

  const guardar = async () => {
    const completas = filas.filter((f) => f.fecha && f.descripcion.trim());
    if (completas.length === 0) {
      setToast({ message: 'Cada linea necesita al menos fecha y descripcion', type: 'error' });
      return;
    }

    const aEnviar: NuevoProgramacionItem[] = completas.map((f) => ({
      fecha: new Date(f.fecha).toISOString(),
      descripcion: f.descripcion.trim(),
      ...(f.barrio ? { barrio: f.barrio } : {}),
      ...(f.gestoresIds.length > 0 ? { gestorUserIds: f.gestoresIds } : {}),
    }));

    setGuardando(true);
    try {
      await programacionService.crear(aEnviar);
      setToast({ message: `Se cargaron ${aEnviar.length} actividades programadas`, type: 'success' });
      setFilas([{ ...FILA_VACIA }]);
      setIntento((n) => n + 1);
    } catch (err) {
      const motivo = mensajeDeError(err);
      if (motivo) setToast({ message: motivo, type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: string) => {
    try {
      await programacionService.eliminar(id);
      setItems((previos) => previos.filter((i) => i.id !== id));
    } catch (err) {
      const motivo = mensajeDeError(err);
      if (motivo) setToast({ message: motivo, type: 'error' });
    }
  };

  const nombreDeGestor = (id?: string | null) =>
    id ? gestores.find((g) => g.id === id)?.nombre ?? 'Gestor del area' : 'Sin asignar';

  if (cargando) return <Loading />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Programacion</h1>
          <p className="page-subtitle">Lo que los gestores tienen que hacer. Ellos lo ven en su cronograma.</p>
        </div>
      </div>

      <main className="page-content space-y-6">
        <div className="nav-tabs mb-2">
          <button type="button" className={vista === 'cargar' ? 'nav-tab-active' : 'nav-tab'} onClick={() => setVista('cargar')}>
            Cargar programacion
          </button>
          <button type="button" className={vista === 'cronograma' ? 'nav-tab-active' : 'nav-tab'} onClick={() => setVista('cronograma')}>
            Cronograma del equipo
          </button>
        </div>

        {vista === 'cronograma' && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Cronograma del equipo</h2>
              <p className="card-subtitle">Filtra por gestor para ver su cronograma y su cumplimiento del mes</p>
            </div>
            <EquipoCronogramaPanel programacion={items} actividades={actividades} gestores={gestores} />
          </section>
        )}

        {vista === 'cargar' && (
          <>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Cargar programacion</h2>
            <p className="card-subtitle">
              Agrega una linea por actividad programada. Se guardan todas juntas.
            </p>
          </div>

          <div className="space-y-4">
            {filas.map((fila, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="input-label" htmlFor={`fecha-${i}`}>
                    Fecha
                  </label>
                  <input
                    id={`fecha-${i}`}
                    type="datetime-local"
                    className="input-field"
                    value={fila.fecha}
                    onChange={(e) => cambiarFila(i, 'fecha', e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label" htmlFor={`barrio-${i}`}>
                    Barrio
                  </label>
                  <select
                    id={`barrio-${i}`}
                    className="select-field"
                    value={fila.barrio}
                    onChange={(e) => cambiarFila(i, 'barrio', e.target.value)}
                  >
                    <option value="">Sin barrio definido</option>
                    {barrios.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <MultiSelectCombobox
                    legend="Gestores asignados"
                    placeholder="Sin asignar"
                    options={gestores.map((g) => ({ value: g.id, label: g.nombre }))}
                    selected={fila.gestoresIds}
                    onChange={(seleccion) => cambiarFilaGestores(i, seleccion)}
                    emptyMessage="No hay gestores del area para asignar."
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="input-label" htmlFor={`descripcion-${i}`}>
                      Que hay que hacer
                    </label>
                    <input
                      id={`descripcion-${i}`}
                      type="text"
                      className="input-field"
                      placeholder="Operativo de recuperacion de andenes"
                      value={fila.descripcion}
                      onChange={(e) => cambiarFila(i, 'descripcion', e.target.value)}
                    />
                  </div>
                  {filas.length > 1 && (
                    <button type="button" className="btn-ghost btn-sm self-end" onClick={() => quitarFila(i)}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button type="button" className="btn-secondary btn-sm" onClick={agregarFila}>
              Agregar otra linea
            </button>
            <button type="button" className="btn-success btn-sm" disabled={guardando} onClick={guardar}>
              {guardando ? 'Guardando...' : 'Guardar programacion'}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Programacion cargada</h2>
            <p className="card-subtitle">{items.length} actividades programadas</p>
          </div>

          {error ? (
            <div className="empty-state" role="alert">
              <p className="empty-state-title text-red-700">No se pudo cargar la programacion</p>
              <p className="empty-state-description">{error}</p>
              <button type="button" className="btn-success mt-4" onClick={() => setIntento((n) => n + 1)}>
                Reintentar
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">Todavia no hay programacion cargada</p>
              <p className="empty-state-description">Lo que cargues aca les aparece a los gestores en su cronograma.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Fecha</th>
                    <th className="table-header-cell">Barrio</th>
                    <th className="table-header-cell">Que hay que hacer</th>
                    <th className="table-header-cell">Gestor</th>
                    <th className="table-header-cell">Estado</th>
                    <th className="table-header-cell text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {items.map((item) => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell">
                        {format(new Date(item.fecha), 'dd MMM yyyy, HH:mm', { locale: es })}
                      </td>
                      <td className="table-cell">{item.barrio || 'Sin definir'}</td>
                      <td className="table-cell">{item.descripcion}</td>
                      <td className="table-cell">
                        {item.gestorUserIds.length === 0
                          ? 'Sin asignar'
                          : item.gestorUserIds.map((id) => nombreDeGestor(id)).join(', ')}
                      </td>
                      <td className="table-cell">{ETIQUETA_ESTADO[item.estado] ?? item.estado}</td>
                      <td className="table-cell text-right">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => eliminar(item.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Link to="/validador/dashboard" className="btn-secondary inline-flex">
          Volver a validacion
        </Link>
          </>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
