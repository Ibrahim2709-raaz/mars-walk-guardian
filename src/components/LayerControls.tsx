import React from 'react';
import { Eye, Mountain, AlertOctagon, Sparkles, Layers } from 'lucide-react';
import { LayerVisibility } from '../types';

interface LayerControlsProps {
  layers: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({ layers, onToggleLayer }) => {
  return (
    <div className="layer-controls tactical-panel rounded-xl p-3 border-orange-500/20 text-xs select-none">
      <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-aerospace font-bold text-slate-200 tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-orange-400" /> TERRAIN LAYERS &amp; PROVENANCE
          </span>
          <span className="text-[10px] font-mono text-slate-400">4 ACTIVE CHANNELS</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
            NASA-DERIVED: BASEMAP
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
            SIMULATED: POLYGONS
          </span>
        </div>
      </div>

      <div className="layer-control-grid grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Optical Toggle (NASA-Derived) */}
        <button
          onClick={() => onToggleLayer('optical')}
          className={`layer-control-button flex min-w-0 items-center justify-between p-2 rounded-lg border transition-all text-left cursor-pointer ${
            layers.optical
              ? 'bg-slate-900 border-orange-500/50 text-orange-300 shadow-sm shadow-orange-500/10'
              : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Eye className={`w-3.5 h-3.5 ${layers.optical ? 'text-orange-400' : 'text-slate-600'}`} />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-aerospace font-semibold tracking-wide">OPTICAL</span>
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-blue-900/50 text-blue-300 border border-blue-600/40">
                  NASA
                </span>
              </div>
              <div className="layer-control-description text-[10px] font-mono text-slate-400">NASA/USGS Basemap</div>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              layers.optical ? 'bg-orange-500 shadow-sm shadow-orange-500' : 'bg-slate-700'
            }`}
          />
        </button>

        {/* Slope Toggle (Simulated Mock Data) */}
        <button
          onClick={() => onToggleLayer('slope')}
          className={`layer-control-button flex min-w-0 items-center justify-between p-2 rounded-lg border transition-all text-left cursor-pointer ${
            layers.slope
              ? 'bg-slate-900 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mountain className={`w-3.5 h-3.5 ${layers.slope ? 'text-emerald-400' : 'text-slate-600'}`} />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-aerospace font-semibold tracking-wide">SLOPE</span>
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-900/50 text-amber-300 border border-amber-600/40">
                  SIMULATED
                </span>
              </div>
              <div className="layer-control-description text-[10px] font-mono text-slate-400">&lt;5° to &gt;15° (Mock Data)</div>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              layers.slope ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-slate-700'
            }`}
          />
        </button>

        {/* Hazard Toggle (Simulated Mock Data) */}
        <button
          onClick={() => onToggleLayer('hazard')}
          className={`layer-control-button flex min-w-0 items-center justify-between p-2 rounded-lg border transition-all text-left cursor-pointer ${
            layers.hazard
              ? 'bg-slate-900 border-red-500/50 text-red-300 shadow-sm shadow-red-500/10'
              : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertOctagon className={`w-3.5 h-3.5 ${layers.hazard ? 'text-red-400' : 'text-slate-600'}`} />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-aerospace font-semibold tracking-wide">HAZARDS</span>
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-900/50 text-amber-300 border border-amber-600/40">
                  SIMULATED
                </span>
              </div>
              <div className="layer-control-description text-[10px] font-mono text-slate-400">Slip &amp; Clasts (Mock Data)</div>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              layers.hazard ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-slate-700'
            }`}
          />
        </button>

        {/* Mineral Toggle (Simulated Mock Data) */}
        <button
          onClick={() => onToggleLayer('mineral')}
          className={`layer-control-button flex min-w-0 items-center justify-between p-2 rounded-lg border transition-all text-left cursor-pointer ${
            layers.mineral
              ? 'bg-slate-900 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-500/10'
              : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={`w-3.5 h-3.5 ${layers.mineral ? 'text-purple-400' : 'text-slate-600'}`} />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-aerospace font-semibold tracking-wide">MINERALS</span>
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-900/50 text-amber-300 border border-amber-600/40">
                  SIMULATED
                </span>
              </div>
              <div className="layer-control-description text-[10px] font-mono text-slate-400">CRISM Mock Data</div>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              layers.mineral ? 'bg-purple-500 shadow-sm shadow-purple-500' : 'bg-slate-700'
            }`}
          />
        </button>
      </div>

      {/* Layer Provenance & Color Key Legend */}
      {(layers.slope || layers.hazard || layers.mineral) && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="text-amber-400/90 font-semibold">[SIMULATED MOCK DATA]:</span>
          {layers.slope && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Slope:</span>
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/70" /> <span>Safe (&lt;5°)</span>
              <span className="inline-block w-2 h-2 rounded-sm bg-amber-500/70" /> <span>Moderate (5-15°)</span>
              <span className="inline-block w-2 h-2 rounded-sm bg-red-600/70" /> <span>Rim (&gt;15°)</span>
            </div>
          )}
          {layers.hazard && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Hazards:</span>
              <span className="inline-block w-2 h-2 rounded-sm bg-rose-600/60 border border-rose-500" />{' '}
              <span>Sand Ripple Slip &amp; Boulder Clasts</span>
            </div>
          )}
          {layers.mineral && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Minerals:</span>
              <span className="inline-block w-2 h-2 rounded-sm bg-cyan-400/60" /> <span>Sulfates</span>
              <span className="inline-block w-2 h-2 rounded-sm bg-yellow-400/60" /> <span>Clays</span>
              <span className="inline-block w-2 h-2 rounded-sm bg-purple-500/60" /> <span>Hematite</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
