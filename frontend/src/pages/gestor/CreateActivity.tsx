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
import { construirDtoActividad, preguntasDinamicas } from './lib/activityForm';
import { useAuthStore } from '../../store/authStore';
import type { Catalogs } from '../../types';

const CENTRO_LOCALIDAD: [number, number] = [4.6097, -74.0817];

// El area tiene un unico frente de trabajo, asi que no hay desplegable de
// categoria ni de subtipo: el valor sale del catalogo y se muestra fijo.
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

  const [gestores, setGestores] = useState<GestorResumen[]>([]);
  const [errorGestores, setErrorGestores] = useState<string | null>(null);
  const [gestoresSeleccionados, setGestoresSeleccionados] = useState<string[]>([]);
  const idUsuarioActual = useAuthStore((s) => s.user?.id);

  const [enviando, setEnviando] = useState(false);
  const [borradorPendienteId, setBorradorPendienteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { register, handleSubmit, watch } = useForm<FormData>({
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

  // La lista de gestores se pide APARTE de los catalogos y la encuesta, y su
  // fallo se traga a proposito. Es un dato auxiliar: el proxy de usuarios
  // depende del hub, y si el hub no responde el gestor tiene que poder
  // registrar igual el operativo, sin acompanantes, en vez de quedar bloqueado.
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
          'No se pudo cargar la lista de gestores. Puedes registrar el operativo sin acompanantes.',
        );
      });

    return () => {
      vigente = false;
    };
  }, []);

  // El propio gestor nunca es un acompanante: ya queda como autor de la
  // actividad. Ofrecerlo lo dejaria dos veces en el mismo operativo.
  const posiblesAcompanantes = useMemo(
    () => gestores.filter((g) => g.id !== idUsuarioActual),
    [gestores, idUsuarioActual],
  );

  const enGrupo = watch('enGrupo');

  // Al desmarcar "en grupo" se limpia la seleccion. Si no, quedan casillas
  // marcadas en pantalla que ya no se envian: el gestor cree que registro
  // acompanantes y el DTO va vacio.
  useEffect(() => {
    if (!enGrupo) setGestoresSeleccionados([]);
  }, [enGrupo]);

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
      gestoresInvolucradosIds: gestoresSeleccionados,
    });

    if (!dto) {
      setToast({ message: errores.join('. '), type: 'error' });
      return;
    }

    setEnviando(true);
    // El id vive en estado, no en una variable local: si el borrador se creo y
    // fallo el envio, al reintentar hay que enviar ESE borrador y no crear otro
    // con la misma evidencia.
    let idCreada: string | null = borradorPendienteId;
    try {
      if (!idCreada) {
        const creada = await activityService.create(dto);
        idCreada = creada.id;
        setBorradorPendienteId(creada.id);
      }
      await activityService.send(idCreada);
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
            <PhotosUpload onUploadSuccess={setFotos} existingUrls={fotos} disabled={enviando} />
          </section>

          <section className="card space-y-4">
            <div className="card-header">
              <h2 className="card-title">5. Acta del operativo</h2>
              <p className="card-subtitle">El acta del operativo es obligatoria</p>
            </div>
            <ActaUpload onUploadSuccess={setActaUrl} existingUrl={actaUrl || null} disabled={enviando} />
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
                  emptyMessage="No hay otros gestores del area para seleccionar."
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
