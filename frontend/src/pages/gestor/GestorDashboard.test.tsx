import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GestorDashboard } from './GestorDashboard';
import { activityService } from '../../services/activity.service';

vi.mock('../../services/activity.service', () => ({
  activityService: { listMine: vi.fn(), misEstadisticas: vi.fn() },
}));

describe('GestorDashboard', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (activityService.misEstadisticas as any).mockResolvedValue({ enviada: 1, aprobada: 2, rechazada: 0 });
  });

  it('lista las actividades propias', async () => {
    (activityService.listMine as any).mockResolvedValue({
      data: [{ id: 'a1', barrio: 'LA MACARENA', status: 'BORRADOR', dateTime: '2026-08-20T14:00:00.000Z', categorySeq: 1 }],
      total: 1,
    });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('table')).toBeDefined());
    expect(within(screen.getByRole('table')).getByText(/LA MACARENA/)).toBeDefined();
  });

  it('muestra un mensaje cuando el gestor no tiene actividades', async () => {
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/no tienes actividades|sin actividades/i)).toBeDefined());
  });

  it('no ofrece ningun control para pedir actividades de otro gestor', async () => {
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(activityService.listMine).toHaveBeenCalled());
    // listMine se llama sin ningun identificador de usuario/gestor: el
    // backend decide de quien son las actividades a partir del token.
    const filtrosEnviados = (activityService.listMine as any).mock.calls[0][0];
    expect(filtrosEnviados).not.toHaveProperty('userId');
    expect(filtrosEnviados).not.toHaveProperty('gestorId');
    expect(filtrosEnviados).not.toHaveProperty('createdByUserId');
  });

  it('llama a misEstadisticas para mostrar los contadores', async () => {
    (activityService.listMine as any).mockResolvedValue({ data: [], total: 0 });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('1')).toBeDefined());
    expect(screen.getByText('2')).toBeDefined();
  });
  // Las tres actividades cubren los estados que distinguen el cableado: solo
  // RECHAZADA es editable, y cada una cae en un barrio y turno distinto.
  const TRES_ACTIVIDADES = [
    { id: 'a1', barrio: 'LA MACARENA', status: 'RECHAZADA', dateTime: '2026-08-20T14:00:00.000Z', categorySeq: 1, isNightShift: false },
    { id: 'a2', barrio: 'LAS AGUAS', status: 'ENVIADA', dateTime: '2026-08-21T22:00:00.000Z', categorySeq: 2, isNightShift: true },
    { id: 'a3', barrio: 'LA MACARENA', status: 'PUBLICADA', dateTime: '2026-08-22T09:00:00.000Z', categorySeq: 3, isNightShift: false },
  ];

  async function renderConTres() {
    (activityService.listMine as any).mockResolvedValue({ data: TRES_ACTIVIDADES, total: 3 });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('table')).toBeDefined());
  }

  // Cableado del guard de edicion. Sin este test se puede cambiar
  // `esEditable(a) &&` por `true &&` y la suite sigue verde.
  it('solo ofrece Editar sobre la actividad rechazada', async () => {
    await renderConTres();
    const filas = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(3);

    const rechazada = filas.find((f) => within(f).queryByText('Rechazada'))!;
    expect(within(rechazada).getByText('Editar')).toBeDefined();

    for (const estado of ['Enviada', 'Publicada']) {
      const fila = filas.find((f) => within(f).queryByText(estado))!;
      expect(within(fila).queryByText('Editar')).toBeNull();
    }
  });

  // Cableado de los filtros. Sin estos tests se puede reemplazar
  // `filterActividades(...)` por `actividades` y la suite sigue verde.
  it('el filtro de estado recorta la tabla', async () => {
    await renderConTres();
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'ENVIADA' } });
    await waitFor(() => {
      expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(1);
    });
    expect(within(screen.getByRole('table')).getByText('LAS AGUAS')).toBeDefined();
  });

  it('el filtro de barrio recorta la tabla', async () => {
    await renderConTres();
    fireEvent.change(screen.getByLabelText(/barrio/i), { target: { value: 'LA MACARENA' } });
    await waitFor(() => {
      expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(2);
    });
    expect(within(screen.getByRole('table')).queryByText('LAS AGUAS')).toBeNull();
  });

  it('el filtro de turno recorta la tabla', async () => {
    await renderConTres();
    fireEvent.change(screen.getByLabelText(/turno/i), { target: { value: 'NOCTURNO' } });
    await waitFor(() => {
      expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(1);
    });
    expect(within(screen.getByRole('table')).getByText('LAS AGUAS')).toBeDefined();
  });

  // Un fallo de carga no puede verse igual que "no tienes actividades": el
  // gestor concluiria que perdio su trabajo.
  it('distingue un fallo de carga del estado vacio', async () => {
    const fallo: any = new Error('fallo');
    fallo.name = 'AxiosError';
    (activityService.listMine as any).mockRejectedValue(fallo);
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText(/no se pudieron cargar/i)).toBeDefined();
    expect(screen.queryByText(/aun no tienes actividades/i)).toBeNull();
  });

  it('reintentar vuelve a pedir las actividades', async () => {
    const fallo: any = new Error('fallo');
    fallo.name = 'AxiosError';
    (activityService.listMine as any).mockRejectedValueOnce(fallo).mockResolvedValue({ data: [], total: 0 });
    render(<MemoryRouter><GestorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());

    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByText(/aun no tienes actividades/i)).toBeDefined();
  });
  // La vista movil repite las filas como tarjetas. Si el guard de edicion se
  // cablea solo en la tabla, desde el telefono se ofreceria editar una
  // actividad ya enviada.
  it('la vista movil respeta el guard de edicion', async () => {
    await renderConTres();
    const movil = screen.getByTestId('lista-movil');
    expect(within(movil).getAllByText('Ver detalles')).toHaveLength(3);
    expect(within(movil).getAllByText('Editar')).toHaveLength(1);
  });
});
