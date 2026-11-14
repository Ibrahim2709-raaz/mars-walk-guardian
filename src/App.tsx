import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MarsMap } from './components/MarsMap';
import { TelemetryHUD } from './components/TelemetryHUD';
import { LayerControls } from './components/LayerControls';
import { EmergencyControl } from './components/EmergencyControl';
import { RouteExplanation } from './components/RouteExplanation';
import {
  GALE_BASE_COORDINATES,
  BOXWORK_TARGET_COORDINATES
} from './data/marsGeoData';
import {
  BASE_POSITION,
  SCIENCE_TARGET_POSITION,
  TERRAIN_CELL_SIZE_M
} from './data/terrainSites';
import { NOMINAL_TELEMETRY, EMERGENCY_TELEMETRY } from './data/mockTelemetry';
import { LayerVisibility, LatLng, RouteData, SuitTelemetry, Waypoint } from './types';
import {
  calculateTerrainRoute,
  RouteResult,
} from './services/routingApi';

const EMPTY_ROUTE: RouteData = {
  id: 'route-loading',
  name: 'Waiting for Python routing service',
  type: 'normal',
  color: '#38bdf8',
  distanceKm: 0,
  estimatedMinutes: 0,
  elevationGainMeters: 0,
  maxSlopeDeg: 0,
  status: 'standby',
  rationale: 'Requesting a feasible route from the Python weighted A* service.',
  coordinates: [GALE_BASE_COORDINATES, GALE_BASE_COORDINATES],
  waypoints: []
};

function routeResultToRouteData(result: RouteResult, type: 'normal' | 'emergency'): RouteData {
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
      Math.atan2(Math.abs(elevationChange), distanceM) * 180 / Math.PI
    );
  }

  const waypointStep = Math.max(1, Math.ceil(result.path.length / 5));
  const selectedCells = result.path.filter(
    (_, index) => index === 0 || index === result.path.length - 1 || index % waypointStep === 0
  );
  const waypoints: Waypoint[] = selectedCells.map((cell, index) => ({
    id: `${type}-wp-${cell.row}-${cell.column}`,
    name: index === 0
      ? type === 'emergency' ? 'Rover fault position' : 'Simulated operations point'
      : index === selectedCells.length - 1
      ? type === 'emergency' ? 'Simulated operations point' : 'Boxwork science target'
      : `Grid checkpoint ${cell.row},${cell.column}`,
    coordinates: [cell.longitude, cell.latitude],
    elevationMeters: Number(cell.elevation_m.toFixed(2)),
    slopeGradeDeg: Number((cell.cross_slope_deg ?? 0).toFixed(1)),
    terrainType: cell.blocked ? 'Blocked terrain' : cell.roughness > 0.5 ? 'Rough regolith' : 'Traversable regolith',
    hazardLevel: cell.slip_risk > 0.6 ? 'HIGH' : cell.roughness > 0.5 ? 'MEDIUM' : 'LOW',
    description: `Python grid cell (${cell.row}, ${cell.column}); slip risk ${cell.slip_risk.toFixed(2)}.`
  }));

  return {
    id: `python-${type}-route`,
    name: type === 'emergency' ? 'Python emergency return route' : 'Python planned science route',
    type,
    color: type === 'emergency' ? '#ef4444' : '#38bdf8',
    distanceKm: Number((result.distance_m / 1000).toFixed(3)),
    estimatedMinutes: Math.ceil(result.distance_m / 3),
    elevationGainMeters: Number(elevationGainMeters.toFixed(1)),
    maxSlopeDeg: Number(maxSlopeDeg.toFixed(1)),
    status: type === 'emergency' ? 'recommended' : 'active',
    rationale: `${type === 'emergency' ? 'Fault-aware return' : 'Outbound science'} route calculated by Python weighted A*. ` +
      `Energy ${result.energy_wh.toFixed(2)} Wh; normalized risk ${result.risk_score.toFixed(2)}; ` +
      `battery remaining ${result.battery_remaining_wh.toFixed(2)} Wh.` +
      (result.warnings.length ? ` Warning: ${result.warnings.join(' ')}` : ''),
    coordinates: coordinates.length >= 2 ? coordinates : [GALE_BASE_COORDINATES, GALE_BASE_COORDINATES],
    waypoints
  };
}

