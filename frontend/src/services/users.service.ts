import api from './api';

// Este modulo no tiene tabla de usuarios: la identidad la emite el hub y el
// backend la reexpone a traves de su proxy (`users-proxy.controller.ts`).
// La ruta responde a cualquier usuario autenticado y devuelve un ARREGLO PLANO
// de gestores activos del area, con el usuario completo del hub (correo, rol,
// fechas de creacion). Nada de eso se necesita en la pantalla de registro.

/** Lo unico que la pantalla necesita de un gestor: a quien mostrar y que id enviar. */
export interface GestorResumen {
  id: string;
  nombre: string;
}

// Forma parcial de lo que devuelve el hub. Se declara parcial a proposito: si
// el hub agrega o quita campos, aca no se rompe nada porque no se leen.
interface GestorDelHub {
  id?: unknown;
  name?: unknown;
  lastname?: unknown;
}

export const usersService = {
  // Gestores del area que pueden figurar como acompanantes de un operativo en
  // grupo. El saneamiento a {id, nombre} es intencional: evita que datos de
  // contacto del hub terminen viviendo en el estado de una pantalla que solo
  // necesita pintar una lista de casillas.
  async listarGestores(): Promise<GestorResumen[]> {
    const { data } = await api.get<GestorDelHub[]>('/users/gestores/list');
    if (!Array.isArray(data)) return [];
    return data
      .filter((u): u is GestorDelHub => !!u && typeof u.id === 'string' && !!u.id)
      .map((u) => {
        const nombre = `${typeof u.name === 'string' ? u.name : ''} ${
          typeof u.lastname === 'string' ? u.lastname : ''
        }`.trim();
        return { id: u.id as string, nombre: nombre || 'Gestor sin nombre' };
      });
  },
};
