import { FeatureCollection, Polygon } from 'geojson';
import { LatLng } from '../types';
import { TERRAIN_BASE_COORDINATES, TERRAIN_TARGET_COORDINATES } from './terrainSites';

export const GALE_BASE_COORDINATES: LatLng = TERRAIN_BASE_COORDINATES;
export const BOXWORK_TARGET_COORDINATES: LatLng = TERRAIN_TARGET_COORDINATES;
export const CURRENT_ROVER_COORDINATES: LatLng = TERRAIN_TARGET_COORDINATES;

type OverlayProperties = Record<string, string | number>;
type OverlayCollection = FeatureCollection<Polygon, OverlayProperties>;

// These small polygons sit inside the verified HiRISE crop. They are illustrative
// UI overlays only; routing uses the server-side DTM values, not these polygons.
export const SLOPES_GEOJSON: OverlayCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        grade: 'gentle',
        slopeDeg: 3,
        label: 'Illustrative gentle-slope zone; not a measured routing input.',
        provenance: 'SIMULATED MOCK DATA'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.37992, -4.80452], [137.38030, -4.80452],
          [137.38030, -4.80416], [137.37992, -4.80416],
          [137.37992, -4.80452]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        grade: 'moderate',
        slopeDeg: 11,
        label: 'Illustrative moderate-slope zone; not a measured routing input.',
        provenance: 'SIMULATED MOCK DATA'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.37920, -4.80525], [137.37965, -4.80525],
          [137.37965, -4.80485], [137.37920, -4.80485],
          [137.37920, -4.80525]
        ]]
      }
    }
  ]
};

export const HAZARDS_GEOJSON: OverlayCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        type: 'Simulated rock field',
        warning: 'Illustrative obstacle polygon. The emergency demo injects a separate blocked terrain cell into the routing request.',
        provenance: 'SIMULATED MOCK DATA'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.37962, -4.80498], [137.37983, -4.80498],
          [137.37983, -4.80478], [137.37962, -4.80478],
          [137.37962, -4.80498]
        ]]
      }
    }
  ]
};

export const MINERALS_GEOJSON: OverlayCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        mineral: 'Candidate spectral region',
        deposit: 'Science-priority overlay',
        description: 'Illustrative CRISM-style science region. Local CRISM overlap remains unverified.',
        color: '#a855f7',
        provenance: 'SIMULATED MOCK DATA'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.37935, -4.80558], [137.37970, -4.80558],
          [137.37970, -4.80528], [137.37935, -4.80528],
          [137.37935, -4.80558]
        ]]
      }
    }
  ]
};
