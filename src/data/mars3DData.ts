import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import Point from '@arcgis/core/geometry/Point';

// Mars 2000 Coordinate System (GCS_Mars_2000)
// Semi-major axis: 3,396,190 m, Semi-minor axis: 3,376,200 m
export const MARS_WKID = 104971;
export const marsSpatialReference = new SpatialReference({ wkid: MARS_WKID });

// Martian physical constants
export const MARS_RADIUS_M = 3396190;
export const METERS_PER_DEGREE_LAT = (Math.PI * MARS_RADIUS_M) / 180; // ~59,274 m per degree

export interface MarsBookmark {
  id: string;
  name: string;
  category: 'feature' | 'mission' | 'base';
  description: string;
  coordinates: [number, number]; // [longitude, latitude]
  camera: {
    position: {
      x: number; // longitude
      y: number; // latitude
      z: number; // altitude in meters
    };
    heading: number; // 0-360
    tilt: number; // 0-90
  };
  thumbnail?: string;
  groundElevationApproxM?: number;
}

export const MARS_BOOKMARKS: MarsBookmark[] = [
  {
    id: 'gale-base',
    name: '[SIMULATED] Gale Rover Base',
    category: 'base',
    description: 'Simulated operations hub in Gale Crater near Mount Sharp (Aeolis Mons).',
    coordinates: [137.38017231, -4.80425574],
    camera: {
      position: { x: 137.38017231, y: -4.8055, z: -3550 },
      heading: 350,
      tilt: 62
    },
    groundElevationApproxM: -3631
  },
  {
    id: 'science-candidate',
    name: 'Science Target Candidate',
    category: 'base',
    description: 'Curiosity Sol 4621 waypoint-linked exploration candidate with mineralized ridges.',
    coordinates: [137.37950662, -4.80541641],
    camera: {
      position: { x: 137.37950662, y: -4.8066, z: -3550 },
      heading: 350,
      tilt: 60
    },
    groundElevationApproxM: -3622
  },
  {
    id: 'rover-aer1',
    name: '[SIMULATED] AER-1 (Rover)',
    category: 'mission',
    description: 'Autonomous Exploration Rover platform operating in Gale Crater.',
    coordinates: [137.37950662, -4.80541641],
    camera: {
      position: { x: 137.37950662, y: -4.8066, z: -3560 },
      heading: 350,
      tilt: 65
    },
    groundElevationApproxM: -3622
  },
  {
    id: 'olympus-mons',
    name: 'Olympus Mons',
    category: 'feature',
    description: 'Largest volcano in the Solar System: 21.9 km high, spanning over 600 km wide.',
    coordinates: [-133.8, 18.65],
    camera: {
      position: { x: -130.5, y: 15.0, z: 380000 },
      heading: 320,
      tilt: 62
    },
    groundElevationApproxM: 21287
  },
  {
    id: 'valles-marineris',
    name: 'Valles Marineris',
    category: 'feature',
    description: 'Vast canyon system stretching over 4,000 km long and up to 7 km deep.',
    coordinates: [-75.0, -14.0],
    camera: {
      position: { x: -75.0, y: -22.0, z: 520000 },
      heading: 0,
      tilt: 58
    },
    groundElevationApproxM: -4500
  },
  {
    id: 'gale-crater',
    name: 'Gale Crater (Mount Sharp)',
    category: 'feature',
    description: '154 km impact basin containing central mound Aeolis Mons rising 5.5 km high.',
    coordinates: [137.4, -5.4],
    camera: {
      position: { x: 137.4, y: -8.8, z: 85000 },
      heading: 355,
      tilt: 64
    },
    groundElevationApproxM: -4400
  },
  {
    id: 'jezero-crater',
    name: 'Jezero Crater',
    category: 'feature',
    description: 'Ancient river delta and lake basin holding preserved clay sediment layers.',
    coordinates: [77.45, 18.38],
    camera: {
      position: { x: 77.45, y: 15.5, z: 55000 },
      heading: 0,
      tilt: 60
    },
    groundElevationApproxM: -2500
  },
  {
    id: 'north-pole',
    name: 'North Pole (Planum Boreum)',
    category: 'feature',
    description: 'Northern polar ice cap composed of water ice layers and seasonal frozen carbon dioxide.',
    coordinates: [0, 85.0],
    camera: {
      position: { x: 0, y: 65.0, z: 1200000 },
      heading: 0,
      tilt: 35
    },
    groundElevationApproxM: -1800
  },
  {
    id: 'south-pole',
    name: 'South Pole (Planum Australe)',
    category: 'feature',
    description: 'Southern polar cap featuring permanent dry-ice carbon dioxide deposits.',
    coordinates: [0, -85.0],
    camera: {
      position: { x: 0, y: -65.0, z: 1200000 },
      heading: 180,
      tilt: 35
    },
    groundElevationApproxM: 3200
  },
  {
    id: 'curiosity',
    name: 'Curiosity Rover Landing Site',
    category: 'mission',
    description: 'NASA Mars Science Laboratory landed at Bradbury Landing, Gale Crater in 2012.',
    coordinates: [137.4417, -4.5895],
    camera: {
      position: { x: 137.4417, y: -4.62, z: 12000 },
      heading: 350,
      tilt: 68
    },
    groundElevationApproxM: -4450
  },
  {
    id: 'perseverance',
    name: 'Perseverance Rover Landing Site',
    category: 'mission',
    description: 'NASA Mars 2020 mission landed at Octavia E. Butler Landing in Jezero Crater in 2021.',
    coordinates: [77.4509, 18.4447],
    camera: {
      position: { x: 77.4509, y: 18.40, z: 8500 },
      heading: 0,
      tilt: 66
    },
    groundElevationApproxM: -2580
  },
  {
    id: 'opportunity',
    name: 'Opportunity Rover Landing Site',
    category: 'mission',
    description: 'NASA Mars Exploration Rover Opportunity explored Meridiani Planum from 2004 to 2018.',
    coordinates: [-5.5342, -1.9462],
    camera: {
      position: { x: -5.5342, y: -2.02, z: 22000 },
      heading: 10,
      tilt: 62
    },
    groundElevationApproxM: -1400
  }
];

// Helper to convert geographic displacement in meters to Martian latitude/longitude deltas
export function metersToDegreesOnMars(metersNorth: number, metersEast: number, currentLatitudeDeg: number): { dLat: number; dLng: number } {
  const latRad = (currentLatitudeDeg * Math.PI) / 180;
  const metersPerDegLat = METERS_PER_DEGREE_LAT;
  const metersPerDegLng = METERS_PER_DEGREE_LAT * Math.max(0.01, Math.cos(latRad));

  return {
    dLat: metersNorth / metersPerDegLat,
    dLng: metersEast / metersPerDegLng
  };
}

// Helper to find the nearest landmark from a given Point
export function findNearestLandmark(point: Point): { name: string; distanceM: number } {
  let closest = { name: 'Unknown Martian Terrain', distanceM: Infinity };
  const lng1 = point.x;
  const lat1 = point.y;

  for (const b of MARS_BOOKMARKS) {
    const [lng2, lat2] = b.coordinates;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distM = MARS_RADIUS_M * c;

    if (distM < closest.distanceM) {
      closest = { name: b.name, distanceM: Math.round(distM) };
    }
  }

  return closest;
}
