import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ValidarActividadPage } from './ValidarActividadPage';
import { activityService } from '../../services/activity.service';

vi.mock('../../services/activity.service', () => ({
  activityService: { getById: vi.fn(), approve: vi.fn(), reject: vi.fn() },
}));

vi.mock('../../hooks/useFileUrl', () => ({
  useFileUrl: (v: string | null) => v,
  useFileUrls: (v: string[]) => v,
}));

const ACTIVIDAD = {
  id: 'a1',
  createdByUserId: 'u1',
  status: 'ENVIADA',
  dateTime: '2026-08-20T14:00:00.000Z',
  activityType: '1801',
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
  entidadesAcompanantes: [],
  categorySeq: 7,
  dynamicAnswers: { comparendos: 3 },
} as any;

function renderPantalla() {
  return render(
    <MemoryRouter initialEntries={['/validador/actividad/a1']}>
      <Routes>
        <Route path="/validador/actividad/:id" element={<ValidarActividadPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ValidarActividadPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (activityService.getById as any).mockReset().mockResolvedValue(ACTIVIDAD);
    (activityService.approve as any).mockReset().mockResolvedValue(ACTIVIDAD);
    (activityService.reject as any).mockReset().mockResolvedValue(ACTIVIDAD);
  });

  // Un rechazo mudo deja al gestor adivinando que corregir.
  it('no deja rechazar sin escribir la nota', async () => {
    renderPantalla();
    fireEvent.click(await screen.findByRole('button', { name: /Rechazar y devolver/i }));

    expect(await screen.findByText(/Escribi que hay que corregir/i)).toBeDefined();
    expect(activityService.reject).not.toHaveBeenCalled();
  });

  it('rechaza mandando la nota tal cual la escribio el validador', async () => {
    renderPantalla();
    const nota = await screen.findByLabelText(/Nota para el gestor/i);
    fireEvent.change(nota, { target: { value: 'Falta el acta firmada' } });
    fireEvent.click(screen.getByRole('button', { name: /Rechazar y devolver/i }));

    await waitFor(() => expect(activityService.reject).toHaveBeenCalledWith('a1', 'Falta el acta firmada'));
  });

  // Las fotos que el validador desmarca NO salen al visor publico: es el
  // control editorial sobre lo que ve el ciudadano.
  it('aprueba publicando solo las fotos que quedaron marcadas', async () => {
    renderPantalla();
    await screen.findByLabelText(/Nota para el gestor/i);

    const casillas = screen.getAllByRole('checkbox');
    fireEvent.click(casillas[0]);
    fireEvent.click(screen.getByRole('button', { name: /Aprobar y publicar/i }));

    await waitFor(() => expect(activityService.approve).toHaveBeenCalled());
    const [, , fotos] = (activityService.approve as any).mock.calls[0];
    expect(fotos).toEqual(['photos/b.jpg']);
  });

  it('por defecto se publican todas las fotos', async () => {
    renderPantalla();
    await screen.findByLabelText(/Nota para el gestor/i);
    fireEvent.click(screen.getByRole('button', { name: /Aprobar y publicar/i }));

    await waitFor(() => expect(activityService.approve).toHaveBeenCalled());
    const [, , fotos] = (activityService.approve as any).mock.calls[0];
    expect(fotos).toEqual(['photos/a.jpg', 'photos/b.jpg']);
  });

  // Una actividad ya validada no se vuelve a validar.
  it('no ofrece decidir sobre una actividad que ya no espera validacion', async () => {
    (activityService.getById as any).mockResolvedValue({ ...ACTIVIDAD, status: 'PUBLICADA' });
    renderPantalla();

    await screen.findByText(/ya no espera validacion/i);
    expect(screen.queryByRole('button', { name: /Aprobar y publicar/i })).toBeNull();
  });

  it('distingue un fallo de carga de una actividad vacia', async () => {
    (activityService.getById as any).mockRejectedValue(new Error('boom'));
    renderPantalla();
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
  });

  // Antes se descartaba cualquier respuesta que no fuera numero positivo: texto
  // y booleanos desaparecian de la pantalla sin dejar rastro.
  it('muestra respuestas de texto y booleanas del formulario dinamico', async () => {
    (activityService.getById as any).mockResolvedValue({
      ...ACTIVIDAD,
      dynamicAnswers: { comparendos: 0, observacionesAdicionales: 'Zona reincidente', huboReaccion: false },
    });
    renderPantalla();

    expect(await screen.findByText('Zona reincidente')).toBeDefined();
    expect(await screen.findByText('No')).toBeDefined();
    expect(await screen.findByText('0')).toBeDefined();
  });

  it('muestra las entidades acompanantes cuando hay', async () => {
    (activityService.getById as any).mockResolvedValue({
      ...ACTIVIDAD,
      entidadesAcompanantes: ['Policia Nacional', 'UAESP'],
    });
    renderPantalla();

    expect(await screen.findByText('Policia Nacional, UAESP')).toBeDefined();
  });

  it('muestra la nota de validacion aunque la actividad todavia espere validacion', async () => {
    (activityService.getById as any).mockResolvedValue({
      ...ACTIVIDAD,
      validationNotes: 'Corregido tras el primer rechazo',
    });
    renderPantalla();

    expect(await screen.findByText('Corregido tras el primer rechazo')).toBeDefined();
  });
});
