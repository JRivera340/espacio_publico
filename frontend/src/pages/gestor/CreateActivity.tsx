import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { activityService } from '../../services/activity.service';
import { catalogService } from '../../services/catalog.service';
import { surveyService, type SurveySchema } from '../../services/survey.service';
import { AREAS_CATALOG, SUBCATEGORY_MAPPING } from '../../config/areasCatalog';
import { detectarBarrio } from '../../utils/boundaryValidation';
import { mensajeDeError } from '../../utils/errorMessage';
import { Loading } from '../../components/Loading';
import { Toast } from '../../components/Toast';
import { PhotosUpload } from '../../components/PhotosUpload';
import { ActaUpload } from '../../components/ActaUpload';
import { BoundaryLayer } from '../../components/BoundaryLayer';
import { BarriosLayer } from '../../components/BarriosLayer';
import { MapLayerControl, type LayerVisibility } from '../../components/MapLayerControl';
import { DynamicSurveyRenderer } from '../../components/DynamicSurveyRenderer';
import { construirDtoActividad, preguntasDinamicas } from './lib/activityForm';
import type { Catalogs } from '../../types';

const CENTRO_LOCALIDAD: [number, number] = [4.6097, -74.0817];

// El area tiene un unico frente de trabajo, asi que no hay desplegable de
// categoria ni de subtipo: el valor sale del catalogo y se muestra fijo.
const SUBTIPO_DISPLAY = SUBCATEGORY_MAPPING[AREAS_CATALOG[0].subtipos[0].enum];

const iconoMarcador = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface FormData {
  fechaHora: string;
  descripcion: string;
  entidadResponsable: string;
  enGrupo: boolean;
}

// Valor inicial del input datetime-local: ahora, en hora local del telefono.
function ahoraLocal(): string {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 16);
}

