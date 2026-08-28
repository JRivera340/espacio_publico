import { describe, it, expect } from 'vitest';
import { HUB_LOGIN_URL, HUB_URL } from './hub';

describe('config/hub', () => {
  it('el login del hub pide cerrar sesion alla tambien', () => {
    expect(HUB_LOGIN_URL).toBe(`${HUB_URL}/login?logout=1`);
  });
});
