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
import type { Actividad } from '../../types';

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
    const valores = cifrasDe(actividad.dynamicAnswers) as Record<string, number | undefined>;
    return Object.entries(valores).filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0);
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
          </div>
          <div className="mt-5">
            <p className="card-subtitle">Descripcion de lo realizado</p>
            <p className="text-neutral-800 whitespace-pre-wrap">{actividad.results}</p>
          </div>
        </section>

        {cifras.length > 0 && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Cifras reportadas</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {cifras.map(([clave, valor]) => (
                <div key={clave}>
                  <p className="card-subtitle">{clave}</p>
                  <p className="text-2xl font-bold text-primary">{valor}</p>
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
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
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
            </div>
          </section>
        ) : (
          <section className="card">
            <p className="text-neutral-600">
              Esta actividad ya no espera validacion. Su estado actual es{' '}
              <strong>{actividad.status.toLowerCase()}</strong>.
            </p>
            {actividad.validationNotes && (
              <p className="mt-3 text-neutral-700 whitespace-pre-wrap">{actividad.validationNotes}</p>
            )}
          </section>
        )}

        <Link to="/validador/dashboard" className="btn-secondary inline-flex">
          Volver
        </Link>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
