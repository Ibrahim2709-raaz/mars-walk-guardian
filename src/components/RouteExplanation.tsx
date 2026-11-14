import React, { useState } from 'react';
import { Navigation, Route, AlertCircle, Mountain, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { RouteData, Waypoint, LatLng } from '../types';

interface RouteExplanationProps {
  activeRoute: RouteData;
  isEmergency: boolean;
  onSelectWaypoint: (coords: LatLng) => void;
}

export const RouteExplanation: React.FC<RouteExplanationProps> = ({
  activeRoute,
  isEmergency,
  onSelectWaypoint
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

  return (
    <div className={`tactical-panel rounded-xl overflow-hidden border transition-all duration-300 text-xs ${
      isEmergency ? 'border-red-500/40' : 'border-orange-500/20'
    }`}>
      {/* Panel Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Route className={`w-4 h-4 ${isEmergency ? 'text-red-400' : 'text-cyan-400'}`} />
          <span className="font-aerospace font-bold text-slate-100 tracking-wider">
            {isEmergency ? 'EMERGENCY RETURN VECTOR EXPLANATION' : 'ROUTE ANALYSIS & TERRAIN PROFILE'}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
            isEmergency ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          }`}>
            {activeRoute.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            {activeRoute.distanceKm} km • {activeRoute.estimatedMinutes} min
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 space-y-3 max-h-80 overflow-y-auto">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Navigation className="w-3 h-3 text-cyan-400" /> DISTANCE
              </span>
              <span className="text-sm font-mono font-bold text-slate-100">
                {activeRoute.distanceKm} km
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-amber-400" /> EST. TIME
              </span>
              <span className="text-sm font-mono font-bold text-amber-300">
                {activeRoute.estimatedMinutes} min
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Mountain className="w-3 h-3 text-emerald-400" /> ELEVATION Δ
              </span>
              <span className="text-sm font-mono font-bold text-slate-100">
                {activeRoute.elevationGainMeters > 0 ? `+${activeRoute.elevationGainMeters}` : activeRoute.elevationGainMeters} m
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3 h-3 text-rose-400" /> MAX SLOPE
              </span>
              <span className="text-sm font-mono font-bold text-slate-100">
                {activeRoute.maxSlopeDeg}°
              </span>
            </div>
          </div>

          {/* Rationale & Geological Context */}
          <div className={`p-2.5 rounded-lg border text-xs font-mono leading-relaxed ${
            isEmergency
              ? 'bg-red-950/40 border-red-500/30 text-red-200'
              : 'bg-slate-900/70 border-slate-800 text-slate-300'
          }`}>
            <span className="font-bold text-orange-400 block mb-1 font-aerospace">
              {isEmergency ? 'PRIORITY EGRESS RATIONALE:' : 'STRATEGIC TRAVERSE RATIONALE:'}
            </span>
            <p>{activeRoute.rationale}</p>
          </div>

          {/* Waypoints Sequence List */}
          <div>
            <div className="text-[11px] font-aerospace font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>WAYPOINT TRAVERSE SEQUENCE ({activeRoute.waypoints.length} STATIONS)</span>
              <span className="text-[10px] font-mono text-slate-500">Click waypoint to locate</span>
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
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        index === 0
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                          : index === activeRoute.waypoints.length - 1
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>{wp.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            wp.hazardLevel === 'HIGH'
                              ? 'bg-red-500/20 text-red-400'
                              : wp.hazardLevel === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
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
