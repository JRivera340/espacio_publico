import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavIcon } from './NavIcon';
import type { NavItem } from './navItems';

interface BottomNavProps {
  items: NavItem[];
}

// Nav movil, equivalente a SideNav para pantallas chicas.
export const BottomNav: React.FC<BottomNavProps> = ({ items }) => (
  <nav
    className="shrink-0 flex bg-white/95 backdrop-blur-md border-t border-neutral-100 shadow-xl z-[1600]"
    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
  >
    {items.map((item) => (
      <NavLink
        key={item.key}
        to={item.to}
        end
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors ${
            isActive ? 'text-[#F97316]' : 'text-neutral-400 hover:text-neutral-600'
          }`
        }
      >
        <NavIcon name={item.icon} className="w-5 h-5" />
        <span className="text-[10px] font-bold">{item.label}</span>
      </NavLink>
    ))}
  </nav>
);