export const App: React.FC = () => {
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [layers, setLayers] = useState<LayerVisibility>({
    optical: true,
    slope: true,
    hazard: true,
    mineral: false
  });
  const [telemetry, setTelemetry] = useState<SuitTelemetry>(NOMINAL_TELEMETRY);
  const [focusedCoordinates, setFocusedCoordinates] = useState<LatLng | null>(null);
  const [normalRoute, setNormalRoute] = useState<RouteData | null>(null);
  const [emergencyRoute, setEmergencyRoute] = useState<RouteData | null>(null);
  const [normalRouteResult, setNormalRouteResult] = useState<RouteResult | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(true);
  const [routingError, setRoutingError] = useState<string | null>(null);

  useEffect(() => {
    const requestNormalRoute = async () => {
      setIsRouting(true);
      setRoutingError(null);
      try {
        const result = await calculateTerrainRoute({
          start: BASE_POSITION,
          target: SCIENCE_TARGET_POSITION,
          rover_state: {
            battery_wh: 100,
            battery_reserve_wh: 10,
            energy_per_meter_wh: 0.25
          }
        });
        if (!result.feasible) throw new Error(result.reason ?? 'No feasible outbound route.');
        setNormalRouteResult(result);
        setNormalRoute(routeResultToRouteData(result, 'normal'));
      } catch (error) {
        setRoutingError(error instanceof Error ? error.message : 'Python routing service is unavailable.');
      } finally {
        setIsRouting(false);
      }
    };

    void requestNormalRoute();
  }, []);

  const handleToggleEmergency = async () => {
    if (isEmergency) {
      setIsEmergency(false);
      setTelemetry(NOMINAL_TELEMETRY);
      setRoutingError(null);
      return;
    }

    if (!normalRouteResult) {
      setRoutingError('The outbound route must load before an emergency can be simulated.');
      return;
    }

    setIsRouting(true);
    setRoutingError(null);
    try {
      const rerouteCell = normalRouteResult.path[Math.floor(normalRouteResult.path.length / 2)];

      const result = await calculateTerrainRoute({
        start: SCIENCE_TARGET_POSITION,
        target: BASE_POSITION,
        rover_state: {
          battery_wh: 65,
          battery_reserve_wh: 10,
          energy_per_meter_wh: 0.25
        },
        blocked_cells: rerouteCell ? [{ row: rerouteCell.row, column: rerouteCell.column }] : []
      });
      if (!result.feasible) throw new Error(result.reason ?? 'No feasible emergency return route.');
      setEmergencyRoute(routeResultToRouteData(result, 'emergency'));
      setIsEmergency(true);
      setTelemetry(EMERGENCY_TELEMETRY);
    } catch (error) {
      setRoutingError(error instanceof Error ? error.message : 'Emergency routing failed.');
    } finally {
      setIsRouting(false);
    }
  };

  // Toggle Map Layer
  const handleToggleLayer = (layerKey: keyof LayerVisibility) => {
    setLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  // Center on Gale Base
  const handleCenterBase = () => {
    setFocusedCoordinates(GALE_BASE_COORDINATES);
  };

  // Center on Boxwork Target
  const handleCenterTarget = () => {
    setFocusedCoordinates(BOXWORK_TARGET_COORDINATES);
  };

  // Center on any waypoint
  const handleSelectWaypoint = (coords: LatLng) => {
    setFocusedCoordinates(coords);
  };

  // Minor simulated telemetry tick to make suit sensors feel live
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const jitter = (Math.random() - 0.5) * 0.05;
        const hrJitter = Math.floor((Math.random() - 0.5) * 3);
        return {
          ...prev,
          heartRateBpm: Math.max(60, Math.min(170, prev.heartRateBpm + hrJitter)),
          oxygen: {
            ...prev.oxygen,
            percentage: Math.max(10, Number((prev.oxygen.percentage - 0.005 + jitter * 0.01).toFixed(2)))
          },
          battery: {
            ...prev.battery,
            percentage: Math.max(10, Number((prev.battery.percentage - 0.003).toFixed(2)))
          }
        };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const activeRoute = isEmergency ? emergencyRoute ?? EMPTY_ROUTE : normalRoute ?? EMPTY_ROUTE;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Top Tactical Mission Control Header */}
      <Header
        telemetry={telemetry}
        isEmergency={isEmergency}
        onCenterBase={handleCenterBase}
        onCenterTarget={handleCenterTarget}
      />

      {/* Main Tactical Dashboard Body */}
      <main className="flex-1 p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto lg:overflow-hidden">
        {/* Left / Center Map Section (8 Columns on desktop) */}
        <section className="lg:col-span-8 flex flex-col gap-3 min-h-[460px] lg:h-full">
          {/* Interactive MapLibre Mars Map */}
          <div className="flex-1 relative min-h-[360px] rounded-xl overflow-hidden">
            <MarsMap
              layers={layers}
              isEmergency={isEmergency}
              normalRoute={normalRoute}
              emergencyRoute={emergencyRoute}
              focusedCoordinates={focusedCoordinates}
              onClearFocus={() => setFocusedCoordinates(null)}
            />
          </div>

          {/* Layer Control Toggles Docked Under Map */}
          <LayerControls
            layers={layers}
            onToggleLayer={handleToggleLayer}
          />
        </section>

        {/* Right Tactical Sidebar (4 Columns on desktop) */}
        <aside className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto pr-0.5">
          {/* Emergency Contingency Action Box */}
          <EmergencyControl
            isEmergency={isEmergency}
            isRouting={isRouting}
            error={routingError}
            onToggleEmergency={handleToggleEmergency}
          />

          {/* Suit Telemetry Indicators (Oxygen, Battery, Temp, Daylight) */}
          <TelemetryHUD
            telemetry={telemetry}
            isEmergency={isEmergency}
          />

          {/* Route Explanation & Waypoint Profile */}
          <RouteExplanation
            activeRoute={activeRoute}
            isEmergency={isEmergency}
            onSelectWaypoint={handleSelectWaypoint}
          />
        </aside>
      </main>
    </div>
  );
};
export default App;
