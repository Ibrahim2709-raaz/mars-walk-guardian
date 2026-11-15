import { LatLng, RouteCalculationResult, RouteData, Waypoint } from '../types';
import { MARS_RADIUS_M } from '../data/mars3DData';

/** Mars volumetric mean radius in meters */
const R_MARS = MARS_RADIUS_M; // 3,396,190 m

/** Energy consumption rate: 0.25 Wh/m (250 Wh/km) */
const WH_PER_METER = 0.25;

/** Nominal rover speed: 3.8 cm/s = 0.038 m/s */
const ROVER_SPEED_M_S = 0.038;

/** Expedition cruise speed for long-distance multi-sol traverses: 0.12 m/s */
const EXPEDITION_SPEED_M_S = 0.12;

/** Daily solar + MMRTG energy generation available for driving: ~110 Wh/Sol */
const WH_PER_SOL_BUDGET = 110;

/** Convert degrees to radians */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees */
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculate great-circle geodesic distance on Mars between two [lng, lat] points in meters.
 */
export function calculateMarsGeodesicDistance(start: LatLng, end: LatLng): number {
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lng2 - lng1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
  return R_MARS * c;
}

/**
 * Interpolate points along the great-circle arc on Mars for smooth 3D globe ribbon rendering.
 */
export function interpolateGreatCircle(start: LatLng, end: LatLng, numSegments: number = 80): LatLng[] {
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;

  const phi1 = toRad(lat1);
  const lambda1 = toRad(lng1);
  const phi2 = toRad(lat2);
  const lambda2 = toRad(lng2);

  const dLambda = lambda2 - lambda1;
  const cosD = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const d = Math.acos(Math.max(-1, Math.min(1, cosD)));

  if (d < 1e-6) {
    return [start, end];
  }

  const sinD = Math.sin(d);
  const points: LatLng[] = [];

  for (let i = 0; i <= numSegments; i++) {
    const f = i / numSegments;
    const a = Math.sin((1 - f) * d) / sinD;
    const b = Math.sin(f * d) / sinD;

    const x = a * Math.cos(phi1) * Math.cos(lambda1) + b * Math.cos(phi2) * Math.cos(lambda2);
    const y = a * Math.cos(phi1) * Math.sin(lambda1) + b * Math.cos(phi2) * Math.sin(lambda2);
    const z = a * Math.sin(phi1) + b * Math.sin(phi2);

    const phiF = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lambdaF = Math.atan2(y, x);

    points.push([toDeg(lambdaF), toDeg(phiF)]);
  }

  return points;
}

export interface TargetDestinationInfo {
  id: string;
  name: string;
  coordinates: LatLng;
  groundElevationM?: number;
  description?: string;
  category?: 'base' | 'mission' | 'feature';
}

/**
 * Terrain classification and description based on target and region
 */
