import React from 'react';
import { Compass, Footprints, Mountain, Navigation, Eye, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, X } from 'lucide-react';

export interface FirstPersonTelemetry {
  latitude: number;
  longitude: number;
  elevationM: number;
  headingDeg: number;
  eyeHeightM: number;
  isSprinting: boolean;
  isMoving: boolean;
  nearestLandmark: {
    name: string;
    distanceM: number;
  };
}

interface FirstPersonHUDProps {
  telemetry: FirstPersonTelemetry;
  onExit: () => void;
  onVirtualMove?: (direction: 'forward' | 'backward' | 'left' | 'right' | 'stop') => void;
  isPointerLocked?: boolean;
  onTogglePointerLock?: () => void;
}

export const FirstPersonHUD: React.FC<FirstPersonHUDProps> = ({
  telemetry,
  onExit,
  onVirtualMove,
  isPointerLocked = false,
  onTogglePointerLock
}) => {
  const formatCoord = (deg: number, posLabel: string, negLabel: string) => {
    const dir = deg >= 0 ? posLabel : negLabel;
    return `${Math.abs(deg).toFixed(5)}° ${dir}`;
  };

  const formatDistance = (m: number) => {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${m} m`;
  };

  // Convert heading to compass cardinal (N, NE, E, SE, S, SW, W, NW)
  const getCardinal = (heading: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return directions[index];
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden flex flex-col justify-between p-3 md:p-6">
      {/* Top Bar: Crosshairs + Mission Breadcrumb */}
      <div className="flex items-start justify-between">
        {/* Left: Mode Badge & Quick Exit */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-950/90 border border-orange-500/40 rounded-lg px-3 py-1.5 shadow-xl backdrop-blur flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="font-aerospace font-bold text-xs tracking-wider text-emerald-300">
              FIRST-PERSON SURFACE MODE (1.7m AGL)
            </span>
          </div>

          {onTogglePointerLock && (
            <button
              onClick={onTogglePointerLock}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-lg backdrop-blur border ${
                isPointerLocked
                  ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400 shadow-cyan-500/20'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500/40'
              }`}
              title="Lock mouse cursor to look around freely in 360 degrees (Esc to release)"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">
                {isPointerLocked ? 'MOUSE LOOK: ACTIVE (ESC)' : 'ENGAGE MOUSE LOOK'}
              </span>
              <span className="sm:hidden">
                {isPointerLocked ? 'LOOK: ON' : 'LOOK: OFF'}
              </span>
            </button>
          )}

          <button
            onClick={onExit}
            className="bg-slate-900/90 hover:bg-red-950/80 border border-slate-700 hover:border-red-500/60 text-slate-300 hover:text-red-200 rounded-lg px-3 py-1.5 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-lg backdrop-blur"
            title="Return to Orbital 3D Globe View (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EXIT SURFACE (ESC)</span>
            <span className="sm:hidden">EXIT</span>
          </button>
        </div>

        {/* Center: Compass Heading Ribbon */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1 font-mono text-xs text-slate-300 shadow-xl backdrop-blur hidden md:flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>HEADING:</span>
          <span className="text-cyan-300 font-bold">
            {Math.round(telemetry.headingDeg)}° {getCardinal(telemetry.headingDeg)}
          </span>
        </div>

        {/* Right: Key Controls Help Badge */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 font-mono text-[10px] text-slate-400 shadow-xl backdrop-blur hidden lg:block">
          <div className="text-slate-200 font-bold mb-1 flex items-center gap-1">
            <Footprints className="w-3 h-3 text-orange-400" /> SURFACE CONTROLS
          </div>
          <div><span className="text-cyan-300">W / A / S / D</span> : Walk</div>
          <div><span className="text-cyan-300">Shift</span> : Sprint (3× Speed)</div>
          <div><span className="text-cyan-300">Mouse Drag / Click</span> : Look Around</div>
          <div><span className="text-cyan-300">Q / E</span> : Eye Height ({telemetry.eyeHeightM.toFixed(1)}m)</div>
          <div><span className="text-cyan-300">Esc</span> : Orbit Globe</div>
        </div>
      </div>

      {/* Center Screen Tactical Reticle / Horizon Mark */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 ${isPointerLocked ? 'opacity-80' : 'opacity-40'}`}>
        <div className="relative w-12 h-12">
          <div className="absolute top-1/2 left-0 w-3 h-[1.5px] bg-cyan-400 -translate-y-1/2" />
          <div className="absolute top-1/2 right-0 w-3 h-[1.5px] bg-cyan-400 -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 h-3 w-[1.5px] bg-cyan-400 -translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 h-3 w-[1.5px] bg-cyan-400 -translate-x-1/2" />
          <div className="absolute inset-2.5 rounded-full border border-cyan-400/60" />
          {isPointerLocked && <div className="absolute inset-[21px] rounded-full bg-cyan-300 animate-pulse" />}
        </div>
        {!isPointerLocked && (
          <span className="mt-2 text-[10px] font-mono text-cyan-300/80 bg-slate-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
            Click to engage 360° mouse look (or drag)
          </span>
        )}
      </div>

      {/* Bottom Bar: Telemetry Readings + Mobile Touch Controls */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3">
        {/* Left: Tactical Surface HUD Cards */}
        <div className="bg-slate-950/95 border border-orange-500/30 rounded-xl p-3 shadow-2xl backdrop-blur max-w-md w-full font-mono text-xs">
          <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[9px]">LATITUDE</span>
              <span className="font-bold text-slate-200">
                {formatCoord(telemetry.latitude, 'N', 'S')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">LONGITUDE</span>
              <span className="font-bold text-slate-200">
                {formatCoord(telemetry.longitude, 'E', 'W')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] flex items-center gap-1">
                <Mountain className="w-2.5 h-2.5 text-amber-400" /> SURFACE ELEVATION
              </span>
              <span className="font-bold text-amber-300">
                {telemetry.elevationM >= 0 ? '+' : ''}{Math.round(telemetry.elevationM)} m (Datum)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] flex items-center gap-1">
                <Eye className="w-2.5 h-2.5 text-cyan-400" /> CAMERA EYE HEIGHT
              </span>
              <span className="font-bold text-cyan-300">
                {telemetry.eyeHeightM.toFixed(1)} m AGL
              </span>
            </div>
          </div>

          {/* Nearest Landmark & Motion State */}
          <div className="pt-2 flex items-center justify-between text-[11px]">
            <div className="truncate pr-2">
              <span className="text-slate-500 text-[9px] block flex items-center gap-1">
                <Navigation className="w-2.5 h-2.5 text-orange-400" /> NEAREST LANDMARK
              </span>
              <span className="text-orange-300 font-bold truncate">
                {telemetry.nearestLandmark.name}
              </span>
              <span className="text-slate-400 text-[10px] ml-1">
                ({formatDistance(telemetry.nearestLandmark.distanceM)})
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-slate-500 text-[9px] block">LOCOMOTION</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  telemetry.isSprinting
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                    : telemetry.isMoving
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {telemetry.isSprinting ? 'SPRINTING 3×' : telemetry.isMoving ? 'WALKING' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Touch Directional D-Pad for Mobile / Mouse click */}
        {onVirtualMove && (
          <div className="pointer-events-auto sm:hidden flex flex-col items-center gap-1 bg-slate-950/80 border border-slate-800 p-2 rounded-xl backdrop-blur">
            <button
              onTouchStart={() => onVirtualMove('forward')}
              onTouchEnd={() => onVirtualMove('stop')}
              onMouseDown={() => onVirtualMove('forward')}
              onMouseUp={() => onVirtualMove('stop')}
              className="w-10 h-10 rounded bg-slate-900 active:bg-orange-600 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer shadow"
              aria-label="Walk Forward"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div className="flex gap-1">
              <button
                onTouchStart={() => onVirtualMove('left')}
                onTouchEnd={() => onVirtualMove('stop')}
                onMouseDown={() => onVirtualMove('left')}
                onMouseUp={() => onVirtualMove('stop')}
                className="w-10 h-10 rounded bg-slate-900 active:bg-orange-600 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer shadow"
                aria-label="Strafe Left"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onTouchStart={() => onVirtualMove('backward')}
                onTouchEnd={() => onVirtualMove('stop')}
                onMouseDown={() => onVirtualMove('backward')}
                onMouseUp={() => onVirtualMove('stop')}
                className="w-10 h-10 rounded bg-slate-900 active:bg-orange-600 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer shadow"
                aria-label="Walk Backward"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onTouchStart={() => onVirtualMove('right')}
                onTouchEnd={() => onVirtualMove('stop')}
                onMouseDown={() => onVirtualMove('right')}
                onMouseUp={() => onVirtualMove('stop')}
                className="w-10 h-10 rounded bg-slate-900 active:bg-orange-600 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer shadow"
                aria-label="Strafe Right"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
