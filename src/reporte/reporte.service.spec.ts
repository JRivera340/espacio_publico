import * as XLSX from 'xlsx';
import { ReporteService } from './reporte.service';
import { ActividadStatus } from '../actividades/enums/actividad-status.enum';
import { OperativoSubtipo } from '../actividades/enums/operativo-subtipo.enum';
import { Turno } from '../actividades/enums/turno.enum';
import type { Actividad } from '../actividades/actividades.repository';
import { ActividadesController } from '../actividades/actividades.controller';
import { ProgramacionEstado } from '../programacion/enums/programacion-estado.enum';
import type { ProgramacionItem } from '../programacion/programacion.repository';

function actividad(over: Partial<Actividad> = {}): Actividad {
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    createdByUserId: 'gestor-1',
    status: ActividadStatus.PUBLICADA,
    dateTime: '2026-08-20T14:00:00.000Z',
    activityType: 'ESPACIO_PUBLICO - 1801',
    operativoSubtipo: OperativoSubtipo.ESPACIO_PUBLICO_1801,
    shift: Turno.DIURNO,
    lat: 4.6,
    lng: -74.07,
    barrio: 'LA MACARENA',
    photos: [],
    publishedPhotos: [],
    results: 'Recuperacion de anden',
    incautacionLicores: 0,
    incautacionArmasBlancas: 0,
    personasTransladadas: 0,
    personasSensibilizadas: 12,
    entidadesAcompanantes: ['Policía Nacional'],
    isGroupOperativo: false,
    gestoresInvolucradosIds: [],
    categorySeq: 7,
    createdAt: '2026-08-20T13:00:00.000Z',
    updatedAt: '2026-08-20T13:00:00.000Z',
    ...over,
  } as Actividad;
}

function primeraFila(buffer: Buffer) {
  const libro = XLSX.read(buffer, { type: 'buffer' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, any>>(hoja)[0];
}

describe('ReporteService', () => {
  const service = new ReporteService();

  it('genera una fila por actividad con el codigo visible', () => {
    const fila = primeraFila(service.generarXlsx([actividad()], 'https://ep.example.com'));
    expect(fila['Codigo']).toBe('EP-07');
    expect(fila['Barrio']).toBe('LA MACARENA');
    expect(fila['Estado']).toBe('PUBLICADA');
  });

  it('incluye el enlace publico construido con la url recibida', () => {
    const fila = primeraFila(service.generarXlsx([actividad()], 'https://ep.example.com/'));
    expect(fila['Enlace']).toBe(
      'https://ep.example.com/public/actividad/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
  });

  it('aplana las cifras de dynamicAnswers en columnas propias', () => {
    const fila = primeraFila(
      service.generarXlsx(
        [actividad({ dynamicAnswers: { m2RecuperadosEspacioPublico: 340, cambuches: 3 } })],
        'https://ep.example.com',
      ),
    );
    expect(fila['m2RecuperadosEspacioPublico']).toBe(340);
    expect(fila['cambuches']).toBe(3);
  });

  it('no rompe con una lista vacia', () => {
    expect(() => service.generarXlsx([], 'https://ep.example.com')).not.toThrow();
  });

  it('mapea fecha, turno, tipo, resultados, ubicacion y las cuatro cifras sin cruzarlas', () => {
    const fila = primeraFila(
      service.generarXlsx(
        [
          actividad({
            dateTime: '2026-08-20T14:00:00.000Z',
            shift: Turno.NOCTURNO,
            activityType: 'ESPACIO_PUBLICO - 1801',
            results: 'Recuperacion de anden',
            lat: 4.6,
            lng: -74.07,
            personasSensibilizadas: 11,
            personasTransladadas: 22,
            incautacionLicores: 33,
            incautacionArmasBlancas: 44,
          }),
        ],
        'https://ep.example.com',
      ),
    );
    expect(fila['Fecha']).toBe('2026-08-20T14:00:00.000Z');
    expect(fila['Turno']).toBe('NOCTURNO');
    expect(fila['Tipo']).toBe('ESPACIO_PUBLICO - 1801');
    expect(fila['Resultados']).toBe('Recuperacion de anden');
    expect(fila['Latitud']).toBe(4.6);
    expect(fila['Longitud']).toBe(-74.07);
    expect(fila['Personas sensibilizadas']).toBe(11);
    expect(fila['Personas trasladadas']).toBe(22);
    expect(fila['Incautacion licores']).toBe(33);
    expect(fila['Incautacion armas blancas']).toBe(44);
  });

  it('une varias entidades acompanantes por coma en una sola celda', () => {
    const fila = primeraFila(
      service.generarXlsx(
        [actividad({ entidadesAcompanantes: ['Policía Nacional', 'Alcaldia Local', 'Bomberos'] })],
        'https://ep.example.com',
      ),
    );
    expect(fila['Entidades acompanantes']).toBe('Policía Nacional, Alcaldia Local, Bomberos');
  });

  it('deja vacias Entidad responsable y Operativos 1801 cuando son nulas, en vez de "null"', () => {
    const fila = primeraFila(
      service.generarXlsx(
        [actividad({ entidadResponsable: null, num_1801: null })],
        'https://ep.example.com',
      ),
    );
    expect(fila['Entidad responsable']).toBe('');
    expect(fila['Operativos 1801']).toBe('');
  });
});

function itemProgramacion(over: Partial<ProgramacionItem> = {}): ProgramacionItem {
  return {
    id: 'item-1',
    fecha: '2026-09-05T14:00:00.000Z',
    barrio: 'LA MACARENA',
    descripcion: 'Recorrido de control',
    gestorUserIds: ['gestor-1'],
    creadoPorUserId: 'validador-1',
    estado: ProgramacionEstado.PENDIENTE,
    actividadId: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

describe('ReporteService.generarPazYSalvoPdf', () => {
  const service = new ReporteService();

  it('devuelve un PDF real, no vacio', async () => {
    const buffer = await service.generarPazYSalvoPdf(
      [actividad()],
      [itemProgramacion()],
      { nombreGestor: 'Rosa Diaz', desde: '2026-09-01', hasta: '2026-09-30' },
    );

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    // Todo PDF valido empieza con esta cabecera - es la unica verificacion de
    // contenido que tiene sentido sin sumar una libreria de parseo de PDF
    // solo para el test.
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('funciona con listas vacias, sin actividades ni programacion en el periodo', async () => {
    const buffer = await service.generarPazYSalvoPdf([], [], { nombreGestor: 'Rosa Diaz', desde: '2026-09-01', hasta: '2026-09-30' });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });
});

// El controller no puede dejar que el cliente elija el dominio del enlace: el
// XLSX lleva sello institucional y un query param manipulado permitiria armar
// un archivo oficial que apunta a un dominio ajeno.
describe('ActividadesController.reportXlsx', () => {
  it('toma la url del entorno y no del query param del cliente', async () => {
    process.env.JWT_SECRET = 'secreto';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';
    process.env.FRONTEND_URL = 'https://espaciopublico.bogotaneidapp.com';

    const generarXlsx = jest.fn().mockReturnValue(Buffer.from('x'));
    const service = { listarTodas: jest.fn().mockResolvedValue({ data: [], total: 0 }) } as any;
    const controller = new ActividadesController(service, { generarXlsx } as any);
    const res = { setHeader: jest.fn(), send: jest.fn() } as any;

    await controller.reportXlsx({ frontendUrl: 'https://sitio-atacante.example' } as any, res);

    expect(generarXlsx).toHaveBeenCalledWith([], 'https://espaciopublico.bogotaneidapp.com');
  });
});
