import React from 'react';
import { Compass, Radio, ShieldAlert, Cpu } from 'lucide-react';
import { RoverTelemetry } from '../types';

interface HeaderProps {
  telemetry: RoverTelemetry;
  isEmergency: boolean;
  onCenterBase: () => void;
  onCenterTarget: () => void;
  onCenterRover?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  isEmergency,
  onCenterBase,
  onCenterTarget,
  onCenterRover
}) => {
  return (
    <header className="h-16 border-b border-orange-500/20 bg-slate-950/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between z-30 relative select-none">
      {/* Brand & Robotic Mission Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center shadow-lg shadow-orange-600/30 border border-orange-400/40">
          <Compass className="w-6 h-6 text-white animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-aerospace text-lg lg:text-xl font-bold tracking-wider text-slate-100 flex items-center gap-2">
              MARS ROVER GUARDIAN
              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-medium">
                ROBOTIC OPS v1.1
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono hidden sm:block">
            Gale Crater Robotic Rover Mission Control • Mount Sharp Sector • Lat 4.84°S, Long 137.42°E
          </p>
        </div>
      </div>

      {/* Center Simulated Operations Notice */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mandatory Simulation Notice Banner */}
        <div className="badge-simulated hidden md:inline-flex items-center gap-1.5 text-xs">
          <Cpu className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>SIMULATED ENVIRONMENT • GALE ROVER BASE — SIMULATED OPERATIONS POINT</span>
        </div>

        {/* Rover Mission Status Badge */}
        <div
          className={`px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 border ${
            isEmergency
              ? 'bg-red-500/20 text-red-400 border-red-500/60 emergency-flash'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {isEmergency ? (
            <>
              <ShieldAlert className="w-4 h-4 text-red-400 animate-bounce" />
              <span>SIMULATED EMERGENCY STATE ACTIVE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>NOMINAL ROVER STATUS</span>
            </>
          )}
        </div>
      </div>

      {/* Right Telemetry / Quick Center Controls */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400 border-r border-slate-800 pr-3">
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>MRO RELAY: {telemetry.communicationStatus.signalStrengthPercent}%</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-orange-300 font-semibold">SOL {telemetry.missionTime.sol}</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-300">{telemetry.missionTime.localSolarTime}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onCenterBase}
            title="Recenter Map on Gale Rover Base — Simulated Operations Point"
            className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 hover:bg-slate-800 text-orange-300 border border-orange-500/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>[Gale Rover Base]</span>
          </button>
          <button
            onClick={onCenterTarget}
            title="Recenter Map on Mount Sharp Boxwork Target"
            className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>[Boxwork Target]</span>
          </button>
          {onCenterRover && (
            <button
              onClick={onCenterRover}
              title="Recenter Map on Rover Current Station"
              className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>[Rover]</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
