import { useState } from 'react';
import { useFileUrls } from '../hooks/useFileUrl';

interface PhotoCarouselProps {
  photos: string[];
  title?: string;
}

export const PhotoCarousel = ({ photos, title = 'Evidencia Fotografica' }: PhotoCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Convertir keys a URLs frescas
  const photoUrls = useFileUrls(photos);

  if (!photos || photos.length === 0) {
    return null;
  }

  // Filtrar URLs nulas
  const validPhotoUrls = photoUrls.filter((url): url is string => url !== null);

  if (validPhotoUrls.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? validPhotoUrls.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === validPhotoUrls.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  return (
    <>
      <div className="space-y-4">
        {title && (
          <h2 className="text-xl font-semibold mb-4">{title}</h2>
        )}

        {/* Vista principal del carrusel */}
        <div className="relative bg-neutral-900 rounded-lg overflow-hidden border border-neutral-300">
            {/* Imagen principal */}
          <div className="relative bg-neutral-900 flex items-center justify-center" style={{ minHeight: '16rem' }}>
            <img
              src={validPhotoUrls[currentIndex]}
              alt={`Foto ${currentIndex + 1} de ${validPhotoUrls.length}`}
              className="w-full h-auto object-contain cursor-pointer"
              style={{ maxHeight: '32rem' }}
              onClick={openFullscreen}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Error+al+cargar+imagen';
              }}
            />

            {/* Controles de navegacion */}
            {validPhotoUrls.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all z-10"
                  aria-label="Foto anterior"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all z-10"
                  aria-label="Foto siguiente"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Indicador de posicion */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-10">
              {currentIndex + 1} / {validPhotoUrls.length}
            </div>
          </div>
        </div>

        {/* Miniaturas (thumbnails) */}
        {validPhotoUrls.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100">
            {validPhotoUrls.map((photo, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}
                aria-label={`Ver foto ${index + 1}`}
              >
                <img
                  src={photo}
                  alt={`Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=Error';
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Boton para abrir en pantalla completa */}
        <div className="flex justify-center">
          <button
            onClick={openFullscreen}
            className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Ver en pantalla completa
          </button>
        </div>
      </div>

      {/* Modal de pantalla completa */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={closeFullscreen}
        >
          <div className="relative max-w-7xl w-full h-full flex items-center justify-center">
            {/* Boton cerrar */}
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all z-10"
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Imagen en pantalla completa */}
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={validPhotoUrls[currentIndex]}
                alt={`Foto ${currentIndex + 1} de ${validPhotoUrls.length}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x800?text=Error+al+cargar+imagen';
                }}
              />
            </div>

            {/* Controles de navegacion en pantalla completa */}
            {validPhotoUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-4 transition-all z-10"
                  aria-label="Foto anterior"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-4 transition-all z-10"
                  aria-label="Foto siguiente"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Indicador de posicion en pantalla completa */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-full text-lg z-10">
                  {currentIndex + 1} / {validPhotoUrls.length}
                </div>

                {/* Miniaturas en pantalla completa */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 max-w-4xl overflow-x-auto px-4 z-10">
                  {validPhotoUrls.map((photo, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToSlide(index);
                      }}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentIndex
                          ? 'border-white ring-2 ring-white/50'
                          : 'border-white/30 hover:border-white/50'
                      }`}
                      aria-label={`Ver foto ${index + 1}`}
                    >
                      <img
                        src={photo}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Error';
                        }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
