import React, { lazy, Suspense, useEffect, useState } from 'react';
import { EmergencyControl } from './components/EmergencyControl';
import { Header, ViewMode } from './components/Header';
import { LayerControls } from './components/LayerControls';
import { MarsMap } from './components/MarsMap';
import { Mars3DScene } from './components/Mars3DScene';
import { OrbitalBookmarks } from './components/OrbitalBookmarks';
import { RegionalTargetNotice } from './components/RegionalTargetNotice';
import { RouteExplanation } from './components/RouteExplanation';
import { TelemetryHUD } from './components/TelemetryHUD';
import {
  BOXWORK_TARGET_COORDINATES,
  CURRENT_ROVER_COORDINATES,
  GALE_BASE_COORDINATES
} from './data/marsGeoData';
import { MARS_BOOKMARKS, MarsBookmark } from './data/mars3DData';
import { EMERGENCY_ROVER_TELEMETRY, NOMINAL_ROVER_TELEMETRY } from './data/mockTelemetry';
import {
  BASE_POSITION,
  isInsideTerrainCrop,
  lngLatToCell,
  SCIENCE_TARGET_POSITION,
  TERRAIN_CELL_SIZE_M
} from './data/terrainSites';
import { calculateTerrainRoute, RouteResult } from './services/routingApi';
import {
  LatLng,
  LayerVisibility,
  RouteCalculationResult,
  RouteData,
  RoverTelemetry,
  Waypoint
} from './types';

const RoverView = lazy(() => import('./components/rover/RoverView'));

class RoverModuleBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div role="alert" className="grid h-full place-items-center bg-slate-900 px-6 text-center text-sm text-slate-200">
          Unable to load the 3D Rover view. Reload to retry or select another view.
        </div>
      : this.props.children;
  }
}

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

type PanelMode = 'route' | 'telemetry';

const DEFAULT_TARGET_BOOKMARK = MARS_BOOKMARKS.find((bookmark) => bookmark.id === 'science-candidate')!;

function routeResultToRouteData(
  result: RouteResult,
  type: 'normal' | 'emergency',
  targetName = 'Sol 4621 science-target candidate'
): RouteData {
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
      ? type === 'emergency' ? 'Rover fault position' : 'Gale Rover Base — Simulated Operations Point'
      : index === selectedCells.length - 1
      ? type === 'emergency' ? 'Gale Rover Base — Simulated Operations Point' : targetName
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
    rationale: `${type === 'emergency' ? 'Fault-aware return' : 'Outbound science'} route calculated by Python weighted A*. ` +
      `Energy ${result.energy_wh.toFixed(2)} Wh; normalized risk ${result.risk_score.toFixed(2)}; ` +
      `battery remaining ${result.battery_remaining_wh.toFixed(2)} Wh.` +
      (result.warnings.length ? ` Warning: ${result.warnings.join(' ')}` : ''),
    coordinates: coordinates.length >= 2 ? coordinates : [GALE_BASE_COORDINATES, GALE_BASE_COORDINATES],
    waypoints,
    provenance: 'SYSTEM-DERIVED'
  };
}

