import type { Actividad } from '../../types';

// Logica pura del detalle: sin React ni estado, para poder probarla directo.

/** true si el valor apunta a un archivo real y no a un marcador de pendiente. */
export function esReferenciaDeArchivo(valor?: string | null): boolean {
  if (!valor) return false;
  const v = valor.trim();
  return v !== '' && v.toUpperCase() !== 'PENDIENTE';
}

/**
 * Encuentra el acta de una actividad.
 *
 * Prioriza los campos dedicados. Como respaldo busca dentro de dynamicAnswers
 * una respuesta que apunte a un PDF o a la carpeta de actas: recupera las actas
 * que el gestor subio pero que quedaron guardadas solo como respuesta del
 * formulario. Sin ese respaldo, esas actas existen en el deposito de archivos y
 * la pantalla las muestra como si nunca se hubieran cargado.
 */
export function resolverActa(actividad?: Partial<Actividad> | null): string | null {
  if (!actividad) return null;
  if (esReferenciaDeArchivo(actividad.actaPdfUrl)) return (actividad.actaPdfUrl as string).trim();
  if (esReferenciaDeArchivo(actividad.actaOperativo)) return (actividad.actaOperativo as string).trim();

  const respuestas = actividad.dynamicAnswers;
  if (!respuestas || typeof respuestas !== 'object') return null;

  const buscar = (valor: unknown): string | null => {
    if (typeof valor === 'string') {
      const s = valor.trim();
      if (!s) return null;
      const bajo = s.toLowerCase();
      if (bajo.includes('actas/') || (bajo.endsWith('.pdf') && s.toUpperCase() !== 'PENDIENTE')) return s;
      return null;
    }
    if (Array.isArray(valor)) {
      for (const item of valor) {
        const encontrado = buscar(item);
        if (encontrado) return encontrado;
      }
    }
    return null;
  };

  // Primero las claves que se llaman como el acta, despues cualquier otra.
  for (const [clave, valor] of Object.entries(respuestas)) {
    if (/acta/i.test(clave)) {
      const encontrado = buscar(valor);
      if (encontrado) return encontrado;
    }
  }
  for (const valor of Object.values(respuestas)) {
    const encontrado = buscar(valor);
    if (encontrado) return encontrado;
  }
  return null;
}

/** La ubicacion de la actividad, si tiene coordenadas usables. */
export function ubicacionDe(actividad?: Partial<Actividad> | null): { lat: number; lng: number } | null {
  if (!actividad) return null;
  const { lat, lng } = actividad;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

/** Etiqueta legible de una pregunta, tomada del retrato guardado al registrar. */
export function etiquetaDePregunta(
  dynamicAnswers: Record<string, any> | null | undefined,
  clave: string,
): string | null {
  const meta = dynamicAnswers?.__fieldMeta;
  if (!meta || typeof meta !== 'object') return null;
  const entrada = (meta as Record<string, any>)[clave];
  if (entrada && typeof entrada.label === 'string' && entrada.label.trim()) return entrada.label;
  return null;
}
