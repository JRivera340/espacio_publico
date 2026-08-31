import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../services/activity.service';
import { usersService, type GestorResumen } from '../services/users.service';
import { mensajeDeError } from '../utils/errorMessage';
import { getActivityCode } from '../utils/activityCode';
import { cifrasDe, type CifrasEspacioPublico1801 } from '../types/operativoFields';
import { useFileUrl } from '../hooks/useFileUrl';
import { esEditable } from '../pages/gestor/lib/dashboardFilters';
import { resolverActa, ubicacionDe, etiquetaDePregunta } from './lib/activityDetail';
import { StatusBadge } from './StatusBadge';
import { PhotoCarousel } from './PhotoCarousel';
import { Loading } from './Loading';
import type { Actividad } from '../types';

const PREFIJO_EDITAR = '/gestor/editar-actividad/';
const FORMATO_FECHA = "dd 'de' MMMM yyyy, HH:mm";

// Nombres legibles de las cifras del operativo, para cuando la actividad no
// trae el retrato de etiquetas de la encuesta (__fieldMeta).
const NOMBRE_DE_CIFRA: Record<keyof CifrasEspacioPublico1801, string> = {
  estructurasNoConvencionales: 'Estructuras no convencionales intervenidas',
  cambuches: 'Cambuches intervenidos',
  cachivacherosIntervenidos: 'Cachivacheros intervenidos',
  comparendos: 'Comparendos impuestos',
  trasladadosCtp: 'Trasladados a CTP',
  capturados: 'Capturados',
  armasCortopunzantes: 'Armas cortopunzantes incautadas',
  armasFuego: 'Armas de fuego incautadas',
  personasSensibilizadas: 'Personas sensibilizadas',
  kgMercanciaIncautada: 'Kg de mercancia incautada',
  pipetasIncautadas: 'Pipetas incautadas',
  bicicletasRecuperadas: 'Bicicletas recuperadas',
  celularesRecuperados: 'Celulares recuperados',
  carretasIncautadas: 'Carretas incautadas',
  mendicidad: 'Personas en situacion de mendicidad identificadas',
  vendedoresInformalesRetirados: 'Vendedores informales retirados',
  vendedoresInformalesIntervenidos: 'Vendedores informales intervenidos',
  m2RecuperadosEspacioPublico: 'm2 de espacio publico recuperados',
};

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) => (
  <div>
    <p className="card-subtitle">{etiqueta}</p>
    <p className="font-semibold text-neutral-800">{valor}</p>
  </div>
);

const EnlaceDeActa = ({ referencia }: { referencia: string }) => {
  const url = useFileUrl(referencia);
  if (!url) return <p className="text-neutral-500">Preparando el acta...</p>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm inline-flex">
      Ver acta del operativo
    </a>
  );
};

