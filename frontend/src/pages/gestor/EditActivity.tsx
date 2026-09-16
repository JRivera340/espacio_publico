import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { activityService } from '../../services/activity.service';
import { catalogService } from '../../services/catalog.service';
import { surveyService, type SurveySchema } from '../../services/survey.service';
import { usersService, type GestorResumen } from '../../services/users.service';
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
import { MultiSelectCombobox } from '../../components/MultiSelectCombobox';
import {
  aInputDatetimeLocal,
  construirDtoActividad,
  preguntasDinamicas,
  respuestasDesdeActividad,
} from './lib/activityForm';
import { puedeEditar } from './lib/dashboardFilters';
import { useAuthStore } from '../../store/authStore';
import type { Actividad, Catalogs } from '../../types';

const CENTRO_LOCALIDAD: [number, number] = [4.6097, -74.0817];

// Igual que el @MaxLength del DTO del backend.
const MAX_DESCRIPCION = 10000;

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

// Correccion de una actividad rechazada. Es la unica salida de un rechazo: sin
// esta pantalla la observacion del validador no tiene como responderse.
//
// Aplica EXACTAMENTE las mismas reglas que el registro, porque comparte con el
// la misma libreria pura (construirDtoActividad). Si aca se validara distinto,
// un operativo valido al registrarse dejaria de serlo al corregirse.
export const EditActivity: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const usuario = useAuthStore((s) => s.user);

  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);

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

  const [gestores, setGestores] = useState<GestorResumen[]>([]);
  const [errorGestores, setErrorGestores] = useState<string | null>(null);
  const [gestoresSeleccionados, setGestoresSeleccionados] = useState<string[]>([]);
  const idUsuarioActual = usuario?.id;

  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { register, handleSubmit, watch, reset } = useForm<FormData>({
    defaultValues: { fechaHora: '', descripcion: '', entidadResponsable: '', enGrupo: false },
  });

  useEffect(() => {
    let vigente = true;
    if (!id) return;

    Promise.all([
      activityService.getById(id),
      catalogService.getAll(),
      surveyService.getSurvey(SUBTIPO_DISPLAY),
    ])
      .then(([cargada, catalogos, encuesta]) => {
        if (!vigente) return;
        setErrorCarga(null);
        setCatalogs(catalogos);

        // Solo se corrige una actividad RECHAZADA y propia. El backend tambien
        // lo rechaza, pero dejar entrar a la pantalla igual significaria que el
        // gestor descubre que no puede recien al guardar, con todo recargado.
        if (!puedeEditar(cargada, idUsuarioActual)) {
          setSinPermiso(true);
          return;
        }

        setActividad(cargada);

        if (encuesta) {
          setSchema(encuesta);
          setErrorFormulario(null);
          setRespuestas(respuestasDesdeActividad(encuesta.questions, cargada.dynamicAnswers));
        } else {
          // Un formulario que no llega no puede verse como uno vacio: sin
          // esquema no hay cifras del operativo que corregir.
          setSchema(null);
          setErrorFormulario(
            'No hay un formulario activo para este tipo de operativo. Avisa al administrador antes de continuar.',
          );
        }

        setLat(cargada.lat);
        setLng(cargada.lng);
        setBarrio(cargada.barrio);
        setFotos(cargada.photos ?? []);
        setActaUrl(cargada.actaPdfUrl ?? '');
        setEntidadesAcompanantes(cargada.entidadesAcompanantes ?? []);
        setGestoresSeleccionados(cargada.gestoresInvolucradosIds ?? []);

        reset({
          fechaHora: aInputDatetimeLocal(cargada.dateTime),
          descripcion: cargada.results ?? '',
          entidadResponsable: cargada.entidadResponsable ?? '',
          enGrupo: Boolean(cargada.isGroupOperativo),
        });
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
  }, [id, idUsuarioActual, reset]);

  // La lista de gestores se pide APARTE y su fallo se traga a proposito: es un
  // dato auxiliar que depende del hub, y sin el la correccion tiene que poder
  // guardarse igual en vez de quedar bloqueada.
  useEffect(() => {
    let vigente = true;

    usersService
      .listarGestores()
      .then((lista) => {
        if (!vigente) return;
        setGestores(lista);
        setErrorGestores(null);
      })
      .catch(() => {
        if (!vigente) return;
        setGestores([]);
        setErrorGestores(
          'No se pudo cargar la lista de gestores. Puedes guardar la correccion sin acompanantes.',
        );
      });

    return () => {
      vigente = false;
    };
  }, []);

  // El propio gestor nunca es un acompanante: ya es el autor de la actividad.
  const posiblesAcompanantes = useMemo(
    () => gestores.filter((g) => g.id !== idUsuarioActual),
    [gestores, idUsuarioActual],
  );

  const enGrupo = watch('enGrupo');

  // Al desmarcar "en grupo" se limpia la seleccion, igual que en el registro:
  // si no, quedan casillas marcadas que ya no se envian.
  useEffect(() => {
    if (!enGrupo) setGestoresSeleccionados([]);
  }, [enGrupo]);

  const preguntasVisibles = useMemo(
    () => (schema ? preguntasDinamicas(schema.questions) : []),
    [schema],
  );

  const centroMapa: [number, number] = lat !== null && lng !== null ? [lat, lng] : CENTRO_LOCALIDAD;

  // El barrio NO se elige: se deriva de la coordenada.
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

  const guardar = async (data: FormData, reenviar: boolean) => {
    if (!actividad) return;

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
      gestoresInvolucradosIds: gestoresSeleccionados,
    });

    if (!dto) {
      setToast({ message: errores.join('. '), type: 'error' });
      return;
    }

    setGuardando(true);
    let guardado = false;
    try {
      // Corregir NUNCA crea una actividad: se actualiza la que ya existe y se
      // reenvia esa misma. Un create aca dejaria dos actividades por el mismo
      // operativo, una rechazada y otra en validacion.
      await activityService.update(actividad.id, dto);
      guardado = true;

      if (!reenviar) {
        setToast({
          message: 'Cambios guardados. La actividad sigue rechazada hasta que la reenvies a validacion.',
          type: 'success',
        });
        return;
      }

      await activityService.send(actividad.id);
      setToast({ message: 'Actividad corregida y reenviada a validacion', type: 'success' });
      setTimeout(() => navigate('/gestor/dashboard'), 1500);
    } catch (err) {
      const motivo = mensajeDeError(err);
      if (motivo) {
        // Distinguir los dos fallos importa: con los cambios ya guardados, el
        // gestor solo tiene que reintentar el reenvio, no rehacer la correccion.
        setToast({
          message: guardado
            ? `Los cambios quedaron guardados pero no se pudo reenviar a validacion: ${motivo}`
            : motivo,
          type: 'error',
        });
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoInicial) return <Loading />;

  if (errorCarga) {
    return (
      <div className="page-container">
        <main className="page-content max-w-4xl">
          <div className="card border border-red-200" role="alert">
            <p className="text-sm font-semibold text-red-700">No se pudo cargar la actividad</p>
            <p className="text-sm text-neutral-600 mt-1">{errorCarga}</p>
            <button type="button" className="btn-secondary btn-sm mt-4" onClick={() => navigate('/gestor/dashboard')}>
              Volver al panel
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (sinPermiso) {
    return (
      <div className="page-container">
        <main className="page-content max-w-4xl">
          <div className="card border border-amber-200" role="alert">
            <p className="text-sm font-semibold text-amber-700">Esta actividad no se puede corregir</p>
            <p className="text-sm text-neutral-600 mt-1">
              Solo puedes corregir tus propias actividades cuando fueron rechazadas.
            </p>
            <button type="button" className="btn-secondary btn-sm mt-4" onClick={() => navigate('/gestor/dashboard')}>
              Volver al panel
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!actividad) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="page-title">Corregir actividad</h1>
            <p className="page-subtitle">Espacio publico - operativo {SUBTIPO_DISPLAY}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
              Rechazada - corregir y reenviar
            </span>
            <button type="button" className="btn-ghost btn-sm" onClick={() => navigate('/gestor/dashboard')}>
              Volver
            </button>
          </div>
        </div>
      </div>

      <main className="page-content max-w-4xl">
        {/* Lo unico que le dice al gestor que corregir. Va primero y siempre
            visible: sin esto el rechazo no tiene explicacion. */}
        <div className="card mb-6 border border-red-200 bg-red-50" role="alert">
          <p className="text-sm font-semibold text-red-800">Observaciones del validador</p>
          <p className="text-sm text-red-700 mt-1 whitespace-pre-line">
            {actividad.validationNotes?.trim()
              ? actividad.validationNotes
              : 'El validador no dejo observaciones escritas. Revisa la evidencia y las cifras antes de reenviar.'}
          </p>
        </div>

        {errorFormulario && (
          <div className="card mb-6 border border-amber-200" role="alert">
            <p className="text-sm font-semibold text-amber-700">Formulario no disponible</p>
            <p className="text-sm text-neutral-600 mt-1">{errorFormulario}</p>
          </div>
        )}

        <form onSubmit={handleSubmit((data) => guardar(data, true))} className="space-y-6" noValidate>
          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">1. Fecha y hora</h2>
              <p className="card-subtitle">Todos los campos marcados con * son obligatorios</p>
            </div>
            <div>
              <label className="input-label font-semibold" htmlFor="fechaHora">
                Fecha y hora del operativo <span className="text-red-500">*</span>
              </label>
              <input id="fechaHora" type="datetime-local" className="input-field" {...register('fechaHora')} />
            </div>
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">2. Ubicacion</h2>
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
                telefono y un mapa alto deja el resto del formulario fuera de vista. */}
            <div className="h-64 md:h-80 rounded-2xl overflow-hidden border border-neutral-200 relative">
              <MapContainer center={centroMapa} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapLayerControl
                  layerVisibility={layerVisibility}
                  onLayerVisibilityChange={(capa, visible) =>
                    setLayerVisibility((previo) => ({ ...previo, [capa]: visible }))
                  }
                />
                <BoundaryLayer color="#c9142f" fillOpacity={0.08} />
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

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">3. Descripcion</h2>
            </div>
            <div>
              <label className="input-label font-semibold" htmlFor="descripcion">
                Descripcion de lo realizado <span className="text-red-500">*</span>
              </label>
              <textarea
                id="descripcion"
                rows={4}
                maxLength={MAX_DESCRIPCION}
                className="input-field"
                placeholder="Que se hizo, con quien y con que resultado"
                {...register('descripcion')}
              />
            </div>
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">4. Evidencia fotografica</h2>
              <p className="card-subtitle">Maximo 5 fotos en total, maximo 10MB cada una</p>
            </div>
            <PhotosUpload onUploadSuccess={setFotos} existingUrls={fotos} disabled={guardando} />
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">5. Acta del operativo</h2>
              <p className="card-subtitle">El acta del operativo es obligatoria</p>
            </div>
            <ActaUpload
              onUploadSuccess={setActaUrl}
              existingUrl={actaUrl || null}
              activityId={actividad.id}
              disabled={guardando}
            />
          </section>

          <section className="card space-y-5">
            <div className="card-header">
              <h2 className="card-title">6. Entidades</h2>
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
            <MultiSelectCombobox
              legend="Entidades acompanantes"
              placeholder="Seleccionar entidades acompanantes..."
              options={(catalogs?.entidades ?? []).map((e) => ({ value: e, label: e }))}
              selected={entidadesAcompanantes}
              onChange={setEntidadesAcompanantes}
              disabled={guardando}
            />
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">7. Operativo en grupo</h2>
            </div>
            <div className="flex items-center gap-3">
              <input id="enGrupo" type="checkbox" className="checkbox-field" {...register('enGrupo')} />
              <label className="input-label mb-0" htmlFor="enGrupo">
                El operativo se realizo en grupo
              </label>
            </div>

            {enGrupo && (
              <div className="space-y-2">
                {errorGestores && (
                  <p className="text-xs text-amber-700" role="alert">
                    {errorGestores}
                  </p>
                )}
                <MultiSelectCombobox
                  legend="Gestores acompanantes"
                  placeholder="Seleccionar gestores acompanantes..."
                  options={posiblesAcompanantes.map((g) => ({ value: g.id, label: g.nombre }))}
                  selected={gestoresSeleccionados}
                  onChange={setGestoresSeleccionados}
                  disabled={guardando}
                  emptyMessage={
                    errorGestores
                      ? 'No se pudo cargar la lista de gestores.'
                      : 'No hay otros gestores del area para seleccionar.'
                  }
                />
              </div>
            )}
          </section>

          {schema && preguntasVisibles.length > 0 && (
            <section className="card space-y-5">
              <div className="card-header">
                <h2 className="card-title">8. {schema.title || 'Cifras del operativo'}</h2>
                {schema.description && <p className="card-subtitle">{schema.description}</p>}
              </div>

              <DynamicSurveyRenderer
                questions={preguntasVisibles}
                allQuestions={schema.questions}
                values={respuestas}
                onChange={(idPregunta, valor) =>
                  setRespuestas((previas) => ({ ...previas, [idPregunta]: valor }))
                }
                entidades={catalogs?.entidades ?? []}
                disabled={guardando}
              />
            </section>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={guardando || !schema} className="btn-success btn-lg flex-1 justify-center">
              {guardando ? 'Guardando...' : 'Guardar y reenviar a validacion'}
            </button>
            {/* Guardar sin reenviar existe para no perder una correccion a
                medio hacer: esto se usa en terreno, desde el telefono. El texto
                dice que sigue rechazada para que nadie crea que ya respondio. */}
            <button
              type="button"
              disabled={guardando || !schema}
              onClick={handleSubmit((data) => guardar(data, false))}
              className="btn-secondary btn-lg flex-1 justify-center"
            >
              Guardar sin reenviar
            </button>
          </div>
        </form>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
