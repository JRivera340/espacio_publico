import {
  startOfMonth, startOfWeek, addDays, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, format,
} from 'date-fns';
import { es } from 'date-fns/locale';

export interface DiaCalendario {
  fecha: Date;
  enMes: boolean;
  esHoy: boolean;
}

// Grilla de 6 semanas (42 dias) que cubre el mes completo, siempre empezando
// en lunes. Fija en 6 semanas aunque el mes quepa en 5: una grilla de alto
// variable hace saltar el layout al cambiar de mes.
export function gridDelMes(mesRef: Date): DiaCalendario[] {
  const inicio = startOfWeek(startOfMonth(mesRef), { weekStartsOn: 1 });
  const dias: DiaCalendario[] = [];
  for (let i = 0; i < 42; i++) {
    const fecha = addDays(inicio, i);
    dias.push({ fecha, enMes: isSameMonth(fecha, mesRef), esHoy: isToday(fecha) });
  }
  return dias;
}

export function mesSiguiente(mesRef: Date): Date {
  return addMonths(mesRef, 1);
}

export function mesAnterior(mesRef: Date): Date {
  return subMonths(mesRef, 1);
}

export function tituloMes(mesRef: Date): string {
  const texto = format(mesRef, 'LLLL yyyy', { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function mismoDia(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
