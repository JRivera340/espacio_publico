import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicoService, type CifrasPublicas } from '../../services/publico.service';
import { AREA, nombrePublicoDeCifra } from '../../config/publicAreas';

const formatearCifra = (valor: number): string => valor.toLocaleString('es-CO');

export const PublicLanding = () => {
  const [cifras, setCifras] = useState<CifrasPublicas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    publicoService
      .cifras()
      .then((datos) => {
        if (!vigente) return;
        setCifras(datos);
        setError(false);
      })
      .catch(() => {
        if (!vigente) return;
        setCifras(null);
        setError(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const barrios = useMemo(() => {
    if (!cifras) return [];
    return Object.entries(cifras.porBarrio).sort((a, b) => b[1] - a[1]);
  }, [cifras]);

  const listaCifras = useMemo(() => {
    if (!cifras) return [];
    return Object.entries(cifras.cifras).filter(([, v]) => typeof v === 'number' && v > 0);
  }, [cifras]);

  return (
    <div className="min-h-screen bg-[#14171F] text-white">
      <header className="max-w-5xl mx-auto px-6 pt-16 pb-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: AREA.color }}>
          Alcaldia Local de Santa Fe
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight">{AREA.nombreLargo}</h1>
        <p className="mt-4 text-lg text-neutral-300 max-w-2xl">{AREA.proposito}</p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/mapa"
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl font-bold text-[#14171F]"
            style={{ backgroundColor: AREA.color }}
          >
            Ver el mapa de jornadas
          </Link>
          <a
            href="#que-hacemos"
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl font-bold border border-white/20 hover:bg-white/10 transition-colors"
          >
            Como trabaja el area
          </a>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        {cargando ? (
          <p className="text-neutral-400">Cargando las cifras del area...</p>
        ) : error ? (
          // Un fallo no puede verse como "el area no hizo nada".
          <div className="rounded-[24px] bg-white/5 border border-white/10 p-6">
            <p className="font-bold">No pudimos cargar las cifras en este momento</p>
            <p className="mt-1 text-neutral-400">
              Es un problema nuestro, no del area. Intenta de nuevo en unos minutos.
            </p>
          </div>
        ) : cifras && cifras.total > 0 ? (
          <>
            <div className="rounded-[24px] bg-white/5 border border-white/10 p-6">
              <p className="text-sm uppercase tracking-wide text-neutral-400">Jornadas publicadas</p>
              <p className="text-5xl font-black" style={{ color: AREA.color }}>
                {formatearCifra(cifras.total)}
              </p>
              <p className="mt-2 text-neutral-300">
                en {barrios.length} {barrios.length === 1 ? 'barrio' : 'barrios'} de la localidad
              </p>
            </div>

            {listaCifras.length > 0 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listaCifras.map(([clave, valor]) => (
                  <div key={clave} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                    <p className="text-3xl font-black">{formatearCifra(valor)}</p>
                    <p className="mt-1 text-sm text-neutral-400">{nombrePublicoDeCifra(clave)}</p>
                  </div>
                ))}
              </div>
            )}

            {barrios.length > 0 && (
              <div className="mt-10">
                <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400 mb-3">
                  Donde se trabajo
                </h2>
                <div className="flex flex-wrap gap-2">
                  {barrios.map(([barrio, total]) => (
                    <Link
                      key={barrio}
                      to={`/mapa?barrio=${encodeURIComponent(barrio)}`}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
                    >
                      {barrio} <span className="text-neutral-400">({total})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[24px] bg-white/5 border border-white/10 p-6">
            <p className="font-bold">Todavia no hay jornadas publicadas</p>
            <p className="mt-1 text-neutral-400">
              Cuando el area publique la primera, aparece aca con su ubicacion y sus cifras.
            </p>
          </div>
        )}
      </section>

      <section id="que-hacemos" className="max-w-5xl mx-auto px-6 pb-20">
        <div className="rounded-[24px] bg-white/5 border border-white/10 p-6 sm:p-8">
          <h2 className="text-2xl font-black">Como trabaja el area</h2>
          <p className="mt-3 text-neutral-300 leading-relaxed">{AREA.descripcion}</p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Frentes de trabajo</h3>
              <ul className="mt-3 space-y-2">
                {AREA.frentes.map((f) => (
                  <li key={f} className="text-neutral-200">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-400">
                Que queda registrado de cada jornada
              </h3>
              <ul className="mt-3 space-y-2">
                {AREA.registra.map((r) => (
                  <li key={r} className="text-neutral-200">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">Alcaldia Local de Santa Fe</p>
          <Link to="/handoff" className="text-sm text-neutral-400 hover:text-white transition-colors">
            Ingreso para funcionarios
          </Link>
        </div>
      </footer>
    </div>
  );
};
