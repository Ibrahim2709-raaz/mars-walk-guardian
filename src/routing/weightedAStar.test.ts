import { describe, expect, it } from 'vitest';
import {
  calculateRoute,
  GridCell,
  GridPosition,
  RoverState
} from './weightedAStar';

const CELL_SIZE_M = 5;

function makeGrid(rows: number, columns: number): GridCell[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => ({
      row,
      column,
      longitude: 137.38 + column * 0.00001,
      latitude: -4.805 + row * 0.00001,
      elevationM: 0,
      valid: true,
      roughness: 0,
      slipRisk: 0,
      blocked: false,
      crossSlopeDeg: 0,
      thermalRisk: 0
    }))
  );
}

const roverState: RoverState = {
  batteryWh: 100,
  batteryReserveWh: 10,
  energyPerMeterWh: 0.25
};

const route = (
  grid: GridCell[][],
  start: GridPosition,
  target: GridPosition,
  state: RoverState = roverState
) => calculateRoute(grid, start, target, state, { cellSizeM: CELL_SIZE_M });

describe('calculateRoute', () => {
  it('uses diagonal movement across a flat safe grid', () => {
    const result = route(makeGrid(3, 3), { row: 0, column: 0 }, { row: 2, column: 2 });

    expect(result.feasible).toBe(true);
    expect(result.path).toHaveLength(3);
    expect(result.distanceM).toBeCloseTo(2 * CELL_SIZE_M * Math.SQRT2);
    expect(result.energyWh).toBeCloseTo(result.distanceM * 0.25);
  });

  it('routes around a blocked rock field', () => {
    const grid = makeGrid(5, 5);
    grid[2][2].blocked = true;

    const result = route(grid, { row: 0, column: 0 }, { row: 4, column: 4 });

    expect(result.feasible).toBe(true);
    expect(result.path).not.toContainEqual(grid[2][2]);
    expect(result.distanceM).toBeGreaterThan(4 * CELL_SIZE_M * Math.SQRT2);
  });

  it('rejects an excessive slope and selects a gentler detour', () => {
    const grid = makeGrid(3, 5);
    grid[1][1].elevationM = 10;
    grid[1][2].elevationM = 10;
    grid[1][3].elevationM = 10;

    const result = route(grid, { row: 1, column: 0 }, { row: 1, column: 4 });

    expect(result.feasible).toBe(true);
    expect(result.path).not.toContainEqual(grid[1][1]);
    expect(result.path.some((cell) => cell.row !== 1)).toBe(true);
  });

  it('avoids cells at the slip-risk rejection threshold', () => {
    const grid = makeGrid(3, 5);
    grid[1][2].slipRisk = 0.8;

    const result = route(grid, { row: 1, column: 0 }, { row: 1, column: 4 });

    expect(result.feasible).toBe(true);
    expect(result.path).not.toContainEqual(grid[1][2]);
  });

  it('returns infeasible when the battery reserve cannot be maintained', () => {
    const grid = makeGrid(1, 5);
    const constrainedState: RoverState = {
      batteryWh: 12,
      batteryReserveWh: 10,
      energyPerMeterWh: 0.25
    };

    const result = route(grid, { row: 0, column: 0 }, { row: 0, column: 4 }, constrainedState);

    expect(result.feasible).toBe(false);
    expect(result.reason).toMatch(/No safe route/);
  });

  it('recalculates an emergency return around a newly blocked cell', () => {
    const grid = makeGrid(5, 5);
    const base = { row: 0, column: 0 };
    const rover = { row: 4, column: 4 };
    const original = route(grid, rover, base);

    expect(original.feasible).toBe(true);
    const originalMiddle = original.path[Math.floor(original.path.length / 2)];
    originalMiddle.blocked = true;

    const emergency = route(grid, rover, base);

    expect(emergency.feasible).toBe(true);
    expect(emergency.path).not.toContainEqual(originalMiddle);
    expect(emergency.path).not.toEqual(original.path);
  });
});
