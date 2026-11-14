export interface GridCell {
  row: number;
  column: number;
  longitude: number;
  latitude: number;
  elevationM: number;
  valid: boolean;
  roughness: number;
  slipRisk: number;
  blocked: boolean;
  crossSlopeDeg?: number;
  thermalRisk?: number;
}
export interface GridPosition {
  row: number;
  column: number;
}

export interface RoverState {
  batteryWh: number;
  batteryReserveWh: number;
  energyPerMeterWh: number;
}

export interface RoutingOptions {
  cellSizeM: number;
  maxAlongSlopeDeg: number;
  maxCrossSlopeDeg: number;
  maxSlipRisk: number;
}

export interface RouteResult {
  path: GridCell[];
  distanceM: number;
  energyWh: number;
  riskScore: number;
  routeScore: number;
  batteryRemainingWh: number;
  warnings: string[];
  feasible: boolean;
  reason?: string;
}

interface SearchLabel {
  id: number;
  cell: GridCell;
  cost: number;
  estimatedTotalCost: number;
  distanceM: number;
  energyWh: number;
  riskDistance: number;
  parentId?: number;
  active: boolean;
}

interface EdgeEvaluation {
  distanceM: number;
  energyWh: number;
  terrainRisk: number;
  cost: number;
}

const DEFAULT_OPTIONS: RoutingOptions = {
  cellSizeM: 5,
  maxAlongSlopeDeg: 20,
  maxCrossSlopeDeg: 15,
  maxSlipRisk: 0.8
};

const NEIGHBOR_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],             [0, 1],
  [1, -1],  [1, 0],   [1, 1]
] as const;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const cellKey = (cell: GridPosition): string => `${cell.row},${cell.column}`;

function getCell(grid: GridCell[][], position: GridPosition): GridCell | undefined {
  return grid[position.row]?.[position.column];
}

function isCellSafe(cell: GridCell | undefined, options: RoutingOptions): cell is GridCell {
  return Boolean(
    cell &&
    cell.valid &&
    !cell.blocked &&
    Number.isFinite(cell.elevationM) &&
    clamp01(cell.slipRisk) < options.maxSlipRisk &&
    Math.abs(cell.crossSlopeDeg ?? 0) <= options.maxCrossSlopeDeg
  );
}

function movementDistanceM(from: GridCell, to: GridCell, cellSizeM: number): number {
  const diagonal = from.row !== to.row && from.column !== to.column;
  return diagonal ? cellSizeM * Math.SQRT2 : cellSizeM;
}

function slopeDegrees(from: GridCell, to: GridCell, distanceM: number): number {
  return Math.atan2(Math.abs(to.elevationM - from.elevationM), distanceM) * 180 / Math.PI;
}

function octileDistanceM(from: GridPosition, to: GridPosition, cellSizeM: number): number {
  const dx = Math.abs(from.column - to.column);
  const dy = Math.abs(from.row - to.row);
  return cellSizeM * (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy));
}

function diagonalMoveIsClear(
  grid: GridCell[][],
  from: GridCell,
  to: GridCell,
  options: RoutingOptions
): boolean {
  if (from.row === to.row || from.column === to.column) return true;

  const horizontal = getCell(grid, { row: from.row, column: to.column });
  const vertical = getCell(grid, { row: to.row, column: from.column });

  // Safety-first: do not squeeze diagonally past either unsafe orthogonal cell.
  return isCellSafe(horizontal, options) && isCellSafe(vertical, options);
}

function evaluateEdge(
  from: GridCell,
  to: GridCell,
  roverState: RoverState,
  options: RoutingOptions
): EdgeEvaluation | undefined {
  const distanceM = movementDistanceM(from, to, options.cellSizeM);
  const alongSlopeDeg = slopeDegrees(from, to, distanceM);
  if (alongSlopeDeg > options.maxAlongSlopeDeg) return undefined;

  const crossSlopeDeg = Math.max(
    Math.abs(from.crossSlopeDeg ?? 0),
    Math.abs(to.crossSlopeDeg ?? 0)
  );
  if (crossSlopeDeg > options.maxCrossSlopeDeg) return undefined;

  const normalizedAlongSlope = clamp01(alongSlopeDeg / options.maxAlongSlopeDeg);
  const normalizedCrossSlope = clamp01(crossSlopeDeg / options.maxCrossSlopeDeg);
  const roughness = clamp01((from.roughness + to.roughness) / 2);
  const slipRisk = clamp01((from.slipRisk + to.slipRisk) / 2);
  const thermalRisk = clamp01(((from.thermalRisk ?? 0) + (to.thermalRisk ?? 0)) / 2);

  const terrainRisk =
    0.30 * normalizedAlongSlope +
    0.20 * normalizedCrossSlope +
    0.20 * roughness +
    0.20 * slipRisk +
    0.10 * thermalRisk;

  const energyWh = distanceM * roverState.energyPerMeterWh;
  const usableEnergyWh = Math.max(0, roverState.batteryWh - roverState.batteryReserveWh);
  const normalizedEnergy = energyWh / (energyWh + Math.max(usableEnergyWh, Number.EPSILON));
  const cost = distanceM * (1 + 3 * terrainRisk + 2 * normalizedEnergy);

  return { distanceM, energyWh, terrainRisk, cost };
}

