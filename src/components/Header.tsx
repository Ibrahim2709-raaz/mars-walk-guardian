import React from 'react';
import { Compass, Radio, ShieldAlert, Activity } from 'lucide-react';
import { SuitTelemetry } from '../types';

interface HeaderProps {
  telemetry: SuitTelemetry;
  isEmergency: boolean;
  onCenterBase: () => void;
  onCenterTarget: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  isEmergency,
  onCenterBase,
  onCenterTarget
}) => {
  return (
    <header className="h-16 border-b border-orange-500/20 bg-slate-950/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between z-30 relative select-none">
      {/* Brand & Mission Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center shadow-lg shadow-orange-600/30 border border-orange-400/40">
          <Compass className="w-6 h-6 text-white animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-aerospace text-lg lg:text-xl font-bold tracking-wider text-slate-100 flex items-center gap-2">
              MARS WALK GUARDIAN
              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-medium">
                GALE CRATER v1.0
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono hidden sm:block">
            Mount Sharp Sector (Aeolis Mons) • Lat 4.86°S, Long 137.40°E
          </p>
        </div>
      </div>

      {/* Center Simulated & Status Notice */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mandatory Simulation Notice Banner */}
        <div className="badge-simulated hidden md:inline-flex">
          <Activity className="w-3 h-3 text-amber-400 animate-pulse" />
          <span>SIMULATED ENVIRONMENT • GALE BASE ALPHA &amp; TELEMETRY</span>
        </div>

        {/* Mission Status Badge */}
        <div className={`px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 border ${
          isEmergency
            ? 'bg-red-500/20 text-red-400 border-red-500/60 emergency-flash'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        }`}>
          {isEmergency ? (
            <>
              <ShieldAlert className="w-4 h-4 text-red-400 animate-bounce" />
              <span>EMERGENCY EGRESS ACTIVE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>NOMINAL EVA STATUS</span>
            </>
          )}
        </div>
      </div>

      {/* Right Controls / Quick Targets */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400 border-r border-slate-800 pr-3">
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>MRO UHF LINK: 100%</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-orange-300 font-semibold">SOL {telemetry.daylight.sol}</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-300">{telemetry.daylight.localSolarTime}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onCenterBase}
            title="Recenter Map on Gale Base"
            className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 hover:bg-slate-800 text-orange-300 border border-orange-500/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>[Base]</span>
          </button>
          <button
            onClick={onCenterTarget}
            title="Recenter Map on Boxwork Science Target"
            className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>[Boxwork]</span>
          </button>
        </div>
      </div>
    </header>
  );
};
