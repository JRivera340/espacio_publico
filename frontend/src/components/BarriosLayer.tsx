import React, { useEffect, useState } from 'react';
import { GeoJSON, Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { GeoJSON as GeoJSONType } from 'geojson';
// @ts-ignore - @mapbox/togeojson no tiene tipos oficiales
import toGeoJSON from '@mapbox/togeojson';

interface BarriosLayerProps {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
  visible?: boolean;
}

interface EtiquetaBarrio {
  name: string;
  lat: number;
  lng: number;
}

// Centroide aproximado de un anillo de coordenadas GeoJSON ([lng, lat]).
function centroideDeAnillo(anillo: number[][]): [number, number] | null {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  for (const coord of anillo) {
    if (coord.length >= 2) {
      sumLng += coord[0];
      sumLat += coord[1];
      count++;
    }
  }
  return count > 0 ? [sumLat / count, sumLng / count] : null;
}

// Limites de barrios de la localidad, leidos de /boundaries/doc.kml. Se dibujan
// bajo el marcador para que el gestor ubique el operativo por referencia visual.
export const BarriosLayer: React.FC<BarriosLayerProps> = ({
  color = '#3b82f6',
  fillColor = '#3b82f6',
  fillOpacity = 0.1,
  weight = 1,
  visible = true,
}) => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONType | null>(null);
  const [etiquetas, setEtiquetas] = useState<EtiquetaBarrio[]>([]);

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      try {
        const response = await fetch('/boundaries/doc.kml');
        if (!response.ok) throw new Error('No se pudo cargar el archivo de barrios');

        const kmlText = await response.text();
        const kml = new DOMParser().parseFromString(kmlText, 'text/xml');
        if (kml.querySelector('parsererror')) throw new Error('Error al parsear el KML de barrios');

        const geoJson = toGeoJSON.kml(kml);
        const labels: EtiquetaBarrio[] = [];

        if (geoJson.type === 'FeatureCollection') {
          geoJson.features.forEach((feature: any) => {
            const nombre = feature.properties?.name || feature.properties?.Name || '';
            if (!nombre || !feature.geometry) return;

            let centro: [number, number] | null = null;
            if (feature.geometry.type === 'Polygon') {
              centro = centroideDeAnillo(feature.geometry.coordinates[0]);
            } else if (feature.geometry.type === 'MultiPolygon') {
              const primerPoligono = feature.geometry.coordinates[0];
              if (primerPoligono?.[0]) centro = centroideDeAnillo(primerPoligono[0]);
            }

            if (centro) labels.push({ name: nombre, lat: centro[0], lng: centro[1] });
          });
        }

        if (!vigente) return;
        setGeoJsonData(geoJson);
        setEtiquetas(labels);
      } catch (error) {
        console.error('Error cargando limites de barrios:', error);
      }
    };

    cargar();
    return () => {
      vigente = false;
    };
  }, []);

  if (!geoJsonData || !visible) return null;

  return (
    <>
      <GeoJSON
        data={geoJsonData}
        style={{ color, fillColor, fillOpacity, weight }}
        onEachFeature={(feature, layer) => {
          const nombre = feature.properties?.name || feature.properties?.Name || 'Barrio';
          layer.bindTooltip(nombre, { permanent: false, direction: 'center', className: 'barrio-tooltip' });
        }}
      />
      {etiquetas.map((etiqueta, index) => (
        <Marker
          key={`barrio-label-${index}`}
          position={[etiqueta.lat, etiqueta.lng]}
          interactive={false}
          icon={
            new DivIcon({
              html: `<div style="color:#000;font-weight:600;font-size:12px;text-align:center;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff,0 0 2px #fff;pointer-events:none;white-space:nowrap;font-family:Inter,system-ui,sans-serif;">${etiqueta.name}</div>`,
              className: 'barrio-label',
              iconSize: [100, 20],
              iconAnchor: [50, 10],
            })
          }
        />
      ))}
    </>
  );
};
