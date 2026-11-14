import { RouteData, ScienceMarker, LatLng, TerrainGrid } from '../types';

export const GALE_BASE_COORDINATES: LatLng = [137.41900, -4.84200];
export const BOXWORK_TARGET_COORDINATES: LatLng = [137.42010, -4.84295];
export const CURRENT_ROVER_COORDINATES: LatLng = [137.41952, -4.84235];

export const MOCK_TERRAIN_GRID: TerrainGrid = {
  id: 'gale-simulated-dem-grid-v1',
  resolutionM: 1.0,
  rows: 100,
  cols: 100,
  bounds: {
    minLng: 137.4185,
    maxLng: 137.4205,
    minLat: -4.8435,
    maxLat: -4.8415
  },
  isSimulated: true
};

export const GALE_BASE_MARKER: ScienceMarker = {
  id: 'gale-rover-base',
  name: 'Gale Rover Base — Simulated Operations Point',
  coordinates: GALE_BASE_COORDINATES,
  category: 'base',
  elevation: -4420,
  label: '[SIMULATED] Gale Rover Base — Simulated Operations Point',
  isSimulated: true,
  provenance: 'SIMULATED MOCK DATA',
  geologicalSignificance: 'Simulated robotic operations center, docking berth, and recharge station situated on the consolidated sedimentary plains of Aeolis Palus.'
};

export const BOXWORK_TARGET_MARKER: ScienceMarker = {
  id: 'boxwork-target',
  name: 'Mount Sharp Boxwork Science Target Alpha',
  coordinates: BOXWORK_TARGET_COORDINATES,
  category: 'boxwork_target',
  elevation: -4416.9,
  label: 'Boxwork Mineralized Ridge Target',
  isSimulated: false,
  provenance: 'NASA-DERIVED',
  geologicalSignificance: 'NASA Curiosity rover discovery: Web-like polygonal ridges formed by ancient mineral-rich groundwater filling subsurface bedrock fractures, exposed after billions of years of wind erosion.'
};

export const ROVER_MARKER: ScienceMarker = {
  id: 'aer-1-rover',
  name: 'Autonomous Exploration Rover (AER-1)',
  coordinates: CURRENT_ROVER_COORDINATES,
  category: 'rover',
  elevation: -4418.6,
  label: 'AER-1 Robotic Rover (Current Station)',
  isSimulated: true,
  provenance: 'SYSTEM-DERIVED',
  geologicalSignificance: 'Robotic exploration rover currently stationed on Bedrock Saddle (Station 2) undergoing wheel-slip check and telemetry uplink.'
};

export const NORMAL_ROUTE: RouteData = {
  id: 'route-normal',
  name: 'Planned Scientific Traverse (Gale Rover Base -> Boxwork Target)',
  type: 'normal',
  color: '#00e5ff',
  distanceM: 86.3,
  estimatedMinutes: 38,
  elevationGainMeters: 3.1,
  maxSlopeDeg: 8.5,
  status: 'active',
  provenance: 'SYSTEM-DERIVED',
  rationale: 'Primary robotic traverse vector (86.3 m). Directs rover across consolidated alluvial hardpan and stable basalt bedrock to reach the Boxwork fracture ridges while maintaining low wheel-slip (<5%) and safe energy consumption margins.',
  coordinates: [
    [137.41900, -4.84200], // Gale Rover Base Berth 1
    [137.41925, -4.84218], // Outwash Hardpan (Station 1)
    [137.41952, -4.84235], // Bedrock Saddle (Station 2 - Rover Position)
    [137.41978, -4.84262], // Sand Drift Margin (Station 3)
    [137.42010, -4.84295]  // Boxwork Science Target (Station 4)
  ],
  waypoints: [
    {
      id: 'wp-0',
      name: 'Gale Rover Base — Simulated Operations Point (Berth 1)',
      coordinates: [137.41900, -4.84200],
      elevationMeters: -4420.0,
      slopeGradeDeg: 0.8,
      terrainType: 'Compacted Regolith Apron',
      hazardLevel: 'LOW',
      description: 'Operations departure berth with high-gain uplink to Mars Reconnaissance Orbiter and battery recharge coupling.'
    },
    {
      id: 'wp-1',
      name: 'Local Outwash Hardpan (Station 1)',
      coordinates: [137.41925, -4.84218],
      elevationMeters: -4419.4,
      slopeGradeDeg: 2.1,
      terrainType: 'Consolidated Pebble Pavement',
      hazardLevel: 'LOW',
      description: 'Ancient fluvial conglomerate fan with rounded pebbles. Excellent 6-wheel traction with near-zero sinkage.'
    },
    {
      id: 'wp-2',
      name: 'Bedrock Saddle (Station 2 — Rover Current Position)',
      coordinates: [137.41952, -4.84235],
      elevationMeters: -4418.6,
      slopeGradeDeg: 3.8,
      terrainType: 'Resistant Basalt Siltstone',
      hazardLevel: 'LOW',
      description: 'Intermediate structural bench. Rover telemetry check station and mast camera forward hazard scan.'
    },
    {
      id: 'wp-3',
      name: 'Sand Drift Bypass Margin (Station 3)',
      coordinates: [137.41978, -4.84262],
      elevationMeters: -4417.8,
      slopeGradeDeg: 4.2,
      terrainType: 'Firm Inter-Ripple Bedrock',
      hazardLevel: 'MEDIUM',
      description: 'Navigates along firm bedrock perimeter to bypass active loose ripple slipfaces and minimize wheel slip.'
    },
    {
      id: 'wp-4',
      name: 'Mount Sharp Boxwork Science Target Alpha (Station 4)',
      coordinates: [137.42010, -4.84295],
      elevationMeters: -4416.9,
      slopeGradeDeg: 2.5,
      terrainType: 'Mineralized Boxwork Fracture Blades',
      hazardLevel: 'LOW',
      description: 'Primary robotic science sampling target. Polygonal blades protruding 0.5-1.5m above eroded bedrock.'
    }
  ]
};