export const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gestores, setGestores] = useState<GestorResumen[]>([]);

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    setCargando(true);
    activityService
      .getById(id)
      .then((datos) => {
        if (!vigente) return;
        setActividad(datos);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setActividad(null);
        setError(mensajeDeError(err) ?? 'No se pudo cargar la actividad');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [id]);

  // Los acompanantes se resuelven aparte: si el proxy de usuarios falla, el
  // detalle igual se ve. Perder los nombres no puede costar la pantalla entera.
  useEffect(() => {
    if (!actividad?.gestoresInvolucradosIds?.length) return;
    let vigente = true;
    usersService
      .listarGestores()
      .then((lista) => {
        if (vigente) setGestores(lista);
      })
      .catch(() => {
        if (vigente) setGestores([]);
      });
    return () => {
      vigente = false;
    };
  }, [actividad?.gestoresInvolucradosIds]);

  const acta = useMemo(() => resolverActa(actividad), [actividad]);
  const ubicacion = useMemo(() => ubicacionDe(actividad), [actividad]);

  const cifras = useMemo(() => {
    if (!actividad) return [] as Array<{ clave: string; etiqueta: string; valor: number }>;
    const valores = cifrasDe(actividad.dynamicAnswers);
    return (Object.keys(NOMBRE_DE_CIFRA) as Array<keyof CifrasEspacioPublico1801>)
      .map((clave) => ({
        clave: clave as string,
        etiqueta: etiquetaDePregunta(actividad.dynamicAnswers, clave) ?? NOMBRE_DE_CIFRA[clave],
        valor: valores[clave],
      }))
      .filter(
        (c): c is { clave: string; etiqueta: string; valor: number } =>
          typeof c.valor === 'number' && c.valor > 0,
      );
  }, [actividad]);

  const acompanantes = useMemo(() => {
    const ids = actividad?.gestoresInvolucradosIds ?? [];
    if (!ids.length) return [];
    return ids.map((idGestor) => gestores.find((g) => g.id === idGestor)?.nombre ?? 'Gestor del area');
  }, [actividad?.gestoresInvolucradosIds, gestores]);

  if (cargando) return <Loading />;

  if (error || !actividad) {
    return (
      <div className="page-container">
        <main className="page-content">
          <div className="card empty-state" role="alert">
            <p className="empty-state-title text-red-700">No se pudo abrir la actividad</p>
            <p className="empty-state-description">{error ?? 'No se encontro la actividad'}</p>
            <button type="button" className="btn-secondary mt-4" onClick={() => navigate('/gestor/dashboard')}>
              Volver al panel
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">{getActivityCode(actividad)}</h1>
          <p className="page-subtitle">Espacio publico - actividades del articulo 1801</p>
        </div>
        <StatusBadge status={actividad.status} />
      </div>

      <main className="page-content space-y-6">
        {/* La nota del rechazo va primero: es lo unico que le dice al gestor
            que tiene que corregir. */}
        {actividad.status === 'RECHAZADA' && (
          <div className="card border-l-4 border-red-500">
            <h2 className="card-title text-red-700">Esta actividad fue rechazada</h2>
            <p className="mt-2 text-neutral-700 whitespace-pre-wrap">
              {actividad.validationNotes?.trim()
                ? actividad.validationNotes
                : 'El validador no dejo una nota. Consultale que hay que corregir antes de reenviarla.'}
            </p>
            {esEditable(actividad) && (
              <Link to={PREFIJO_EDITAR + actividad.id} className="btn-success btn-sm mt-4 inline-flex">
                Corregir y reenviar
              </Link>
            )}
          </div>
        )}

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Datos del operativo</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Dato
              etiqueta="Fecha y hora"
              valor={format(new Date(actividad.dateTime), FORMATO_FECHA, { locale: es })}
            />
            <Dato etiqueta="Turno" valor={actividad.isNightShift ? 'Nocturno' : 'Diurno'} />
            <Dato etiqueta="Barrio" valor={actividad.barrio} />
            <Dato etiqueta="Entidad responsable" valor={actividad.entidadResponsable || 'Sin registrar'} />
            {actividad.entidadesAcompanantes?.length > 0 && (
              <Dato etiqueta="Entidades acompanantes" valor={actividad.entidadesAcompanantes.join(', ')} />
            )}
            {ubicacion && (
              <Dato etiqueta="Ubicacion" valor={ubicacion.lat.toFixed(5) + ', ' + ubicacion.lng.toFixed(5)} />
            )}
          </div>

          <div className="mt-5">
            <p className="card-subtitle">Descripcion de lo realizado</p>
            <p className="text-neutral-800 whitespace-pre-wrap">{actividad.results}</p>
          </div>
        </section>

        {/* Un gestor acompanante puede abrir esta actividad porque el backend lo
            autoriza con esta lista. Si no la mostramos, la abre y no entiende
            por que figura en ella. */}
        {actividad.isGroupOperativo && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Operativo en grupo</h2>
            </div>
            {acompanantes.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {acompanantes.map((nombre, i) => (
                  <li key={i} className="px-3 py-1 rounded-full bg-neutral-100 text-sm font-medium text-neutral-700">
                    {nombre}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">Se registro como operativo en grupo, sin gestores acompanantes.</p>
            )}
          </section>
        )}

        {cifras.length > 0 && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Cifras del operativo</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cifras.map((c) => (
                <div key={c.clave}>
                  <p className="card-subtitle">{c.etiqueta}</p>
                  <p className="text-2xl font-bold text-primary">{c.valor}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Evidencia</h2>
          </div>
          <PhotoCarousel photos={actividad.photos ?? []} />
          <div className="mt-4">
            {acta ? <EnlaceDeActa referencia={acta} /> : <p className="text-neutral-500">Sin acta cargada</p>}
          </div>
        </section>

        {actividad.validatedAt && actividad.status !== 'RECHAZADA' && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Validacion</h2>
            </div>
            <Dato
              etiqueta="Validada el"
              valor={format(new Date(actividad.validatedAt), FORMATO_FECHA, { locale: es })}
            />
            {actividad.validationNotes && (
              <p className="mt-3 text-neutral-700 whitespace-pre-wrap">{actividad.validationNotes}</p>
            )}
          </section>
        )}

        <Link to="/gestor/dashboard" className="btn-secondary inline-flex">
          Volver al panel
        </Link>
      </main>
    </div>
  );
};