function CapturadorDeClicks({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function CentrarVista({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Registro de un operativo de espacio publico. El flujo es en dos pasos, igual
// que en el hub: se crea en BORRADOR y despues se envia a validacion.
export const CreateActivity: React.FC = () => {
  const navigate = useNavigate();

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [schema, setSchema] = useState<SurveySchema | null>(null);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [barrio, setBarrio] = useState('');
  const [ubicando, setUbicando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({ barrios: true });

  const [fotos, setFotos] = useState<string[]>([]);
  const [actaUrl, setActaUrl] = useState('');
  const [entidadesAcompanantes, setEntidadesAcompanantes] = useState<string[]>([]);

  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: { fechaHora: ahoraLocal(), descripcion: '', entidadResponsable: '', enGrupo: false },
  });

  useEffect(() => {
    let vigente = true;

    Promise.all([catalogService.getAll(), surveyService.getSurvey(SUBTIPO_DISPLAY)])
      .then(([catalogos, encuesta]) => {
        if (!vigente) return;
        setCatalogs(catalogos);
        setErrorCarga(null);
        if (encuesta) {
          setSchema(encuesta);
          setErrorFormulario(null);
        } else {
          // Un formulario que no llega no puede verse como uno vacio: sin
          // esquema no hay cifras del operativo que registrar.
          setSchema(null);
          setErrorFormulario(
            'No hay un formulario activo para este tipo de operativo. Avisa al administrador antes de continuar.',
          );
        }
      })
      .catch((err) => {
        if (!vigente) return;
        setErrorCarga(mensajeDeError(err));
      })
      .finally(() => {
        if (vigente) setCargandoInicial(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const preguntasVisibles = useMemo(
    () => (schema ? preguntasDinamicas(schema.questions) : []),
    [schema],
  );

  const centroMapa: [number, number] = lat !== null && lng !== null ? [lat, lng] : CENTRO_LOCALIDAD;

  // El barrio NO se elige: se deriva de la coordenada. detectarBarrio devuelve
  // null cuando el punto cae en Candelaria, fuera de Santa Fe, o en una zona
  // sin barrio identificable; en esos casos la coordenada se descarta para que
  // no quede una actividad ubicada fuera de la zona de trabajo.
  const aplicarCoordenada = async (nuevaLat: number, nuevaLng: number) => {
    setErrorUbicacion('');
    const barrioDetectado = await detectarBarrio(nuevaLat, nuevaLng);
    if (!barrioDetectado) {
      setErrorUbicacion('Esa ubicacion esta fuera de la localidad de Santa Fe o no pertenece a ningun barrio.');
      return;
    }
    setLat(nuevaLat);
    setLng(nuevaLng);
    setBarrio(barrioDetectado);
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setErrorUbicacion('La geolocalizacion no esta disponible en este navegador');
      return;
    }
    setErrorUbicacion('');
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await aplicarCoordenada(pos.coords.latitude, pos.coords.longitude);
        setUbicando(false);
      },
      (err) => {
        setErrorUbicacion(err.code === 1 ? 'Permiso de ubicacion denegado' : 'No se pudo obtener la ubicacion');
        setUbicando(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const onSubmit = async (data: FormData) => {
    const { errores, dto } = construirDtoActividad({
      subtipoDisplay: SUBTIPO_DISPLAY,
      preguntas: schema?.questions ?? [],
      respuestas,
      lat,
      lng,
      barrio,
      fechaHora: data.fechaHora,
      descripcion: data.descripcion,
      fotos,
      actaUrl,
      entidadResponsable: data.entidadResponsable,
      entidadesAcompanantes,
      enGrupo: Boolean(data.enGrupo),
    });

    if (!dto) {
      setToast({ message: errores.join('. '), type: 'error' });
      return;
    }

    setEnviando(true);
    let idCreada: string | null = null;
    try {
      const creada = await activityService.create(dto);
      idCreada = creada.id;
      await activityService.send(creada.id);
      setToast({ message: 'Actividad registrada y enviada a validacion', type: 'success' });
      setTimeout(() => navigate('/gestor/dashboard'), 1500);
    } catch (err) {
      const motivo = mensajeDeError(err);
      if (motivo) {
        setToast({
          message: idCreada
            ? `La actividad quedo guardada como borrador pero no se pudo enviar a validacion: ${motivo}`
            : motivo,
          type: 'error',
        });
      }
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoInicial) return <Loading />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Registrar actividad</h1>
            <p className="page-subtitle">Espacio publico - operativo {SUBTIPO_DISPLAY}</p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={() => navigate('/gestor/dashboard')}>
            Volver
          </button>
        </div>
      </div>

      <main className="page-content max-w-4xl">
        {errorCarga && (
          <div className="card mb-6 border border-red-200" role="alert">
            <p className="text-sm font-semibold text-red-700">No se pudieron cargar los datos del formulario</p>
            <p className="text-sm text-neutral-600 mt-1">{errorCarga}</p>
          </div>
        )}

        {errorFormulario && (
          <div className="card mb-6 border border-amber-200" role="alert">
            <p className="text-sm font-semibold text-amber-700">Formulario no disponible</p>
            <p className="text-sm text-neutral-600 mt-1">{errorFormulario}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <section className="card space-y-5">
            <div className="card-header">
              <h2 className="card-title">Datos del operativo</h2>
              <p className="card-subtitle">Todos los campos marcados con * son obligatorios</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="input-label font-semibold" htmlFor="fechaHora">
                  Fecha y hora <span className="text-red-500">*</span>
                </label>
                <input id="fechaHora" type="datetime-local" className="input-field" {...register('fechaHora')} />
              </div>

              <div>
                <label className="input-label font-semibold" htmlFor="entidadResponsable">
                  Entidad responsable <span className="text-red-500">*</span>
                </label>
                <select id="entidadResponsable" className="select-field" {...register('entidadResponsable')}>
                  <option value="">Seleccionar entidad</option>
                  {(catalogs?.entidades ?? []).map((entidad) => (
                    <option key={entidad} value={entidad}>
                      {entidad}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="input-label font-semibold" htmlFor="descripcion">
                Descripcion de lo realizado <span className="text-red-500">*</span>
              </label>
              <textarea
                id="descripcion"
                rows={4}
                className="input-field"
                placeholder="Que se hizo, con quien y con que resultado"
                {...register('descripcion')}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="input-label font-semibold">Entidades acompanantes</legend>
              <div className="flex flex-wrap gap-2">
                {(catalogs?.entidades ?? []).map((entidad) => {
                  const marcada = entidadesAcompanantes.includes(entidad);
                  return (
                    <label
                      key={entidad}
                      htmlFor={`acompanante-${entidad}`}
                      className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer ${
                        marcada ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-neutral-200 text-neutral-600'
                      }`}
                    >
                      <input
                        id={`acompanante-${entidad}`}
                        type="checkbox"
                        checked={marcada}
                        onChange={() =>
                          setEntidadesAcompanantes((previas) =>
                            marcada ? previas.filter((e) => e !== entidad) : [...previas, entidad],
                          )
                        }
                        className="w-3.5 h-3.5"
                      />
                      {entidad}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex items-center gap-3">
              <input id="enGrupo" type="checkbox" className="checkbox-field" {...register('enGrupo')} />
              <label className="input-label mb-0" htmlFor="enGrupo">
                El operativo se realizo en grupo
              </label>
            </div>
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">Ubicacion</h2>
              <p className="card-subtitle">Toca el mapa o usa tu ubicacion actual. El barrio se detecta solo.</p>
            </div>

            <button
              type="button"
              onClick={usarMiUbicacion}
              disabled={ubicando}
              className="btn-secondary w-full justify-center"
            >
              {ubicando ? 'Buscando senal GPS...' : 'Usar mi ubicacion actual'}
            </button>

            {errorUbicacion && (
              <p className="text-xs text-red-600" role="alert">
                {errorUbicacion}
              </p>
            )}

            {/* Alto reducido en movil: la pantalla se usa en terreno desde el
                telefono y un mapa de 320px deja el resto del formulario fuera
                de vista. */}
            <div className="h-64 md:h-80 rounded-2xl overflow-hidden border border-neutral-200 relative">
              <MapContainer center={centroMapa} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapLayerControl
                  layerVisibility={layerVisibility}
                  onLayerVisibilityChange={(capa, visible) =>
                    setLayerVisibility((previo) => ({ ...previo, [capa]: visible }))
                  }
                />
                <BoundaryLayer color="#DC2626" fillOpacity={0.08} />
                <BarriosLayer visible={layerVisibility.barrios} fillOpacity={0.05} weight={1} />
                <CentrarVista center={centroMapa} />
                {lat !== null && lng !== null && <Marker position={[lat, lng]} icon={iconoMarcador} />}
                <CapturadorDeClicks onClick={aplicarCoordenada} />
              </MapContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="input-label font-semibold" htmlFor="latitud">
                  Latitud
                </label>
                <input id="latitud" className="input-field" value={lat !== null ? lat.toFixed(6) : ''} readOnly disabled />
              </div>
              <div>
                <label className="input-label font-semibold" htmlFor="longitud">
                  Longitud
                </label>
                <input id="longitud" className="input-field" value={lng !== null ? lng.toFixed(6) : ''} readOnly disabled />
              </div>
              <div>
                {/* Solo lectura a proposito: el barrio se detecta por
                    coordenadas y no se elige a mano. */}
                <label className="input-label font-semibold" htmlFor="barrio">
                  Barrio <span className="text-red-500">*</span>
                </label>
                <input
                  id="barrio"
                  className="input-field"
                  value={barrio}
                  readOnly
                  disabled
                  placeholder="Se detecta al marcar el mapa"
                />
              </div>
            </div>
          </section>

          <section className="card space-y-6">
            <div className="card-header">
              <h2 className="card-title">Evidencia</h2>
              <p className="card-subtitle">El acta del operativo es obligatoria</p>
            </div>

            <PhotosUpload onUploadSuccess={setFotos} existingUrls={fotos} disabled={enviando} />
            <ActaUpload onUploadSuccess={setActaUrl} existingUrl={actaUrl || null} disabled={enviando} />
          </section>

          {schema && preguntasVisibles.length > 0 && (
            <section className="card space-y-5">
              <div className="card-header">
                <h2 className="card-title">{schema.title || 'Cifras del operativo'}</h2>
                {schema.description && <p className="card-subtitle">{schema.description}</p>}
              </div>

              <DynamicSurveyRenderer
                questions={preguntasVisibles}
                allQuestions={schema.questions}
                values={respuestas}
                onChange={(id, valor) => setRespuestas((previas) => ({ ...previas, [id]: valor }))}
                entidades={catalogs?.entidades ?? []}
                disabled={enviando}
              />
            </section>
          )}

          <button type="submit" disabled={enviando || !schema} className="btn-success btn-lg w-full justify-center">
            {enviando ? 'Guardando...' : 'Finalizar registro'}
          </button>
        </form>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
