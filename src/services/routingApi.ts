import { TERRAIN_BASE_COORDINATES, TERRAIN_CELL_SIZE_M } from '../data/terrainSites';
import { LatLng, RouteCalculationResult, RouteData, Waypoint } from '../types';

export interface RoutingGridCell {
  row: number;
  column: number;
  longitude: number;
  latitude: number;
  elevation_m: number;
  valid: boolean;
  roughness: number;
  slip_risk: number;
  blocked: boolean;
  cross_slope_deg?: number;
  thermal_risk?: number;
}

export interface GridPosition {
  row: number;
  column: number;
}

export interface RouteRequest {
  grid: RoutingGridCell[][];
  start: GridPosition;
  target: GridPosition;
  rover_state: {
    battery_wh: number;
    battery_reserve_wh: number;
    energy_per_meter_wh: number;
  };
  options?: {
    cell_size_m?: number;
    max_along_slope_deg?: number;
    max_cross_slope_deg?: number;
    max_slip_risk?: number;
  };
}

export interface RouteResult {
  path: RoutingGridCell[];
  distance_m: number;
  energy_wh: number;
  risk_score: number;
  route_score: number;
  battery_remaining_wh: number;
  warnings: string[];
  feasible: boolean;
  reason?: string;
}

export interface TerrainRouteRequest {
  start: GridPosition;
  target: GridPosition;
  rover_state: {
    battery_wh: number;
    battery_reserve_wh: number;
    energy_per_meter_wh: number;
  };
  blocked_cells?: GridPosition[];
  options?: {
    max_along_slope_deg?: number;
    max_cross_slope_deg?: number;
    max_slip_risk?: number;
  };
}

export interface TerrainInfo {
  title: string;
  status: string;
  width_cells: number;
  height_cells: number;
  cell_size_m: number;
  base: {
    row: number;
    column: number;
    latitude: number;
    longitude_east: number;
  };
  target: {
    row: number;
    column: number;
    latitude: number;
    longitude_east: number;
  };
}

const ROUTING_API_URL = import.meta.env.VITE_ROUTING_API_URL ?? 'http://localhost:8000';

export async function calculateRoute(request: RouteRequest): Promise<RouteResult> {
  const response = await fetch(`${ROUTING_API_URL}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Routing request failed (${response.status}): ${detail}`);
  }

  return response.json() as Promise<RouteResult>;
}

export async function getTerrainInfo(): Promise<TerrainInfo> {
  const response = await fetch(`${ROUTING_API_URL}/terrain/info`);
  if (!response.ok) {
    throw new Error(`Terrain metadata request failed (${response.status}).`);
  }
  return response.json() as Promise<TerrainInfo>;
}

export async function calculateTerrainRoute(request: TerrainRouteRequest): Promise<RouteResult> {
  const response = await fetch(`${ROUTING_API_URL}/terrain/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Terrain routing request failed (${response.status}): ${detail}`);
  }

  return response.json() as Promise<RouteResult>;
}

export function routeResultToRouteData(result: RouteResult, type: 'normal' | 'emergency'): RouteData {
  const coordinates = result.path.map((cell): LatLng => [cell.longitude, cell.latitude]);
  let elevationGainMeters = 0;
  let maxSlopeDeg = 0;

  for (let index = 1; index < result.path.length; index += 1) {
    const previous = result.path[index - 1];
    const current = result.path[index];
    const diagonal = previous.row !== current.row && previous.column !== current.column;
    const distanceM = diagonal ? TERRAIN_CELL_SIZE_M * Math.SQRT2 : TERRAIN_CELL_SIZE_M;
    const elevationChange = current.elevation_m - previous.elevation_m;
    elevationGainMeters += Math.max(0, elevationChange);
    maxSlopeDeg = Math.max(
      maxSlopeDeg,
      (Math.atan2(Math.abs(elevationChange), distanceM) * 180) / Math.PI
    );
  }

  const waypointStep = Math.max(1, Math.ceil(result.path.length / 5));
  const selectedCells = result.path.filter(
    (_, index) => index === 0 || index === result.path.length - 1 || index % waypointStep === 0
  );
  const waypoints: Waypoint[] = selectedCells.map((cell, index) => ({
    id: `${type}-wp-${cell.row}-${cell.column}`,
    name:
      index === 0
        ? type === 'emergency'
          ? 'Rover fault position'
          : 'Gale Rover Base — Simulated Operations Point'
        : index === selectedCells.length - 1
        ? type === 'emergency'
          ? 'Gale Rover Base — Simulated Operations Point'
          : 'Sol 4621 science-target candidate'
        : `Terrain-grid checkpoint ${cell.row},${cell.column}`,
    coordinates: [cell.longitude, cell.latitude],
    elevationMeters: Number(cell.elevation_m.toFixed(2)),
    slopeGradeDeg: Number((cell.cross_slope_deg ?? 0).toFixed(1)),
    terrainType: cell.roughness > 0.5 ? 'Rough DTM cell' : 'Traversable DTM cell',
    hazardLevel: cell.slip_risk > 0.6 ? 'HIGH' : cell.roughness > 0.5 ? 'MEDIUM' : 'LOW',
    description: `HiRISE terrain cell (${cell.row}, ${cell.column}); simulated slip risk ${cell.slip_risk.toFixed(2)}.`
  }));

  return {
    id: `python-${type}-route`,
    name: type === 'emergency' ? 'Python emergency return route' : 'Python planned science route',
    type,
    color: type === 'emergency' ? '#ef4444' : '#38bdf8',
    distanceM: Number(result.distance_m.toFixed(2)),
    estimatedMinutes: Math.ceil(result.distance_m / 3),
    elevationGainMeters: Number(elevationGainMeters.toFixed(1)),
    maxSlopeDeg: Number(maxSlopeDeg.toFixed(1)),
    status: type === 'emergency' ? 'recommended' : 'active',
    rationale:
      `${type === 'emergency' ? 'Fault-aware return' : 'Outbound science'} route calculated by Python weighted A*. ` +
      `Energy ${result.energy_wh.toFixed(2)} Wh; normalized risk ${result.risk_score.toFixed(2)}; ` +
      `battery remaining ${result.battery_remaining_wh.toFixed(2)} Wh.` +
      (result.warnings.length ? ` Warning: ${result.warnings.join(' ')}` : ''),
    coordinates: coordinates.length >= 2 ? coordinates : [TERRAIN_BASE_COORDINATES, TERRAIN_BASE_COORDINATES],
    waypoints,
    provenance: 'SYSTEM-DERIVED'
  };
}

export function routeResultToCalculation(result: RouteResult): RouteCalculationResult {
  return {
    path: result.path.map((cell): LatLng => [cell.longitude, cell.latitude]),
    distanceM: Number(result.distance_m.toFixed(2)),
    energyWh: Number(result.energy_wh.toFixed(2)),
    riskScore: result.risk_score,
    batteryRemainingWh: result.battery_remaining_wh,
    warnings: result.warnings,
    feasible: result.feasible
  };
}
