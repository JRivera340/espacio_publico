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

  const resumenIndividual = gestorId
    ? resumenDelMes(
        programacionFiltrada,
        actividades.filter((a) => a.createdByUserId === gestorId),
        mes,
        new Date(),
      )
    : null;

  const resumenEquipo = gestorId ? [] : resumenPorGestor(programacion, actividades, mes, new Date(), gestores);

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

      <MonthCalendar
        mes={mes}
        onMesChange={setMes}
        items={programacionFiltrada}
        diaSeleccionado={diaSeleccionado}
        onSeleccionarDia={setDiaSeleccionado}
      />

      <div>
        <h3 className="font-bold text-neutral-800 mb-2">
          {diaSeleccionado ? format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un dia'}
        </h3>
        {itemsDelDia.length === 0 ? (
          <p className="text-neutral-500">Nada programado este dia{gestorId ? ' para este gestor' : ''}.</p>
        ) : (
          <div className="space-y-2">
            {itemsDelDia.map((item) => (
              <div key={item.id} className="p-3 rounded-xl border border-neutral-100 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-800">{item.descripcion}</p>
                  <p className="text-xs text-neutral-500">
                    {nombreDeGestor(item.gestorUserId)}
                    {item.barrio ? ` - ${item.barrio}` : ''}
                  </p>
                </div>
                <span className="text-xs font-semibold text-neutral-500 shrink-0">{item.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {resumenIndividual && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card">
            <p className="card-subtitle">Programadas</p>
            <p className="text-xl font-bold text-neutral-800">{resumenIndividual.programadasMes}</p>
          </div>
          <div className="card">
            <p className="card-subtitle">Cumplidas</p>
            <p className="text-xl font-bold text-neutral-800">{resumenIndividual.cumplidasMes}</p>
          </div>
          <div className="card">
            <p className="card-subtitle">Vencidas</p>
            <p className="text-xl font-bold text-red-600">{resumenIndividual.vencidasMes}</p>
          </div>
          <div className="card">
            <p className="card-subtitle">Cumplimiento</p>
            <p className="text-xl font-bold text-neutral-800">{resumenIndividual.porcentajeCumplimiento}%</p>
          </div>
        </div>
      )}

      {resumenEquipo.length > 0 && (
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
              {resumenEquipo.map((fila) => (
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
      )}
    </div>
  );
};