function getTerrainStationProfile(
  fraction: number,
  targetName: string,
  _startElev: number,
  targetElev: number
): { name: string; terrainType: string; hazard: 'LOW' | 'MEDIUM' | 'HIGH'; slope: number; desc: string } {
  const isHighland = targetElev > 0;
  const isCanyon = targetName.toLowerCase().includes('marineris');
  const isVolcano = targetName.toLowerCase().includes('mons');
  const isPolar = targetName.toLowerCase().includes('pole');

  if (fraction === 0) {
    return {
      name: 'AER-1 Current Station — Gale Crater Origin',
      terrainType: 'Lacustrine Mudstone & Regolith Bedrock',
      hazard: 'LOW',
      slope: 3.2,
      desc: 'Nominal staging base in northwest Gale Crater floor.'
    };
  }

  if (fraction === 1) {
    return {
      name: `${targetName} — Science Objective Arrival`,
      terrainType: isVolcano
        ? 'Basaltic Volcanic Caldera / Shield Flank'
        : isCanyon
        ? 'Stratified Sedimentary Canyon Wall Deposit'
        : isPolar
        ? 'Permanent CO2 & Water Ice Polar Layer'
        : 'Exploration Objective Terrain Zone',
      hazard: isVolcano || isCanyon ? 'MEDIUM' : 'LOW',
      slope: isVolcano ? 14.5 : isCanyon ? 12.0 : 4.5,
      desc: `Arrival checkpoint at ${targetName}. Geological survey and sample collection zone.`
    };
  }

  // Intermediate stations
  if (fraction < 0.25) {
    return {
      name: `Traverse Station Alpha (Sector ${(fraction * 100).toFixed(0)}%)`,
      terrainType: 'Aeolis Palus Basaltic Sand Ripple Field',
      hazard: 'MEDIUM',
      slope: 5.8,
      desc: 'Traverse corridor exiting Gale Crater northern ejecta apron.'
    };
  } else if (fraction < 0.5) {
    return {
      name: `Expedition Midpoint Station Beta (Sector ${(fraction * 100).toFixed(0)}%)`,
      terrainType: isHighland ? 'Southern Uplands Cratered Terrain' : 'Northern Lowland Rolling Basalt Plains',
      hazard: 'LOW',
      slope: 4.1,
      desc: 'Open navigation plain with direct Mars Reconnaissance Orbiter (MRO) line-of-sight.'
    };
  } else if (fraction < 0.75) {
    return {
      name: `Regional Transition Waypoint Gamma (Sector ${(fraction * 100).toFixed(0)}%)`,
      terrainType: isCanyon ? 'Chasma Trough Egress Shelf' : isVolcano ? 'Tharsis Volcanic Rise Apron' : 'Wrinkle Ridge Basaltic Shelf',
      hazard: isVolcano || isCanyon ? 'HIGH' : 'MEDIUM',
      slope: isVolcano ? 11.2 : 7.6,
      desc: 'Topographic transition zone requiring careful autonomous wheel-slip monitoring.'
    };
  } else {
    return {
      name: `Final Approach Checkpoint Delta (Sector ${(fraction * 100).toFixed(0)}%)`,
      terrainType: isPolar ? 'Periglacial Patterned Ground' : 'Pre-Target Scree & Talus Apron',
      hazard: 'LOW',
      slope: 6.4,
      desc: `Terminal descent corridor approaching target boundary of ${targetName}.`
    };
  }
}

/**
 * Calculate an expedition route from the current rover location to any bookmark / target on Mars.
 */
