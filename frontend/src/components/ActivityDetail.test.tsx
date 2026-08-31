import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ActivityDetail } from './ActivityDetail';
import { activityService } from '../services/activity.service';
import { usersService } from '../services/users.service';

vi.mock('../services/activity.service', () => ({
  activityService: { getById: vi.fn() },
}));

vi.mock('../services/users.service', () => ({
  usersService: { listarGestores: vi.fn() },
}));

vi.mock('./PhotoCarousel', () => ({
  PhotoCarousel: ({ photos }: { photos: string[] }) => <div data-testid="fotos">{photos.length}</div>,
}));

vi.mock('../hooks/useFileUrl', () => ({
  useFileUrl: (v: string | null) => v,
  useFileUrls: (v: string[]) => v,
}));

const ACTIVIDAD = {
  id: 'a1',
  createdByUserId: 'u1',
  status: 'PUBLICADA',
  dateTime: '2026-08-20T14:00:00.000Z',
  activityType: '1801 - Espacio Publico',
  operativoSubtipo: 'ESPACIO_PUBLICO_1801',
  lat: 4.6,
  lng: -74.07,
  barrio: 'LA MACARENA',
  photos: ['photos/a.jpg', 'photos/b.jpg'],
  results: 'Recuperacion de andenes',
  incautacionLicores: 0,
  incautacionArmasBlancas: 0,
  personasTransladadas: 0,
  personasSensibilizadas: 0,
  entidadResponsable: 'ALCALDIA LOCAL DE SANTA FE',
  entidadesAcompanantes: [],
  categorySeq: 4,
  dynamicAnswers: { comparendos: 3, cambuches: 0 },
} as any;

function renderDetalle() {
  return render(
    <MemoryRouter initialEntries={['/gestor/actividad/a1']}>
      <Routes>
        <Route path="/gestor/actividad/:id" element={<ActivityDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ActivityDetail', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (activityService.getById as any).mockReset().mockResolvedValue(ACTIVIDAD);
    (usersService.listarGestores as any).mockReset().mockResolvedValue([]);
  });

  it('muestra los datos del operativo', async () => {
    renderDetalle();
    expect(await screen.findByText('LA MACARENA')).toBeDefined();
    expect(screen.getByText('Recuperacion de andenes')).toBeDefined();
    expect(screen.getByText('EP-04')).toBeDefined();
  });

  // Las cifras viven en dynamicAnswers bajo el NOMBRE TECNICO de la pregunta.
  // Si el detalle las buscara por id de pregunta no mostraria ninguna.
  it('muestra las cifras leidas por nombre tecnico, y omite las que estan en cero', async () => {
    renderDetalle();
    expect(await screen.findByText('Comparendos impuestos')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.queryByText('Cambuches intervenidos')).toBeNull();
  });

  it('prefiere la etiqueta que quedo guardada al registrar', async () => {
    (activityService.getById as any).mockResolvedValue({
      ...ACTIVIDAD,
      dynamicAnswers: { comparendos: 2, __fieldMeta: { comparendos: { label: 'Comparendos del operativo' } } },
    });
    renderDetalle();
    expect(await screen.findByText('Comparendos del operativo')).toBeDefined();
  });

  // Es lo unico que le dice al gestor que tiene que corregir.
  it('muestra la nota del validador cuando la actividad fue rechazada', async () => {
    (activityService.getById as any).mockResolvedValue({
      ...ACTIVIDAD,
      status: 'RECHAZADA',
      validationNotes: 'Falta el acta firmada',
    });
    renderDetalle();
    expect(await screen.findByText(/Falta el acta firmada/)).toBeDefined();
    expect(screen.getByText(/Corregir y reenviar/)).toBeDefined();
  });

  it('avisa cuando la rechazaron sin dejar nota', async () => {
    (activityService.getById as any).mockResolvedValue({ ...ACTIVIDAD, status: 'RECHAZADA', validationNotes: '  ' });
    renderDetalle();
    expect(await screen.findByText(/no dejo una nota/i)).toBeDefined();
  });

  // Aprobar y rechazar no son acciones del gestor.
  it('no ofrece acciones de validacion', async () => {
    renderDetalle();
    await screen.findByText('LA MACARENA');
    expect(screen.queryByText(/^Aprobar/i)).toBeNull();
    expect(screen.queryByText(/^Rechazar/i)).toBeNull();
  });

  // El backend deja abrir la actividad a los gestores de la lista. Si no se
  // muestran, esa persona la abre y no entiende por que figura en ella.
  it('muestra los gestores acompanantes de un operativo en grupo', async () => {
    (activityService.getById as any).mockResolvedValue({
      ...ACTIVIDAD,
      isGroupOperativo: true,
      gestoresInvolucradosIds: ['g2'],
    });
    (usersService.listarGestores as any).mockResolvedValue([{ id: 'g2', nombre: 'Ana Perez' }]);
    renderDetalle();
    expect(await screen.findByText('Ana Perez')).toBeDefined();
  });

  it('si no puede resolver los nombres, igual muestra el detalle', async () => {
    (activityService.getById as any).mockResolvedValue({
      ...ACTIVIDAD,
      isGroupOperativo: true,
      gestoresInvolucradosIds: ['g2'],
    });
    (usersService.listarGestores as any).mockRejectedValue(new Error('proxy caido'));
    renderDetalle();
    expect(await screen.findByText('LA MACARENA')).toBeDefined();
    expect(screen.getByText(/Gestor del area/)).toBeDefined();
  });

  it('distingue un fallo de carga de una actividad vacia', async () => {
    (activityService.getById as any).mockRejectedValue(new Error('boom'));
    renderDetalle();
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText(/No se pudo abrir la actividad/)).toBeDefined();
  });
});
