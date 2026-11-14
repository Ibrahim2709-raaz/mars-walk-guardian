import { RouteData, ScienceMarker, LatLng } from '../types';
import { MOCK_BASE_COORDINATES, MOCK_TARGET_COORDINATES } from './mockRoutingGrid';

export const GALE_BASE_COORDINATES: LatLng = MOCK_BASE_COORDINATES;
export const BOXWORK_TARGET_COORDINATES: LatLng = MOCK_TARGET_COORDINATES;
export const CURRENT_ROVER_COORDINATES: LatLng = MOCK_TARGET_COORDINATES;

export const GALE_BASE_MARKER: ScienceMarker = {
  id: 'gale-base',
  name: 'Gale Base Alpha (SIMULATED)',
  coordinates: GALE_BASE_COORDINATES,
  category: 'base',
  elevation: -4420,
  label: 'SIMULATED Gale Base Alpha',
  isSimulated: true,
  geologicalSignificance: 'Primary pressurized habitat & rover garage situated on the flat, consolidated plains of Aeolis Palus.'
};

export const BOXWORK_TARGET_MARKER: ScienceMarker = {
  id: 'boxwork-target',
  name: 'Mount Sharp Boxwork Target Alpha',
  coordinates: BOXWORK_TARGET_COORDINATES,
  category: 'boxwork_target',
  elevation: -4090,
  label: 'Boxwork Mineralized Ridge Target',
  isSimulated: false,
  geologicalSignificance: 'Curiosity-observed 3D web-like boxwork ridges formed by mineral-rich groundwater filling subsurface bedrock fractures, subsequently exposed by billions of years of wind erosion.'
};

export const NORMAL_ROUTE: RouteData = {
  id: 'route-normal',
  name: 'Planned Scientific Traverse (Gale Base -> Boxwork)',
  type: 'normal',
  color: '#00e5ff',
  distanceKm: 4.85,
  estimatedMinutes: 95,
  elevationGainMeters: 330,
  maxSlopeDeg: 14.5,
  status: 'active',
  rationale: 'Primary scientific route designed to sample the Vera Rubin Ridge hematite transition while keeping suit energy expenditure within nominal margins. Traverse avoids steep sand dunes and prioritizes firm sedimentary bedrock.',
  coordinates: [
    [137.419, -4.842], // Gale Base
    [137.414, -4.849], // Peace Vallis Alluvial Fan
    [137.409, -4.858], // Duna Low Gap
    [137.403, -4.869], // Bagnold Inter-Dune Transit
    [137.396, -4.879], // Vera Rubin Ridge Saddle (Current Astronaut Position)
    [137.389, -4.887], // Gediz Vallis Channel Margin
    [137.382, -4.892]  // Boxwork Target Alpha
  ],
  waypoints: [
    {
      id: 'wp-0',
      name: 'Gale Base Airlock-1 (SIMULATED)',
      coordinates: [137.419, -4.842],
      elevationMeters: -4420,
      slopeGradeDeg: 1.2,
      terrainType: 'Compacted Regolith / Concrete Apron',
      hazardLevel: 'LOW',
      description: 'Departure staging bay with direct high-gain comms to Mars Reconnaissance Orbiter.'
    },
    {
      id: 'wp-1',
      name: 'Peace Vallis Outwash Apron',
      coordinates: [137.414, -4.849],
      elevationMeters: -4385,
      slopeGradeDeg: 4.5,
      terrainType: 'Conglomerate Sandstone Pavement',
      hazardLevel: 'LOW',
      description: 'Ancient fluvial fan with gravel-sized rounded pebbles, excellent wheel and boot traction.'
    },
    {
      id: 'wp-2',
      name: 'Bagnold Dunes North Corridor',
      coordinates: [137.409, -4.858],
      elevationMeters: -4330,
      slopeGradeDeg: 8.2,
      terrainType: 'Inter-Dune Basalt Hardpan',
      hazardLevel: 'MEDIUM',
      description: 'Narrow transit lane between active dark basalt dunes. Stay on bedrock corridor to prevent sinkage.'
    },
    {
      id: 'wp-3',
      name: 'Vera Rubin Ridge Saddle',
      coordinates: [137.396, -4.879],
      elevationMeters: -4210,
      slopeGradeDeg: 12.0,
      terrainType: 'Hematite-Rich Resistant Bedrock',
      hazardLevel: 'LOW',
      description: 'Prominent structural ledge with elevated iron oxide signatures and high scenic visibility.'
    },
    {
      id: 'wp-4',
      name: 'Gediz Vallis Gully Flank',
      coordinates: [137.389, -4.887],
      elevationMeters: -4145,
      slopeGradeDeg: 14.5,
      terrainType: 'Debris Flow Boulder Conglomerate',
      hazardLevel: 'MEDIUM',
      description: 'Boulder-strewn slope deposited by ancient water-lubricated slurry debris flows.'
    },
    {
      id: 'wp-5',
      name: 'Boxwork Science Target Alpha',
      coordinates: [137.382, -4.892],
      elevationMeters: -4090,
      slopeGradeDeg: 7.8,
      terrainType: 'Mineralized Fractured Grid Blades',
      hazardLevel: 'LOW',
      description: 'Primary sampling objective. Polished boxwork ridges protruding up to 1-2 meters above surrounding siltstone.'
    }
  ]
};

