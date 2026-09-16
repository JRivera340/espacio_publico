import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../../services/activity.service';
import { mensajeDeError } from '../../utils/errorMessage';
import { getActivityCode } from '../../utils/activityCode';
import { cifrasDe } from '../../types/operativoFields';
import { useFileUrls, useFileUrl } from '../../hooks/useFileUrl';
import { resolverActa } from '../../components/lib/activityDetail';
import { StatusBadge } from '../../components/StatusBadge';
import { Loading } from '../../components/Loading';
import { Toast } from '../../components/Toast';
import { NOMBRES_CAMPOS_FIJOS } from '../gestor/lib/activityForm';
import type { Actividad } from '../../types';

// Claves de dynamicAnswers que ya se muestran con su propio control fijo en
// otra parte de la pantalla (fecha, ubicacion, barrio, fotos...) mas las
// tecnicas que no son una respuesta ('tipo', metadatos de campo). No van en
// "Otras respuestas" para no repetir lo que ya se ve arriba.
const CLAVES_EXCLUIDAS_DE_OTRAS_RESPUESTAS = new Set([...NOMBRES_CAMPOS_FIJOS, 'tipo', '__fieldMeta']);

// Etiqueta legible a partir del nombre tecnico de una pregunta: sin esto se ve
// "personasSensibilizadas" en vez de "Personas sensibilizadas".
function etiquetaDeClave(clave: string): string {
  const conEspacios = clave.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  const minuscula = conEspacios.toLowerCase();
  return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
}

// Valor de una respuesta dinamica en texto legible: booleanos como Si/No,
// listas separadas por coma, vacio explicito en vez de nada.
function valorLegible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return 'Sin responder';
  if (typeof valor === 'boolean') return valor ? 'Si' : 'No';
  if (Array.isArray(valor)) return valor.length > 0 ? valor.join(', ') : 'Sin responder';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

const EnlaceDeActa = ({ referencia }: { referencia: string }) => {
  const url = useFileUrl(referencia);
  if (!url) return <p className="text-neutral-500">Preparando el acta...</p>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm inline-flex">
      Ver acta del operativo
    </a>
  );
};

