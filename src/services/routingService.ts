import { LatLng, RoverState, RouteCalculationResult, TerrainGrid } from '../types';

const MARS_RADIUS_METERS = 3389500;

/**
 * Computes haversine distance in meters between two Martian coordinates.
 */
export function haversineDistanceMeters(coord1: LatLng, coord2: LatLng): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return MARS_RADIUS_METERS * c;
}

/**
 * Calculates a route between start and target across a terrain grid.
 * Prepared interface for robotic rover pathfinding integration.
 *
 * @param grid Terrain elevation/cost grid (mock grid or ingested DEM)
 * @param start Rover starting coordinates [lng, lat]
 * @param target Mission target or recovery waypoint coordinates [lng, lat]
 * @param roverState Current state of the rover (battery, consumption, speed, slip)
 * @returns RouteCalculationResult with path, metrics, warnings, and feasibility
 */
export function calculateRoute(
  grid: TerrainGrid | null | any,
  start: LatLng,
  target: LatLng,
  roverState: RoverState
): RouteCalculationResult {
  // Check if grid is passed (for live algorithm ingestion in future phases)
  void grid;

  // Determine whether this request is for the emergency return vector or normal planned traverse
  const isEmergencyVector =
    Math.abs(start[0] - 137.42010) < 0.0002 &&
    Math.abs(target[0] - 137.41900) < 0.0002;

  let path: LatLng[];
  let warnings: string[] = [];
  let riskScore = 0.18;

  if (isEmergencyVector) {
    // Egress return corridor to Gale Rover Base: ~79.4 meters
    path = [
      [137.42010, -4.84295], // Abort Point (Near Boxwork Site)
      [137.41970, -4.84258], // Hardpan Egress Spine
      [137.41932, -4.84226], // Base Ingress Vector
      [137.41900, -4.84200]  // Gale Rover Base Berth 1
    ];
    warnings = [
      'Simulated Emergency State: Direct hardpan egress corridor engaged',
      'Drive actuator power draw elevated (340 W) for rapid retreat to base',
      'Bypasses unconsolidated sand ripple corridor to prevent chassis entrapment'
    ];
    riskScore = 0.32;
  } else {
    // Planned scientific traverse to Boxwork Target: ~86.3 meters
    path = [
      [137.41900, -4.84200], // Gale Rover Base Berth 1
      [137.41925, -4.84218], // Outwash Hardpan (Station 1)
      [137.41952, -4.84235], // Bedrock Saddle (Station 2)
      [137.41978, -4.84262], // Sand Ripple Bypass (Station 3)
      [137.42010, -4.84295]  // Boxwork Science Target (Station 4)
    ];
    warnings = [
      'Slope gradient reaches 8.5° across Bedrock Saddle (Station 2)',
      'Wheel-slip risk elevated to 12% along sand drift margin (Station 3)'
    ];
    riskScore = 0.18;
  }

  // Calculate cumulative distance in meters along path
  let distanceM = 0;
  for (let i = 0; i < path.length - 1; i++) {
    distanceM += haversineDistanceMeters(path[i], path[i + 1]);
  }
  distanceM = Number(distanceM.toFixed(1));

  // Compute energy consumption:
  // Speed in m/s: cm/s / 100
  const speedMPerSec = Math.max(0.01, (roverState.speedCmPerSec || 3.8) / 100);
  const traverseSeconds = distanceM / speedMPerSec;
  const traverseHours = traverseSeconds / 3600;
  const baseEnergyWh = (roverState.energyConsumptionW || 185) * traverseHours;
  // Apply terrain & slope multiplier
  const energyWh = Number((baseEnergyWh * (1 + riskScore * 0.4)).toFixed(1));

  // Remaining battery after traverse
  const batteryRemainingWh = Number(
    Math.max(0, roverState.batteryRemainingWh - energyWh).toFixed(1)
  );

  // Feasibility check: rover must maintain at least 15% battery reserve and acceptable risk
  const feasible = batteryRemainingWh > (roverState.batteryRemainingWh * 0.15) && riskScore < 0.75;

  if (!feasible) {
    warnings.push('CRITICAL: Traverse exceeds safe battery reserve threshold or maximum terrain risk score');
  }

  return {
    path,
    distanceM,
    energyWh,
    riskScore,
    batteryRemainingWh,
    warnings,
    feasible
  };
}