export const EMERGENCY_ROUTE: RouteData = {
  id: 'route-emergency',
  name: 'Contingency Return Vector (Direct Hardpan Egress)',
  type: 'emergency',
  color: '#ef4444',
  distanceM: 79.4,
  estimatedMinutes: 26,
  elevationGainMeters: -3.1, // Downhill return to base
  maxSlopeDeg: 6.2,
  status: 'standby',
  provenance: 'SYSTEM-DERIVED',
  rationale: 'Contingency recovery corridor (79.4 m). Hard-coded mock return vector that steers rover along high-traction bedrock directly back to Gale Rover Base Berth 1, bypassing loose drift zones to protect drive actuators.',
  coordinates: [
    [137.42010, -4.84295], // Contingency Abort Origin (Near Boxwork Site)
    [137.41970, -4.84258], // Firm Hardpan Egress Spine
    [137.41932, -4.84226], // Operations Base Approach Vector
    [137.41900, -4.84200]  // Gale Rover Base Berth 1
  ],
  waypoints: [
    {
      id: 'ewp-0',
      name: 'Contingency Abort Origin (Near Boxwork Site)',
      coordinates: [137.42010, -4.84295],
      elevationMeters: -4416.9,
      slopeGradeDeg: 2.5,
      terrainType: 'Fractured Bedrock Rim',
      hazardLevel: 'LOW',
      description: 'Station where contingency abort was initiated. Rover re-orients toward Gale Rover Base heading 315°.'
    },
    {
      id: 'ewp-1',
      name: 'Firm Hardpan Egress Spine',
      coordinates: [137.41970, -4.84258],
      elevationMeters: -4417.9,
      slopeGradeDeg: 3.1,
      terrainType: 'Exposed Hardpan Pavement',
      hazardLevel: 'LOW',
      description: 'High-traction spine bypassing all sand ripple hazards for maximum rover stability.'
    },
    {
      id: 'ewp-2',
      name: 'Operations Base Approach Vector',
      coordinates: [137.41932, -4.84226],
      elevationMeters: -4419.1,
      slopeGradeDeg: 1.8,
      terrainType: 'Level Regolith Corridor',
      hazardLevel: 'LOW',
      description: 'Direct visual and UHF line-of-sight to Gale Rover Base docking beacon.'
    },
    {
      id: 'ewp-3',
      name: 'Gale Rover Base — Simulated Operations Point (Berth 1)',
      coordinates: [137.41900, -4.84200],
      elevationMeters: -4420.0,
      slopeGradeDeg: 0.5,
      terrainType: 'Docking & Recharge Pad',
      hazardLevel: 'LOW',
      description: 'Safe recovery berth reached. Wheel drive motors locked, automated diagnostic & recharge cycle initiated.'
    }
  ]
};

