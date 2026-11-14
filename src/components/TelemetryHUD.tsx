import React from 'react';
import {
  BatteryCharging,
  Zap,
  Thermometer,
  Disc3,
  Radio,
  Gauge,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { RoverTelemetry } from '../types';

interface TelemetryHUDProps {
  telemetry: RoverTelemetry;
  isEmergency: boolean;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ telemetry, isEmergency }) => {
  return (
    <div
      className={`tactical-panel rounded-xl p-3 md:p-4 transition-all duration-300 ${
        isEmergency ? 'border-red-500/50 shadow-red-950/40' : 'border-orange-500/25'
      }`}
    >
      {/* Top Banner with Provenance & Rover Identity */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="badge-simulated text-[10px]">
            [SIMULATED ROVER TELEMETRY]
          </span>
          <span className="font-mono text-slate-300 font-semibold truncate">
            {telemetry.roverId} • {telemetry.roverName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>{telemetry.communicationStatus.relay}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{telemetry.communicationStatus.latencyMinutes}m latency</span>
        </div>
      </div>

      {/* Primary 4 Rover Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. BATTERY REMAINING IN WH */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold font-aerospace tracking-wider">
              <BatteryCharging className="w-3.5 h-3.5" /> BATTERY REMAINING
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {telemetry.batteryCapacityWh} Wh Cap
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span
              className={`text-xl font-mono font-bold ${
                telemetry.batteryRemainingWh < 30 ? 'text-amber-400 glow-orange' : 'text-emerald-300'
              }`}
            >
              {telemetry.batteryRemainingWh.toFixed(0)} Wh
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry.batteryPercentage.toFixed(1)}%
            </span>
          </div>

          {/* Battery Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                telemetry.batteryPercentage < 70
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, telemetry.batteryPercentage)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
            <span>Nominal reserve</span>
            <span className="text-slate-500">[SIMULATED]</span>
          </div>
        </div>

        {/* 2. ENERGY CONSUMPTION (WATTS & WH/M) */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-cyan-400 font-semibold font-aerospace tracking-wider">
              <Zap className="w-3.5 h-3.5" /> ENERGY CONSUMPTION
            </span>
            <span className="font-mono text-[10px] text-cyan-400/80">
              {telemetry.energyRateWhPerM.toFixed(2)} Wh/m
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span
              className={`text-xl font-mono font-bold ${
                telemetry.energyConsumptionW > 55 ? 'text-amber-400 glow-orange' : 'text-cyan-300 glow-cyan'
              }`}
            >
              {telemetry.energyConsumptionW.toFixed(0)} W
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry.energyConsumptionW > 55 ? 'HIGH DRAW' : 'NOMINAL'}
            </span>
          </div>

          {/* Consumption Level Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                telemetry.energyConsumptionW > 55
                  ? 'bg-gradient-to-r from-amber-600 to-rose-500'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
              }`}
              style={{ width: `${Math.min(100, (telemetry.energyConsumptionW / 75) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
            <span>6 Drive Actuators</span>
            <span className="text-slate-500">[SIMULATED]</span>
          </div>
        </div>

        {/* 3. ROVER TEMPERATURE */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-orange-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-orange-400 font-semibold font-aerospace tracking-wider">
              <Thermometer className="w-3.5 h-3.5" /> ROVER TEMPERATURE
            </span>
            <span className="font-mono text-[10px] text-slate-500">Avionics Box</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xl font-mono font-bold text-orange-300 glow-orange">
              +{telemetry.roverTemperature.internalCelsius.toFixed(1)}°C
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Ext: {telemetry.roverTemperature.externalCelsius.toFixed(0)}°C
            </span>
          </div>

          {/* Thermal Balance Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 flex">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-500"
              style={{ width: '45%' }}
              title="Ambient Cryogenic Surface (-64°C)"
            />
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400"
              style={{ width: '55%' }}
              title="Warm Electronics Box (+14°C)"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
            <span>RHU Thermal Loop</span>
            <span className="text-slate-500">[SIMULATED]</span>
          </div>
        </div>

        {/* 4. WHEEL-SLIP RISK */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 hover:border-yellow-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-yellow-400 font-semibold font-aerospace tracking-wider">
              <Disc3 className="w-3.5 h-3.5" /> WHEEL-SLIP RISK
            </span>
            <span
              className={`font-mono text-[10px] font-bold ${
                telemetry.wheelSlipRisk.level === 'HIGH'
                  ? 'text-red-400'
                  : telemetry.wheelSlipRisk.level === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {telemetry.wheelSlipRisk.level}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span
              className={`text-xl font-mono font-bold ${
                telemetry.wheelSlipRisk.percentage > 15 ? 'text-amber-400' : 'text-yellow-300'
              }`}
            >
              {telemetry.wheelSlipRisk.percentage.toFixed(1)}%
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Slip Est.
            </span>
          </div>

          {/* Slip Risk Gauge Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                telemetry.wheelSlipRisk.percentage > 15
                  ? 'bg-gradient-to-r from-yellow-500 to-rose-500'
                  : 'bg-gradient-to-r from-emerald-500 to-yellow-400'
              }`}
              style={{ width: `${Math.min(100, telemetry.wheelSlipRisk.percentage * 3.3)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
            <span>Visual Odometry</span>
            <span className="text-slate-500">[SIMULATED]</span>
          </div>
        </div>
      </div>

      {/* Secondary Rover Telemetry Strip: Speed, Mission Time, Fault Status */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
        {/* Speed */}
        <div className="bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" /> ROVER SPEED:
          </span>
          <span className="font-bold text-slate-200">
            {telemetry.speedCmPerSec.toFixed(1)} cm/s ({(telemetry.speedCmPerSec * 0.036).toFixed(2)} km/h)
          </span>
        </div>

        {/* Mission Time */}
        <div className="bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> MISSION TIME:
          </span>
          <span className="font-bold text-amber-300">
            Sol {telemetry.missionTime.sol} • {telemetry.missionTime.localSolarTime}
          </span>
        </div>

        {/* Fault Status */}
        <div
          className={`px-2.5 py-1.5 rounded border flex items-center justify-between ${
            telemetry.faultStatus.hasFault
              ? 'bg-red-950/40 border-red-500/50 text-red-300'
              : 'bg-slate-950/60 border-slate-800 text-slate-300'
          }`}
        >
          <span className="text-slate-400 flex items-center gap-1.5">
            {telemetry.faultStatus.hasFault ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            FAULT STATUS:
          </span>
          <span
            className={`font-bold ${
              telemetry.faultStatus.hasFault ? 'text-red-400 font-semibold truncate' : 'text-emerald-400'
            }`}
          >
            {telemetry.faultStatus.code}: {telemetry.faultStatus.severity === 'NONE' ? 'NOMINAL (0 FAULTS)' : 'SIMULATED FAULT'}
          </span>
        </div>
      </div>

      {/* Emergency Active Alert */}
      {isEmergency && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-red-950/70 border border-red-500/50 flex items-center justify-between text-xs text-red-300 font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="font-bold">SIMULATED CONTINGENCY STATE:</span>
            <span>Blocked-path fault injected. Live Python return route active.</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Priority Recovery</span>
        </div>
      )}
    </div>
  );
};
