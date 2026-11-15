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
