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
  distanceKm: number;
  estimatedMinutes: number;
  elevationGainMeters: number;
  maxSlopeDeg: number;
  status: 'active' | 'standby' | 'recommended';
  rationale: string;
  waypoints: Waypoint[];
  coordinates: LatLng[];
}

export interface SuitTelemetry {
  isSimulated: boolean;
  astronautName: string;
  suitId: string;
  missionStatus: 'NOMINAL' | 'EMERGENCY_RETURN';
  oxygen: {
    percentage: number;
    consumptionLitersPerMin: number;
    hoursRemaining: number;
    pressureKPa: number;
    status: 'optimal' | 'warning' | 'critical';
  };
  battery: {
    percentage: number;
    powerDrawWatts: number;
    voltage: number;
    hoursRemaining: number;
    status: 'optimal' | 'warning' | 'critical';
  };
  temperature: {
    internalCelsius: number;
    externalCelsius: number;
    heaterDutyCyclePercent: number;
    status: 'optimal' | 'warning' | 'critical';
  };
  daylight: {
    sol: number;
    localSolarTime: string; // e.g. "14:42 LMST"
    solarElevationDeg: number;
    hoursDaylightRemaining: number;
    isDuskApproaching: boolean;
  };
  heartRateBpm: number;
  radiationMicroSvPerHour: number;
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
  category: 'base' | 'boxwork_target' | 'hazard' | 'astronaut';
  elevation: number;
  label: string;
  isSimulated: boolean;
  geologicalSignificance: string;
}
