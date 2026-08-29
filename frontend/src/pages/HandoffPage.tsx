import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { irAlLoginDelHub } from '../config/hub';
import type { User } from '../types';
import { RUTA_POR_ROL } from '../utils/permissions';

// Pantalla de destino del handoff. Lee el JWT del fragmento de URL (nunca
// llega al servidor), lo decodifica (sin verificar firma: eso ya lo hizo el
// backend en POST /api/handoff antes de redirigir aca) y arranca la sesion.
function decodeJwtPayload(token: string): { sub: string; email: string; role: string } | null {
  try {
    const [, payloadB64] = token.split('.');
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const HandoffPage: React.FC = () => {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'procesando' | 'error' | 'rol-no-permitido'>('procesando');
  const [identity, setIdentity] = useState<{ email: string; role: string } | null>(null);
  // React.StrictMode invoca los efectos dos veces en desarrollo. La primera
  // corrida procesa el token y limpia el hash con replaceState; sin este
  // guard, la segunda corrida ya no encuentra hash y pisa el estado con error.
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash;
    const match = hash.match(/token=([^&]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    // El token es una credencial: sirve para el hub, para ambiental y para
    // este modulo. Se limpia del fragmento apenas se lee, ANTES de mirar
    // ?error=, antes de decodificar, antes de cualquier return - no puede
    // haber un camino de salida entre leer el token y limpiarlo, porque
    // cualquier return agregado despues de este punto reabriria el hueco.
    // Si history.replaceState llegara a lanzar (contexto sin acceso al
    // historial), no puede tirar abajo el resto del flujo: sin este
    // try/catch la pantalla quedaria colgada en "Procesando sesion..." para
    // siempre.
    if (token) {
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {
        // No poder limpiar el historial no es motivo para dejar al usuario
        // sin pantalla - se sigue con el flujo normal.
      }
    }

    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      setStatus('error');
      return;
    }

    if (!token) {
      setStatus('error');
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
      setStatus('error');
      return;
    }

    // El backend del handoff solo verifica firma y expiracion, no el rol - y
    // el secreto de firma se comparte con el hub y con otros modulos, asi que
    // un token de CUALQUIER rol del sistema (incluido ESTUDIANTE, menores de
    // edad) es criptograficamente valido aca. La puerta de rol es este
    // modulo: si el rol no es uno de los tres que maneja RUTA_POR_ROL, no se
    // guarda la sesion. Guardarla dejaria un token completo de un rol ajeno
    // en sessionStorage aunque no haya pantalla que lo use.
    const esRolDelModulo = Object.prototype.hasOwnProperty.call(RUTA_POR_ROL, payload.role);
    if (!esRolDelModulo) {
      setIdentity({ email: payload.email, role: payload.role });
      setStatus('rol-no-permitido');
      return;
    }

    // El JWT del hub no trae name/lastname (solo sub/email/role) - placeholder
    // minimo hasta que haya un endpoint propio para resolver identidad completa.
    const user: User = {
      id: payload.sub,
      name: payload.email,
      lastname: '',
      email: payload.email,
      role: payload.role as User['role'],
    };

    login(token, user);
    navigate(RUTA_POR_ROL[user.role], { replace: true });
  }, [login, navigate]);

  if (status === 'procesando') {
    return <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>Procesando sesion...</div>;
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>No se pudo iniciar sesion</h1>
        <p style={{ color: '#666', marginTop: 8 }}>El enlace de acceso no es valido o expiro. Inicia sesion de nuevo para entrar al modulo.</p>
        {/* Sin este boton la pantalla era un callejon sin salida: el usuario
            no tenia forma de llegar al login desde aca. */}
        <button
          onClick={irAlLoginDelHub}
          style={{
            marginTop: 20, padding: '10px 18px', background: '#dc2626', color: 'white',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Ir al inicio de sesion
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Este rol no tiene acceso al modulo</h1>
      <p style={{ marginTop: 8 }}>Usuario: <strong>{identity?.email}</strong></p>
      <p>Rol: <strong>{identity?.role}</strong></p>
      <p style={{ color: '#666', marginTop: 16 }}>
        El modulo de espacio publico no tiene pantallas para este rol. No se
        guardo ninguna sesion aca.
      </p>
      <button
        onClick={irAlLoginDelHub}
        style={{
          marginTop: 20, padding: '10px 18px', background: '#dc2626', color: 'white',
          border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Ir al inicio de sesion
      </button>
    </div>
  );
};