function reconstructPath(goal: SearchLabel, labelsById: Map<number, SearchLabel>): GridCell[] {
  const path: GridCell[] = [];
  let current: SearchLabel | undefined = goal;

  while (current) {
    path.push(current.cell);
    current = current.parentId === undefined ? undefined : labelsById.get(current.parentId);
  }

  return path.reverse();
}

function infeasible(reason: string, roverState: RoverState): RouteResult {
  return {
    path: [],
    distanceM: 0,
    energyWh: 0,
    riskScore: 0,
    routeScore: 0,
    batteryRemainingWh: roverState.batteryWh,
    warnings: [reason],
    feasible: false,
    reason
  };
}

/**
 * Finds the lowest-cost feasible route through an 8-neighbor terrain grid.
 *
 * Hard safety constraints are applied before an edge is scored. Multiple
 * non-dominated labels may be retained for a cell so a low-energy alternative
 * is not discarded solely because another path has a lower terrain score.
 */
export function calculateRoute(
  grid: GridCell[][],
  start: GridPosition,
  target: GridPosition,
  roverState: RoverState,
  optionOverrides: Partial<RoutingOptions> = {}
): RouteResult {
  const options = { ...DEFAULT_OPTIONS, ...optionOverrides };

  if (grid.length === 0) return infeasible('Terrain grid is empty.', roverState);
  if (options.cellSizeM <= 0) return infeasible('Cell size must be greater than zero.', roverState);
  if (roverState.energyPerMeterWh < 0) return infeasible('Energy per metre cannot be negative.', roverState);
  if (roverState.batteryWh <= roverState.batteryReserveWh) {
    return infeasible('Battery is already at or below the required reserve.', roverState);
  }

  const startCell = getCell(grid, start);
  const targetCell = getCell(grid, target);
  if (!isCellSafe(startCell, options)) return infeasible('Start cell is unsafe or invalid.', roverState);
  if (!isCellSafe(targetCell, options)) return infeasible('Target cell is unsafe or invalid.', roverState);

  const labelsById = new Map<number, SearchLabel>();
  const labelsByCell = new Map<string, SearchLabel[]>();
  const open: SearchLabel[] = [];
  let nextLabelId = 0;

  const startLabel: SearchLabel = {
    id: nextLabelId++,
    cell: startCell,
    cost: 0,
    estimatedTotalCost: octileDistanceM(startCell, targetCell, options.cellSizeM),
    distanceM: 0,
    energyWh: 0,
    riskDistance: 0,
    active: true
  };
  labelsById.set(startLabel.id, startLabel);
  labelsByCell.set(cellKey(startCell), [startLabel]);
  open.push(startLabel);

  while (open.length > 0) {
    open.sort((a, b) => a.estimatedTotalCost - b.estimatedTotalCost || a.cost - b.cost);
    const current = open.shift();
    if (!current || !current.active) continue;

    if (current.cell.row === targetCell.row && current.cell.column === targetCell.column) {
      const batteryRemainingWh = roverState.batteryWh - current.energyWh;
      const riskScore = current.distanceM > 0 ? current.riskDistance / current.distanceM : 0;
      const warnings: string[] = [];
      if (batteryRemainingWh - roverState.batteryReserveWh < roverState.batteryReserveWh) {
        warnings.push('Route leaves less than one additional reserve margin above the required battery reserve.');
      }
      if (riskScore >= 0.6) warnings.push('Selected route has elevated aggregate terrain risk.');

      return {
        path: reconstructPath(current, labelsById),
        distanceM: current.distanceM,
        energyWh: current.energyWh,
        riskScore,
        routeScore: current.cost,
        batteryRemainingWh,
        warnings,
        feasible: true
      };
    }

    for (const [rowOffset, columnOffset] of NEIGHBOR_OFFSETS) {
      const neighbor = getCell(grid, {
        row: current.cell.row + rowOffset,
        column: current.cell.column + columnOffset
      });

      if (!isCellSafe(neighbor, options)) continue;
      if (!diagonalMoveIsClear(grid, current.cell, neighbor, options)) continue;

      const edge = evaluateEdge(current.cell, neighbor, roverState, options);
      if (!edge) continue;

      const nextEnergyWh = current.energyWh + edge.energyWh;
      if (roverState.batteryWh - nextEnergyWh < roverState.batteryReserveWh) continue;

      const nextCost = current.cost + edge.cost;
      const key = cellKey(neighbor);
      const existingLabels = labelsByCell.get(key) ?? [];
      const dominated = existingLabels.some(
        (label) => label.active && label.cost <= nextCost && label.energyWh <= nextEnergyWh
      );
      if (dominated) continue;

      for (const label of existingLabels) {
        if (label.active && nextCost <= label.cost && nextEnergyWh <= label.energyWh) {
          label.active = false;
        }
      }

      const nextLabel: SearchLabel = {
        id: nextLabelId++,
        cell: neighbor,
        cost: nextCost,
        estimatedTotalCost: nextCost + octileDistanceM(neighbor, targetCell, options.cellSizeM),
        distanceM: current.distanceM + edge.distanceM,
        energyWh: nextEnergyWh,
        riskDistance: current.riskDistance + edge.terrainRisk * edge.distanceM,
        parentId: current.id,
        active: true
      };

      labelsById.set(nextLabel.id, nextLabel);
      labelsByCell.set(key, [...existingLabels, nextLabel]);
      open.push(nextLabel);
    }
  }

  return infeasible('No safe route satisfies the terrain and battery constraints.', roverState);
}
