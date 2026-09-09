import { useMemo, useState } from 'react';
import { startOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MonthCalendar } from './MonthCalendar';
import { mismoDia } from '../lib/calendar.lib';
import { resumenDelMes, resumenPorGestor } from '../lib/desempenoGestor.lib';
import type { ProgramacionItem } from '../services/programacion.service';
import type { GestorResumen } from '../services/users.service';
import type { Actividad } from '../types';

export interface EquipoCronogramaPanelProps {
  programacion: ProgramacionItem[];
  actividades: Actividad[];
  gestores: GestorResumen[];
}

// Cronograma del equipo: mismo calendario que usa el gestor para el suyo,
// filtrable por gestor puntual o con la tabla comparativa de todos. Sin
// controles de edicion: la carga de programacion sigue siendo la pestana de
// al lado. Se monta igual en Programacion (validador) y en Administracion.
export const EquipoCronogramaPanel: React.FC<EquipoCronogramaPanelProps> = ({
  programacion, actividades, gestores,
}) => {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [gestorId, setGestorId] = useState('');
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(() => new Date());
  const [mostrarSinActividad, setMostrarSinActividad] = useState(false);

  const programacionFiltrada = useMemo(
    () => (gestorId ? programacion.filter((p) => p.gestorUserId === gestorId) : programacion),
    [programacion, gestorId],
  );

  const nombreDeGestor = (id?: string | null) =>
    id ? gestores.find((g) => g.id === id)?.nombre ?? 'Gestor del area' : 'Sin asignar';

  const itemsDelDia = useMemo(
    () => (diaSeleccionado ? programacionFiltrada.filter((p) => mismoDia(new Date(p.fecha), diaSeleccionado)) : []),
    [programacionFiltrada, diaSeleccionado],
  );

  const resumenIndividual = useMemo(
    () =>
      gestorId
        ? resumenDelMes(
            programacionFiltrada,
            actividades.filter((a) => a.createdByUserId === gestorId),
            mes,
            new Date(),
          )
        : null,
    [gestorId, programacionFiltrada, actividades, mes],
  );

  // Separado en dos grupos: la tabla de "todos" con cada gestor del area
  // (pueden ser decenas) se vuelve una pared de ceros ilegible si se listan
  // todos por igual. Los que no tienen nada programado este mes quedan
  // plegados aparte - la tabla principal muestra solo a quien le toco algo.
  const { equipoConActividad, equipoSinActividad } = useMemo(() => {
    if (gestorId) return { equipoConActividad: [], equipoSinActividad: [] };
    const todos = resumenPorGestor(programacion, actividades, mes, new Date(), gestores);
    return {
      equipoConActividad: todos.filter((f) => f.programadasMes > 0),
      equipoSinActividad: todos.filter((f) => f.programadasMes === 0),
    };
  }, [gestorId, programacion, actividades, mes, gestores]);

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <label className="input-label" htmlFor="filtroGestorCronograma">
          Gestor
        </label>
        <select
          id="filtroGestorCronograma"
          className="select-field"
          value={gestorId}
          onChange={(e) => setGestorId(e.target.value)}
        >
          <option value="">Todos los gestores</option>
          {gestores.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Calendario y detalle del dia lado a lado en escritorio: elegir un
          dia y ver que le toca es una sola accion, no una que obligue a
          bajar la pagina para encontrar la respuesta. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <MonthCalendar
          mes={mes}
          onMesChange={setMes}
          items={programacionFiltrada}
          diaSeleccionado={diaSeleccionado}
          onSeleccionarDia={setDiaSeleccionado}
        />

        <div className="lg:sticky lg:top-4 space-y-4">
          <div>
            <h3 className="font-bold text-neutral-800 mb-2">
              {diaSeleccionado ? format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un dia'}
            </h3>
            {itemsDelDia.length === 0 ? (
              <p className="text-neutral-500 text-sm">Nada programado este dia{gestorId ? ' para este gestor' : ''}.</p>
            ) : (
              <div className="space-y-2">
                {itemsDelDia.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl border border-neutral-100">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-neutral-800 text-sm">{item.descripcion}</p>
                      <span className="text-xs font-semibold text-neutral-500 shrink-0">{item.estado}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {nombreDeGestor(item.gestorUserId)}
                      {item.barrio ? ` - ${item.barrio}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {resumenIndividual && (
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3">
                <p className="card-subtitle">Programadas</p>
                <p className="text-lg font-bold text-neutral-800">{resumenIndividual.programadasMes}</p>
              </div>
              <div className="card p-3">
                <p className="card-subtitle">Cumplidas</p>
                <p className="text-lg font-bold text-neutral-800">{resumenIndividual.cumplidasMes}</p>
              </div>
              <div className="card p-3">
                <p className="card-subtitle">Vencidas</p>
                <p className="text-lg font-bold text-red-600">{resumenIndividual.vencidasMes}</p>
              </div>
              <div className="card p-3">
                <p className="card-subtitle">Cumplimiento</p>
                <p className="text-lg font-bold text-neutral-800">{resumenIndividual.porcentajeCumplimiento}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {equipoConActividad.length > 0 && (
        <div>
          <h3 className="font-bold text-neutral-800 mb-2">Con actividad programada este mes</h3>
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Gestor</th>
                  <th className="table-header-cell">Programadas</th>
                  <th className="table-header-cell">Cumplidas</th>
                  <th className="table-header-cell">Vencidas</th>
                  <th className="table-header-cell">Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {equipoConActividad.map((fila) => (
                  <tr key={fila.gestorId} className="table-row">
                    <td className="table-cell font-semibold">{fila.nombre}</td>
                    <td className="table-cell">{fila.programadasMes}</td>
                    <td className="table-cell">{fila.cumplidasMes}</td>
                    <td className="table-cell text-red-600">{fila.vencidasMes}</td>
                    <td className="table-cell font-bold">{fila.porcentajeCumplimiento}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {equipoSinActividad.length > 0 && (
        <div>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setMostrarSinActividad((v) => !v)}
          >
            {mostrarSinActividad ? 'Ocultar' : 'Mostrar'} {equipoSinActividad.length} gestor
            {equipoSinActividad.length === 1 ? '' : 'es'} sin nada programado este mes
          </button>
          {mostrarSinActividad && (
            <div className="table-container mt-3">
              <table className="table">
                <tbody className="table-body">
                  {equipoSinActividad.map((fila) => (
                    <tr key={fila.gestorId} className="table-row">
                      <td className="table-cell text-neutral-600">{fila.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
