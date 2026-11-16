from dataclasses import asdict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from .routing import (
    GridCell,
    GridPosition,
    RoverState,
    RoutingOptions,
    calculate_route,
)
from .terrain_dataset import (
    grid_with_blocked_overrides,
    load_terrain_dataset,
    terrain_info,
)


class GridCellModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    row: int = Field(ge=0)
    column: int = Field(ge=0)
    longitude: float
    latitude: float
    elevation_m: float
    valid: bool
    roughness: float = Field(ge=0, le=1)
    slip_risk: float = Field(ge=0, le=1)
    blocked: bool
    cross_slope_deg: float = 0.0
    thermal_risk: float = Field(default=0.0, ge=0, le=1)


class GridPositionModel(BaseModel):
    row: int = Field(ge=0)
    column: int = Field(ge=0)


class RoverStateModel(BaseModel):
    battery_wh: float = Field(gt=0)
    battery_reserve_wh: float = Field(ge=0)
    energy_per_meter_wh: float = Field(ge=0)


class RoutingOptionsModel(BaseModel):
    cell_size_m: float = Field(default=5.0, gt=0)
    max_along_slope_deg: float = Field(default=20.0, gt=0, le=90)
    max_cross_slope_deg: float = Field(default=15.0, gt=0, le=90)
    max_slip_risk: float = Field(default=0.8, gt=0, le=1)


class RouteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    grid: list[list[GridCellModel]]
    start: GridPositionModel
    target: GridPositionModel
    rover_state: RoverStateModel
    options: RoutingOptionsModel = Field(default_factory=RoutingOptionsModel)


class TerrainRoutingOptionsModel(BaseModel):
    max_along_slope_deg: float = Field(default=20.0, gt=0, le=90)
    max_cross_slope_deg: float = Field(default=15.0, gt=0, le=90)
    max_slip_risk: float = Field(default=0.8, gt=0, le=1)


class TerrainRouteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: GridPositionModel
    target: GridPositionModel
    rover_state: RoverStateModel
    blocked_cells: list[GridPositionModel] = Field(default_factory=list)
    options: TerrainRoutingOptionsModel = Field(default_factory=TerrainRoutingOptionsModel)


app = FastAPI(title="Mars Walk Guardian Routing API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://ibrahim2709-raaz.github.io",
        "*",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/terrain/info")
def get_terrain_info() -> dict:
    return terrain_info(load_terrain_dataset())


@app.post("/route")
def route(request: RouteRequest) -> dict:
    grid = [
        [GridCell(**cell.model_dump()) for cell in row]
        for row in request.grid
    ]
    result = calculate_route(
        grid=grid,
        start=GridPosition(**request.start.model_dump()),
        target=GridPosition(**request.target.model_dump()),
        rover_state=RoverState(**request.rover_state.model_dump()),
        options=RoutingOptions(**request.options.model_dump()),
    )
    return asdict(result)


@app.post("/terrain/route")
def terrain_route(request: TerrainRouteRequest) -> dict:
    dataset = load_terrain_dataset()
    blocked_cells = [GridPosition(**position.model_dump()) for position in request.blocked_cells]
    grid = grid_with_blocked_overrides(dataset, blocked_cells)
    result = calculate_route(
        grid=grid,
        start=GridPosition(**request.start.model_dump()),
        target=GridPosition(**request.target.model_dump()),
        rover_state=RoverState(**request.rover_state.model_dump()),
        options=RoutingOptions(
            cell_size_m=dataset.cell_size_m,
            **request.options.model_dump(),
        ),
    )
    return asdict(result)


class DebugLogModel(BaseModel):
    tag: str
    data: str


@app.post("/debug/log")
def log_debug(entry: DebugLogModel) -> dict:
    print(f"[BROWSER_DEBUG] {entry.tag}: {entry.data}", flush=True)
    return {"status": "ok"}

