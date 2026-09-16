import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { mensajeDeError } from '../utils/errorMessage';
import { RUTA_POR_ROL } from '../utils/permissions';
import type { Role } from '../types';

/**
 * Ingreso temporal por URL, para probar el modulo antes de conectarlo al hub.
 *
 * NO es un login propio: el backend reenvia las credenciales al hub, que sigue
 * siendo el unico proveedor de identidad, y devuelve el mismo token que emite
 * el hub. Cuando la entrada desde el hub este lista, esta pantalla se elimina.
 */
export const IngresoPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const token: string | undefined = data?.access_token;
      const usuario = data?.user;

      if (!token || !usuario?.role) {
        setError('El sistema de usuarios respondio de una forma que no esperabamos');
        return;
      }

      const rol = usuario.role as Role;
      const destino = RUTA_POR_ROL[rol];
      if (!destino) {
        // Un rol de otra area autentica bien en el hub pero no tiene nada que
        // hacer aca. Decirselo es mejor que dejarlo en una pantalla vacia.
        setError(`Tu usuario (${rol}) no pertenece a Espacio Publico`);
        return;
      }

      authService.saveSession(token, usuario);
      login(token, usuario);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(mensajeDeError(err) ?? 'No se pudo iniciar sesion');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'radial-gradient(circle at 20% 20%, #c9142f, #5e0113 65%)' }}
    >
      {/* Logo blanco sobre transparente: por eso va sobre el fondo rojo, no
          dentro de la tarjeta blanca donde quedaria invisible. */}
      <img
        src="/images/alcaldialocalsantafe-sinfondo.png"
        alt="Alcaldia Local de Santa Fe"
        className="h-14 w-auto object-contain mb-8"
      />

      <div className="w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-10">
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Espacio Publico</h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Ingreso temporal para pruebas. Usa tu mismo usuario de bogotaneidapp.
        </p>

        <form onSubmit={enviar} className="mt-7 space-y-5" noValidate>
          <div>
            <label className="input-label font-semibold" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="input-label font-semibold" htmlFor="password">
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={entrando} className="btn-success btn-lg w-full justify-center">
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