export const ValidarActividadPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [fotosElegidas, setFotosElegidas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    setCargando(true);
    activityService
      .getById(id)
      .then((datos) => {
        if (!vigente) return;
        setActividad(datos);
        // Por defecto se publican todas: el validador quita las que no van, no
        // tiene que acordarse de marcarlas una por una.
        setFotosElegidas(datos.photos ?? []);
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

  const fotos = actividad?.photos ?? [];
  const urls = useFileUrls(fotos);
  const acta = useMemo(() => resolverActa(actividad), [actividad]);

  const cifras = useMemo(() => {
    if (!actividad) return [] as Array<[string, number]>;
    const valores = cifrasDe(actividad.dynamicAnswers) as Record<string, unknown>;
    return Object.entries(valores).filter((e): e is [string, number] => typeof e[1] === 'number');
  }, [actividad]);

  // Respuestas del formulario dinamico que no son cifras (texto, booleanos) y
  // que no tienen ya su propio control fijo en pantalla.
  const otrasRespuestas = useMemo(() => {
    if (!actividad?.dynamicAnswers) return [] as Array<[string, unknown]>;
    return Object.entries(actividad.dynamicAnswers).filter(
      ([clave, valor]) => !CLAVES_EXCLUIDAS_DE_OTRAS_RESPUESTAS.has(clave) && typeof valor !== 'number',
    );
  }, [actividad]);

  const cifrasHeredadas = useMemo(() => {
    if (!actividad) return [] as Array<[string, number]>;
    const posibles: Array<[string, number | null | undefined]> = [
      ['Personas sensibilizadas', actividad.personasSensibilizadas],
      ['Personas trasladadas', actividad.personasTransladadas],
      ['Incautacion de licores', actividad.incautacionLicores],
      ['Incautacion de armas blancas', actividad.incautacionArmasBlancas],
      ['Operativos 1801', actividad.num_1801],
    ];
    return posibles.filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0);
  }, [actividad]);

  const alternarFoto = (foto: string) => {
    setFotosElegidas((previas) =>
      previas.includes(foto) ? previas.filter((f) => f !== foto) : [...previas, foto],
    );
  };

  const aprobar = async () => {
    if (!actividad) return;
    setGuardando(true);
    try {
      await activityService.approve(actividad.id, nota.trim() || undefined, fotosElegidas);
      setToast({ message: 'Actividad aprobada y publicada', type: 'success' });
      setTimeout(() => navigate('/validador/dashboard'), 1200);
    } catch (err) {
      const motivo = mensajeDeError(err);
      if (motivo) setToast({ message: motivo, type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const rechazar = async () => {
    if (!actividad) return;
    // Un rechazo sin nota deja al gestor adivinando que corregir.
    if (!nota.trim()) {
      setToast({ message: 'Escribi que hay que corregir antes de rechazar', type: 'error' });
      return;
    }
    setGuardando(true);
    try {
      await activityService.reject(actividad.id, nota.trim());
      setToast({ message: 'Actividad devuelta al gestor', type: 'success' });
      setTimeout(() => navigate('/validador/dashboard'), 1200);
    } catch (err) {
      const motivo = mensajeDeError(err);
      if (motivo) setToast({ message: motivo, type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Loading />;

  if (error || !actividad) {
    return (
      <div className="page-container">
        <main className="page-content">
          <div className="card empty-state" role="alert">
            <p className="empty-state-title text-red-700">No se pudo abrir la actividad</p>
            <p className="empty-state-description">{error ?? 'No se encontro la actividad'}</p>
            <button type="button" className="btn-secondary mt-4" onClick={() => navigate('/validador/dashboard')}>
              Volver
            </button>
          </div>
        </main>
      </div>
    );
  }

  const puedeValidar = actividad.status === 'ENVIADA';

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">{getActivityCode(actividad)}</h1>
          <p className="page-subtitle">{actividad.barrio}</p>
        </div>
        <StatusBadge status={actividad.status} />
      </div>

      <main className="page-content space-y-6">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Datos del operativo</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="card-subtitle">Fecha y hora</p>
              <p className="font-semibold text-neutral-800">
                {format(new Date(actividad.dateTime), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
              </p>
            </div>
            <div>
              <p className="card-subtitle">Turno</p>
              <p className="font-semibold text-neutral-800">{actividad.isNightShift ? 'Nocturno' : 'Diurno'}</p>
            </div>
            <div>
              <p className="card-subtitle">Entidad responsable</p>
              <p className="font-semibold text-neutral-800">{actividad.entidadResponsable || 'Sin registrar'}</p>
            </div>
            <div>
              <p className="card-subtitle">Entidades acompanantes</p>
              <p className="font-semibold text-neutral-800">
                {actividad.entidadesAcompanantes?.length ? actividad.entidadesAcompanantes.join(', ') : 'Ninguna'}
              </p>
            </div>
            {actividad.isGroupOperativo && (
              <div>
                <p className="card-subtitle">Operativo en grupo</p>
                <p className="font-semibold text-neutral-800">
                  {actividad.gestoresInvolucradosIds?.length
                    ? `Si, con ${actividad.gestoresInvolucradosIds.length} gestor(es) mas`
                    : 'Si'}
                </p>
              </div>
            )}
          </div>
          <div className="mt-5">
            <p className="card-subtitle">Descripcion de lo realizado</p>
            <p className="text-neutral-800 whitespace-pre-wrap">{actividad.results}</p>
          </div>
        </section>

        {actividad.validationNotes && (
          <section className="card border-l-4 border-amber-400">
            <div className="card-header">
              <h2 className="card-title">Nota de validacion</h2>
            </div>
            <p className="text-neutral-700 whitespace-pre-wrap">{actividad.validationNotes}</p>
          </section>
        )}

        {cifras.length > 0 && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Cifras reportadas</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {cifras.map(([clave, valor]) => (
                <div key={clave}>
                  <p className="card-subtitle">{etiquetaDeClave(clave)}</p>
                  <p className="text-2xl font-bold text-primary">{valor}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {cifrasHeredadas.length > 0 && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Cifras adicionales</h2>
              <p className="card-subtitle">Registradas por fuera del formulario dinamico.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {cifrasHeredadas.map(([etiqueta, valor]) => (
                <div key={etiqueta}>
                  <p className="card-subtitle">{etiqueta}</p>
                  <p className="text-2xl font-bold text-primary">{valor}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {otrasRespuestas.length > 0 && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Otras respuestas del formulario</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otrasRespuestas.map(([clave, valor]) => (
                <div key={clave}>
                  <p className="card-subtitle">{etiquetaDeClave(clave)}</p>
                  <p className="font-semibold text-neutral-800 whitespace-pre-wrap">{valorLegible(valor)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Evidencia</h2>
            <p className="card-subtitle">
              Las fotos marcadas son las que se publican en el visor publico. Las que desmarques no salen.
            </p>
          </div>

          {fotos.length === 0 ? (
            <p className="text-neutral-500">Sin fotos cargadas</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {fotos.map((foto, i) => {
                const elegida = fotosElegidas.includes(foto);
                return (
                  <label
                    key={foto}
                    htmlFor={`foto-${i}`}
                    className={`block rounded-2xl overflow-hidden border-2 cursor-pointer transition-colors ${
                      elegida ? 'border-green-500' : 'border-neutral-200 opacity-60'
                    }`}
                  >
                    {urls[i] ? (
                      <img src={urls[i] as string} alt={`Evidencia ${i + 1}`} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-neutral-100" />
                    )}
                    <div className="flex items-center gap-2 p-2 bg-white">
                      <input
                        id={`foto-${i}`}
                        type="checkbox"
                        className="checkbox-field"
                        checked={elegida}
                        onChange={() => alternarFoto(foto)}
                        disabled={!puedeValidar}
                      />
                      <span className="text-sm">{elegida ? 'Se publica' : 'No se publica'}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            {acta ? <EnlaceDeActa referencia={acta} /> : <p className="text-neutral-500">Sin acta cargada</p>}
          </div>
        </section>

        {puedeValidar ? (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Decision</h2>
            </div>
            <label className="input-label font-semibold" htmlFor="nota">
              Nota para el gestor
            </label>
            <textarea
              id="nota"
              rows={3}
              maxLength={2000}
              className="input-field"
              placeholder="Obligatoria si vas a rechazar: es lo unico que le dice al gestor que corregir"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </section>
        ) : (
          <section className="card">
            <p className="text-neutral-600">
              Esta actividad ya no espera validacion. Su estado actual es{' '}
              <strong>{actividad.status.toLowerCase()}</strong>.
            </p>
          </section>
        )}

        {/* Espaciador para que la barra flotante no tape el final del contenido. */}
        <div className="h-24" aria-hidden="true" />
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-4 py-3 z-20">
        <div className="page-content flex flex-col sm:flex-row gap-3">
          <Link to="/validador/dashboard" className="btn-secondary btn-lg justify-center sm:w-auto">
            Volver
          </Link>
          {puedeValidar && (
            <>
              <button
                type="button"
                disabled={guardando}
                onClick={aprobar}
                className="btn-success btn-lg flex-1 justify-center"
              >
                {guardando ? 'Guardando...' : 'Aprobar y publicar'}
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={rechazar}
                className="btn-secondary btn-lg flex-1 justify-center"
              >
                Rechazar y devolver
              </button>
            </>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
