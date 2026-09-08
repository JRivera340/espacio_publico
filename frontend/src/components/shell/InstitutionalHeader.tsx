import React from 'react';
import { NavIcon } from './NavIcon';

interface InstitutionalHeaderProps {
  email: string;
  onCerrarSesion: () => void;
}

// Encabezado fijo con la identidad del modulo y la salida de sesion. Visible
// en todas las pantallas, escritorio y movil. Mismo rojo institucional que
// el fondo de IngresoPage - antes era blanco con un logo rojo suelto encima,
// dos colores que competian en vez de una sola identidad.
export const InstitutionalHeader: React.FC<InstitutionalHeaderProps> = ({ email, onCerrarSesion }) => (
  <header
    className="shrink-0 flex items-center justify-between px-4 py-2.5 z-[1700] shadow-lg"
    style={{ background: 'linear-gradient(135deg, #ff1f3d, #c9142f)' }}
  >
    <div className="flex items-center gap-3 min-w-0">
      {/* Logo blanco sobre transparente: sobre este fondo rojo se ve. */}
      <img
        src="/images/alcaldialocalsantafe-sinfondo.png"
        alt="Alcaldia Local de Santa Fe"
        className="h-7 w-auto object-contain shrink-0"
      />
      <div className="min-w-0 border-l border-white/25 pl-3">
        <h1 className="text-base font-black text-white tracking-tight truncate">Espacio Publico</h1>
        <p className="text-[11px] text-white/70 font-medium truncate">Articulo 1801</p>
      </div>
    </div>

    <div className="flex items-center gap-3 shrink-0">
      <span className="hidden sm:inline text-xs font-semibold text-white/80 truncate max-w-[220px]">{email}</span>
      <button
        onClick={onCerrarSesion}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold text-white/90 hover:bg-white/15 transition-colors"
      >
        <NavIcon name="logout" className="w-4 h-4" />
        <span>Cerrar sesion</span>
      </button>
    </div>
  </header>
);
