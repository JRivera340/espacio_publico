import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { publicoService, type JornadaPublica } from '../../services/publico.service';
import { AREA, nombrePublicoDeCifra } from '../../config/publicAreas';

const CENTRO_SANTA_FE: [number, number] = [4.606, -74.073];

/** Solo las jornadas con coordenadas usables se pueden poner en el mapa. */
export function conUbicacion(jornadas: JornadaPublica[]): JornadaPublica[] {
  return jornadas.filter(
    (j) =>
      typeof j.lat === 'number' &&
      typeof j.lng === 'number' &&
      !Number.isNaN(j.lat) &&
      !Number.isNaN(j.lng),
  );
}

export function barriosDisponibles(jornadas: JornadaPublica[]): string[] {
  return [...new Set(jornadas.map((j) => j.barrio).filter(Boolean))].sort();
}

export const PublicMapPage = () => {
  const [params, setParams] = useSearchParams();
  const barrioFiltro = params.get('barrio') ?? '';

  const [jornadas, setJornadas] = useState<JornadaPublica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    publicoService
      .listar({ limit: 500 })
      .then((lista) => {
        if (!vigente) return;
        setJornadas(lista);
        setError(false);
      })
      .catch(() => {
        if (!vigente) return;
        setJornadas([]);
        setError(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const barrios = useMemo(() => barriosDisponibles(jornadas), [jornadas]);
  const filtradas = useMemo(
    () => (barrioFiltro ? jornadas.filter((j) => j.barrio === barrioFiltro) : jornadas),
    [jornadas, barrioFiltro],
  );
  const enMapa = useMemo(() => conUbicacion(filtradas), [filtradas]);

  const cambiarBarrio = (valor: string) => {
    if (valor) setParams({ barrio: valor });
    else setParams({});
  };

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <header className="bg-[#14171F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link to="/publico" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Volver al inicio
            </Link>
            <h1 className="mt-1 text-2xl font-black">Jornadas de {AREA.nombre}</h1>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-1" htmlFor="barrio">
              Barrio
            </label>
            <select
              id="barrio"
              value={barrioFiltro}
              onChange={(e) => cambiarBarrio(e.target.value)}
              className="rounded-2xl bg-white/10 border border-white/20 px-3 py-2 text-sm"
            >
              <option value="">Todos los barrios</option>
              {barrios.map((b) => (
                <option key={b} value={b} className="text-neutral-900">
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {cargando ? (
          <p className="text-neutral-600">Cargando las jornadas...</p>
        ) : error ? (
          <div className="rounded-[24px] bg-white p-6 shadow-xl" role="alert">
            <p className="font-bold text-red-700">No pudimos cargar las jornadas</p>
            <p className="mt-1 text-neutral-600">Es un problema nuestro. Intenta de nuevo en unos minutos.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-neutral-600">
              {filtradas.length} {filtradas.length === 1 ? 'jornada publicada' : 'jornadas publicadas'}
              {barrioFiltro ? ` en ${barrioFiltro}` : ''}
              {enMapa.length !== filtradas.length && (
                <span className="text-neutral-500"> ({filtradas.length - enMapa.length} sin ubicacion en el mapa)</span>
              )}
            </p>

            <div className="rounded-[24px] overflow-hidden shadow-xl" style={{ height: 420 }}>
              <MapContainer center={CENTRO_SANTA_FE} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {enMapa.map((j) => (
                  <Marker key={j.id} position={[j.lat as number, j.lng as number]}>
                    <Popup>
                      <p className="font-bold">{j.barrio}</p>
                      <p className="text-sm">{format(new Date(j.fecha), "dd 'de' MMMM yyyy", { locale: es })}</p>
                      <Link to={`/publico/jornada/${j.id}`} className="text-sm underline">
                        Ver la jornada
                      </Link>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {filtradas.length === 0 ? (
              <div className="mt-6 rounded-[24px] bg-white p-6 shadow-xl">
                <p className="font-bold">Todavia no hay jornadas publicadas{barrioFiltro ? ` en ${barrioFiltro}` : ''}</p>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtradas.map((j) => (
                  <li key={j.id} className="rounded-[24px] bg-white p-5 shadow-xl">
                    <p className="text-xs font-bold" style={{ color: AREA.color }}>
                      {j.codigo}
                    </p>
                    <p className="mt-1 font-black text-neutral-900">{j.barrio}</p>
                    <p className="text-sm text-neutral-500">
                      {format(new Date(j.fecha), "dd 'de' MMMM yyyy", { locale: es })}
                    </p>
                    {j.cifras && Object.keys(j.cifras).length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {Object.entries(j.cifras)
                          .filter(([, v]) => v > 0)
                          .slice(0, 3)
                          .map(([clave, valor]) => (
                            <li key={clave} className="text-sm text-neutral-700">
                              <span className="font-bold">{valor}</span> {nombrePublicoDeCifra(clave).toLowerCase()}
                            </li>
                          ))}
                      </ul>
                    )}
                    <Link to={`/publico/jornada/${j.id}`} className="mt-4 inline-flex text-sm font-bold underline">
                      Ver la jornada
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
};
