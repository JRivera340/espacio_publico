import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EditActivity } from './EditActivity';
import { activityService } from '../../services/activity.service';
import { catalogService } from '../../services/catalog.service';
import { surveyService } from '../../services/survey.service';
import { usersService } from '../../services/users.service';
import { useAuthStore } from '../../store/authStore';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => ({ setView: vi.fn(), getZoom: () => 16 }),
  useMapEvents: () => null,
}));

vi.mock('leaflet', () => ({
  Icon: class {
    constructor(public opciones: unknown) {}
  },
}));

vi.mock('../../components/BoundaryLayer', () => ({ BoundaryLayer: () => null }));
vi.mock('../../components/BarriosLayer', () => ({ BarriosLayer: () => null }));

vi.mock('../../components/PhotosUpload', () => ({
  PhotosUpload: ({ onUploadSuccess }: any) => (
    <button type="button" onClick={() => onUploadSuccess(['photos/nueva.jpg'])}>
      simular subida de foto
    </button>
  ),
}));

vi.mock('../../components/ActaUpload', () => ({
  ActaUpload: ({ onUploadSuccess }: any) => (
    <button type="button" onClick={() => onUploadSuccess('https://archivos.example/acta.pdf')}>
      simular subida de acta
    </button>
  ),
}));

vi.mock('../../services/activity.service', () => ({
  activityService: { getById: vi.fn(), update: vi.fn(), send: vi.fn(), create: vi.fn() },
}));
vi.mock('../../services/catalog.service', () => ({
  catalogService: { getAll: vi.fn() },
}));
vi.mock('../../services/survey.service', () => ({
  surveyService: { getSurvey: vi.fn() },
}));
vi.mock('../../services/users.service', () => ({
  usersService: { listarGestores: vi.fn() },
}));
vi.mock('../../utils/boundaryValidation', () => ({
  detectarBarrio: vi.fn().mockResolvedValue('LA MACARENA'),
}));

const GESTOR_ACTUAL = {
  id: 'g-actual',
  name: 'Rosa',
  lastname: 'Diaz',
  email: 'rosa@ejemplo.gov',
  role: 'GESTOR_ESPACIO_PUBLICO' as const,
};

const ENCUESTA = {
  id: 's1',
  title: 'Operativo 1801',
  questions: [
    { id: 'uuid-comparendos', type: 'NUMBER', name: 'comparendos', label: 'Comparendos', required: false },
  ],
};

// Actividad rechazada y propia: el unico caso corregible.
const ACTIVIDAD_RECHAZADA = {
  id: 'act-1',
  createdByUserId: 'g-actual',
  status: 'RECHAZADA',
  dateTime: '2026-08-20T15:30:00.000Z',
  activityType: 'ESPACIO_PUBLICO - 1801',
  operativoSubtipo: 'ESPACIO_PUBLICO_1801',
  lat: 4.6156,
  lng: -74.0664,
  barrio: 'LA MACARENA',
  photos: ['photos/vieja.jpg'],
  results: 'Recuperacion de andenes',
  entidadResponsable: 'ALCALDIA LOCAL DE SANTA FE',
  entidadesAcompanantes: [],
  actaPdfUrl: 'https://archivos.example/acta-vieja.pdf',
  isGroupOperativo: false,
  gestoresInvolucradosIds: [],
  validationNotes: 'Falta el detalle de los comparendos',
  dynamicAnswers: { tipo: 'ESPACIO_PUBLICO_1801', comparendos: 7 },
  createdAt: '2026-08-20T15:30:00.000Z',
  updatedAt: '2026-08-21T10:00:00.000Z',
};

