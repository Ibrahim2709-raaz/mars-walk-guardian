import React, { useEffect, useState } from 'react';
import { EmergencyControl } from './components/EmergencyControl';
import { Header, ViewMode } from './components/Header';
import { LayerControls } from './components/LayerControls';
import { MarsMap } from './components/MarsMap';
import { Mars3DScene } from './components/Mars3DScene';
import { OrbitalBookmarks } from './components/OrbitalBookmarks';
import { RouteExplanation } from './components/RouteExplanation';
import { TelemetryHUD } from './components/TelemetryHUD';
import {
  BOXWORK_TARGET_COORDINATES,
  CURRENT_ROVER_COORDINATES,
  GALE_BASE_COORDINATES
} from './data/marsGeoData';
import { MarsBookmark } from './data/mars3DData';
import { EMERGENCY_ROVER_TELEMETRY, NOMINAL_ROVER_TELEMETRY } from './data/mockTelemetry';
import { BASE_POSITION, SCIENCE_TARGET_POSITION } from './data/terrainSites';
import {
  calculateTerrainRoute,
  RouteResult,
  routeResultToRouteData,
  routeResultToCalculation
} from './services/routingApi';
import {
  LatLng,
  LayerVisibility,
  RouteCalculationResult,
  RouteData,
  RoverTelemetry
} from './types';

const EMPTY_ROUTE: RouteData = {
  id: 'route-loading',
  name: 'Waiting for Python routing service',
  type: 'normal',
  color: '#38bdf8',
  distanceM: 0,
  estimatedMinutes: 0,
  elevationGainMeters: 0,
  maxSlopeDeg: 0,
  status: 'standby',
  rationale: 'Loading the cached HiRISE terrain grid and requesting a weighted A* route.',
  coordinates: [GALE_BASE_COORDINATES, GALE_BASE_COORDINATES],
  waypoints: [],
  provenance: 'SYSTEM-DERIVED'
};

const EMPTY_CALCULATION: RouteCalculationResult = {
  path: [GALE_BASE_COORDINATES, GALE_BASE_COORDINATES],
  distanceM: 0,
  energyWh: 0,
  riskScore: 0,
  batteryRemainingWh: 100,
  warnings: ['Waiting for the Python terrain-routing service.'],
  feasible: false
};

