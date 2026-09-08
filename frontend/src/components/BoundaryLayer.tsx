import React, { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { GeoJSON as GeoJSONType } from 'geojson';
// @ts-ignore - @mapbox/togeojson no tiene tipos oficiales
import toGeoJSON from '@mapbox/togeojson';
import JSZip from 'jszip';
import L from 'leaflet';

interface BoundaryLayerProps {
  /** Ruta al archivo KML o KMZ, relativa a /public */
  kmlPath?: string;
  /** Color del borde del poligono */
  color?: string;
  /** Color de relleno */
  fillColor?: string;
  /** Opacidad del relleno (0-1) */
  fillOpacity?: number;
  /** Grosor del borde */
  weight?: number;
  /** Filtrar features por nombre (ej: "Santa Fe") */
  filterByName?: string;
  /** Mostrar u ocultar la capa */
  visible?: boolean;
  /**
   * Si la capa responde al mouse. Por defecto false: el gestor marca la
   * ubicacion tocando el mapa, y una capa interactiva se come ese click.
   */
  interactive?: boolean;
}

// Dibuja los limites de la localidad a partir de un KML/KMZ de /public.
export const BoundaryLayer: React.FC<BoundaryLayerProps> = ({
  kmlPath = '/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz',
  color = '#c9142f',
  fillColor = '#c9142f',
  fillOpacity = 0.1,
  weight = 2,
  filterByName,
  visible = true,
  interactive = false,
}) => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      try {
        setLoading(true);

        const response = await fetch(kmlPath);
        if (!response.ok) throw new Error(`No se pudo cargar el archivo: ${kmlPath}`);

        let kmlText: string;
        if (kmlPath.endsWith('.kmz')) {
          const arrayBuffer = await response.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          const kmlFile = Object.keys(zip.files).find((name) => name.endsWith('.kml'));
          if (!kmlFile) throw new Error('No se encontro archivo KML dentro del KMZ');
          kmlText = await zip.files[kmlFile].async('string');
        } else {
          kmlText = await response.text();
        }

        const kml = new DOMParser().parseFromString(kmlText, 'text/xml');
        if (kml.querySelector('parsererror')) throw new Error('Error al parsear el archivo KML');

        let geoJson = toGeoJSON.kml(kml);

        if (filterByName && geoJson.type === 'FeatureCollection') {
          const filtro = filterByName.toLowerCase();
          geoJson = {
            ...geoJson,
            features: geoJson.features.filter((feature: any) => {
              const name = feature.properties?.name || feature.properties?.Name || '';
              const description = feature.properties?.description || feature.properties?.Description || '';
              const texto = `${name} ${description}`.toLowerCase();
              // Candelaria comparte el archivo con Santa Fe y no es zona de trabajo.
              return texto.includes(filtro) && !texto.includes('candelaria');
            }),
          };
        }

        if (vigente) setGeoJsonData(geoJson);
      } catch (error) {
        console.error('Error cargando limites:', error);
      } finally {
        if (vigente) setLoading(false);
      }
    };

    cargar();
    return () => {
      vigente = false;
    };
  }, [kmlPath, filterByName]);

  if (loading || !geoJsonData || !visible) return null;

  return (
    <GeoJSON
      data={geoJsonData}
      pointToLayer={(_feature: any, latlng: L.LatLng) =>
        L.circleMarker(latlng, {
          radius: 6,
          fillColor: fillColor || color,
          color,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
          interactive,
        })
      }
      style={{ color, fillColor, fillOpacity, weight, interactive } as any}
    />
  );
};
