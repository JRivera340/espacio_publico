import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { activityService } from '../../services/activity.service';
import { programacionService } from '../../services/programacion.service';

vi.mock('../../services/activity.service', () => ({
  activityService: { listAll: vi.fn(), descargarInforme: vi.fn() },
}));

vi.mock('../../services/programacion.service', () => ({
  programacionService: { listar: vi.fn() },
}));

const ahora = Date.now();
const haceDias = (d: number) => new Date(ahora - d * 86400000).toISOString();

const ACTIVIDADES = [
  { id: 'a1', status: 'PUBLICADA', barrio: 'LA MACARENA', lat: 4.6, lng: -74.07, dateTime: haceDias(1), operativoSubtipo: 'ESPACIO_PUBLICO_1801' },
  { id: 'a2', status: 'PUBLICADA', barrio: 'LA MACARENA', lat: 4.6001, lng: -74.0701, dateTime: haceDias(2), operativoSubtipo: 'ESPACIO_PUBLICO_1801' },
  { id: 'a3', status: 'ENVIADA', barrio: 'LA MACARENA', lat: 4.6002, lng: -74.0702, dateTime: haceDias(3), operativoSubtipo: 'ESPACIO_PUBLICO_1801' },
  { id: 'a4', status: 'RECHAZADA', barrio: 'LAS AGUAS', lat: 4.61, lng: -74.06, dateTime: haceDias(40), operativoSubtipo: 'ESPACIO_PUBLICO_1801' },
] as any[];

function renderPantalla() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

describe('AdminDashboard', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (activityService.listAll as any).mockReset().mockResolvedValue({ data: ACTIVIDADES, total: 4 });
    (programacionService.listar as any).mockReset().mockResolvedValue([]);
  });

  it('pide todas las actividades del area', async () => {
    renderPantalla();
    await waitFor(() => expect(activityService.listAll).toHaveBeenCalled());
  });

  it('muestra el total y el ritmo reciente', async () => {
    renderPantalla();
    await screen.findByText('Total de operativos');
    // 4 en total, 3 en los ultimos 20 dias (la cuarta es de hace 40).
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('agrupa por barrio', async () => {
    renderPantalla();
    await screen.findByText('Por barrio');
    // LA MACARENA aparece tambien en la tabla de puntos repetidos.
    expect(screen.getAllByText('LA MACARENA').length).toBeGreaterThan(0);
    expect(screen.getByText('LAS AGUAS')).toBeDefined();
  });

  // Tres operativos a metros uno del otro no es lo mismo que tres repartidos:
  // el panel tiene que distinguirlos.
  it('detecta los puntos con intervencion repetida', async () => {
    renderPantalla();
    await screen.findByText('Puntos con intervencion repetida');
    await waitFor(() => expect(screen.getByRole('table')).toBeDefined());
  });

  it('cuenta la programacion pendiente', async () => {
    (programacionService.listar as any).mockResolvedValue([
      { id: 'p1', estado: 'PENDIENTE', fecha: haceDias(0), descripcion: 'x', creadoPorUserId: 'v1' },
      { id: 'p2', estado: 'CUMPLIDA', fecha: haceDias(0), descripcion: 'y', creadoPorUserId: 'v1' },
    ]);
    renderPantalla();
    await screen.findByText('Programadas pendientes');
    await waitFor(() => expect(screen.getAllByText('1').length).toBeGreaterThan(0));
  });

  // Si la programacion falla, los indicadores de actividades se siguen viendo.
  it('un fallo de la programacion no tumba la pantalla', async () => {
    (programacionService.listar as any).mockRejectedValue(new Error('boom'));
    renderPantalla();
    expect(await screen.findByText('Total de operativos')).toBeDefined();
  });

  it('distingue un fallo de carga de no tener actividades', async () => {
    (activityService.listAll as any).mockRejectedValue(new Error('boom'));
    renderPantalla();
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.queryByText(/Todavia no hay actividades/)).toBeNull();
  });

  it('avisa cuando no hay nada registrado todavia', async () => {
    (activityService.listAll as any).mockResolvedValue({ data: [], total: 0 });
    renderPantalla();
    expect(await screen.findByText(/Todavia no hay actividades registradas/)).toBeDefined();
  });
});
