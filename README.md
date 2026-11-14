# Mars Rover Guardian

Mars Rover Guardian is a NASA Space Apps MVP that plans a rover traverse through a local Gale Crater terrain crop. It combines a React/MapLibre mission interface with a Python FastAPI service and weighted A* routing.

## What the demo does

- Loads a cached 201 × 201 HiRISE DTM crop at approximately 1.012 metres per cell.
- Plans a live outbound route from a simulated rover base at row 32, column 139 to a science-target candidate at row 100, column 100.
- Rejects blocked or unsafe cells before comparing weighted terrain costs.
- Reports physical distance and battery energy separately from the normalized route-risk score.
- Injects a blocked cell during an emergency simulation and recalculates a feasible route back to base.
- Labels simulated telemetry and illustrative map overlays separately from measured or derived terrain data.

## Demonstration locations

| Location | Grid cell | Coordinates | Status |
| --- | --- | --- | --- |
| Gale Rover Base | (32, 139) | 137.38017231° E, 4.80425574° S | Simulated operations point |
| Science target | (100, 100) | 137.37950662° E, 4.80541641° S | Sol 4621 waypoint-linked candidate; exact boxwork ridge unconfirmed |

The baseline route is about 86 metres. Exact results come from the Python route response rather than a hard-coded frontend path.

## Energy model

The fictional rover demo uses a 100 Wh battery, a 10 Wh reserve, and a baseline physical driving cost of 0.25 Wh/m. The UI shows a 45 W nominal additional driving load. These values are project assumptions, not specifications for a real NASA rover.

## Run locally

Open two terminals in the repository root.

Backend:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --reload --port 8000
```

Frontend:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`. The API health endpoint is `http://127.0.0.1:8000/health`.

## GitHub Pages

The GitHub Pages workflow publishes the React interface from
`feature/weighted-astar-routing` at `/mars-walk-guardian/`. GitHub Pages is
static hosting and does not run the Python FastAPI backend. Set the repository
Actions variable `VITE_ROUTING_API_URL` to a public HTTPS backend URL for live
routing outside the local demo environment; otherwise the published interface
will continue looking for the routing service at `http://localhost:8000`.

## Verify

```powershell
npm run build
.\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

## Data boundary

- HiRISE supplies local elevation input and derived roughness/slope values.
- MOLA is regional context only.
- CRISM may support science-region selection, but local overlap is not yet verified.
- Slip risk, blocked defaults, rover telemetry, mineral polygons, and hazard overlays are explicitly simulated placeholders.
