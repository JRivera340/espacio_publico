import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavIcon } from './NavIcon';
import type { NavItem } from './navItems';

interface SideNavProps {
  items: NavItem[];
}

// Nav de escritorio. Oculta en movil - ahi el mismo set de items vive en
// BottomNav.
export const SideNav: React.FC<SideNavProps> = ({ items }) => (
  <aside className="shrink-0 hidden md:flex flex-col w-56 bg-white/95 backdrop-blur-md border-r border-neutral-100">
    <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
              isActive ? 'bg-orange-50 text-[#F97316]' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
            }`
          }
        >
          <NavIcon name={item.icon} className="w-5 h-5 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);
