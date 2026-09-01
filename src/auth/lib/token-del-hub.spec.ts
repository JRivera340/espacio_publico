import { extraerTokenDelHub } from './token-del-hub';

describe('extraerTokenDelHub', () => {
  // Regresion: el hub responde `accessToken` en camelCase. Leer solo
  // `access_token` convertia un login correcto en un 502.
  it('lee accessToken, que es lo que devuelve el hub de verdad', () => {
    expect(extraerTokenDelHub({ accessToken: 'tok', user: { id: 'u1' } })).toBe('tok');
  });

  it('lee access_token', () => {
    expect(extraerTokenDelHub({ access_token: 'tok' })).toBe('tok');
  });

  it('lee token', () => {
    expect(extraerTokenDelHub({ token: 'tok' })).toBe('tok');
  });

  it('prefiere accessToken si vienen varios', () => {
    expect(extraerTokenDelHub({ accessToken: 'a', access_token: 'b', token: 'c' })).toBe('a');
  });

  it('devuelve null si no hay token', () => {
    expect(extraerTokenDelHub({ user: { id: 'u1' } })).toBeNull();
    expect(extraerTokenDelHub(null)).toBeNull();
  });

  it('devuelve null si el token viene vacio o no es texto', () => {
    expect(extraerTokenDelHub({ accessToken: '' })).toBeNull();
    expect(extraerTokenDelHub({ accessToken: '   ' })).toBeNull();
    expect(extraerTokenDelHub({ accessToken: 123 })).toBeNull();
  });
});
