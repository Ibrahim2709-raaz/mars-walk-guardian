import { GridPosition } from '../services/routingApi';
import { LatLng } from '../types';

export const TERRAIN_CELL_SIZE_M = 1.0117467945795;
export const TERRAIN_GRID_SIZE = 201;
export const BASE_POSITION: GridPosition = { row: 32, column: 139 };
export const SCIENCE_TARGET_POSITION: GridPosition = { row: 100, column: 100 };

export const TERRAIN_BASE_COORDINATES: LatLng = [137.3801723062723, -4.804255737466637];
export const TERRAIN_TARGET_COORDINATES: LatLng = [137.37950662383716, -4.805416414533008];

// Approximate degree-per-cell steps derived from the two known anchor points.
// lng_step = (target_lng - base_lng) / (target_col - base_col)
// lat_step = (target_lat - base_lat) / (target_row - base_row)
const LNG_STEP = (TERRAIN_TARGET_COORDINATES[0] - TERRAIN_BASE_COORDINATES[0]) / (SCIENCE_TARGET_POSITION.column - BASE_POSITION.column);
const LAT_STEP = (TERRAIN_TARGET_COORDINATES[1] - TERRAIN_BASE_COORDINATES[1]) / (SCIENCE_TARGET_POSITION.row - BASE_POSITION.row);

// Origin (row 0, col 0) in geographic coordinates
const ORIGIN_LNG = TERRAIN_BASE_COORDINATES[0] - BASE_POSITION.column * LNG_STEP;
const ORIGIN_LAT = TERRAIN_BASE_COORDINATES[1] - BASE_POSITION.row * LAT_STEP;

/** Convert a grid cell position to approximate geographic coordinates. */
export function cellToLngLat(row: number, column: number): LatLng {
  return [
    ORIGIN_LNG + column * LNG_STEP,
    ORIGIN_LAT + row * LAT_STEP
  ];
}

/** Convert approximate geographic coordinates to the nearest HiRISE terrain cell. */
export function lngLatToCell(longitude: number, latitude: number): GridPosition {
  return {
    row: Math.round((latitude - ORIGIN_LAT) / LAT_STEP),
    column: Math.round((longitude - ORIGIN_LNG) / LNG_STEP)
  };
}

/** True only when a coordinate falls inside the verified 201 x 201 HiRISE crop. */
export function isInsideTerrainCrop(coordinates: LatLng): boolean {
  const { row, column } = lngLatToCell(coordinates[0], coordinates[1]);
  return row >= 0 && row < TERRAIN_GRID_SIZE && column >= 0 && column < TERRAIN_GRID_SIZE;
}

const TERRAIN_CORNERS = [
  cellToLngLat(0, 0),
  cellToLngLat(0, TERRAIN_GRID_SIZE - 1),
  cellToLngLat(TERRAIN_GRID_SIZE - 1, 0),
  cellToLngLat(TERRAIN_GRID_SIZE - 1, TERRAIN_GRID_SIZE - 1)
];

export const TERRAIN_CROP_BOUNDS = {
  minLongitude: Math.min(...TERRAIN_CORNERS.map(([longitude]) => longitude)),
  maxLongitude: Math.max(...TERRAIN_CORNERS.map(([longitude]) => longitude)),
  minLatitude: Math.min(...TERRAIN_CORNERS.map(([, latitude]) => latitude)),
  maxLatitude: Math.max(...TERRAIN_CORNERS.map(([, latitude]) => latitude))
};
