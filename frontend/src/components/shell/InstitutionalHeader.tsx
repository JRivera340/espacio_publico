import React from 'react';
import { NavIcon } from './NavIcon';

interface InstitutionalHeaderProps {
  email: string;
  onCerrarSesion: () => void;
}

// Encabezado fijo con la identidad del modulo y la salida de sesion. Visible
// en todas las pantallas, escritorio y movil.
export const InstitutionalHeader: React.FC<InstitutionalHeaderProps> = ({ email, onCerrarSesion }) => (
  <header className="shrink-0 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-xl px-4 py-2.5 z-[1700]">
    <div className="flex items-center gap-3 min-w-0">
      <img
        src="/images/alcaldialocalsantafe-sinfondo.png"
        alt="Alcaldia Local de Santa Fe"
        className="w-10 h-10 object-contain shrink-0"
      />
      <div className="min-w-0">
        <h1 className="text-base font-black text-neutral-900 tracking-tight truncate">Espacio Publico</h1>
        <p className="text-[11px] text-neutral-400 font-medium truncate">Alcaldia Local de Santa Fe</p>
      </div>
    </div>

    <div className="flex items-center gap-3 shrink-0">
      <span className="hidden sm:inline text-xs font-semibold text-neutral-500 truncate max-w-[220px]">{email}</span>
      <button
        onClick={onCerrarSesion}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 transition-colors"
      >
        <NavIcon name="logout" className="w-4 h-4" />
        <span>Cerrar sesion</span>
      </button>
    </div>
  </header>
);
