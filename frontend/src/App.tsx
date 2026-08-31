import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { HandoffPage } from './pages/HandoffPage';
import { irAlLoginDelHub } from './config/hub';
import { AppShell } from './components/shell/AppShell';
import { RUTA_POR_ROL, ROUTE_ACCESS } from './utils/permissions';
import type { Role } from './types';
import { Toast } from './components/Toast';
import { GestorDashboard } from './pages/gestor/GestorDashboard';
import { CreateActivity } from './pages/gestor/CreateActivity';
import { EditActivity } from './pages/gestor/EditActivity';
import { ActivityDetail } from './components/ActivityDetail';
import { CronogramaPage } from './pages/gestor/CronogramaPage';
import { ValidadorDashboard } from './pages/validador/ValidadorDashboard';
import { ValidarActividadPage } from './pages/validador/ValidarActividadPage';
import { ProgramacionPage } from './pages/validador/ProgramacionPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

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
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [sesionVencida, setSesionVencida] = React.useState(false);

  React.useEffect(() => {
    // api.ts despacha este evento al recibir un 401 con token guardado, pero
    // solo limpia sessionStorage - sin este oyente el store de Zustand seguia
    // creyendo que habia sesion (isAuthenticated/user/token en memoria) y el
    // usuario se quedaba viendo una interfaz que parece andar mientras cada
    // pedido vuelve 401 en silencio.
    function manejarSesionVencida() {
      clearAuth();
      setSesionVencida(true);
      // Le da tiempo al usuario de leer el aviso antes de sacarlo del modulo.
      setTimeout(() => irAlLoginDelHub(), 2000);
    }

    window.addEventListener('session-expired', manejarSesionVencida);
    return () => window.removeEventListener('session-expired', manejarSesionVencida);
  }, [clearAuth]);

  return (
    <>
      {sesionVencida && (
        <Toast
          type="error"
          message="Tu sesion vencio. Te llevamos al inicio de sesion."
          duration={0}
          onClose={() => setSesionVencida(false)}
        />
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/handoff" replace />} />

        <Route path="/handoff" element={<HandoffPage />} />

        <Route
          path="/gestor/dashboard"
          element={<RutaProtegida roles={ROUTE_ACCESS['/gestor/dashboard']}><GestorDashboard /></RutaProtegida>}
        />
        <Route
          path="/gestor/crear-actividad"
          element={<RutaProtegida roles={ROUTE_ACCESS['/gestor/crear-actividad']}><CreateActivity /></RutaProtegida>}
        />
        <Route
          path="/gestor/editar-actividad/:id"
          element={<RutaProtegida roles={ROUTE_ACCESS['/gestor/editar-actividad/:id']}><EditActivity /></RutaProtegida>}
        />
        <Route
          path="/gestor/actividad/:id"
          element={<RutaProtegida roles={ROUTE_ACCESS['/gestor/actividad/:id']}><ActivityDetail /></RutaProtegida>}
        />
        <Route
          path="/gestor/cronograma"
          element={<RutaProtegida roles={ROUTE_ACCESS['/gestor/cronograma']}><CronogramaPage /></RutaProtegida>}
        />
        <Route
          path="/validador/dashboard"
          element={<RutaProtegida roles={ROUTE_ACCESS['/validador/dashboard']}><ValidadorDashboard /></RutaProtegida>}
        />
        <Route
          path="/validador/actividad/:id"
          element={<RutaProtegida roles={ROUTE_ACCESS['/validador/actividad/:id']}><ValidarActividadPage /></RutaProtegida>}
        />
        <Route
          path="/validador/programacion"
          element={<RutaProtegida roles={ROUTE_ACCESS['/validador/programacion']}><ProgramacionPage /></RutaProtegida>}
        />
        <Route
          path="/admin"
          element={<RutaProtegida roles={ROUTE_ACCESS['/admin']}><AdminDashboard /></RutaProtegida>}
        />

        {/* Cualquier ruta sin match (ej: un navigate() a una ruta que ya no
            existe, o un bundle viejo en cache del navegador apuntando a algo
            removido) manda al inicio en vez de dejar la pantalla en blanco. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
