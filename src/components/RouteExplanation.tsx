import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Route,
  MapPin,
  ChevronDown,
  ChevronUp,
  Zap,
  Battery,
  ShieldCheck,
  AlertTriangle,
  FileCode2
} from 'lucide-react';
import { RouteData, Waypoint, LatLng, RouteCalculationResult } from '../types';

interface RouteExplanationProps {
  activeRoute: RouteData;
  routeCalculation: RouteCalculationResult;
  isEmergency: boolean;
  onSelectWaypoint: (coords: LatLng) => void;
  focusedCoordinates?: LatLng | null;
}

export const RouteExplanation: React.FC<RouteExplanationProps> = ({
  activeRoute,
  routeCalculation,
  isEmergency,
  onSelectWaypoint,
  focusedCoordinates
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusedCoordinates || !activeRoute?.waypoints) return;
    const match = activeRoute.waypoints.find(
      (wp) =>
        wp?.coordinates &&
        Math.abs(wp.coordinates[0] - focusedCoordinates[0]) < 0.0001 &&
        Math.abs(wp.coordinates[1] - focusedCoordinates[1]) < 0.0001
    );
    if (match) setSelectedWaypointId(match.id);
  }, [focusedCoordinates, activeRoute]);

  return (
    <div
      className={`tactical-panel rounded-xl overflow-hidden border transition-all duration-300 text-xs ${
        isEmergency ? 'border-red-500/40' : 'border-orange-500/20'
      }`}
    >
      {/* Panel Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Route className={`w-4 h-4 ${isEmergency ? 'text-red-400' : 'text-cyan-400'}`} />
          <span className="font-aerospace font-bold text-slate-100 tracking-wider">
            {isEmergency
              ? 'CONTINGENCY RECOVERY PROFILE'
              : 'ROBOTIC ROVER TRAVERSE PROFILE'}
          </span>
          <span className="badge-system text-[9px]">[SYSTEM-DERIVED]</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              routeCalculation.feasible
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {routeCalculation.feasible ? 'TRAVERSE FEASIBLE' : 'TRAVERSE UNFEASIBLE'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            {routeCalculation.distanceM >= 1000
              ? `${(routeCalculation.distanceM / 1000).toFixed(1)} km`
              : `${routeCalculation.distanceM} m`}{' '}
            •{' '}
            {routeCalculation.energyWh >= 1000
              ? `${(routeCalculation.energyWh / 1000).toFixed(2)} kWh`
              : `${routeCalculation.energyWh} Wh`}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 space-y-3 max-h-96 overflow-y-auto">
          {/* Output Cards from calculateRoute(...) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* distanceM */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Navigation className="w-3 h-3 text-cyan-400" /> DISTANCE
              </span>
              <span className="text-sm font-mono font-bold text-slate-100">
                {routeCalculation.distanceM >= 1000
                  ? `${(routeCalculation.distanceM / 1000).toFixed(1)} km`
                  : `${routeCalculation.distanceM} m`}
              </span>
              <span className="text-[9px] font-mono text-slate-500 block">
                {routeCalculation.distanceM >= 1000 ? 'Planetary traverse' : 'Gale micro-terrain'}
              </span>
            </div>

            {/* energyWh */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Zap className="w-3 h-3 text-amber-400" /> ENERGY DRAW
              </span>
              <span className="text-sm font-mono font-bold text-amber-300">
                {routeCalculation.energyWh >= 1000
                  ? `${(routeCalculation.energyWh / 1000).toFixed(2)} kWh`
                  : `${routeCalculation.energyWh} Wh`}
              </span>
              <span className="text-[9px] font-mono text-slate-500 block">
                Total traverse energy
              </span>
            </div>

            {/* riskScore */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> RISK SCORE
              </span>
              <span className="text-sm font-mono font-bold text-emerald-300">
                {routeCalculation.riskScore.toFixed(2)}{' '}
                <span className="text-[10px] font-normal text-slate-400">
                  ({(routeCalculation.riskScore * 100).toFixed(0)}%)
                </span>
              </span>
              <span className="text-[9px] font-mono text-slate-500 block">
                Terrain difficulty index
              </span>
            </div>

            {/* batteryRemainingWh */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Battery className="w-3 h-3 text-cyan-400" /> POST-TRAVERSE
              </span>
              <span className="text-sm font-mono font-bold text-cyan-300">
                {routeCalculation.batteryRemainingWh.toFixed(0)} Wh
              </span>
              <span className="text-[9px] font-mono text-slate-500 block">
                Battery remaining
              </span>
            </div>
          </div>

          {/* Warnings Display from calculateRoute(...) */}
          {routeCalculation.warnings && routeCalculation.warnings.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-aerospace font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> ROUTE ENGINE WARNINGS (calculateRoute)
              </div>
              <div className="space-y-1">
                {routeCalculation.warnings.map((warn, i) => (
                  <div
                    key={i}
                    className="p-1.5 rounded bg-amber-950/30 border border-amber-500/30 text-[11px] font-mono text-amber-200 flex items-start gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interface signature & backend connection notice */}
          <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-start gap-2">
            <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              {activeRoute.id.startsWith('planetary-') || activeRoute.id.startsWith('emergency-recovery-') ? (
                <>
                  <span className="text-cyan-300 font-semibold">PLANETARY GEODESIC ROUTING ENGINE: </span>
                  <code className="text-slate-300">GCS_Mars_2000 (Great Circle)</code>
                  <p className="text-slate-400 mt-0.5">
                    Evaluates spherical geodesic traverse distance, Mars curvature, MMRTG/solar Sol recharge budgets, and topography.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-cyan-300 font-semibold">LIVE ROUTING ENGINE: </span>
                  <code className="text-slate-300">POST /terrain/route</code>
                  <p className="text-slate-400 mt-0.5">
                    Python weighted A* evaluates the cached 201 × 201 HiRISE terrain crop, simulated slip risk, and the approved battery reserve model.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Traverse Rationale */}
          <div
            className={`p-2.5 rounded-lg border text-xs font-mono leading-relaxed ${
              isEmergency
                ? 'bg-red-950/40 border-red-500/30 text-red-200'
                : 'bg-slate-900/70 border-slate-800 text-slate-300'
            }`}
          >
            <span className="font-bold text-orange-400 block mb-1 font-aerospace">
              {isEmergency
                ? 'PRIORITY CONTINGENCY EGRESS RATIONALE:'
                : 'STRATEGIC ROVER TRAVERSE RATIONALE:'}
            </span>
            <p>{activeRoute.rationale}</p>
          </div>

          {/* Waypoint Traverse Sequence */}
          <div>
            <div className="text-[11px] font-aerospace font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>
                ROBOTIC TRAVERSE STATIONS ({activeRoute.waypoints.length} STATIONS •{' '}
                {routeCalculation.distanceM >= 1000
                  ? `${(routeCalculation.distanceM / 1000).toFixed(1)} km`
                  : `${routeCalculation.distanceM} m`}
                )
              </span>
              <span className="text-[10px] font-mono text-slate-500">Click station to locate</span>
            </div>

            <div className="space-y-1.5">
              {activeRoute.waypoints.map((wp: Waypoint, index: number) => {
                const isSelected = selectedWaypointId === wp.id;
                return (
                  <div
                    key={wp.id}
                    onClick={() => {
                      setSelectedWaypointId(wp.id);
                      onSelectWaypoint(wp.coordinates);
                    }}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-2 text-xs font-mono ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-400 shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          index === 0
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                            : index === activeRoute.waypoints.length - 1
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>{wp.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              wp.hazardLevel === 'HIGH'
                                ? 'bg-red-500/20 text-red-400'
                                : wp.hazardLevel === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {wp.hazardLevel}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {wp.terrainType} • Slope: {wp.slopeGradeDeg}° • Elev: {wp.elevationMeters}m
                        </div>
                        {isSelected && (
                          <div className="text-[10px] text-cyan-300/90 mt-1 border-t border-slate-700 pt-1">
                            {wp.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      title="Focus on map"
                      className="text-slate-500 hover:text-cyan-400 shrink-0 p-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
