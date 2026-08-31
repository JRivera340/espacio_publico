import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateActivity } from './CreateActivity';
import { activityService } from '../../services/activity.service';
import { catalogService } from '../../services/catalog.service';
import { surveyService } from '../../services/survey.service';
import { usersService } from '../../services/users.service';
import { detectarBarrio } from '../../utils/boundaryValidation';
import { useAuthStore } from '../../store/authStore';

// Handler que el mapa registra al montarse. El test lo dispara para simular que
// el gestor toco el mapa, sin montar Leaflet de verdad.
let clickEnElMapa: ((e: { latlng: { lat: number; lng: number } }) => void) | null = null;

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => ({ setView: vi.fn(), getZoom: () => 16 }),
  useMapEvents: (handlers: any) => {
    clickEnElMapa = handlers.click;
    return null;
  },
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
    <button type="button" onClick={() => onUploadSuccess(['photos/uno.jpg'])}>
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
  activityService: { create: vi.fn(), send: vi.fn() },
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
  detectarBarrio: vi.fn(),
}));

const GESTOR_ACTUAL = {
  id: 'g-actual',
  name: 'Rosa',
  lastname: 'Diaz',
  email: 'rosa@ejemplo.gov',
  role: 'GESTOR_ESPACIO_PUBLICO' as const,
};

const OTROS_GESTORES = [
  { id: 'g-actual', nombre: 'Rosa Diaz' },
  { id: 'g-2', nombre: 'Ana Perez' },
  { id: 'g-3', nombre: 'Luis Mora' },
];

const ENCUESTA = {
  id: 's1',
  title: 'Operativo 1801',
  questions: [
    { id: 'q-cifra', type: 'NUMBER', name: 'comparendos', label: 'Comparendos', required: false },
  ],
};

function renderPantalla() {
  return render(
    <MemoryRouter>
      <CreateActivity />
    </MemoryRouter>,
  );
}

// Deja la pantalla con todo lo obligatorio cargado menos lo que se indique.
async function completarFormulario(opciones: { conActa?: boolean } = {}) {
  const { conActa = true } = opciones;

  await screen.findByLabelText(/Fecha y hora/);

  await act(async () => {
    clickEnElMapa?.({ latlng: { lat: 4.6156, lng: -74.0664 } });
  });
  await waitFor(() => expect((screen.getByLabelText(/^Barrio/) as HTMLInputElement).value).toBe('LA MACARENA'));

  fireEvent.change(screen.getByLabelText(/Descripcion de lo realizado/), {
    target: { value: 'Recuperacion de andenes' },
  });
  fireEvent.change(screen.getByLabelText(/Entidad responsable/), {
    target: { value: 'ALCALDIA LOCAL DE SANTA FE' },
  });
  fireEvent.click(screen.getByText('simular subida de foto'));
  if (conActa) fireEvent.click(screen.getByText('simular subida de acta'));
}

