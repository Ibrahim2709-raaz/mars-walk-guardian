import React from 'react';
import { Compass, Radio, Globe, Footprints, Map as MapIcon, Bookmark, Bot } from 'lucide-react';
import { RoverTelemetry } from '../types';

export type ViewMode = '3d-orbital' | '3d-surface' | '2d-grid' | '3d-rover';

interface HeaderProps {
  telemetry: RoverTelemetry;
  isEmergency: boolean;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onToggleBookmarks?: () => void;
  isBookmarksOpen?: boolean;
  onCenterBase: () => void;
  onCenterTarget: () => void;
  onCenterRover?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  isEmergency: _isEmergency,
  viewMode,
  onChangeViewMode,
  onToggleBookmarks,
  isBookmarksOpen,
  onCenterBase,
  onCenterTarget,
  onCenterRover
}) => {
  return (
    <header className="h-16 border-b border-orange-500/20 bg-slate-950/90 backdrop-blur-md px-3 lg:px-6 flex items-center justify-between z-30 relative select-none">
      {/* Brand & Robotic Mission Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center shadow-lg shadow-orange-600/30 border border-orange-400/40 shrink-0">
          <Compass className="w-6 h-6 text-white animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-aerospace text-base lg:text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2">
              MARS EXPLORER 3D
              <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-medium">
                GCS_Mars_2000
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 font-mono hidden md:block">
            ArcGIS 3D Globe &amp; Surface Walking • Gale Crater Sector • Lat 4.805°S, Long 137.38°E
          </p>
        </div>
      </div>

      {/* Center: View Mode Switcher Pills */}
      <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button
          onClick={() => onChangeViewMode('3d-orbital')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            viewMode === '3d-orbital'
              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Orbital 3D Mars Globe View"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">3D GLOBE</span>
        </button>

        <button
          onClick={() => onChangeViewMode('3d-surface')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            viewMode === '3d-surface'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="First-Person Surface Mode (1.7 m eye level)"
        >
          <Footprints className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">1ST-PERSON</span>
        </button>

        <button
          onClick={() => onChangeViewMode('2d-grid')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            viewMode === '2d-grid'
              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="2D Tactical Gale Crater Grid"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">2D TACTICAL</span>
        </button>

        <button
          onClick={() => onChangeViewMode('3d-rover')}
          aria-pressed={viewMode === '3d-rover'}
          aria-label="3D ROVER"
          title="3D Rover Traverse"
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            viewMode === '3d-rover' ? 'bg-slate-800 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">3D ROVER</span>
        </button>
      </div>

      {/* Right: Bookmarks Drawer Toggle & Quick Centers */}
      <div className="flex items-center gap-2">
        {onToggleBookmarks && viewMode !== '3d-rover' && (
          <button
            onClick={onToggleBookmarks}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
              isBookmarksOpen
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-sm shadow-orange-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
            title="Open Mars Bookmarks & Landing Sites"
          >
            <Bookmark className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden xl:inline">BOOKMARKS</span>
          </button>
        )}

        <div className="hidden 2xl:flex items-center gap-2 text-xs font-mono text-slate-400 border-l border-slate-800 pl-3">
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>MRO RELAY: {telemetry.communicationStatus.signalStrengthPercent}%</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-orange-300 font-semibold">SOL {telemetry.missionTime.sol}</span>
        </div>

        <div className={viewMode === '3d-rover' ? 'hidden' : 'hidden lg:flex items-center gap-1.5'}>
          <button
            onClick={onCenterBase}
            title="Recenter Map on Gale Rover Base — Simulated Operations Point"
            className="px-2 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-orange-300 border border-orange-500/30 transition-all cursor-pointer"
          >
            [Base]
          </button>
          <button
            onClick={onCenterTarget}
            title="Recenter Map on Science Target Candidate"
            className="px-2 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
          >
            [Target]
          </button>
          {onCenterRover && (
            <button
              onClick={onCenterRover}
              title="Recenter Map on Rover Current Station"
              className="px-2 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
            >
              [Rover]
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

