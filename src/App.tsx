import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MarsMap } from './components/MarsMap';
import { TelemetryHUD } from './components/TelemetryHUD';
import { LayerControls } from './components/LayerControls';
import { EmergencyControl } from './components/EmergencyControl';
import { RouteExplanation } from './components/RouteExplanation';
import {
  GALE_BASE_COORDINATES,
  BOXWORK_TARGET_COORDINATES,
  NORMAL_ROUTE,
  EMERGENCY_ROUTE
} from './data/marsGeoData';
import { NOMINAL_TELEMETRY, EMERGENCY_TELEMETRY } from './data/mockTelemetry';
import { LayerVisibility, LatLng, SuitTelemetry } from './types';

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

  // Toggle Emergency Status
  const handleToggleEmergency = () => {
    setIsEmergency((prev) => {
      const nextState = !prev;
      setTelemetry(nextState ? EMERGENCY_TELEMETRY : NOMINAL_TELEMETRY);
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

  const activeRoute = isEmergency ? EMERGENCY_ROUTE : NORMAL_ROUTE;

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
      <main className="flex-1 p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto lg:overflow-hidden" style={{ minHeight: 0 }}>
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
