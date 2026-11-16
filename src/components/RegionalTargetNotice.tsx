import React from 'react';
import { Crosshair, Globe2, RotateCcw } from 'lucide-react';
import { MarsBookmark } from '../data/mars3DData';

interface RegionalTargetNoticeProps {
  bookmark: MarsBookmark;
  onViewTarget: () => void;
  onReturnToGale: () => void;
}

export const RegionalTargetNotice: React.FC<RegionalTargetNoticeProps> = ({
  bookmark,
  onViewTarget,
  onReturnToGale
}) => (
  <section className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-4" aria-label="Regional visualization scope">
    <div className="flex items-start gap-3">
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-300">
        <Globe2 className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold tracking-[0.16em] text-cyan-400">REGIONAL VISUALIZATION</span>
        <h3 className="mt-1 font-aerospace text-base font-semibold text-slate-100">{bookmark.name}</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Camera and location context only. This landmark is outside the verified Gale HiRISE crop,
          so Guardian does not calculate terrain safety, energy, risk, or route feasibility here.
        </p>
        <p className="mt-2 font-mono text-[10px] text-slate-500">
          {bookmark.coordinates[0].toFixed(4)}°E · {bookmark.coordinates[1].toFixed(4)}°N
        </p>
      </div>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={onViewTarget}
        className="flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
      >
        <Crosshair className="h-4 w-4" />
        View on globe
      </button>
      <button
        type="button"
        onClick={onReturnToGale}
        className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:border-orange-500/40"
      >
        <RotateCcw className="h-4 w-4" />
        Return to Gale routing
      </button>
    </div>
  </section>
);
