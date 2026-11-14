from __future__ import annotations

import csv
import json
from dataclasses import dataclass, replace
from functools import lru_cache
from math import atan, degrees, hypot
from pathlib import Path
from typing import Any

from .routing import GridCell, GridPosition


DATA_DIRECTORY = Path(__file__).resolve().parents[1] / "data"
GRID_PATH = DATA_DIRECTORY / "terrain_grid.csv"
METADATA_PATH = DATA_DIRECTORY / "terrain_metadata.json"

# Project assumption: the measured 5x5 elevation standard deviation is
# normalized to a 0-1 routing penalty using 0.5 m as the saturation point.
ROUGHNESS_SATURATION_M = 0.5


@dataclass(frozen=True, slots=True)
class TerrainDataset:
    grid: list[list[GridCell]]
    metadata: dict[str, Any]
    base: GridPosition
    target: GridPosition
    cell_size_m: float


def _as_bool(value: str) -> bool:
    return value.strip().lower() == "true"


def _derive_local_slope_proxy(grid: list[list[GridCell]], cell_size_m: float) -> None:
    """Populate a conservative local-slope proxy from central elevation differences.

    This is the magnitude of the local surface gradient, not direction-specific
    cross-slope. It conservatively limits cells whose total local slope exceeds
    the cross-slope threshold until slope/aspect fields are supplied.
    """
    height = len(grid)
    width = len(grid[0]) if height else 0
    for row in range(1, height - 1):
        for column in range(1, width - 1):
            cell = grid[row][column]
            west = grid[row][column - 1]
            east = grid[row][column + 1]
            north = grid[row - 1][column]
            south = grid[row + 1][column]
            if not all(candidate.valid for candidate in (cell, west, east, north, south)):
                continue
            dz_dx = (east.elevation_m - west.elevation_m) / (2 * cell_size_m)
            dz_dy = (south.elevation_m - north.elevation_m) / (2 * cell_size_m)
            cell.cross_slope_deg = degrees(atan(hypot(dz_dx, dz_dy)))


@lru_cache(maxsize=1)
def load_terrain_dataset() -> TerrainDataset:
    with METADATA_PATH.open(encoding="utf-8") as handle:
        metadata = json.load(handle)

    width = int(metadata["grid"]["width_cells"])
    height = int(metadata["grid"]["height_cells"])
    cell_size_m = float(metadata["grid"]["cell_size_m"])
    grid: list[list[GridCell | None]] = [[None for _ in range(width)] for _ in range(height)]

    with GRID_PATH.open(newline="", encoding="utf-8") as handle:
        for record in csv.DictReader(handle):
            row = int(record["row"])
            column = int(record["column"])
            roughness_text = record["roughness_m_5x5_sd"].strip()
            measured_valid = _as_bool(record["valid"])
            routing_valid = measured_valid and bool(roughness_text)
            roughness_m = float(roughness_text) if roughness_text else ROUGHNESS_SATURATION_M

            grid[row][column] = GridCell(
                row=row,
                column=column,
                longitude=float(record["longitude_deg_east"]),
                latitude=float(record["latitude_deg_planetocentric"]),
                elevation_m=float(record["elevation_m"]),
                valid=routing_valid,
                roughness=min(max(roughness_m / ROUGHNESS_SATURATION_M, 0.0), 1.0),
                slip_risk=float(record["slip_risk_0_1"]),
                blocked=_as_bool(record["blocked"]),
            )

    if any(cell is None for row in grid for cell in row):
        raise ValueError("Terrain CSV does not contain every expected grid cell.")

    complete_grid = [[cell for cell in row if cell is not None] for row in grid]
    _derive_local_slope_proxy(complete_grid, cell_size_m)

    return TerrainDataset(
        grid=complete_grid,
        metadata=metadata,
        base=GridPosition(int(metadata["base"]["row"]), int(metadata["base"]["column"])),
        target=GridPosition(int(metadata["target"]["row"]), int(metadata["target"]["column"])),
        cell_size_m=cell_size_m,
    )


def grid_with_blocked_overrides(
    dataset: TerrainDataset,
    blocked_cells: list[GridPosition],
) -> list[list[GridCell]]:
    if not blocked_cells:
        return dataset.grid

    grid = dataset.grid.copy()
    copied_rows: set[int] = set()
    for position in blocked_cells:
        if not (0 <= position.row < len(grid) and 0 <= position.column < len(grid[position.row])):
            raise ValueError(f"Blocked cell is outside the terrain grid: {position}")
        if position.row not in copied_rows:
            grid[position.row] = grid[position.row].copy()
            copied_rows.add(position.row)
        grid[position.row][position.column] = replace(
            grid[position.row][position.column],
            blocked=True,
        )
    return grid


def terrain_info(dataset: TerrainDataset) -> dict[str, Any]:
    metadata = dataset.metadata
    return {
        "title": metadata["title"],
        "status": metadata["status"],
        "width_cells": metadata["grid"]["width_cells"],
        "height_cells": metadata["grid"]["height_cells"],
        "cell_size_m": dataset.cell_size_m,
        "crop_bounds": metadata["grid"]["crop_bounds"],
        "base": metadata["base"],
        "target": metadata["target"],
        "roughness_normalization": {
            "source_field": "roughness_m_5x5_sd",
            "formula": "clamp(roughness_m_5x5_sd / 0.5 m, 0, 1)",
            "classification": "Project assumption",
        },
        "local_slope_proxy": {
            "formula": "atan(hypot(dz_dx, dz_dy)) from central elevation differences",
            "classification": "Derived; conservative proxy, not direction-specific cross-slope",
        },
        "simulated_fields": ["slip_risk_0_1", "blocked"],
    }
