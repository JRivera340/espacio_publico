import axios from 'axios';
import { authService } from './auth.service';
import { shouldRetry, backoffDelay } from './lib/retry';

const MAX_RETRIES = 2;

const getApiBaseURL = () => {
  // Este modulo vive en un origen propio, distinto del backend, asi que la URL
  // tiene que ser absoluta. El hub usa rutas relativas porque su nginx proxea
  // /api al backend en el mismo dominio; aca eso no existe.
  const envUrl = import.meta.env.VITE_EP_API_URL as string | undefined;
  if (envUrl) return `${envUrl.replace(/\/$/, '')}/api`;
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag para evitar multiples eventos de session-expired simultaneos
let isHandlingSessionExpired = false;

// Interceptor para agregar token JWT (usando authService como single source of truth)
api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores 401
// IMPORTANTE: Solo dispara session-expired si:
// 1. Habia un token guardado (sesion activa que expiro)
// 2. No estamos ya manejando una expiracion
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Reintento de errores transitorios (cold-start/502/503/504/red) en GET.
    const config = error.config;
    if (config) {
      const attempt = config.__retryCount || 0;
      if (shouldRetry({ method: config.method, status: error.response?.status, attempt, maxRetries: MAX_RETRIES })) {
        config.__retryCount = attempt + 1;
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
        return api(config);
      }
    }

    const hadToken = !!authService.getToken();

    if (error.response?.status === 401 && hadToken && !isHandlingSessionExpired) {
      isHandlingSessionExpired = true;

      // Token expirado - limpiar sesion
      authService.clearSession();

      // Disparar evento UNA sola vez
      const event = new CustomEvent('session-expired');
      window.dispatchEvent(event);

      // Reset flag despues de un tiempo para permitir nuevos eventos si es necesario
      setTimeout(() => {
        isHandlingSessionExpired = false;
      }, 3000);
    }

    return Promise.reject(error);
  }
);

export default api;
