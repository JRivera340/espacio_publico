import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HandoffPage } from './HandoffPage';
import { useAuthStore } from '../store/authStore';

function tokenFalso(role: string) {
  const payload = { sub: 'u-1', email: 'gestor@ejemplo.com', role };
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

function montar() {
  return render(<MemoryRouter><HandoffPage /></MemoryRouter>);
}

function montarConStrictMode() {
  return render(
    <React.StrictMode>
      <MemoryRouter><HandoffPage /></MemoryRouter>
    </React.StrictMode>,
  );
}

describe('HandoffPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.getState().logout();
    window.location.hash = '';
    window.history.replaceState(null, '', window.location.pathname);
  });

  // Sin globals:true en la config de vitest, @testing-library/react no
  // engancha su limpieza automatica: sin esto, el DOM de un test queda
  // montado para el siguiente y getByText encuentra multiples coincidencias.
  afterEach(() => {
    cleanup();
  });

  it('inicia sesion con el token del fragmento y limpia la url', async () => {
    window.location.hash = `#token=${tokenFalso('GESTOR_ESPACIO_PUBLICO')}`;
    montar();
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(window.location.hash).toBe('');
  });

  it('muestra el error cuando el backend redirigio con ?error=', async () => {
    montar();
    // sin hash y sin sesion: la pantalla no puede iniciar sesion
    await waitFor(() => expect(screen.getByText(/no se pudo iniciar sesion/i)).toBeDefined());
  });

  it('no pisa el estado en la segunda corrida del efecto de StrictMode', async () => {
    window.location.hash = `#token=${tokenFalso('ADMIN')}`;
    // React.StrictMode real: el efecto corre dos veces en desarrollo. Sin el
    // guard processed.current, la segunda corrida ya no encuentra hash (la
    // primera lo limpio) y pisa el estado con error.
    montarConStrictMode();
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(screen.queryByText(/no se pudo iniciar sesion/i)).toBeNull();
  });

  it('limpia el fragmento cuando el token no es un JWT valido', async () => {
    window.location.hash = '#token=esto-no-es-un-jwt';
    montar();
    await waitFor(() => expect(screen.getByText(/no se pudo iniciar sesion/i)).toBeDefined());
    expect(window.location.hash).toBe('');
  });

  it('limpia el fragmento cuando el payload del JWT no es JSON valido', async () => {
    // JWT con forma correcta (dos puntos) pero cuyo payload en base64 no
    // decodifica a JSON valido.
    const payloadB64 = btoa('esto no es json').replace(/=/g, '');
    window.location.hash = `#token=cabecera.${payloadB64}.firma`;
    montar();
    await waitFor(() => expect(screen.getByText(/no se pudo iniciar sesion/i)).toBeDefined());
    expect(window.location.hash).toBe('');
  });

  it('limpia el fragmento aunque la url tambien traiga ?error=', async () => {
    // El backend nunca produce esta combinacion (redirige a ?error= o a
    // #token=, nunca a los dos), pero el token no puede depender de que
    // return se ejecute primero: si hay token, se limpia sin importar que
    // ?error= tambien este presente.
    history.replaceState(null, '', `${window.location.pathname}?error=invalid_token`);
    window.location.hash = `#token=${tokenFalso('GESTOR_ESPACIO_PUBLICO')}`;
    montar();
    await waitFor(() => expect(screen.getByText(/no se pudo iniciar sesion/i)).toBeDefined());
    expect(window.location.hash).toBe('');
  });
});
