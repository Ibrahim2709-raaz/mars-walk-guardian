import { SuitTelemetry } from '../types';

export const NOMINAL_TELEMETRY: SuitTelemetry = {
  isSimulated: true,
  astronautName: 'Astronaut M. Watney (EVA-1)',
  suitId: 'ARES-IV-EMU-07',
  missionStatus: 'NOMINAL',
  oxygen: {
    percentage: 86.4,
    consumptionLitersPerMin: 0.84,
    hoursRemaining: 4.8,
    pressureKPa: 29.6,
    status: 'optimal'
  },
  battery: {
    percentage: 81.2,
    powerDrawWatts: 285,
    voltage: 28.4,
    hoursRemaining: 5.6,
    status: 'optimal'
  },
  temperature: {
    internalCelsius: 21.2,
    externalCelsius: -62.4,
    heaterDutyCyclePercent: 38,
    status: 'optimal'
  },
  daylight: {
    sol: 424,
    localSolarTime: '14:38 LMST',
    solarElevationDeg: 44.2,
    hoursDaylightRemaining: 3.3,
    isDuskApproaching: false
  },
  heartRateBpm: 76,
  radiationMicroSvPerHour: 18.2
};

export const EMERGENCY_TELEMETRY: SuitTelemetry = {
  isSimulated: true,
  astronautName: 'Astronaut M. Watney (EVA-1)',
  suitId: 'ARES-IV-EMU-07',
  missionStatus: 'EMERGENCY_RETURN',
  oxygen: {
    percentage: 64.1,
    consumptionLitersPerMin: 1.75, // Elevated under exertion
    hoursRemaining: 1.8,
    pressureKPa: 29.2,
    status: 'warning'
  },
  battery: {
    percentage: 72.8,
    powerDrawWatts: 495, // High telemetry broadcast & life support boost
    voltage: 27.6,
    hoursRemaining: 2.9,
    status: 'warning'
  },
  temperature: {
    internalCelsius: 23.8,
    externalCelsius: -63.8,
    heaterDutyCyclePercent: 62,
    status: 'optimal'
  },
  daylight: {
    sol: 424,
    localSolarTime: '14:41 LMST',
    solarElevationDeg: 43.6,
    hoursDaylightRemaining: 3.25,
    isDuskApproaching: false
  },
  heartRateBpm: 142,
  radiationMicroSvPerHour: 22.4
};
