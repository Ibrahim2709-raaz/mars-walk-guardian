# Python routing service

The React application remains the user interface. This service owns terrain
loading, validation, weighted A* routing, energy calculations, and emergency
rerouting. The supplied 201×201 HiRISE DTM crop is loaded and cached server-side.

## Run locally

From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

The API is then available at `http://localhost:8000`. Check it with
`http://localhost:8000/health`.

Terrain endpoints:

- `GET /terrain/info` returns grid dimensions, base and target cells, provenance,
  and explicit derived/simulated-field caveats.
- `POST /terrain/route` calculates a route using the cached terrain crop. React
  sends only start, target, rover state, optional threshold overrides, and any
  simulated blocked cells.

Run the routing tests without additional test dependencies:

```powershell
python -m unittest discover -s backend\tests -v
```

## API contract

Send `POST /route` with a terrain grid, start and target cell, rover state, and
optional routing thresholds. The response includes the path, physical distance,
physical energy use, normalized risk score, route score, remaining battery,
warnings, and feasibility status.
