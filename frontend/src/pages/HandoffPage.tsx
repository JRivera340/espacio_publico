import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { irAlLoginDelHub } from '../config/hub';
import type { User } from '../types';

// Ruta de aterrizaje por rol tras el handoff.
const RUTA_POR_ROL: Partial<Record<string, string>> = {
  GESTOR_ESPACIO_PUBLICO: '/gestor/dashboard',
  VALIDADOR_ESPACIO_PUBLICO: '/validador/dashboard',
  ADMIN: '/admin',
};

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
  const [status, setStatus] = useState<'procesando' | 'error' | 'sin-destino'>('procesando');
  const [identity, setIdentity] = useState<{ email: string; role: string } | null>(null);
  // React.StrictMode invoca los efectos dos veces en desarrollo. La primera
  // corrida procesa el token y limpia el hash con replaceState; sin este
  // guard, la segunda corrida ya no encuentra hash y pisa el estado con error.
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      setStatus('error');
      return;
    }

    const hash = window.location.hash;
    const match = hash.match(/token=([^&]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    if (!token) {
      setStatus('error');
      return;
    }

    // El token es una credencial: sirve para el hub, para ambiental y para
    // este modulo. Se limpia del fragmento apenas se extrae, antes de
    // intentar decodificarlo, para que no quede en la barra de direcciones
    // ni en el historial del navegador sin importar como termine lo que
    // sigue (payload malformado, JSON invalido, etc).
    history.replaceState(null, '', window.location.pathname);

    const payload = decodeJwtPayload(token);
    if (!payload) {
      setStatus('error');
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

    const destino = RUTA_POR_ROL[payload.role];
    if (destino) {
      navigate(destino, { replace: true });
      return;
    }

    // Rol sin pantalla propia todavia - se queda en esta pantalla minima con
    // un mensaje que lo explique, en vez de navegar a una ruta que no existe.
    setIdentity({ email: payload.email, role: payload.role });
    setStatus('sin-destino');
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
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Sesion iniciada</h1>
      <p style={{ marginTop: 8 }}>Usuario: <strong>{identity?.email}</strong></p>
      <p>Rol: <strong>{identity?.role}</strong></p>
      <p style={{ color: '#666', marginTop: 16 }}>
        Este rol todavia no tiene un panel propio en el modulo de espacio publico -
        no hay ninguna pantalla a la que redirigir.
      </p>
    </div>
  );
};
