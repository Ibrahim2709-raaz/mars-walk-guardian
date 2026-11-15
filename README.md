# Mars Rover Guardian & 3D Interactive Mars Explorer

Mars Rover Guardian is an interactive dual-mode space mission and planetary exploration web application. It combines:
1. **Interactive 3D Mars Globe & Surface Explorer** built with the ArcGIS Maps SDK for JavaScript (`SceneView` in global mode, Mars 2000 spatial reference), referencing the architecture of [Esri Explore Mars](https://github.com/Esri/explore-mars).
2. **Tactical Rover Traverse & Emergency Rerouting System** in Gale Crater, driven by a Python FastAPI weighted A* routing backend with real HiRISE DTM elevation.

---

## Viewing Modes

### Mode 1: Orbital 3D Globe
- **True Planetary Scale**: Uses `GCS_Mars_2000` (`wkid: 104971`) with a physical semi-major radius of 3,396,190 meters.
- **Deep Space Environment**: Atmospheric Rayleigh scattering is disabled (`atmosphereEnabled: false`), revealing an authentic cosmic starfield and direct solar lighting.
- **Global Elevation & Color Imagery**: Blends USGS/NASA Astrogeology Mars DEM (200m/px) and high-resolution viking/global imagery tiles.
- **Interactive Bookmarks**: Seamless animated fly-to transitions (`view.goTo`) to major geological wonders:
  - *Olympus Mons* (tallest planetary shield volcano in the Solar System)
  - *Valles Marineris* (the Grand Canyon of Mars)
  - *Gale Crater* (Curiosity rover site & mission base)
  - *Jezero Crater* (Perseverance rover & Ingenuity site)
  - *North & South Polar Caps* (Planum Boreum & Planum Australe)
- **Historic Landing Sites & Traverse Trajectory**: 3D markers for Curiosity, Perseverance, Opportunity, and the live Gale Rover Base, Science Target Candidate, and emergency obstacle zone.

### Mode 2: First-Person Surface View ("Drop Me Here")
- **Ground Dropping**: Click the **"DROP ME ANYWHERE ON MARS"** button and click any point on the Martian surface. The camera smoothly descends from orbit down to surface level (~1.7 m above terrain).
- **Ground-Hugging Elevation Tracking**: Continuously queries elevation (`view.map.ground.queryElevation(point)`) along the movement vector to lock the camera to eye-level (1.7 m AGL) across slopes and craters.
- **Full Locomotion & Mouselook Controls**:
  - `W` / `A` / `S` / `D` or Arrow Keys: Walk forward, backward, strafe left/right
  - `Shift`: Sprint (3.2× speed multiplier)
  - `Q` / `E`: Adjust observer eye height (0.5 m to 25.0 m)
  - Mouse Click & Drag: 360° heading rotation and clamped tilt (-60° to +75°)
  - Mobile Virtual D-Pad: On-screen touch directional pad for touchscreens
  - `Esc`: Return to orbital view
- **Tactical Surface HUD**: Real-time Martian coordinates (Latitude/Longitude in degrees), absolute datum elevation (meters), camera heading (degrees), current eye height, nearest landmark distance, and active locomotion status.

### Mode 3: 2D Tactical Traverse View
- Focused high-resolution (1.012 m/cell) local routing interface in Gale Crater.
- Live outbound traverse planning (cyan) and emergency detour calculation (bold red around simulated rectangular hazard zone rows 62–72, cols 115–135).

---

### 3D Rover terrain imagery

The 3D Rover view drapes a contrast-adjusted crop of the HiRISE red-band orthophoto `PSP_009149_1750_RED_A_01_ORTHO` (NASA/JPL-Caltech/UArizona) over the measured HiRISE elevation mesh. The 804 × 804 crop starts at zero-based pixel column 5728 and row 29879 in the orthoimage. The imagery has approximately 0.25 m pixels and covers the same area as the 201 × 201 elevation grid. Surface tint and lighting are illustrative.

[HiRISE terrain and orthophoto products](https://www.uahirise.org/dtm/dtm.php?ID=PSP_009149_1750)

## First-Person Camera Controller Architecture

The first-person camera controller (`src/components/Mars3DScene.tsx`) operates via an asynchronous, requestAnimationFrame-backed update loop:

1. **Planetary Displacement Math**:
   Movement vectors are projected onto the Mars sphere (`R = 3,396,190 m`):
   $$\Delta \text{lat} = \frac{\Delta y}{R} \times \frac{180}{\pi}$$
   $$\Delta \text{lon} = \frac{\Delta x}{R \cdot \cos(\text{lat}_{\text{rad}})} \times \frac{180}{\pi}$$
   This accounts for longitudinal convergence towards the Martian poles.

2. **Real-Time Surface Clamping (`queryElevation`)**:
   As the user moves, the target geographic coordinate is sampled against the active 3D elevation service:
   ```typescript
   const elevationResult = await view.map.ground.queryElevation(testPoint);
   const surfaceZ = elevationResult.geometry.z;
   camera.position.z = surfaceZ + eyeHeight; // Clamped at 1.7 m above Martian soil
   ```

3. **Gimbal & Look Clamping**:
   Pitch (tilt) is strictly clamped between $15^\circ$ (looking up) and $150^\circ$ (looking down), preventing camera inversion or disorientation while maintaining full $360^\circ$ heading control.

---

## ArcGIS Layers and APIs Used

| Component / Layer | Specification / Endpoint | Purpose |
| --- | --- | --- |
| **Spatial Reference** | `SpatialReference({ wkid: 104971 })` | GCS_Mars_2000 spheroid definition |
| **SceneView** | `@arcgis/core/views/SceneView` | 3D WebGL global globe renderer |
| **Mars Global Elevation** | `https://astro.arcgis.com/arcgis/rest/services/OnMars/MDEM200M/ImageServer` | USGS/NASA 200m global Mars DTM |
| **Mars Global Imagery** | `https://astro.arcgis.com/arcgis/rest/services/OnMars/MDIM21/ImageServer` | Mars Viking MDIM 2.1 color mosaic |
| **Gale Crater HiRISE** | `https://astro.arcgis.com/arcgis/rest/services/OnMars/Gale_HiRISE/ImageServer` | High-resolution local Gale orbital imagery |
| **GraphicsLayer** | `@arcgis/core/layers/GraphicsLayer` | 3D landing site pins, route polylines, and hazard envelopes |
| **Elevation Query API** | `ground.queryElevation(geometry)` | Dynamic raycasting for ground-level camera anchoring |

---

## Technical Limitations & Terrain Resolution

- **Global DEM Resolution**: The global Mars elevation layer operates at approximately 200 meters per pixel. When walking at 1.7 meters eye-level in first-person mode, micro-relief (small rocks, pebbles, sand dunes under 200 meters across) is smoothly interpolated between ground postings rather than presenting photogrammetric sub-meter roughness.
- **Local HiRISE Overlay**: Local sub-meter terrain crops (such as the 1.012 m/cell Gale Crater crop used by the Python routing service) provide high-resolution feature recognition, while the global layer ensures planet-wide navigation.

---

## Quickstart Setup & Run

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

### 1. Start Python Routing Backend
```powershell
cd mars-walk-guardian
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn
uvicorn backend.app.main:app --reload --port 8000
```
API health endpoint: `http://127.0.0.1:8000/health`

### 2. Start Frontend
```powershell
cd mars-walk-guardian
npm install
npm run dev
```
Open `http://localhost:5173`. Use the top navigation bar to toggle between:
- **3D GLOBE** (Mode 1: Orbital exploration & bookmarks)
- **1ST-PERSON** (Mode 2: Surface walking & telemetry HUD)
- **2D TACTICAL** (Mode 3: Local Gale Crater mission grid)

### 3. Verify
```powershell
npm run build
python -m unittest discover -s backend/tests -v
```

## GitHub Pages

The GitHub Pages workflow publishes the React interface from
`feature/weighted-astar-routing` at `/mars-walk-guardian/`. GitHub Pages is
static hosting and does not run the Python FastAPI backend. Set the repository
Actions variable `VITE_ROUTING_API_URL` to a public HTTPS backend URL for live
routing outside the local demo environment; otherwise the published interface
will continue looking for the routing service at `http://localhost:8000`.