describe('CreateActivity', () => {
  // Sin globals: true vitest no engancha el afterEach automatico de testing
  // library - hay que desmontar a mano entre tests.
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    clickEnElMapa = null;
    (catalogService.getAll as any).mockResolvedValue({
      barrios: ['LA MACARENA'],
      entidades: ['ALCALDIA LOCAL DE SANTA FE', 'POLICIA NACIONAL'],
    });
    (surveyService.getSurvey as any).mockResolvedValue(ENCUESTA);
    (detectarBarrio as any).mockResolvedValue('LA MACARENA');
    (activityService.create as any).mockResolvedValue({ id: 'a1' });
    (activityService.send as any).mockResolvedValue({ id: 'a1' });
    (usersService.listarGestores as any).mockResolvedValue(OTROS_GESTORES);
    useAuthStore.getState().login('tok', GESTOR_ACTUAL);
  });

  it('pide el formulario dinamico de la unica subcategoria del area', async () => {
    renderPantalla();
    await waitFor(() => expect(surveyService.getSurvey).toHaveBeenCalledWith('1801'));
  });

  // Decision tomada: el barrio se detecta por coordenadas, no se elige. Si
  // alguien lo vuelve editable, este test lo delata.
  it('muestra el campo Barrio en solo lectura', async () => {
    renderPantalla();
    const barrio = (await screen.findByLabelText(/^Barrio/)) as HTMLInputElement;
    expect(barrio.tagName).toBe('INPUT');
    expect(barrio.disabled).toBe(true);
    expect(barrio.readOnly).toBe(true);
  });

  it('llena el barrio a partir de la coordenada marcada en el mapa', async () => {
    renderPantalla();
    await screen.findByLabelText(/^Barrio/);
    await act(async () => {
      clickEnElMapa?.({ latlng: { lat: 4.6156, lng: -74.0664 } });
    });
    await waitFor(() =>
      expect((screen.getByLabelText(/^Barrio/) as HTMLInputElement).value).toBe('LA MACARENA'),
    );
    expect(detectarBarrio).toHaveBeenCalledWith(4.6156, -74.0664);
  });

  it('descarta una coordenada fuera de la zona de trabajo', async () => {
    (detectarBarrio as any).mockResolvedValue(null);
    renderPantalla();
    await screen.findByLabelText(/^Barrio/);
    await act(async () => {
      clickEnElMapa?.({ latlng: { lat: 40.4168, lng: -3.7038 } });
    });
    await screen.findByText(/fuera de la localidad/i);
    expect((screen.getByLabelText(/^Barrio/) as HTMLInputElement).value).toBe('');
  });

  // En el sistema original el acta se exigia con una excepcion para un caso
  // de otra area. Aca ese caso no existe: la regla no tiene excepcion.
  it('no deja registrar sin el acta del operativo', async () => {
    renderPantalla();
    await completarFormulario({ conActa: false });

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await screen.findByText(/Debe subir el acta del operativo/);
    expect(activityService.create).not.toHaveBeenCalled();
  });

  it('no deja registrar sin entidad responsable', async () => {
    renderPantalla();
    await completarFormulario();
    fireEvent.change(screen.getByLabelText(/Entidad responsable/), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await screen.findByText(/Debe indicar la entidad responsable/);
    expect(activityService.create).not.toHaveBeenCalled();
  });

  it('crea en borrador y despues envia a validacion', async () => {
    renderPantalla();
    await completarFormulario();

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await waitFor(() => expect(activityService.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(activityService.send).toHaveBeenCalledWith('a1'));

    const dto = (activityService.create as any).mock.calls[0][0];
    expect(dto.operativoSubtipo).toBe('ESPACIO_PUBLICO_1801');
    expect(dto.activityType).toBe('ESPACIO_PUBLICO - 1801');
    expect(dto.barrio).toBe('LA MACARENA');
    expect(dto.actaPdfUrl).toBe('https://archivos.example/acta.pdf');
    expect(dto.entidadResponsable).toBe('ALCALDIA LOCAL DE SANTA FE');
    expect(dto.photos).toEqual(['photos/uno.jpg']);
  });

  it('avisa cuando el registro falla, en vez de comportarse como si hubiera funcionado', async () => {
    (activityService.create as any).mockRejectedValue(new Error('boom'));
    renderPantalla();
    await completarFormulario();

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await screen.findByText(/No se pudo cargar la informacion|No se pudo conectar/);
    expect(activityService.send).not.toHaveBeenCalled();
  });

  it('avisa que la actividad quedo en borrador si falla el envio a validacion', async () => {
    (activityService.send as any).mockRejectedValue(new Error('boom'));
    renderPantalla();
    await completarFormulario();

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await screen.findByText(/quedo guardada como borrador/);
  });

  it('avisa cuando no hay formulario activo y no deja registrar', async () => {
    (surveyService.getSurvey as any).mockResolvedValue(null);
    renderPantalla();

    await screen.findByText(/No hay un formulario activo/);
    expect((screen.getByRole('button', { name: /Finalizar registro/ }) as HTMLButtonElement).disabled).toBe(true);
  });
  // Al reintentar tras un envio fallido no puede crearse un segundo borrador
  // con la misma evidencia: el gestor terminaria con dos actividades gemelas y
  // el validador sin saber cual es la buena.
  it('al reintentar envia el borrador que ya existe, sin crear otro', async () => {
    (activityService.send as any).mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ id: 'a1' });
    renderPantalla();
    await completarFormulario();

    const boton = screen.getByRole('button', { name: /Finalizar registro/ });
    fireEvent.click(boton);
    await screen.findByText(/quedo guardada como borrador/);

    fireEvent.click(boton);
    await waitFor(() => expect(activityService.send).toHaveBeenCalledTimes(2));

    expect(activityService.create).toHaveBeenCalledTimes(1);
    expect((activityService.send as any).mock.calls[1][0]).toBe('a1');
  });

  // El backend autoriza la lectura de una actividad a los gestores que figuran
  // en gestoresInvolucradosIds. Antes de esto la casilla "en grupo" se guardaba
  // pero la lista viajaba siempre vacia: los acompanantes no podian abrir la
  // actividad que habian hecho juntos, y nada avisaba.
  it('lleva al DTO los gestores acompanantes seleccionados', async () => {
    renderPantalla();
    await completarFormulario();

    fireEvent.click(screen.getByLabelText(/El operativo se realizo en grupo/));
    fireEvent.click(await screen.findByLabelText('Ana Perez'));
    fireEvent.click(screen.getByLabelText('Luis Mora'));

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await waitFor(() => expect(activityService.create).toHaveBeenCalledTimes(1));
    const dto = (activityService.create as any).mock.calls[0][0];
    expect(dto.isGroupOperativo).toBe(true);
    expect(dto.gestoresInvolucradosIds).toEqual(['g-2', 'g-3']);
  });

  it('no ofrece al propio gestor como acompanante: ya es el autor', async () => {
    renderPantalla();
    await screen.findByLabelText(/Fecha y hora/);

    fireEvent.click(screen.getByLabelText(/El operativo se realizo en grupo/));

    await screen.findByLabelText('Ana Perez');
    expect(screen.queryByLabelText('Rosa Diaz')).toBeNull();
  });

  it('sin marcar el operativo en grupo la lista de acompanantes va vacia', async () => {
    renderPantalla();
    await completarFormulario();

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await waitFor(() => expect(activityService.create).toHaveBeenCalledTimes(1));
    const dto = (activityService.create as any).mock.calls[0][0];
    expect(dto.isGroupOperativo).toBe(false);
    expect(dto.gestoresInvolucradosIds).toEqual([]);
  });

  // El proxy de usuarios depende del hub. Es un dato auxiliar: si no responde,
  // el gestor tiene que poder registrar igual en vez de quedar bloqueado.
  it('deja registrar sin acompanantes si el proxy de usuarios esta caido', async () => {
    (usersService.listarGestores as any).mockRejectedValue(new Error('502'));
    renderPantalla();
    await completarFormulario();

    fireEvent.click(screen.getByLabelText(/El operativo se realizo en grupo/));
    await screen.findByText(/No se pudo cargar la lista de gestores/);

    fireEvent.click(screen.getByRole('button', { name: /Finalizar registro/ }));

    await waitFor(() => expect(activityService.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(activityService.send).toHaveBeenCalledWith('a1'));
    expect((activityService.create as any).mock.calls[0][0].gestoresInvolucradosIds).toEqual([]);
  });
});