export const EMERGENCY_ROUTE: RouteData = {
  id: 'route-emergency',
  name: 'Rapid Evacuation Vector (Direct Hardpan Egress)',
  type: 'emergency',
  color: '#ef4444',
  distanceKm: 3.92,
  estimatedMinutes: 44,
  elevationGainMeters: -210, // Downhill descent back to base
  maxSlopeDeg: 8.8,
  status: 'standby',
  rationale: 'High-speed emergency egress corridor. Bypasses the rocky Vera Rubin ridge climb and deep dune fields, guiding the astronaut along a downhill hardpan basalt freeway with continuous 100% Line-of-Sight telemetry to Gale Base.',
  coordinates: [
    [137.396, -4.879], // Current EVA position (or Boxwork Target)
    [137.401, -4.867], // Hardpan Basalt Run
    [137.411, -4.853], // Alluvial Low-Slope Chute
    [137.419, -4.842]  // Gale Base Airlock-1
  ],
  waypoints: [
    {
      id: 'ewp-0',
      name: 'EVA Position Vector',
      coordinates: [137.396, -4.879],
      elevationMeters: -4210,
      slopeGradeDeg: 8.8,
      terrainType: 'Descent Ridge Flank',
      hazardLevel: 'LOW',
      description: 'Initiation of emergency retreat protocol. Abort all sample extraction.'
    },
    {
      id: 'ewp-1',
      name: 'Basalt Hardpan Evacuation Corridor',
      coordinates: [137.401, -4.867],
      elevationMeters: -4295,
      slopeGradeDeg: 6.2,
      terrainType: 'Flat Basalt Bedrock',
      hazardLevel: 'LOW',
      description: 'Optimal surface for sustained high-speed stride (up to 5.4 km/h in low gravity).'
    },
    {
      id: 'ewp-2',
      name: 'Gale Base Approach Chute',
      coordinates: [137.411, -4.853],
      elevationMeters: -4375,
      slopeGradeDeg: 3.1,
      terrainType: 'Alluvial Flat Regolith',
      hazardLevel: 'LOW',
      description: 'Direct optical contact with Gale Base high-intensity beacon.'
    },
    {
      id: 'ewp-3',
      name: 'Gale Base Airlock-1 (SIMULATED)',
      coordinates: [137.419, -4.842],
      elevationMeters: -4420,
      slopeGradeDeg: 0.5,
      terrainType: 'Pressurized Ingress Pad',
      hazardLevel: 'LOW',
      description: 'Safe haven ingress reached. Automatic suit repressurization & medical triage.'
    }
  ]
};

// Slope Heatmap GeoJSON (Safe green, moderate yellow, steep red)
export const SLOPES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { grade: 'steep', slopeDeg: 28, label: 'Mount Sharp Upper Scarp (>25° - HAZARDOUS)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.370, -4.898],
          [137.388, -4.908],
          [137.375, -4.918],
          [137.360, -4.905],
          [137.370, -4.898]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { grade: 'moderate', slopeDeg: 16, label: 'Vera Rubin Ridge Flank (10-20° - CAUTION)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.385, -4.872],
          [137.402, -4.882],
          [137.398, -4.890],
          [137.380, -4.880],
          [137.385, -4.872]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { grade: 'gentle', slopeDeg: 4, label: 'Aeolis Palus Plains (<8° - SAFE)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.405, -4.835],
          [137.430, -4.835],
          [137.430, -4.858],
          [137.405, -4.858],
          [137.405, -4.835]
        ]]
      }
    }
  ]
};

// Hazard Zones GeoJSON
export const HAZARDS_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'hazard-bagnold',
        type: 'Unconsolidated Sand Dunes',
        severity: 'HIGH_SLIP',
        warning: 'Bagnold Dunes active slipface. High risk of astronaut or rover wheel entrapment. Traversal prohibited.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.402, -4.856],
          [137.410, -4.862],
          [137.405, -4.872],
          [137.397, -4.865],
          [137.402, -4.856]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'hazard-boulder',
        type: 'Dense Boulder Field (>18/m²)',
        severity: 'OBSTACLE_DENSITY',
        warning: 'Gediz Vallis debris fall. Sharp basalt clasts with risk of suit puncture and tripping.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.377, -4.884],
          [137.386, -4.880],
          [137.391, -4.889],
          [137.381, -4.895],
          [137.377, -4.884]
        ]]
      }
    }
  ]
};

// Minerals Layer GeoJSON (CRISM Spectrometer data)
export const MINERALS_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'min-sulfates',
        mineral: 'Hydrated Magnesium & Polyhydrated Sulfates',
        color: '#06b6d4', // Cyan
        deposit: 'Mount Sharp Sulfate Unit',
        description: 'Deposited during Mars drying epoch, rich in ancient evaporite salts.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.372, -4.882],
          [137.392, -4.888],
          [137.387, -4.902],
          [137.368, -4.896],
          [137.372, -4.882]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'min-clays',
        mineral: 'Phyllosilicates (Smectite Clay)',
        color: '#eab308', // Gold/Yellow
        deposit: 'Glen Torridon Clay Unit',
        description: 'Formed in neutral-pH, habitable water bodies inside early Gale Lake.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.395, -4.850],
          [137.420, -4.855],
          [137.412, -4.870],
          [137.390, -4.865],
          [137.395, -4.850]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'min-hematite',
        mineral: 'Crystalline Gray Hematite',
        color: '#a855f7', // Purple
        deposit: 'Vera Rubin Ridge',
        description: 'High-density iron oxide precipitate from groundwater plumes meeting oxidized surface waters.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.390, -4.872],
          [137.408, -4.876],
          [137.405, -4.886],
          [137.386, -4.882],
          [137.390, -4.872]
        ]]
      }
    }
  ]
};
