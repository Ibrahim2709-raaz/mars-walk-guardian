import React from 'react';
import { ShieldAlert, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';

interface EmergencyControlProps {
  isEmergency: boolean;
  isRouting: boolean;
  error?: string | null;
  onToggleEmergency: () => void | Promise<void>;
}

export const EmergencyControl: React.FC<EmergencyControlProps> = ({
  isEmergency,
  isRouting,
  error,
  onToggleEmergency
}) => {
  return (
    <div className={`rounded-xl p-3 md:p-4 border transition-all duration-300 select-none ${
      isEmergency
        ? 'tactical-panel-alert'
        : 'tactical-panel border-orange-500/25'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className={`p-2 rounded-lg ${
            isEmergency ? 'bg-red-600/30 text-red-400 emergency-flash' : 'bg-slate-900 text-orange-400'
          }`}>
            {isEmergency ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-aerospace font-bold text-sm tracking-wide text-slate-100">
                {isEmergency ? 'SIMULATED ROVER FAULT RETURN' : 'ROVER CONTINGENCY CONTROLS'}
              </h3>
              <span className="badge-simulated text-[9px]">[SIMULATED]</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {isEmergency
                ? 'Python weighted A* calculated a feasible return route to the simulated operations point.'
                : 'Inject a blocked-path fault and request a new safe return route from the Python service.'}
            </p>
            {error && <p className="text-xs text-red-400 font-mono mt-1">{error}</p>}
          </div>
        </div>

        {/* Big Action Button */}
        <button
          onClick={onToggleEmergency}
          disabled={isRouting}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-aerospace font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
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
              <span>RESET TO NOMINAL ROUTE</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-white animate-bounce" />
              <span>SIMULATE EMERGENCY</span>
              <ArrowRight className="w-3.5 h-3.5 text-red-200" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
