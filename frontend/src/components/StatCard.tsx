import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Tonos institucionales para los KPI. Cada pantalla del area (gestor,
// validador, admin) repetia el mismo patron: numero suelto en una tarjeta
// blanca, sin icono ni color mas alla del texto. .stat-card/.stat-icon ya
// existian en index.css pero nunca se usaban - esto es lo que los conecta.
export type TonoStat = 'primary' | 'success' | 'danger' | 'amber' | 'neutral';

// Fondo suave + icono en el color fuerte: un insight se lee de un vistazo,
// no se aprieta como un boton (circulo solido con icono blanco).
const CLASES_TONO: Record<TonoStat, string> = {
  primary: 'bg-primary-50 text-primary',
  success: 'bg-success-50 text-success',
  danger: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  neutral: 'bg-neutral-100 text-neutral-500',
};

interface StatCardProps {
  icon: LucideIcon;
  tone?: TonoStat;
  label: string;
  value: string | number;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, tone = 'primary', label, value }) => (
  <div className="stat-card">
    <div className={`stat-icon ${CLASES_TONO[tone]}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="stat-value mt-3">{value}</p>
    <p className="stat-label">{label}</p>
  </div>
);
