import React from 'react';
import { ShieldAlert, RotateCcw, AlertTriangle, ArrowRight, Activity } from 'lucide-react';

interface EmergencyControlProps {
  isEmergency: boolean;
  onToggleEmergency: () => void;
}

export const EmergencyControl: React.FC<EmergencyControlProps> = ({
  isEmergency,
  onToggleEmergency
}) => {
  return (
    <div
      className={`rounded-xl p-3 md:p-4 border transition-all duration-300 select-none ${
        isEmergency
          ? 'tactical-panel-alert'
          : 'tactical-panel border-orange-500/25'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
            <div className="flex items-center gap-2">
              <h3 className="font-aerospace font-bold text-sm tracking-wide text-slate-100">
                {isEmergency
                  ? 'SIMULATED EMERGENCY STATE (CONTINGENCY RETURN)'
                  : 'SIMULATED EMERGENCY STATE CONTROL'}
              </h3>
              <span className="badge-simulated text-[9px]">[SIMULATED STATE]</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 max-w-xl">
              {isEmergency
                ? 'Simulated emergency state active: Currently displaying pre-computed hard-coded contingency return vector (79.4 m egress to Gale Rover Base). Dynamic route recalculation engine will replace hard-coded paths upon routing function connection.'
                : 'Simulated emergency state: Toggles between hard-coded mock route lines (planned scientific traverse vs. contingency retreat vector) until the live route calculation engine is connected.'}
            </p>
          </div>
        </div>

        {/* Big Action Button */}
        <button
          onClick={onToggleEmergency}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-aerospace font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shrink-0 ${
            isEmergency
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-slate-950/60'
              : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white border border-red-400/50 shadow-red-950/60 emergency-flash'
          }`}
        >
          {isEmergency ? (
            <>
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>RESET TO NOMINAL ROUTE</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 text-white animate-pulse" />
              <span>SIMULATE EMERGENCY STATE</span>
              <ArrowRight className="w-3.5 h-3.5 text-red-200" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
