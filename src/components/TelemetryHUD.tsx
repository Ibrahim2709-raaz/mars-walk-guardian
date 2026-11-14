import React from 'react';
import { Wind, BatteryCharging, Thermometer, Sun, Heart, AlertTriangle } from 'lucide-react';
import { SuitTelemetry } from '../types';

interface TelemetryHUDProps {
  telemetry: SuitTelemetry;
  isEmergency: boolean;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ telemetry, isEmergency }) => {
  return (
    <div className={`tactical-panel rounded-xl p-3 md:p-4 transition-all duration-300 ${
      isEmergency ? 'border-red-500/50 shadow-red-950/40' : 'border-orange-500/25'
    }`}>
      {/* Top Banner with Simulation Notice */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="badge-simulated text-[10px]">
            [SIMULATED TELEMETRY]
          </span>
          <span className="font-mono text-slate-300 font-semibold truncate">
            {telemetry.suitId} ({telemetry.astronautName})
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Heart className={`w-3.5 h-3.5 ${isEmergency ? 'text-red-500 animate-ping' : 'text-emerald-400'}`} />
          <span className={isEmergency ? 'text-red-400 font-bold' : 'text-slate-300'}>
            {telemetry.heartRateBpm} BPM
          </span>
        </div>
      </div>

      {/* Primary 4 Telemetry Indicators Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. OXYGEN INDICATOR */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-cyan-400 font-semibold font-aerospace tracking-wider">
              <Wind className="w-3.5 h-3.5" /> OXYGEN (O₂)
            </span>
            <span className="font-mono text-[10px] text-slate-500">{telemetry.oxygen.pressureKPa} kPa</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className={`text-xl font-mono font-bold ${
              telemetry.oxygen.percentage < 70 ? 'text-amber-400 glow-orange' : 'text-cyan-300 glow-cyan'
            }`}>
              {telemetry.oxygen.percentage.toFixed(1)}%
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry.oxygen.hoursRemaining.toFixed(1)}h left
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                telemetry.oxygen.percentage < 70
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
              }`}
              style={{ width: `${telemetry.oxygen.percentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
            <span>Rate: {telemetry.oxygen.consumptionLitersPerMin.toFixed(2)} L/m</span>
            <span className="text-slate-500">[SIMULATED]</span>
          </div>
        </div>

        {/* 2. BATTERY INDICATOR */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold font-aerospace tracking-wider">
              <BatteryCharging className="w-3.5 h-3.5" /> SUIT POWER
            </span>
            <span className="font-mono text-[10px] text-slate-500">{telemetry.battery.voltage.toFixed(1)}V</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className={`text-xl font-mono font-bold ${
              telemetry.battery.percentage < 75 ? 'text-amber-400' : 'text-emerald-300'
            }`}>
              {telemetry.battery.percentage.toFixed(1)}%
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry.battery.hoursRemaining.toFixed(1)}h left
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                telemetry.battery.percentage < 75
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
              }`}
              style={{ width: `${telemetry.battery.percentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
            <span>Draw: {telemetry.battery.powerDrawWatts} W</span>
            <span className="text-slate-500">[SIMULATED]</span>
          </div>
        </div>

        {/* 3. TEMPERATURE INDICATOR */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-orange-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-orange-400 font-semibold font-aerospace tracking-wider">
              <Thermometer className="w-3.5 h-3.5" /> SUIT / AMBIENT
            </span>
            <span className="font-mono text-[10px] text-orange-400/80">Heat {telemetry.temperature.heaterDutyCyclePercent}%</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xl font-mono font-bold text-orange-300 glow-orange">
              {telemetry.temperature.internalCelsius.toFixed(1)}°C
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Ext: {telemetry.temperature.externalCelsius.toFixed(0)}°C
            </span>
          </div>

          {/* Dual Temp Indicator Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 flex">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
              style={{ width: '40%' }}
              title="Ambient Mars Cryo Range (-62°C)"
            />
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400"
              style={{ width: '60%' }}
              title="Suit Internal Habitable Zone (21°C)"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
            <span>Core: 70.2°F</span>
            <span className="text-slate-500">[SIMULATED]</span>
          </div>
        </div>

        {/* 4. DAYLIGHT & SOLAR INDICATOR */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-yellow-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-yellow-400 font-semibold font-aerospace tracking-wider">
              <Sun className="w-3.5 h-3.5" /> MARS DAYLIGHT
            </span>
            <span className="font-mono text-[10px] text-yellow-500 font-medium">Sol {telemetry.daylight.sol}</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xl font-mono font-bold text-yellow-300">
              {telemetry.daylight.hoursDaylightRemaining.toFixed(1)}h
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              El: {telemetry.daylight.solarElevationDeg.toFixed(1)}°
            </span>
          </div>

          {/* Daylight Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-600 via-amber-400 to-orange-500"
              style={{ width: `${Math.min(100, (telemetry.daylight.hoursDaylightRemaining / 12) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
            <span>{telemetry.daylight.localSolarTime}</span>
            <span className="text-slate-500">[SIMULATED]</span>
          </div>
        </div>
      </div>

      {isEmergency && (
        <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-red-950/70 border border-red-500/50 flex items-center justify-between text-xs text-red-300 font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="font-bold">EVA TELEMETRY WARNING:</span>
            <span>Oxygen consumption spiked (+108%). Return vector active.</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Priority 1 Egress</span>
        </div>
      )}
    </div>
  );
};
