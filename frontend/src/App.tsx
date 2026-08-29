import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { HandoffPage } from './pages/HandoffPage';
import { irAlLoginDelHub } from './config/hub';
import { AppShell } from './components/shell/AppShell';
import { RUTA_POR_ROL, ROUTE_ACCESS } from './utils/permissions';
import type { Role } from './types';

// No hay pagina de login en este repo - la sesion llega desde bogotaneidapp
// via /handoff. Sin sesion (logout, token vencido, entrada directa sin pasar
// por el hub) mandamos de vuelta al login real del hub - en local (sin
// VITE_EP_API_URL) no hay hub al que volver, asi que ahi si mostramos las
// instrucciones de dev.
const esEntornoDesplegado = Boolean(import.meta.env.VITE_EP_API_URL);

// Pantalla para un rol autenticado que no tiene permiso sobre esta ruta y
// tampoco tiene un destino propio al que mandarlo (caso de borde: no deberia
// pasar en produccion porque HandoffPage ya filtra por rol antes de guardar
// sesion, pero si el rol en sessionStorage no coincide con ninguna ruta del
// modulo, mejor esto que una pantalla en blanco).
function SinAcceso() {
  return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>No tenes acceso a esta seccion</h1>
      <p style={{ color: '#666', marginTop: 8 }}>Tu rol no tiene permiso para ver este contenido.</p>
    </div>
  );
}

function RutaProtegida({ children, roles }: { children: React.ReactNode; roles: Role[] }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  React.useEffect(() => {
    // Va al login pidiendo cierre de sesion tambien en el hub. Si solo se
    // mandara a `/login`, el hub veia su sesion viva, saltaba el formulario y
    // rebotaba al handoff con un token, ciclo que termina en la pantalla de
    // error del handoff.
    if (!isAuthenticated && esEntornoDesplegado) {
      irAlLoginDelHub();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    if (esEntornoDesplegado) return null; // redirigiendo al login del hub
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>No hay sesion activa</h1>
        <p style={{ color: '#666', marginTop: 8 }}>
          Este modulo no tiene login propio - la sesion se comparte desde bogotaneidapp.
          Para desarrollo local, genera un token con <code>npm run token:test</code> en el backend
          y entra a <code>/handoff#token=&lt;el token&gt;</code>.
        </p>
      </div>
    );
  }

  // Autenticado pero sin permiso para esta ruta puntual (ej: un
  // VALIDADOR_ESPACIO_PUBLICO escribiendo /admin en la barra). Se lo manda a
  // su propio destino en vez de dejarlo ver el contenido ajeno.
  if (role && !roles.includes(role)) {
    const destinoPropio = (RUTA_POR_ROL as Record<string, string>)[role];
    if (destinoPropio) return <Navigate to={destinoPropio} replace />;
    return <SinAcceso />;
  }

  return <AppShell>{children}</AppShell>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/handoff" replace />} />

      <Route path="/handoff" element={<HandoffPage />} />

      <Route
        path="/gestor/dashboard"
        element={<RutaProtegida roles={ROUTE_ACCESS['/gestor/dashboard']}><div>Dashboard del gestor</div></RutaProtegida>}
      />
      <Route
        path="/validador/dashboard"
        element={<RutaProtegida roles={ROUTE_ACCESS['/validador/dashboard']}><div>Dashboard del validador</div></RutaProtegida>}
      />
      <Route
        path="/admin"
        element={<RutaProtegida roles={ROUTE_ACCESS['/admin']}><div>Panel de administracion</div></RutaProtegida>}
      />

      {/* Cualquier ruta sin match (ej: un navigate() a una ruta que ya no
          existe, o un bundle viejo en cache del navegador apuntando a algo
          removido) manda al inicio en vez de dejar la pantalla en blanco. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
