import { sanitizarDatosPublicos } from './public-fields';
import { OperativoSubtipo } from '../actividades/enums/operativo-subtipo.enum';

const SUB = OperativoSubtipo.ESPACIO_PUBLICO_1801;

describe('sanitizarDatosPublicos', () => {
  it('deja pasar las cifras permitidas', () => {
    expect(sanitizarDatosPublicos(SUB, { cambuches: 3, comparendos: 5 }))
      .toEqual({ cambuches: 3, comparendos: 5 });
  });

  it('descarta el texto libre aunque la clave este permitida', () => {
    expect(sanitizarDatosPublicos(SUB, { cambuches: 'tres cambuches en el anden' })).toBeNull();
  });

  it('descarta las claves que no estan en la lista, aunque sean numericas', () => {
    expect(sanitizarDatosPublicos(SUB, { cedulaCiudadano: 1020304050 })).toBeNull();
  });

  it('descarta observaciones en texto libre', () => {
    expect(sanitizarDatosPublicos(SUB, { observaciones: 'El senor Perez vive en la carrera 5' })).toBeNull();
  });

  it('convierte el numero en texto que manda el formulario dinamico', () => {
    expect(sanitizarDatosPublicos(SUB, { cambuches: '3' })).toEqual({ cambuches: 3 });
  });

  it('no convierte un texto que solo empieza con numero', () => {
    expect(sanitizarDatosPublicos(SUB, { cambuches: '3 cambuches' })).toBeNull();
  });

  it('devuelve null cuando no hay datos', () => {
    expect(sanitizarDatosPublicos(SUB, null)).toBeNull();
    expect(sanitizarDatosPublicos(SUB, {})).toBeNull();
  });
});