export function calculatePlanetaryRoute(
  startCoordinates: LatLng,
  target: TargetDestinationInfo,
  currentBatteryWh: number = 100.0
): {
  routeData: RouteData;
  calculation: RouteCalculationResult;
} {
  const distanceM = calculateMarsGeodesicDistance(startCoordinates, target.coordinates);
  const denseCoordinates = interpolateGreatCircle(startCoordinates, target.coordinates, Math.min(100, Math.max(24, Math.round(distanceM / 50000))));

  const startElevation = -3622;
  const targetElevation = target.groundElevationM ?? -3500;
  const totalElevationDelta = targetElevation - startElevation;

  // Generate 5-6 strategic checkpoints
  const numWaypoints = distanceM > 100000 ? 6 : 4;
  const waypoints: Waypoint[] = [];

  for (let i = 0; i < numWaypoints; i++) {
    const fraction = i / (numWaypoints - 1);
    const coordIndex = Math.min(
      denseCoordinates.length - 1,
      Math.round(fraction * (denseCoordinates.length - 1))
    );
    const coord = denseCoordinates[coordIndex];

    const elev = startElevation + fraction * totalElevationDelta + (fraction > 0 && fraction < 1 ? Math.sin(fraction * Math.PI) * 150 : 0);
    const profile = getTerrainStationProfile(fraction, target.name, startElevation, targetElevation);

    waypoints.push({
      id: `expedition-wp-${i + 1}`,
      name: profile.name,
      coordinates: coord,
      elevationMeters: Math.round(elev),
      slopeGradeDeg: profile.slope,
      terrainType: profile.terrainType,
      hazardLevel: profile.hazard,
      description: profile.desc
    });
  }

  // Energy & Feasibility calculations
  const totalEnergyWh = Number((distanceM * WH_PER_METER).toFixed(1));
  const directFeasible = totalEnergyWh <= currentBatteryWh * 0.9; // 10% reserve

  let solsRequired = 1;
  let estimatedMinutes = 0;
  let batteryRemainingWh = 0;
  let feasible = true;
  const warnings: string[] = [];

  if (distanceM <= 500) {
    // Short local traverse
    estimatedMinutes = Math.ceil(distanceM / ROVER_SPEED_M_S / 60);
    batteryRemainingWh = Math.max(10, currentBatteryWh - totalEnergyWh);
    feasible = directFeasible;
    if (!directFeasible) {
      warnings.push(`Traverse energy (${totalEnergyWh} Wh) exceeds available single-charge battery capacity (${currentBatteryWh.toFixed(0)} Wh).`);
    }
  } else {
    // Multi-Sol or Expedition Traverse
    const effectiveSpeed = distanceM > 10000 ? EXPEDITION_SPEED_M_S : ROVER_SPEED_M_S;
    const driveSeconds = distanceM / effectiveSpeed;
    estimatedMinutes = Math.ceil(driveSeconds / 60);

    solsRequired = Math.max(1, Math.ceil(totalEnergyWh / WH_PER_SOL_BUDGET));
    batteryRemainingWh = Math.max(15, currentBatteryWh - Math.min(currentBatteryWh * 0.75, totalEnergyWh));

    warnings.push(`Planetary Expedition (${(distanceM / 1000).toFixed(1)} km): Requires ${solsRequired} Sol recharge cycles (MMRTG + Solar Array).`);
    if (distanceM > 500000) {
      warnings.push(`Long-range inter-crater traverse across Mars. Requires MRO/Odyssey orbital telemetry relay handoffs.`);
    }
  }

  const riskScore = Math.min(0.85, Math.max(0.12, 0.15 + (distanceM / 5000000) * 0.4 + (Math.abs(totalElevationDelta) / 25000) * 0.25));

  const distanceFormatted = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM.toFixed(0)} m`;
  const energyFormatted = totalEnergyWh >= 1000 ? `${(totalEnergyWh / 1000).toFixed(2)} kWh` : `${totalEnergyWh} Wh`;

  const rationale =
    distanceM <= 500
      ? `Short-range science traverse to ${target.name} (${distanceFormatted}). Direct battery drive feasible using ${energyFormatted}.`
      : `Geodesic planetary expedition route to ${target.name} (${distanceFormatted}). ` +
        `Total energy requirement: ${energyFormatted}. Projected mission transit: ~${solsRequired} Sol(s) ` +
        `utilizing solar-noon direct drive and scheduled battery recharge cycles. Autonomous wheel-slip monitoring enabled.`;

  const routeData: RouteData = {
    id: `planetary-expedition-${target.id}`,
    name: `Expedition: Gale Base → ${target.name}`,
    type: 'normal',
    color: '#00f0ff',
    distanceM: Number(distanceM.toFixed(1)),
    estimatedMinutes,
    elevationGainMeters: Math.max(0, Math.round(targetElevation - startElevation)),
    maxSlopeDeg: Math.max(...waypoints.map((w) => w.slopeGradeDeg)),
    status: 'active',
    rationale,
    coordinates: denseCoordinates,
    waypoints,
    provenance: 'SYSTEM-DERIVED'
  };

  const calculation: RouteCalculationResult = {
    path: denseCoordinates,
    distanceM: Number(distanceM.toFixed(1)),
    energyWh: totalEnergyWh,
    riskScore: Number(riskScore.toFixed(2)),
    batteryRemainingWh: Number(batteryRemainingWh.toFixed(1)),
    warnings,
    feasible
  };

  return { routeData, calculation };
}

/**
 * Calculate an emergency contingency route for any target on Mars.
 * Simulates a hazard corridor along the planned route and calculates an immediate diversion to safe haven.
 */
export function calculatePlanetaryEmergencyRoute(
  startCoordinates: LatLng,
  target: TargetDestinationInfo,
  _currentBatteryWh: number = 65.0
): {
  routeData: RouteData;
  calculation: RouteCalculationResult;
  blockedCoordinates?: LatLng[];
} {
  const denseCoordinates = interpolateGreatCircle(startCoordinates, target.coordinates, 60);

  // Egress point: halfway or 35% along the path where simulated fault occurs
  const faultIndex = Math.min(denseCoordinates.length - 1, Math.max(1, Math.floor(denseCoordinates.length * 0.35)));
  const faultCoords = denseCoordinates[faultIndex];

  // Diverted return path: from fault position detour around the hazard back towards a safe haven
  const detourLng = faultCoords[0] + 0.003 * (faultCoords[0] > 0 ? 1 : -1);
  const detourLat = faultCoords[1] + 0.003;
  const detourPoint: LatLng = [detourLng, detourLat];

  // Return to origin or safe shelter
  const returnLeg = interpolateGreatCircle(detourPoint, startCoordinates, 40);
  const emergencyCoordinates: LatLng[] = [faultCoords, detourPoint, ...returnLeg];

  const emergencyDistanceM = calculateMarsGeodesicDistance(faultCoords, detourPoint) + calculateMarsGeodesicDistance(detourPoint, startCoordinates);
  const emergencyEnergyWh = Number((emergencyDistanceM * WH_PER_METER * 1.35).toFixed(1)); // +35% emergency actuator draw

  const emergencyWaypoints: Waypoint[] = [
    {
      id: 'emergency-wp-1',
      name: 'Rover Fault Injection Point',
      coordinates: faultCoords,
      elevationMeters: -3625,
      slopeGradeDeg: 9.8,
      terrainType: 'Slip-Inducing Sand Ripple Trough',
      hazardLevel: 'HIGH',
      description: 'Simulated mobility anomaly detected: elevated wheel-slip and drive actuator resistance.'
    },
    {
      id: 'emergency-wp-2',
      name: 'Lateral Egress Diversion Corridor',
      coordinates: detourPoint,
      elevationMeters: -3628,
      slopeGradeDeg: 7.2,
      terrainType: 'Firm Basalt Regolith Detour',
      hazardLevel: 'MEDIUM',
      description: 'Bypassing hazardous sand ripples onto high-traction exposed bedrock shelf.'
    },
    {
      id: 'emergency-wp-3',
      name: 'Intermediate Safe-Haven Checkpoint',
      coordinates: returnLeg[Math.floor(returnLeg.length * 0.5)] || detourPoint,
      elevationMeters: -3630,
      slopeGradeDeg: 4.5,
      terrainType: 'Navigable Return Corridor',
      hazardLevel: 'LOW',
      description: 'Stable terrain corridor maintaining direct telemetry link with Gale Rover Base.'
    },
    {
      id: 'emergency-wp-4',
      name: 'Gale Operations Safe Haven Sanctuary',
      coordinates: startCoordinates,
      elevationMeters: -3631,
      slopeGradeDeg: 3.0,
      terrainType: 'Designated Base Operations Perimeter',
      hazardLevel: 'LOW',
      description: 'Secure recovery point with full power docking and diagnostic telemetry.'
    }
  ];

  const distFormatted = emergencyDistanceM >= 1000 ? `${(emergencyDistanceM / 1000).toFixed(1)} km` : `${emergencyDistanceM.toFixed(0)} m`;

  const rationale =
    `EMERGENCY CONTINGENCY ACTIVE: Simulated Fault F-12 (mobility restriction & elevated wheel slip along ${target.name} traverse corridor). ` +
    `Autonomous egress path plotted around hazard zone via ${distFormatted} return corridor with +35% drive reserve. ` +
    `Thermal loops nominal; priority battery conservation mode engaged.`;

  const routeData: RouteData = {
    id: `emergency-recovery-${target.id}`,
    name: `Contingency Recovery: ${target.name} Egress`,
    type: 'emergency',
    color: '#ef4444',
    distanceM: Number(emergencyDistanceM.toFixed(1)),
    estimatedMinutes: Math.ceil(emergencyDistanceM / 0.05 / 60),
    elevationGainMeters: 6,
    maxSlopeDeg: 9.8,
    status: 'recommended',
    rationale,
    coordinates: emergencyCoordinates,
    waypoints: emergencyWaypoints,
    provenance: 'SYSTEM-DERIVED'
  };

  const calculation: RouteCalculationResult = {
    path: emergencyCoordinates,
    distanceM: Number(emergencyDistanceM.toFixed(1)),
    energyWh: emergencyEnergyWh,
    riskScore: 0.68,
    batteryRemainingWh: 38.5,
    warnings: [
      `Emergency Contingency Mode engaged: drive actuators drawing 60W (+35% fault resistance).`,
      `Traverse redirected away from obstructed corridor towards Gale Base safe haven.`
    ],
    feasible: true
  };

  return {
    routeData,
    calculation,
    blockedCoordinates: [faultCoords]
  };
}