function routeResultToCalculation(result: RouteResult): RouteCalculationResult {
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

export const App: React.FC = () => {
  const [isEmergency, setIsEmergency] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('2d-grid');
  const [panelMode, setPanelMode] = useState<PanelMode>('route');
  const [isDropModeActive, setIsDropModeActive] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [selectedBookmark, setSelectedBookmark] = useState<MarsBookmark | null>(null);
  const [activeTarget, setActiveTarget] = useState<MarsBookmark>(DEFAULT_TARGET_BOOKMARK);
  const [regionalTarget, setRegionalTarget] = useState<MarsBookmark | null>(null);
  const [activeTargetCell, setActiveTargetCell] = useState(SCIENCE_TARGET_POSITION);
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

  const viewBookmark = (bookmark: MarsBookmark) => {
    setSelectedBookmark(bookmark);
    setFocusedCoordinates(bookmark.coordinates);
    setViewMode('3d-orbital');
    setIsBookmarksOpen(false);
  };

  const returnToGaleRouting = () => {
    setActiveTarget(DEFAULT_TARGET_BOOKMARK);
    setActiveTargetCell(SCIENCE_TARGET_POSITION);
    setRegionalTarget(null);
    setSelectedBookmark(DEFAULT_TARGET_BOOKMARK);
    setFocusedCoordinates(DEFAULT_TARGET_BOOKMARK.coordinates);
    setIsEmergency(false);
    setTelemetry(NOMINAL_ROVER_TELEMETRY);
    setBlockedHazardCells(null);
    setRoutingError(null);
  };

  const selectBookmarkTarget = async (bookmark: MarsBookmark) => {
    if (bookmark.id === 'gale-base') {
      returnToGaleRouting();
      setViewMode('3d-orbital');
      setIsBookmarksOpen(false);
      return;
    }

    setActiveTarget(bookmark);
    viewBookmark(bookmark);

    if (!isInsideTerrainCrop(bookmark.coordinates)) {
      setRegionalTarget(bookmark);
      setIsEmergency(false);
      setTelemetry(NOMINAL_ROVER_TELEMETRY);
      setBlockedHazardCells(null);
      setRoutingError(null);
      return;
    }

    const targetCell = lngLatToCell(bookmark.coordinates[0], bookmark.coordinates[1]);
    setRegionalTarget(null);
    setActiveTargetCell(targetCell);
    setIsEmergency(false);
    setTelemetry(NOMINAL_ROVER_TELEMETRY);
    setBlockedHazardCells(null);
    setIsRouting(true);
    setRoutingError(null);
    try {
      const result = await calculateTerrainRoute({
        start: BASE_POSITION,
        target: targetCell,
        rover_state: {
          battery_wh: 100,
          battery_reserve_wh: 10,
          energy_per_meter_wh: 0.25
        }
      });
      if (!result.feasible) throw new Error(result.reason ?? 'No feasible route to the selected target.');
      setNormalRouteResult(result);
      setNormalRoute(routeResultToRouteData(result, 'normal', bookmark.name));
    } catch (error) {
      setRoutingError(error instanceof Error ? error.message : 'Terrain routing failed.');
    } finally {
      setIsRouting(false);
    }
  };

  const handleToggleEmergency = async () => {
    setPanelMode('route');
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
        start: activeTargetCell,
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
    <div className="app-shell">
      <Header
        telemetry={telemetry}
        isEmergency={isEmergency}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onToggleBookmarks={() => setIsBookmarksOpen((prev) => !prev)}
        isBookmarksOpen={isBookmarksOpen}
        onCenterBase={() => {
          setFocusedCoordinates(GALE_BASE_COORDINATES);
        }}
        onCenterTarget={() => {
          setFocusedCoordinates(activeTarget?.coordinates ?? BOXWORK_TARGET_COORDINATES);
        }}
        onCenterRover={() => {
          setFocusedCoordinates(CURRENT_ROVER_COORDINATES);
        }}
      />

      <main className="mission-grid">
        <section className="mission-workspace" aria-label="Mars mission map and terrain views">
          <div className="mission-viewport">
            {viewMode === '3d-rover' ? (
              <RoverModuleBoundary>
                <Suspense fallback={<div role="status" className="grid h-full place-items-center bg-slate-900 text-sm text-slate-200">Loading 3D Rover…</div>}>
                  <RoverView
                    result={activeResult}
                    isEmergency={isEmergency}
                    isRouting={isRouting}
                    routingError={routingError}
                    telemetry={telemetry}
                    onReset={() => { if (isEmergency) void handleToggleEmergency(); }}
                  />
                </Suspense>
              </RoverModuleBoundary>
            ) : viewMode === '2d-grid' ? (
              <MarsMap
                layers={layers}
                isEmergency={isEmergency}
                normalRoute={normalRoute}
                emergencyRoute={emergencyRoute}
                blockedHazardCells={blockedHazardCells}
                focusedCoordinates={focusedCoordinates}
                onClearFocus={() => setFocusedCoordinates(null)}
              />
            ) : (
              <Mars3DScene
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
              />
            )}

            {/* Bookmarks Drawer Overlay */}
            {isBookmarksOpen && (viewMode === '3d-orbital' || viewMode === '3d-surface') && (
              <div className="absolute top-3 left-3 z-30 animate-in fade-in slide-in-from-left-4 duration-200">
                <OrbitalBookmarks
                  onView={viewBookmark}
                  onSelectTarget={(bookmark) => { void selectBookmarkTarget(bookmark); }}
                  getBookmarkScope={(bookmark) => bookmark.id === 'gale-base'
                    ? 'base'
                    : isInsideTerrainCrop(bookmark.coordinates) ? 'terrain' : 'regional'}
                  activeTargetId={activeTarget.id}
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

          {/* Layer Controls (Available in 2D grid mode) */}
          {viewMode === '2d-grid' && (
            <LayerControls
              layers={layers}
              onToggleLayer={(layerKey) => setLayers((previous) => ({
                ...previous,
                [layerKey]: !previous[layerKey]
              }))}
            />
          )}
        </section>

        <aside className="mission-sidebar" aria-label="Mission decision panel">
          <div className="mission-sidebar__summary">
            <div>
              <span className="mission-eyebrow">Mission decision</span>
              <h2>{regionalTarget ? regionalTarget.name : isEmergency ? 'Contingency return' : 'Science traverse'}</h2>
            </div>
            <span className={`mission-feasibility ${routeCalculation.feasible ? 'is-feasible' : ''}`}>
              {regionalTarget ? 'View only' : isRouting ? 'Routing…' : routeCalculation.feasible ? 'Feasible' : 'Standby'}
            </span>
          </div>

          {regionalTarget ? (
            <RegionalTargetNotice
              bookmark={regionalTarget}
              onViewTarget={() => viewBookmark(regionalTarget)}
              onReturnToGale={returnToGaleRouting}
            />
          ) : (
            <>
              <EmergencyControl
                isEmergency={isEmergency}
                isRouting={isRouting}
                error={routingError}
                onToggleEmergency={handleToggleEmergency}
              />

              <div className="mission-panel-tabs" role="tablist" aria-label="Mission information">
            <button
              type="button"
              role="tab"
              aria-selected={panelMode === 'route'}
              className={panelMode === 'route' ? 'is-active' : ''}
              onClick={() => setPanelMode('route')}
            >
              Route decision
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panelMode === 'telemetry'}
              className={panelMode === 'telemetry' ? 'is-active' : ''}
              onClick={() => setPanelMode('telemetry')}
            >
              Rover telemetry
            </button>
              </div>

              <div className="mission-panel-content">
                {panelMode === 'route' ? (
                  <RouteExplanation
                    activeRoute={activeRoute}
                    routeCalculation={routeCalculation}
                    isEmergency={isEmergency}
                    onSelectWaypoint={setFocusedCoordinates}
                  />
                ) : (
                  <TelemetryHUD telemetry={telemetry} isEmergency={isEmergency} />
                )}
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
};

export default App;
