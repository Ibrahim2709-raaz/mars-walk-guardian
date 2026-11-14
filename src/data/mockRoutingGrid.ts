import { GridPosition, RoutingGridCell } from '../services/routingApi';
import { LatLng } from '../types';

export const MOCK_GRID_SIZE = 20;
export const MOCK_CELL_SIZE_M = 5;
export const BASE_POSITION: GridPosition = { row: 2, column: 2 };
export const SCIENCE_TARGET_POSITION: GridPosition = { row: 14, column: 14 };

const GRID_ORIGIN_LONGITUDE = 137.3786;
const GRID_ORIGIN_LATITUDE = -4.8064;
const MARS_DEGREES_PER_METER = 1 / 59274;

export function gridPositionToCoordinates(position: GridPosition): LatLng {
  return [
    GRID_ORIGIN_LONGITUDE + position.column * MOCK_CELL_SIZE_M * MARS_DEGREES_PER_METER,
    GRID_ORIGIN_LATITUDE + position.row * MOCK_CELL_SIZE_M * MARS_DEGREES_PER_METER
  ];
}

export function buildMockRoutingGrid(): RoutingGridCell[][] {
  return Array.from({ length: MOCK_GRID_SIZE }, (_, row) =>
    Array.from({ length: MOCK_GRID_SIZE }, (_, column) => {
      const [longitude, latitude] = gridPositionToCoordinates({ row, column });
      const hillDistanceSquared = (row - 9) ** 2 + (column - 9) ** 2;
      const hillElevation = 3.5 * Math.exp(-hillDistanceSquared / 18);
      const blocked = column === 9 && row >= 4 && row <= 14 && row !== 10;
      const highSlipZone = row >= 8 && row <= 11 && column >= 12 && column <= 15;
      const roughZone = row >= 4 && row <= 7 && column >= 5 && column <= 8;

      return {
        row,
        column,
        longitude,
        latitude,
        elevation_m: -4100 + row * 0.12 + column * 0.05 + hillElevation,
        valid: true,
        roughness: roughZone ? 0.65 : 0.12,
        slip_risk: highSlipZone ? 0.82 : 0.08,
        blocked,
        cross_slope_deg: roughZone ? 8 : 2,
        thermal_risk: 0.1
      };
    })
  );
}

export const MOCK_BASE_COORDINATES = gridPositionToCoordinates(BASE_POSITION);
export const MOCK_TARGET_COORDINATES = gridPositionToCoordinates(SCIENCE_TARGET_POSITION);