// Slope Heatmap GeoJSON (Simulated Mock Data)
export const SLOPES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        provenance: 'SIMULATED MOCK DATA',
        grade: 'steep',
        slopeDeg: 18.5,
        label: 'Simulated Slope Gradient (Mock Data): Rim Incline (>15° — HAZARDOUS)'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.42020, -4.84310],
          [137.42070, -4.84315],
          [137.42065, -4.84350],
          [137.42015, -4.84345],
          [137.42020, -4.84310]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        provenance: 'SIMULATED MOCK DATA',
        grade: 'moderate',
        slopeDeg: 8.5,
        label: 'Simulated Slope Gradient (Mock Data): Ridge Transition (5-15° — CAUTION)'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.41960, -4.84230],
          [137.42020, -4.84250],
          [137.42005, -4.84285],
          [137.41945, -4.84265],
          [137.41960, -4.84230]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        provenance: 'SIMULATED MOCK DATA',
        grade: 'gentle',
        slopeDeg: 1.8,
        label: 'Simulated Slope Gradient (Mock Data): Operations Plain (<5° — SAFE)'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.41870, -4.84170],
          [137.41960, -4.84180],
          [137.41950, -4.84230],
          [137.41860, -4.84220],
          [137.41870, -4.84170]
        ]]
      }
    }
  ]
};

// Hazard Zones GeoJSON (Simulated Mock Data)
export const HAZARDS_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'hazard-loose-sand',
        provenance: 'SIMULATED MOCK DATA',
        type: 'Loose Sand Ripple Corridor',
        severity: 'HIGH_SLIP',
        warning: '[SIMULATED MOCK DATA] Active sand ripple field with low shear strength. High wheel-slip risk (>30%) for robotic rover chassis. Traverse routing avoids this zone.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.41955, -4.84205],
          [137.41985, -4.84215],
          [137.41975, -4.84242],
          [137.41945, -4.84232],
          [137.41955, -4.84205]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'hazard-boulder-field',
        provenance: 'SIMULATED MOCK DATA',
        type: 'Dense Basalt Boulder Outcrop',
        severity: 'OBSTACLE_DENSITY',
        warning: '[SIMULATED MOCK DATA] Clast density >15 boulders/m². Chassis clearance hazard and wheel puncture risk. Direct rover transit prohibited.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.41915, -4.84235],
          [137.41945, -4.84242],
          [137.41938, -4.84270],
          [137.41908, -4.84262],
          [137.41915, -4.84235]
        ]]
      }
    }
  ]
};

// Minerals Layer GeoJSON (Simulated Mock Data)
export const MINERALS_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'min-sulfates',
        provenance: 'SIMULATED MOCK DATA',
        mineral: 'Hydrated Magnesium & Polyhydrated Sulfates',
        color: '#06b6d4', // Cyan
        deposit: 'Mount Sharp Sulfate Unit (Mock Data)',
        description: '[SIMULATED MOCK DATA] Simulated CRISM spectral signature: Hydrated evaporite salts indicative of Mars transition into drying arid epoch.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.41990, -4.84275],
          [137.42035, -4.84280],
          [137.42030, -4.84315],
          [137.41985, -4.84310],
          [137.41990, -4.84275]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'min-clays',
        provenance: 'SIMULATED MOCK DATA',
        mineral: 'Phyllosilicates (Smectite Clay)',
        color: '#eab308', // Gold/Yellow
        deposit: 'Glen Torridon Clay Unit (Mock Data)',
        description: '[SIMULATED MOCK DATA] Simulated CRISM spectral signature: Smectite clays formed in neutral-pH, ancient aqueous lacustrine conditions.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.41865, -4.84175],
          [137.41915, -4.84180],
          [137.41910, -4.84215],
          [137.41860, -4.84210],
          [137.41865, -4.84175]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'min-hematite',
        provenance: 'SIMULATED MOCK DATA',
        mineral: 'Crystalline Gray Hematite',
        color: '#a855f7', // Purple
        deposit: 'Vera Rubin Ridge Iron Ridge (Mock Data)',
        description: '[SIMULATED MOCK DATA] Simulated CRISM spectral signature: High-density iron oxide precipitate from oxidized groundwater plumes.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [137.41935, -4.84215],
          [137.41970, -4.84222],
          [137.41965, -4.84250],
          [137.41930, -4.84242],
          [137.41935, -4.84215]
        ]]
      }
    }
  ]
};
