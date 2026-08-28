import { chequearSeedGuard } from './seed-guard';

describe('chequearSeedGuard', () => {
  it('aborta si NODE_ENV es production', () => {
    const mensaje = chequearSeedGuard({ nodeEnv: 'production', dbHost: 'localhost' });
    expect(mensaje).toMatch(/production/);
  });

  it('aborta si el host no es local', () => {
    const mensaje = chequearSeedGuard({ nodeEnv: 'development', dbHost: 'altaria.proxy.rlwy.net' });
    expect(mensaje).toMatch(/no es una base local/);
    expect(mensaje).toMatch(/altaria.proxy.rlwy.net/);
  });

  it('deja pasar localhost en development', () => {
    expect(chequearSeedGuard({ nodeEnv: 'development', dbHost: 'localhost' })).toBeNull();
  });

  it('deja pasar 127.0.0.1', () => {
    expect(chequearSeedGuard({ nodeEnv: 'development', dbHost: '127.0.0.1' })).toBeNull();
  });

  it('sin NODE_ENV definido igual exige host local', () => {
    const mensaje = chequearSeedGuard({ dbHost: 'produccion.example.com' });
    expect(mensaje).toMatch(/no es una base local/);
  });

  it('--force salta la guarda incluso contra production', () => {
    expect(chequearSeedGuard({ nodeEnv: 'production', dbHost: 'produccion.example.com', force: true })).toBeNull();
  });
});
