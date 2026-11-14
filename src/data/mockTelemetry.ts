import { RoverTelemetry } from '../types';

export const NOMINAL_ROVER_TELEMETRY: RoverTelemetry = {
  isSimulated: true,
  roverId: 'AER-1',
  roverName: 'Autonomous Exploration Rover (AER-1)',
  missionStatus: 'NOMINAL',
  batteryRemainingWh: 2850.0,
  batteryCapacityWh: 3200.0,
  batteryPercentage: 89.1,
  energyConsumptionW: 185.0,
  energyRateWhPerM: 1.65,
  roverTemperature: {
    internalCelsius: 14.2,
    externalCelsius: -64.0,
    status: 'optimal'
  },
  wheelSlipRisk: {
    percentage: 4.2,
    level: 'LOW',
    status: 'optimal'
  },
  communicationStatus: {
    relay: 'MRO Direct UHF Relay',
    signalStrengthPercent: 100,
    uplinkBandwidthKbps: 16.0,
    latencyMinutes: 14.2,
    status: 'connected'
  },
  speedCmPerSec: 3.8,
  missionTime: {
    sol: 424,
    localSolarTime: '14:38 LMST',
    missionElapsedHours: '184:22:15'
  },
  faultStatus: {
    hasFault: false,
    code: 'F-00',
    description: 'All subsystems nominal (0 active alerts)',
    severity: 'NONE'
  }
};

export const EMERGENCY_ROVER_TELEMETRY: RoverTelemetry = {
  isSimulated: true,
  roverId: 'AER-1',
  roverName: 'Autonomous Exploration Rover (AER-1)',
  missionStatus: 'SIMULATED_EMERGENCY',
  batteryRemainingWh: 2180.0,
  batteryCapacityWh: 3200.0,
  batteryPercentage: 68.1,
  energyConsumptionW: 340.0, // High power draw under emergency drive mode
  energyRateWhPerM: 2.37,
  roverTemperature: {
    internalCelsius: 18.6,
    externalCelsius: -64.5,
    status: 'optimal'
  },
  wheelSlipRisk: {
    percentage: 18.5,
    level: 'MEDIUM',
    status: 'warning'
  },
  communicationStatus: {
    relay: 'MRO Direct UHF Relay',
    signalStrengthPercent: 95,
    uplinkBandwidthKbps: 16.0,
    latencyMinutes: 14.2,
    status: 'connected'
  },
  speedCmPerSec: 5.0,
  missionTime: {
    sol: 424,
    localSolarTime: '14:41 LMST',
    missionElapsedHours: '184:25:30'
  },
  faultStatus: {
    hasFault: true,
    code: 'F-12',
    description: 'Simulated Contingency: Elevated wheel slip & drive actuator draw',
    severity: 'WARNING'
  }
};