export const App: React.FC = () => {
  const [isEmergency, setIsEmergency] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('3d-orbital');
  const [isDropModeActive, setIsDropModeActive] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [selectedBookmark, setSelectedBookmark] = useState<MarsBookmark | null>(null);
  const [layers, setLayers] = useState<LayerVisibility>({
    optical: true,
    slope: true,
    hazard: true,
    mineral: false
  });
  const [telemetry, setTelemetry] = useState<RoverTelemetry>(NOMINAL_ROVER_TELEMETRY);
  const [focusedCoordinates, setFocusedCoordinates] = useState<LatLng | null>(null);
  const [normalRoute, setNormalRoute] = useState<RouteData | null>(null);
  const [emergencyRoute, setEmergencyRoute] = useState<RouteData | null>(null);
  const [normalRouteResult, setNormalRouteResult] = useState<RouteResult | null>(null);
  const [emergencyRouteResult, setEmergencyRouteResult] = useState<RouteResult | null>(null);
  const [isRouting, setIsRouting] = useState(true);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [blockedHazardCells, setBlockedHazardCells] = useState<{ row: number; column: number }[] | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;

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
        setRoutingError(null);
      } catch (error) {
        setRoutingError(error instanceof Error ? error.message : 'Python routing service is unavailable.');
        // Auto-retry after 3 seconds if service is still starting up
        timeoutId = window.setTimeout(requestNormalRoute, 3000);
      } finally {
        setIsRouting(false);
      }
    };

    void requestNormalRoute();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const handleToggleEmergency = async () => {
    if (isEmergency) {
      setIsEmergency(false);
      setTelemetry(NOMINAL_ROVER_TELEMETRY);
      setRoutingError(null);
      setBlockedHazardCells(null);
      return;
    }
    if (!normalRouteResult) {
      setRoutingError('The outbound route must load before an emergency can be simulated.');
      return;
    }

    setIsRouting(true);
    setRoutingError(null);
    try {
      // Generate a rectangular simulated hazard zone: rows 62–72, columns 115–135
      const blockedCells: { row: number; column: number }[] = [];
      for (let row = 62; row <= 72; row++) {
        for (let col = 115; col <= 135; col++) {
          blockedCells.push({ row, column: col });
        }
      }

      const result = await calculateTerrainRoute({
        start: SCIENCE_TARGET_POSITION,
        target: BASE_POSITION,
        rover_state: {
          battery_wh: 65,
          battery_reserve_wh: 10,
          energy_per_meter_wh: 0.25
        },
        blocked_cells: blockedCells
      });
      if (!result.feasible) throw new Error(result.reason ?? 'No feasible emergency return route.');
      setEmergencyRouteResult(result);
      setEmergencyRoute(routeResultToRouteData(result, 'emergency'));
      setBlockedHazardCells(blockedCells);
      setIsEmergency(true);
      setTelemetry(EMERGENCY_ROVER_TELEMETRY);
    } catch (error) {
      setRoutingError(error instanceof Error ? error.message : 'Emergency routing failed.');
    } finally {
      setIsRouting(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((previous) => {
        const energyConsumptionW = Math.max(
          35,
          Math.min(70, previous.energyConsumptionW + Math.floor((Math.random() - 0.5) * 4))
        );
        const batteryRemainingWh = Math.max(
          previous.batteryCapacityWh * 0.1,
          Number((previous.batteryRemainingWh - 0.01).toFixed(2))
        );
        return {
          ...previous,
          batteryRemainingWh,
          batteryPercentage: Number((batteryRemainingWh / previous.batteryCapacityWh * 100).toFixed(1)),
          energyConsumptionW
        };
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const activeRoute = isEmergency ? emergencyRoute ?? EMPTY_ROUTE : normalRoute ?? EMPTY_ROUTE;
  const activeResult = isEmergency ? emergencyRouteResult : normalRouteResult;
  const routeCalculation = activeResult
    ? routeResultToCalculation(activeResult)
    : { ...EMPTY_CALCULATION, warnings: routingError ? [routingError] : EMPTY_CALCULATION.warnings };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      <Header
        telemetry={telemetry}
        isEmergency={isEmergency}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onToggleBookmarks={() => setIsBookmarksOpen((prev) => !prev)}
        isBookmarksOpen={isBookmarksOpen}
        onCenterBase={() => {
          setFocusedCoordinates([...GALE_BASE_COORDINATES]);
        }}
        onCenterTarget={() => {
          setFocusedCoordinates([...BOXWORK_TARGET_COORDINATES]);
        }}
        onCenterRover={() => {
          setFocusedCoordinates([...CURRENT_ROVER_COORDINATES]);
        }}
      />

      <main
        className="flex-1 p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto lg:overflow-hidden relative"
        style={{ minHeight: 0 }}
      >
        {/* Left / Center Map & 3D Scene View (8 Columns on desktop) */}
        <section className="lg:col-span-8 flex flex-col gap-3 relative" style={{ minHeight: '540px', height: '100%' }}>
          <div className="relative rounded-xl overflow-hidden" style={{ flex: '1 1 0', minHeight: '480px' }}>
            <div
              className="absolute inset-0 w-full h-full transition-opacity duration-200"
              style={{
                opacity: viewMode === '2d-grid' ? 1 : 0,
                pointerEvents: viewMode === '2d-grid' ? 'auto' : 'none',
                zIndex: viewMode === '2d-grid' ? 10 : 0
              }}
            >
              <MarsMap
                layers={layers}
                isEmergency={isEmergency}
                normalRoute={normalRoute}
                emergencyRoute={emergencyRoute}
                blockedHazardCells={blockedHazardCells}
                focusedCoordinates={focusedCoordinates}
                onClearFocus={() => setFocusedCoordinates(null)}
              />
            </div>
            <div
              className="absolute inset-0 w-full h-full transition-opacity duration-200"
              style={{
                opacity: viewMode !== '2d-grid' ? 1 : 0,
                pointerEvents: viewMode !== '2d-grid' ? 'auto' : 'none',
                zIndex: viewMode !== '2d-grid' ? 10 : 0
              }}
            >
              <Mars3DScene
                layers={layers}
                isEmergency={isEmergency}
                normalRoute={normalRoute}
                emergencyRoute={emergencyRoute}
                blockedHazardCells={blockedHazardCells}
                mode={viewMode === '3d-surface' ? 'surface' : 'orbital'}
                isDropModeActive={isDropModeActive}
                onDropModeChange={setIsDropModeActive}
                onModeChange={(newMode) => {
                  setViewMode(newMode === 'surface' ? '3d-surface' : '3d-orbital');
                  if (newMode === 'surface') setIsDropModeActive(false);
                }}
                selectedBookmark={selectedBookmark}
                onClearSelectedBookmark={() => setSelectedBookmark(null)}
                focusedCoordinates={focusedCoordinates}
                onClearFocusedCoordinates={() => setFocusedCoordinates(null)}
                onSelectWaypoint={setFocusedCoordinates}
              />
            </div>

            {/* Bookmarks Drawer Overlay */}
            {isBookmarksOpen && viewMode !== '2d-grid' && (
              <div className="absolute top-3 left-3 z-30 animate-in fade-in slide-in-from-left-4 duration-200">
                <OrbitalBookmarks
                  onFlyTo={(bm) => {
                    setSelectedBookmark(bm);
                    setIsBookmarksOpen(false);
                    // If bookmark is clicked, update view coordinates
                    setFocusedCoordinates(bm.coordinates);
                  }}
                  onDropHereMode={() => {
                    setIsDropModeActive(true);
                    setIsBookmarksOpen(false);
                    setViewMode('3d-orbital');
                  }}
                  isDropModeActive={isDropModeActive}
                  onClose={() => setIsBookmarksOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Layer Controls (Available in both 2D grid and 3D globe modes) */}
          {(viewMode === '2d-grid' || viewMode === '3d-orbital') && (
            <LayerControls
              layers={layers}
              onToggleLayer={(layerKey) => setLayers((previous) => ({
                ...previous,
                [layerKey]: !previous[layerKey]
              }))}
            />
          )}
        </section>

        {/* Right Tactical Mission Sidebar (4 Columns on desktop) */}
        <aside className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto pr-0.5">
          <EmergencyControl
            isEmergency={isEmergency}
            isRouting={isRouting}
            error={routingError}
            onToggleEmergency={handleToggleEmergency}
          />
          <TelemetryHUD telemetry={telemetry} isEmergency={isEmergency} />
          <RouteExplanation
            activeRoute={activeRoute}
            routeCalculation={routeCalculation}
            isEmergency={isEmergency}
            onSelectWaypoint={setFocusedCoordinates}
            focusedCoordinates={focusedCoordinates}
          />
        </aside>
      </main>
    </div>
  );
};

export default App;
