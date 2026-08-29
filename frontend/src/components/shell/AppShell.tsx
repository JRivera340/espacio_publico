import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { cerrarSesion } from '../../lib/cerrarSesion';
import { InstitutionalHeader } from './InstitutionalHeader';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';
import { getNavItems } from './navItems';
import { ErrorBoundary } from '../ErrorBoundary';

interface AppShellProps {
  children: React.ReactNode;
}

// Armazon visual de todas las pantallas autenticadas del modulo: encabezado
// institucional, navegacion (sidenav en escritorio, bottomnav en movil) y
// salida de sesion. Las pantallas de gestor, validador y admin se montan
// dentro via `children` - este componente no sabe nada de su contenido.
export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const items = getNavItems(user?.role ?? 'GESTOR_ESPACIO_PUBLICO');

  return (
    // 100vh en navegadores moviles incluye la barra de direcciones oculta -
    // el layout queda mas alto que el viewport visible y el BottomNav se
    // renderiza fuera de pantalla. 100dvh sigue el viewport visible real; se
    // mantiene la clase h-screen como fallback si dvh no es soportado.
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-neutral-50" style={{ height: '100dvh' }}>
      <InstitutionalHeader email={user?.email ?? ''} onCerrarSesion={cerrarSesion} />

      <div className="flex-1 flex flex-row overflow-hidden">
        <SideNav items={items} />
        {/* overflow-y-auto, no overflow-hidden: las pantallas montadas aca (formularios
            largos, listados paginados) suelen ser mas altas que el viewport. Con
            overflow-hidden el contenido se recorta sin scroll y sin error visible -
            el boton de guardar quedaba inalcanzable. */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Una excepcion de render adentro no debe tirar abajo el header ni
              la navegacion - sin esto, cualquier pantalla que truene deja al
              usuario en una pagina en blanco sin salida. */}
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>

      <div className="md:hidden">
        <BottomNav items={items} />
      </div>
    </div>
  );
};
