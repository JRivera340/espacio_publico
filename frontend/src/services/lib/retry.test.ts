import { describe, it, expect } from 'vitest';
import { shouldRetry, backoffDelay } from './retry';

describe('retry', () => {
  it('reintenta un GET ante 502, 503 y 504', () => {
    for (const status of [502, 503, 504]) {
      expect(shouldRetry({ method: 'get', status, attempt: 0, maxRetries: 2 })).toBe(true);
    }
  });

  it('reintenta un GET ante error de red, sin status', () => {
    expect(shouldRetry({ method: 'get', status: undefined, attempt: 0, maxRetries: 2 })).toBe(true);
  });

  it('no reintenta ante 400 ni 401', () => {
    expect(shouldRetry({ method: 'get', status: 400, attempt: 0, maxRetries: 2 })).toBe(false);
    expect(shouldRetry({ method: 'get', status: 401, attempt: 0, maxRetries: 2 })).toBe(false);
  });

  it('no reintenta un POST', () => {
    expect(shouldRetry({ method: 'post', status: 503, attempt: 0, maxRetries: 2 })).toBe(false);
  });

  it('deja de reintentar al agotar los intentos', () => {
    expect(shouldRetry({ method: 'get', status: 503, attempt: 2, maxRetries: 2 })).toBe(false);
  });

  it('el backoff crece con cada intento', () => {
    expect(backoffDelay(1)).toBeGreaterThan(backoffDelay(0));
  });
});
