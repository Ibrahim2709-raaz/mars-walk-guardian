import React from 'react';
import { ShieldAlert, RotateCcw, AlertTriangle, Activity } from 'lucide-react';

interface EmergencyControlProps {
  isEmergency: boolean;
  isRouting: boolean;
  error?: string | null;
  onToggleEmergency: () => void | Promise<unknown>;
}

export const EmergencyControl: React.FC<EmergencyControlProps> = ({
  isEmergency,
  isRouting,
  error,
  onToggleEmergency
}) => {
  return (
    <div
      className={`mission-control-card rounded-xl border transition-all duration-300 select-none ${
        isEmergency
          ? 'tactical-panel-alert'
          : 'tactical-panel border-orange-500/25'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className={`p-2 rounded-lg ${
              isEmergency
                ? 'bg-red-600/30 text-red-400 emergency-flash'
                : 'bg-slate-900 text-orange-400'
            }`}
          >
            {isEmergency ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-aerospace font-semibold text-sm tracking-wide text-slate-100">
                {isEmergency
                  ? 'Emergency return active'
                  : 'Emergency route test'}
              </h3>
              <span className="badge-simulated text-[9px]">Simulated</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 mt-0.5 max-w-xl">
              {isEmergency
                ? 'A* recalculated the return around the injected hazard.'
                : 'Block part of the route and calculate a safe return.'}
            </p>
            {error && <p className="text-xs text-red-400 font-mono mt-1">{error}</p>}
          </div>
        </div>

        {/* Big Action Button */}
        <button
          onClick={onToggleEmergency}
          disabled={isRouting}
          className={`mission-control-action px-3 py-2 rounded-lg font-aerospace font-semibold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
            isEmergency
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-slate-950/60'
              : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white border border-red-400/50 shadow-red-950/60 emergency-flash'
          }`}
        >
          {isRouting ? (
            <span>CALCULATING ROUTE…</span>
          ) : isEmergency ? (
            <>
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Reset route</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 text-white animate-pulse" />
              <span>Simulate fault</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
