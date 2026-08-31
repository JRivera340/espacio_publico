import React from 'react';

// El original del hub listaba nueve capas (colegios, cestas, UPZ, bodegas...)
// cuyos KMZ pertenecian a otras areas y no viajaron a este repo. Peor: en el
// formulario de registro esos interruptores no controlaban nada, porque la
// unica capa que el mapa dibujaba se renderizaba siempre. Aca queda solo la
// capa que este modulo realmente tiene, y su interruptor si la enciende y
// la apaga.
export interface LayerVisibility {
  barrios: boolean;
}

interface MapLayerControlProps {
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (layer: keyof LayerVisibility, visible: boolean) => void;
  position?: 'topright' | 'topleft' | 'bottomright' | 'bottomleft';
}

const POSICIONES: Record<NonNullable<MapLayerControlProps['position']>, string> = {
  topright: 'top-2 right-2',
  topleft: 'top-2 left-2',
  bottomright: 'bottom-2 right-2',
  bottomleft: 'bottom-2 left-2',
};

const CAPAS: Array<{ key: keyof LayerVisibility; label: string; color: string }> = [
  { key: 'barrios', label: 'Barrios', color: '#3b82f6' },
];

export const MapLayerControl: React.FC<MapLayerControlProps> = ({
  layerVisibility,
  onLayerVisibilityChange,
  position = 'topright',
}) => {
  const [abierto, setAbierto] = React.useState(false);

  return (
    <div className={`absolute ${POSICIONES[position]} z-[1000] flex flex-col items-end`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAbierto((previo) => !previo);
        }}
        className="bg-white hover:bg-neutral-50 p-2 rounded-lg shadow-lg border border-neutral-200 transition-colors flex items-center justify-center"
        title="Capas del mapa"
        aria-label="Capas del mapa"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5 text-neutral-700">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 12 12 17 22 12" />
          <polyline points="2 17 12 22 22 17" />
        </svg>
      </button>

      {abierto && (
        <div className="mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 p-3 w-[min(70vw,220px)]">
          <div className="text-xs font-semibold text-neutral-800 mb-2 pb-2 border-b border-neutral-100">
            Capas del mapa
          </div>
          {CAPAS.map((capa) => (
            <label key={capa.key} className="flex items-center cursor-pointer py-1.5 px-1 hover:bg-neutral-50 rounded">
              <input
                type="checkbox"
                id={`capa-${capa.key}`}
                checked={layerVisibility[capa.key]}
                onChange={(e) => {
                  e.stopPropagation();
                  onLayerVisibilityChange(capa.key, !layerVisibility[capa.key]);
                }}
                className="w-4 h-4 border-neutral-300 rounded shrink-0"
              />
              <span className="ml-2.5 text-xs text-neutral-600 flex items-center">
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: capa.color }} />
                {capa.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
