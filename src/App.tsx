import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MarsMap } from './components/MarsMap';
import { TelemetryHUD } from './components/TelemetryHUD';
import { LayerControls } from './components/LayerControls';
import { EmergencyControl } from './components/EmergencyControl';
import { RouteExplanation } from './components/RouteExplanation';
import {
  GALE_BASE_COORDINATES,
  BOXWORK_TARGET_COORDINATES,
  CURRENT_ROVER_COORDINATES,
  NORMAL_ROUTE,
  EMERGENCY_ROUTE,
  MOCK_TERRAIN_GRID
} from './data/marsGeoData';
import { NOMINAL_ROVER_TELEMETRY, EMERGENCY_ROVER_TELEMETRY } from './data/mockTelemetry';
import { calculateRoute } from './services/routingService';
import { LayerVisibility, LatLng, RoverTelemetry, RouteCalculationResult } from './types';

export const App: React.FC = () => {
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [layers, setLayers] = useState<LayerVisibility>({
    optical: true,
    slope: true,
    hazard: true,
    mineral: false
  });
  const [telemetry, setTelemetry] = useState<RoverTelemetry>(NOMINAL_ROVER_TELEMETRY);
  const [focusedCoordinates, setFocusedCoordinates] = useState<LatLng | null>(null);

  // Toggle Simulated Emergency Status
  const handleToggleEmergency = () => {
    setIsEmergency((prev) => {
      const nextState = !prev;
      setTelemetry(nextState ? EMERGENCY_ROVER_TELEMETRY : NOMINAL_ROVER_TELEMETRY);
      return nextState;
    });
  };

  // Toggle Map Layer
  const handleToggleLayer = (layerKey: keyof LayerVisibility) => {
    setLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  // Center on Gale Rover Base
  const handleCenterBase = () => {
    setFocusedCoordinates(GALE_BASE_COORDINATES);
  };

  // Center on Boxwork Science Target
  const handleCenterTarget = () => {
    setFocusedCoordinates(BOXWORK_TARGET_COORDINATES);
  };

  // Center on Rover Current Position
  const handleCenterRover = () => {
    setFocusedCoordinates(CURRENT_ROVER_COORDINATES);
  };

  // Center on any waypoint
  const handleSelectWaypoint = (coords: LatLng) => {
    setFocusedCoordinates(coords);
  };

  // Minor simulated rover telemetry tick to make sensor streams feel live
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const powerJitter = Math.floor((Math.random() - 0.5) * 6);
        const slipJitter = Number(((Math.random() - 0.5) * 0.2).toFixed(2));
        const speedJitter = Number(((Math.random() - 0.5) * 0.1).toFixed(2));
        return {
          ...prev,
          batteryRemainingWh: Math.max(0, Number((prev.batteryRemainingWh - 0.05).toFixed(1))),
          energyConsumptionW: Math.max(120, prev.energyConsumptionW + powerJitter),
          speedCmPerSec: Math.max(1.5, Math.min(6.0, Number((prev.speedCmPerSec + speedJitter).toFixed(1)))),
          wheelSlipRisk: {
            ...prev.wheelSlipRisk,
            percentage: Math.max(1.0, Math.min(45.0, Number((prev.wheelSlipRisk.percentage + slipJitter).toFixed(1))))
          }
        };
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const activeRoute = isEmergency ? EMERGENCY_ROUTE : NORMAL_ROUTE;

  // Execute calculateRoute(grid, start, target, roverState)
  // Prepared routing interface contract
  const routeCalculation: RouteCalculationResult = useMemo(() => {
    const startCoord: LatLng = isEmergency ? BOXWORK_TARGET_COORDINATES : GALE_BASE_COORDINATES;
    const targetCoord: LatLng = isEmergency ? GALE_BASE_COORDINATES : BOXWORK_TARGET_COORDINATES;

    return calculateRoute(MOCK_TERRAIN_GRID, startCoord, targetCoord, {
      batteryRemainingWh: telemetry.batteryRemainingWh,
      energyConsumptionW: telemetry.energyConsumptionW,
      speedCmPerSec: telemetry.speedCmPerSec,
      wheelSlipRiskPercent: telemetry.wheelSlipRisk.percentage
    });
  }, [isEmergency, telemetry.batteryRemainingWh, telemetry.energyConsumptionW, telemetry.speedCmPerSec, telemetry.wheelSlipRisk.percentage]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Top Mission Operations Header */}
      <Header
        telemetry={telemetry}
        isEmergency={isEmergency}
        onCenterBase={handleCenterBase}
        onCenterTarget={handleCenterTarget}
        onCenterRover={handleCenterRover}
      />

      {/* Main Dashboard Body */}
      <main
        className="flex-1 p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto lg:overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Left / Center Map Section (8 Columns on desktop) */}
        <section className="lg:col-span-8 flex flex-col gap-3" style={{ minHeight: '540px', height: '100%' }}>
          {/* Interactive MapLibre Mars Map */}
          <div className="relative rounded-xl overflow-hidden" style={{ flex: '1 1 0', minHeight: '480px' }}>
            <MarsMap
              layers={layers}
              isEmergency={isEmergency}
              focusedCoordinates={focusedCoordinates}
              onClearFocus={() => setFocusedCoordinates(null)}
            />
          </div>

          {/* Layer Control Toggles Docked Under Map */}
          <LayerControls layers={layers} onToggleLayer={handleToggleLayer} />
        </section>

        {/* Right Operations Sidebar (4 Columns on desktop) */}
        <aside className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto pr-0.5">
          {/* Simulated Emergency State Action Box */}
          <EmergencyControl
            isEmergency={isEmergency}
            onToggleEmergency={handleToggleEmergency}
          />

          {/* Rover Telemetry HUD (Wh, Draw, Temp, Wheel-Slip, Speed, Comms, Fault) */}
          <TelemetryHUD telemetry={telemetry} isEmergency={isEmergency} />

          {/* Route Explanation & Waypoint Profile (calculateRoute display) */}
          <RouteExplanation
            activeRoute={activeRoute}
            routeCalculation={routeCalculation}
            isEmergency={isEmergency}
            onSelectWaypoint={handleSelectWaypoint}
          />
        </aside>
      </main>
    </div>
  );
};

export default App;
