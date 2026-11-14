# Python routing service

The React application remains the user interface. This service owns terrain
validation, weighted A* routing, energy calculations, and emergency rerouting.

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

Run the routing tests without additional test dependencies:

```powershell
python -m unittest discover -s backend\tests -v
```

## API contract

Send `POST /route` with a terrain grid, start and target cell, rover state, and
optional routing thresholds. The response includes the path, physical distance,
physical energy use, normalized risk score, route score, remaining battery,
warnings, and feasibility status.
