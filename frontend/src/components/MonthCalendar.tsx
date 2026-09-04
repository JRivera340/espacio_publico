import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { gridDelMes, mesSiguiente, mesAnterior, tituloMes, mismoDia } from '../lib/calendar.lib';
import type { ProgramacionItem } from '../services/programacion.service';

export interface MonthCalendarProps {
  mes: Date;
  onMesChange: (mes: Date) => void;
  items: ProgramacionItem[];
  diaSeleccionado: Date | null;
  onSeleccionarDia: (fecha: Date) => void;
}

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-amber-500',
  CUMPLIDA: 'bg-success',
  CANCELADA: 'bg-neutral-400',
};

const DIAS_SEMANA = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

// Calendario de un mes con indicadores por dia. No sabe nada de "cronograma"
// ni de roles: solo pinta ProgramacionItem[] contra una grilla de fechas y
// avisa clics. Lo reutilizan el gestor (su propio cronograma), el validador
// (cronograma por gestor) y el admin (el mismo, en solo lectura).
export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  mes, onMesChange, items, diaSeleccionado, onSeleccionarDia,
}) => {
  const dias = gridDelMes(mes);
  const itemsDelDia = (fecha: Date) => items.filter((item) => mismoDia(new Date(item.fecha), fecha));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button type="button" className="btn-ghost btn-sm" aria-label="Mes anterior" onClick={() => onMesChange(mesAnterior(mes))}>
          &lsaquo;
        </button>
        <h3 className="font-bold text-neutral-800">{tituloMes(mes)}</h3>
        <button type="button" className="btn-ghost btn-sm" aria-label="Mes siguiente" onClick={() => onMesChange(mesSiguiente(mes))}>
          &rsaquo;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400 mb-1">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dias.map(({ fecha, enMes, esHoy }) => {
          const delDia = itemsDelDia(fecha);
          const seleccionado = diaSeleccionado !== null && mismoDia(fecha, diaSeleccionado);
          const etiqueta = format(fecha, "d 'de' MMMM", { locale: es });
          return (
            <button
              key={fecha.toISOString()}
              type="button"
              onClick={() => onSeleccionarDia(fecha)}
              aria-pressed={seleccionado}
              aria-label={etiqueta}
              className={[
                'aspect-square rounded-lg p-1 text-xs flex flex-col items-center justify-start gap-0.5 border transition-colors',
                enMes ? 'text-neutral-700' : 'text-neutral-300',
                esHoy ? 'border-primary font-bold' : 'border-transparent',
                seleccionado ? 'bg-primary/10 border-primary' : 'hover:bg-neutral-50',
              ].join(' ')}
            >
              <span>{fecha.getDate()}</span>
              {delDia.length > 0 && (
                <span className="flex gap-0.5 flex-wrap justify-center">
                  {delDia.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      data-indicador-estado={item.estado}
                      className={`w-1.5 h-1.5 rounded-full ${COLOR_ESTADO[item.estado] ?? 'bg-neutral-400'}`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
