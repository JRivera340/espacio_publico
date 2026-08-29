import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { mensajeDeError } from './errorMessage';

function axiosConRespuesta(status: number, data?: unknown): AxiosError {
  const err = new AxiosError('fallo');
  err.response = { status, data, statusText: '', headers: {}, config: {} as never };
  return err;
}

describe('mensajeDeError', () => {
  it('devuelve null en 401 para no duplicar el aviso de sesion expirada', () => {
    expect(mensajeDeError(axiosConRespuesta(401))).toBeNull();
  });

  it('usa el mensaje del backend cuando viene', () => {
    expect(mensajeDeError(axiosConRespuesta(400, { message: 'Formato de fecha invalido' }))).toBe(
      'Formato de fecha invalido',
    );
  });

  it('toma el primer mensaje cuando el backend devuelve un arreglo', () => {
    expect(mensajeDeError(axiosConRespuesta(400, { message: ['barrio no puede estar vacio', 'otro'] }))).toBe(
      'barrio no puede estar vacio',
    );
  });

  it('explica el 403 sin mensaje propio', () => {
    expect(mensajeDeError(axiosConRespuesta(403))).toMatch(/permiso/i);
  });

  it('distingue el servidor inalcanzable de un error de servidor', () => {
    const sinRespuesta = new AxiosError('Network Error');
    expect(mensajeDeError(sinRespuesta)).toMatch(/conexion|conectar/i);
    expect(mensajeDeError(axiosConRespuesta(500))).not.toMatch(/conectar/i);
  });

  it('no se cae con algo que no es un error de axios', () => {
    expect(typeof mensajeDeError(new Error('x'))).toBe('string');
    expect(typeof mensajeDeError(undefined)).toBe('string');
  });
});