function renderPantalla() {
  return render(
    <MemoryRouter initialEntries={['/gestor/editar-actividad/act-1']}>
      <Routes>
        <Route path="/gestor/editar-actividad/:id" element={<EditActivity />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EditActivity', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    (catalogService.getAll as any).mockResolvedValue({
      barrios: ['LA MACARENA'],
      entidades: ['ALCALDIA LOCAL DE SANTA FE', 'POLICIA NACIONAL'],
    });
    (surveyService.getSurvey as any).mockResolvedValue(ENCUESTA);
    (usersService.listarGestores as any).mockResolvedValue([{ id: 'g-actual', nombre: 'Rosa Diaz' }]);
    (activityService.getById as any).mockResolvedValue({ ...ACTIVIDAD_RECHAZADA });
    (activityService.update as any).mockResolvedValue({ id: 'act-1' });
    (activityService.send as any).mockResolvedValue({ id: 'act-1' });
    useAuthStore.getState().login('tok', GESTOR_ACTUAL);
  });

  it('precarga los datos de la actividad rechazada', async () => {
    renderPantalla();
    const descripcion = (await screen.findByLabelText(/Descripcion de lo realizado/)) as HTMLTextAreaElement;
    expect(descripcion.value).toBe('Recuperacion de andenes');
    expect((screen.getByLabelText(/Entidad responsable/) as HTMLSelectElement).value).toBe(
      'ALCALDIA LOCAL DE SANTA FE',
    );
    expect((screen.getByLabelText(/^Barrio/) as HTMLInputElement).value).toBe('LA MACARENA');
  });

  // Las respuestas se guardan por NOMBRE TECNICO y el renderer las pide por id
  // de pregunta. Sin la traduccion la pantalla abre en blanco y el gestor
  // reenvia las cifras borradas sin enterarse.
  it('precarga las cifras guardadas por nombre tecnico', async () => {
    renderPantalla();
    const cifra = (await screen.findByLabelText(/Comparendos/)) as HTMLInputElement;
    expect(cifra.value).toBe('7');
  });

  it('muestra la nota del validador', async () => {
    renderPantalla();
    expect(await screen.findByText('Falta el detalle de los comparendos')).toBeTruthy();
  });

  it('no deja corregir una actividad que no esta rechazada', async () => {
    (activityService.getById as any).mockResolvedValue({ ...ACTIVIDAD_RECHAZADA, status: 'ENVIADA' });
    renderPantalla();
    expect(await screen.findByText(/no se puede corregir/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Descripcion de lo realizado/)).toBeNull();
  });

  it('no deja corregir la actividad de otro gestor', async () => {
    (activityService.getById as any).mockResolvedValue({ ...ACTIVIDAD_RECHAZADA, createdByUserId: 'otro-gestor' });
    renderPantalla();
    expect(await screen.findByText(/no se puede corregir/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Descripcion de lo realizado/)).toBeNull();
  });

  it('actualiza la actividad existente y la reenvia, sin crear una nueva', async () => {
    renderPantalla();
    await screen.findByLabelText(/Descripcion de lo realizado/);

    fireEvent.click(screen.getByRole('button', { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(activityService.update).toHaveBeenCalledTimes(1));
    expect((activityService.update as any).mock.calls[0][0]).toBe('act-1');
    expect(activityService.send).toHaveBeenCalledWith('act-1');
    expect(activityService.create).not.toHaveBeenCalled();
  });

  // Bug real del hub: el backend castea la fecha explicitamente y cualquier
  // otro formato revienta con toISOString is not a function.
  it('envia dateTime en formato ISO', async () => {
    renderPantalla();
    await screen.findByLabelText(/Descripcion de lo realizado/);

    fireEvent.click(screen.getByRole('button', { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(activityService.update).toHaveBeenCalled());
    const dto = (activityService.update as any).mock.calls[0][1];
    expect(dto.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(dto.dateTime).toISOString()).toBe(dto.dateTime);
  });

  // La regla venia del original con una excepcion de otra area. Aca esa area no
  // existe: el acta es obligatoria SIEMPRE, tambien al corregir.
  it('no reenvia si se quito el acta', async () => {
    (activityService.getById as any).mockResolvedValue({ ...ACTIVIDAD_RECHAZADA, actaPdfUrl: null });
    renderPantalla();
    await screen.findByLabelText(/Descripcion de lo realizado/);

    fireEvent.click(screen.getByRole('button', { name: /Guardar y reenviar/ }));

    expect(await screen.findByText(/Debe subir el acta del operativo/)).toBeTruthy();
    await waitFor(() => expect(activityService.update).not.toHaveBeenCalled());
  });

  it('conserva las cifras precargadas al reenviar, indexadas por nombre tecnico', async () => {
    renderPantalla();
    await screen.findByLabelText(/Descripcion de lo realizado/);

    fireEvent.click(screen.getByRole('button', { name: /Guardar y reenviar/ }));

    await waitFor(() => expect(activityService.update).toHaveBeenCalled());
    const dto = (activityService.update as any).mock.calls[0][1];
    expect(dto.dynamicAnswers.comparendos).toBe(7);
    expect(dto.dynamicAnswers['uuid-comparendos']).toBeUndefined();
  });
  // Guardar sin reenviar existe para no perder una correccion a medio hacer.
  // Tiene que dejar claro que la actividad sigue rechazada: si el gestor cree
  // que ya respondio el rechazo, su trabajo se queda esperando para siempre.
  it('guardar sin reenviar actualiza pero no manda a validacion', async () => {
    renderPantalla();
    await screen.findByLabelText(/Descripcion de lo realizado/);

    fireEvent.click(screen.getByRole('button', { name: /Guardar sin reenviar/i }));

    await waitFor(() => expect(activityService.update).toHaveBeenCalledTimes(1));
    expect(activityService.send).not.toHaveBeenCalled();
    expect(await screen.findByText(/sigue rechazada/i)).toBeDefined();
  });

  it('si se guardo pero fallo el reenvio, lo dice en vez de pedir rehacer todo', async () => {
    (activityService.send as any).mockRejectedValue(new Error('boom'));
    renderPantalla();
    await screen.findByLabelText(/Descripcion de lo realizado/);

    fireEvent.click(screen.getByRole('button', { name: /Guardar y reenviar/i }));

    expect(await screen.findByText(/quedaron guardados pero no se pudo reenviar/i)).toBeDefined();
  });
});
