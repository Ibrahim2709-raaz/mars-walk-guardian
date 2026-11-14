from __future__ import annotations

from dataclasses import dataclass, field
from heapq import heappop, heappush
from itertools import count
from math import atan2, degrees, hypot, isfinite, sqrt


@dataclass(slots=True)
class GridCell:
    row: int
    column: int
    longitude: float
    latitude: float
    elevation_m: float
    valid: bool
    roughness: float
    slip_risk: float
    blocked: bool
    cross_slope_deg: float = 0.0
    thermal_risk: float = 0.0


@dataclass(frozen=True, slots=True)
class GridPosition:
    row: int
    column: int


@dataclass(frozen=True, slots=True)
class RoverState:
    battery_wh: float
    battery_reserve_wh: float
    energy_per_meter_wh: float


@dataclass(frozen=True, slots=True)
class RoutingOptions:
    cell_size_m: float = 5.0
    max_along_slope_deg: float = 20.0
    max_cross_slope_deg: float = 15.0
    max_slip_risk: float = 0.8


@dataclass(slots=True)
class RouteResult:
    path: list[GridCell]
    distance_m: float
    energy_wh: float
    risk_score: float
    route_score: float
    battery_remaining_wh: float
    warnings: list[str]
    feasible: bool
    reason: str | None = None


@dataclass(slots=True)
class _SearchLabel:
    label_id: int
    cell: GridCell
    cost: float
    estimated_total_cost: float
    distance_m: float
    energy_wh: float
    risk_distance: float
    parent_id: int | None = None
    active: bool = True


@dataclass(frozen=True, slots=True)
class _EdgeEvaluation:
    distance_m: float
    energy_wh: float
    terrain_risk: float
    cost: float


_NEIGHBOR_OFFSETS = (
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1),            (0, 1),
    (1, -1),  (1, 0),   (1, 1),
)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _cell_key(cell: GridCell | GridPosition) -> tuple[int, int]:
    return cell.row, cell.column


def _get_cell(grid: list[list[GridCell]], position: GridPosition) -> GridCell | None:
    if position.row < 0 or position.column < 0 or position.row >= len(grid):
        return None
    row = grid[position.row]
    if position.column >= len(row):
        return None
    return row[position.column]


def _is_cell_safe(cell: GridCell | None, options: RoutingOptions) -> bool:
    return bool(
        cell
        and cell.valid
        and not cell.blocked
        and isfinite(cell.elevation_m)
        and _clamp01(cell.slip_risk) < options.max_slip_risk
        and abs(cell.cross_slope_deg) <= options.max_cross_slope_deg
    )


def _movement_distance_m(from_cell: GridCell, to_cell: GridCell, cell_size_m: float) -> float:
    diagonal = from_cell.row != to_cell.row and from_cell.column != to_cell.column
    return cell_size_m * sqrt(2.0) if diagonal else cell_size_m


def _slope_degrees(from_cell: GridCell, to_cell: GridCell, distance_m: float) -> float:
    return degrees(atan2(abs(to_cell.elevation_m - from_cell.elevation_m), distance_m))


def _octile_distance_m(
    from_position: GridCell | GridPosition,
    to_position: GridCell | GridPosition,
    cell_size_m: float,
) -> float:
    dx = abs(from_position.column - to_position.column)
    dy = abs(from_position.row - to_position.row)
    return cell_size_m * (max(dx, dy) + (sqrt(2.0) - 1.0) * min(dx, dy))


def _diagonal_move_is_clear(
    grid: list[list[GridCell]],
    from_cell: GridCell,
    to_cell: GridCell,
    options: RoutingOptions,
) -> bool:
    if from_cell.row == to_cell.row or from_cell.column == to_cell.column:
        return True

    horizontal = _get_cell(grid, GridPosition(from_cell.row, to_cell.column))
    vertical = _get_cell(grid, GridPosition(to_cell.row, from_cell.column))
    return _is_cell_safe(horizontal, options) and _is_cell_safe(vertical, options)


def _evaluate_edge(
    from_cell: GridCell,
    to_cell: GridCell,
    rover_state: RoverState,
    options: RoutingOptions,
) -> _EdgeEvaluation | None:
    distance_m = _movement_distance_m(from_cell, to_cell, options.cell_size_m)
    along_slope_deg = _slope_degrees(from_cell, to_cell, distance_m)
    if along_slope_deg > options.max_along_slope_deg:
        return None

    cross_slope_deg = max(abs(from_cell.cross_slope_deg), abs(to_cell.cross_slope_deg))
    if cross_slope_deg > options.max_cross_slope_deg:
        return None

    normalized_along_slope = _clamp01(along_slope_deg / options.max_along_slope_deg)
    normalized_cross_slope = _clamp01(cross_slope_deg / options.max_cross_slope_deg)
    roughness = _clamp01((from_cell.roughness + to_cell.roughness) / 2.0)
    slip_risk = _clamp01((from_cell.slip_risk + to_cell.slip_risk) / 2.0)
    thermal_risk = _clamp01((from_cell.thermal_risk + to_cell.thermal_risk) / 2.0)

    terrain_risk = (
        0.30 * normalized_along_slope
        + 0.20 * normalized_cross_slope
        + 0.20 * roughness
        + 0.20 * slip_risk
        + 0.10 * thermal_risk
    )

    energy_wh = distance_m * rover_state.energy_per_meter_wh
    usable_energy_wh = max(0.0, rover_state.battery_wh - rover_state.battery_reserve_wh)
    normalized_energy = energy_wh / (energy_wh + max(usable_energy_wh, 1e-12))
    cost = distance_m * (1.0 + 3.0 * terrain_risk + 2.0 * normalized_energy)
    return _EdgeEvaluation(distance_m, energy_wh, terrain_risk, cost)


