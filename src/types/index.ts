export type LatLng = [number, number]; // [lng, lat] for MapLibre standard

export interface Waypoint {
  id: string;
  name: string;
  coordinates: LatLng;
  elevationMeters: number;
  slopeGradeDeg: number;
  terrainType: string;
  hazardLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface RouteData {
  id: string;
  name: string;
  type: 'normal' | 'emergency';
  color: string;
  distanceM: number;
  estimatedMinutes: number;
  elevationGainMeters: number;
  maxSlopeDeg: number;
  status: 'active' | 'standby' | 'recommended';
  rationale: string;
  waypoints: Waypoint[];
  coordinates: LatLng[];
  provenance: 'SYSTEM-DERIVED';
}

export interface RoverTelemetry {
  isSimulated: boolean;
  roverId: string;
  roverName: string;
  missionStatus: 'NOMINAL' | 'SIMULATED_EMERGENCY';
  batteryRemainingWh: number;
  batteryCapacityWh: number;
  batteryPercentage: number;
  energyConsumptionW: number;
  energyRateWhPerM: number;
  roverTemperature: {
    internalCelsius: number;
    externalCelsius: number;
    status: 'optimal' | 'warning' | 'critical';
  };
  wheelSlipRisk: {
    percentage: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'optimal' | 'warning' | 'critical';
  };
  communicationStatus: {
    relay: string;
    signalStrengthPercent: number;
    uplinkBandwidthKbps: number;
    latencyMinutes: number;
    status: 'connected' | 'degraded' | 'loss_of_signal';
  };
  speedCmPerSec: number;
  missionTime: {
    sol: number;
    localSolarTime: string; // e.g. "14:38 LMST"
    missionElapsedHours: string; // e.g. "184:22:15"
  };
  faultStatus: {
    hasFault: boolean;
    code: string;
    description: string;
    severity: 'NONE' | 'WARNING' | 'CRITICAL';
  };
}

export interface LayerVisibility {
  optical: boolean;
  slope: boolean;
  hazard: boolean;
  mineral: boolean;
}

export interface ScienceMarker {
  id: string;
  name: string;
  coordinates: LatLng;
  category: 'base' | 'boxwork_target' | 'hazard' | 'rover';
  elevation: number;
  label: string;
  isSimulated: boolean;
  provenance: 'NASA-DERIVED' | 'SYSTEM-DERIVED' | 'SIMULATED MOCK DATA';
  geologicalSignificance: string;
}

export interface RoverState {
  batteryRemainingWh: number;
  energyConsumptionW: number;
  speedCmPerSec: number;
  currentSlopeDeg?: number;
  wheelSlipRiskPercent?: number;
}

export interface RouteCalculationResult {
  path: LatLng[];
  distanceM: number;
  energyWh: number;
  riskScore: number;
  batteryRemainingWh: number;
  warnings: string[];
  feasible: boolean;
}

export interface TerrainGrid {
  id: string;
  resolutionM: number;
  rows: number;
  cols: number;
  bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  cells?: number[][];
  isSimulated: boolean;
}
