import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { publicoService, type JornadaPublica } from '../../services/publico.service';
import { AREA, nombrePublicoDeCifra } from '../../config/publicAreas';
import { PhotoCarousel } from '../../components/PhotoCarousel';

export const PublicPuntoPage = () => {
  const { id } = useParams<{ id: string }>();
  const [jornada, setJornada] = useState<JornadaPublica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    setCargando(true);
    publicoService
      .obtener(id)
      .then((datos) => {
        if (!vigente) return;
        setJornada(datos);
        setNoExiste(false);
      })
      .catch(() => {
        if (!vigente) return;
        setJornada(null);
        setNoExiste(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [id]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#EEF1F4] flex items-center justify-center">
        <p className="text-neutral-600">Cargando la jornada...</p>
      </div>
    );
  }

  if (noExiste || !jornada) {
    return (
      <div className="min-h-screen bg-[#EEF1F4] flex items-center justify-center px-6">
        <div className="rounded-[24px] bg-white p-8 shadow-xl max-w-md text-center" role="alert">
          <p className="text-xl font-black text-neutral-900">Esta jornada no esta publicada</p>
          <p className="mt-2 text-neutral-600">
            Puede que el enlace este mal escrito, o que la jornada todavia no se haya publicado.
          </p>
          <Link to="/mapa" className="mt-6 inline-flex font-bold underline">
            Ver todas las jornadas
          </Link>
        </div>
      </div>
    );
  }

  const cifras = Object.entries(jornada.cifras ?? {}).filter(([, v]) => typeof v === 'number' && v > 0);
  const tieneUbicacion = typeof jornada.lat === 'number' && typeof jornada.lng === 'number';

  return (
    <div className="min-h-screen bg-[#EEF1F4]">
      <header className="bg-[#14171F] text-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to="/mapa" className="text-sm text-neutral-400 hover:text-white transition-colors">
            Volver al mapa
          </Link>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: AREA.color }}>
            {jornada.codigo}
          </p>
          <h1 className="mt-1 text-3xl font-black">{jornada.barrio}</h1>
          <p className="mt-1 text-neutral-300">
            {format(new Date(jornada.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {cifras.length > 0 && (
          <section className="rounded-[24px] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-black text-neutral-900">Que se hizo en esta jornada</h2>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cifras.map(([clave, valor]) => (
                <div key={clave}>
                  <p className="text-3xl font-black" style={{ color: AREA.color }}>
                    {valor.toLocaleString('es-CO')}
                  </p>
                  <p className="text-sm text-neutral-600">{nombrePublicoDeCifra(clave)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {jornada.photos.length > 0 && (
          <section className="rounded-[24px] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-black text-neutral-900 mb-4">Fotografias</h2>
            <PhotoCarousel photos={jornada.photos} title="" />
          </section>
        )}

        {tieneUbicacion && (
          <section className="rounded-[24px] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-black text-neutral-900 mb-4">Donde fue</h2>
            <div className="rounded-2xl overflow-hidden" style={{ height: 300 }}>
              <MapContainer
                center={[jornada.lat as number, jornada.lng as number]}
                zoom={17}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[jornada.lat as number, jornada.lng as number]} />
              </MapContainer>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