def _reconstruct_path(
    goal: _SearchLabel,
    labels_by_id: dict[int, _SearchLabel],
) -> list[GridCell]:
    path: list[GridCell] = []
    current: _SearchLabel | None = goal
    while current is not None:
        path.append(current.cell)
        current = labels_by_id.get(current.parent_id) if current.parent_id is not None else None
    path.reverse()
    return path


def _infeasible(reason: str, rover_state: RoverState) -> RouteResult:
    return RouteResult(
        path=[],
        distance_m=0.0,
        energy_wh=0.0,
        risk_score=0.0,
        route_score=0.0,
        battery_remaining_wh=rover_state.battery_wh,
        warnings=[reason],
        feasible=False,
        reason=reason,
    )


def calculate_route(
    grid: list[list[GridCell]],
    start: GridPosition,
    target: GridPosition,
    rover_state: RoverState,
    options: RoutingOptions | None = None,
) -> RouteResult:
    """Find the lowest-cost feasible route through an 8-neighbor terrain grid."""
    options = options or RoutingOptions()

    if not grid:
        return _infeasible("Terrain grid is empty.", rover_state)
    if options.cell_size_m <= 0:
        return _infeasible("Cell size must be greater than zero.", rover_state)
    if rover_state.energy_per_meter_wh < 0:
        return _infeasible("Energy per metre cannot be negative.", rover_state)
    if rover_state.battery_wh <= rover_state.battery_reserve_wh:
        return _infeasible("Battery is already at or below the required reserve.", rover_state)

    start_cell = _get_cell(grid, start)
    target_cell = _get_cell(grid, target)
    if not _is_cell_safe(start_cell, options):
        return _infeasible("Start cell is unsafe or invalid.", rover_state)
    if not _is_cell_safe(target_cell, options):
        return _infeasible("Target cell is unsafe or invalid.", rover_state)
    assert start_cell is not None and target_cell is not None

    labels_by_id: dict[int, _SearchLabel] = {}
    labels_by_cell: dict[tuple[int, int], list[_SearchLabel]] = {}
    open_heap: list[tuple[float, float, int]] = []
    label_ids = count()

    start_label = _SearchLabel(
        label_id=next(label_ids),
        cell=start_cell,
        cost=0.0,
        estimated_total_cost=_octile_distance_m(start_cell, target_cell, options.cell_size_m),
        distance_m=0.0,
        energy_wh=0.0,
        risk_distance=0.0,
    )
    labels_by_id[start_label.label_id] = start_label
    labels_by_cell[_cell_key(start_cell)] = [start_label]
    heappush(open_heap, (start_label.estimated_total_cost, start_label.cost, start_label.label_id))

    while open_heap:
        _, _, current_id = heappop(open_heap)
        current = labels_by_id[current_id]
        if not current.active:
            continue

        if _cell_key(current.cell) == _cell_key(target_cell):
            battery_remaining_wh = rover_state.battery_wh - current.energy_wh
            risk_score = current.risk_distance / current.distance_m if current.distance_m else 0.0
            warnings: list[str] = []
            if battery_remaining_wh - rover_state.battery_reserve_wh < rover_state.battery_reserve_wh:
                warnings.append(
                    "Route leaves less than one additional reserve margin above the required battery reserve."
                )
            if risk_score >= 0.6:
                warnings.append("Selected route has elevated aggregate terrain risk.")
            return RouteResult(
                path=_reconstruct_path(current, labels_by_id),
                distance_m=current.distance_m,
                energy_wh=current.energy_wh,
                risk_score=risk_score,
                route_score=current.cost,
                battery_remaining_wh=battery_remaining_wh,
                warnings=warnings,
                feasible=True,
            )

        for row_offset, column_offset in _NEIGHBOR_OFFSETS:
            neighbor = _get_cell(
                grid,
                GridPosition(
                    current.cell.row + row_offset,
                    current.cell.column + column_offset,
                ),
            )
            if not _is_cell_safe(neighbor, options):
                continue
            assert neighbor is not None
            if not _diagonal_move_is_clear(grid, current.cell, neighbor, options):
                continue

            edge = _evaluate_edge(current.cell, neighbor, rover_state, options)
            if edge is None:
                continue

            next_energy_wh = current.energy_wh + edge.energy_wh
            if rover_state.battery_wh - next_energy_wh < rover_state.battery_reserve_wh:
                continue

            next_cost = current.cost + edge.cost
            key = _cell_key(neighbor)
            existing_labels = labels_by_cell.get(key, [])
            dominated = any(
                label.active and label.cost <= next_cost and label.energy_wh <= next_energy_wh
                for label in existing_labels
            )
            if dominated:
                continue

            for label in existing_labels:
                if label.active and next_cost <= label.cost and next_energy_wh <= label.energy_wh:
                    label.active = False

            next_label = _SearchLabel(
                label_id=next(label_ids),
                cell=neighbor,
                cost=next_cost,
                estimated_total_cost=(
                    next_cost + _octile_distance_m(neighbor, target_cell, options.cell_size_m)
                ),
                distance_m=current.distance_m + edge.distance_m,
                energy_wh=next_energy_wh,
                risk_distance=current.risk_distance + edge.terrain_risk * edge.distance_m,
                parent_id=current.label_id,
            )
            labels_by_id[next_label.label_id] = next_label
            labels_by_cell[key] = [*existing_labels, next_label]
            heappush(
                open_heap,
                (next_label.estimated_total_cost, next_label.cost, next_label.label_id),
            )

    return _infeasible(
        "No safe route satisfies the terrain and battery constraints.",
        rover_state,
    )
