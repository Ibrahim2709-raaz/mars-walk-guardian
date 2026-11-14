# Mars Rover Guardian - Robotic Operations & Tactical Map Interface

An aerospace-grade tactical Mission Operations interface for robotic Mars rover exploration, path evaluation, and contingency recovery around Mount Sharp (Aeolis Mons) in Gale Crater.

Built with **React 19**, **TypeScript**, **Vite**, **MapLibre GL JS**, and **Tailwind CSS**.

---

## 🌟 Key Features

### 1. Robotic Exploration & Tactical Map
- **Mount Sharp / Gale Crater Operations Grid**: Centered on robotic rover operations around Mount Sharp (`[137.41955°E, -4.84245°S]`).
- Powered by **MapLibre GL JS v6** with high-resolution OpenPlanetary USGS/NASA Mars Basemap raster tiles.
- Interactive controls for 3D tilt/pitch, bearing rotation, metric scale calibration, and smooth waypoint centering.

### 2. Gale Rover Base — Simulated Operations Point
- Stationed at `[137.41900°E, -4.84200°S]` on the consolidated plains of Aeolis Palus.
- Distinctive robotic operations hub marker with beacon animation and telemetry popup.
- Clearly marked and badged as **`[SIMULATED MOCK DATA]`**.
- Features docking berth (Berth 1) staging and recharge bay telemetry.

### 3. Mount Sharp Boxwork Science Target
- Located at `[137.42010°E, -4.84295°S]` (~86.3 m traverse from Base).
- Targeted on polygonal mineralized fracture ridges discovered by the NASA Curiosity rover, formed by ancient groundwater flows in Gale Crater.
- Badged as **`[NASA-DERIVED TARGET]`**.

### 4. Mock Traverse Routes (75–100 Metres)
- **Planned Scientific Traverse (Normal Route)**: 86.3-metre tactical route navigating alluvial conglomerate hardpan and basalt bedrock to reach the Boxwork ridge while avoiding loose sand ripple slipfaces.
- **Contingency Recovery Vector (Emergency Route)**: 79.4-metre direct egress spine providing a high-traction retreat vector straight back to Gale Rover Base Berth 1.
- Both routes operate within the specified **75–100 metre** test range pending final terrain grid and coordinate delivery.

### 5. Routing Engine Interface: `calculateRoute`
The interface is prepared to integrate directly with backend pathfinding algorithms via:
```typescript
calculateRoute(grid, start, target, roverState)
```
The application ingests and displays the complete returned routing schema:
```typescript
{
  path: LatLng[],              // Waypoint coordinates [lng, lat]
  distanceM: number,           // Cumulative distance in meters (e.g. 86.3 m)
  energyWh: number,            // Total energy consumption in Watt-hours
  riskScore: number,           // Terrain hazard index (0.0 to 1.0)
  batteryRemainingWh: number,  // Projected battery after traverse
  warnings: string[],          // Terrain, slope, and wheel-slip warning strings
  feasible: boolean            // Traverse feasibility status
}
```

### 6. Simulated Emergency State Control
- Toggles between hard-coded mock route lines (nominal scientific traverse vs. contingency retreat vector).
- **Note on Functionality**: Clearly labeled as a **simulated emergency state**. It switches between pre-computed route lines rather than dynamically recalculating paths, pending live connection to the `calculateRoute` pathfinding engine.

### 7. Real-Time Robotic Rover Telemetry HUD
Replaces legacy suit/EVA metrics with dedicated rover telemetry:
- **Battery Remaining (Wh)**: Remaining Watt-hours and percentage (e.g. 2,850 Wh / 3,200 Wh, 89.1%).
- **Energy Consumption (W & Wh/m)**: Real-time power draw (e.g. 185 W nominal vs. 340 W emergency drive) and traverse energy rate (1.65 Wh/m).
- **Rover Temperature (°C)**: Internal avionics / Warm Electronics Box (+14.2°C) vs. cryogenic Martian surface ambient (-64.0°C).
- **Wheel-Slip Risk (%)**: Real-time wheel-slip estimation from visual odometry (4.2% LOW nominal vs. 18.5% ELEVATED in loose drift).
- **Communication Status**: High-gain direct MRO UHF relay connection (100% signal, 16 kbps bandwidth, 14.2 min Earth-Mars latency).
- **Rover Ground Speed**: Real-time speed in cm/s (3.8 cm/s nominal, 5.0 cm/s contingency pace).
- **Mission Time**: Martian Sol 424, local solar time (14:38 LMST), and Mission Elapsed Time (MET 184:22:15).
- **Fault Status**: System diagnostic status (`F-00: NOMINAL (0 FAULTS)` vs. `F-12: SIMULATED CONTINGENCY`).

### 8. Layer Data Provenance & Mock Data Labeling
Every layer in the system is explicitly marked with its data provenance:
- **NASA-Derived**:
  - `Optical Basemap`: OpenPlanetary / USGS Astrogeology / NASA HiRISE/CTX basemap.
  - `Boxwork Science Target`: Curiosity rover science target coordinates and geological metadata.
- **System-Derived**:
  - `Planned Traverse Vector (86.3 m)` and `Contingency Return Vector (79.4 m)`.
  - `AER-1 Rover Position`: Current station coordinates and waypoint tracking.
  - `Telemetry Analytics`: Energy draw calculations and post-traverse battery projections.
- **Simulated Mock Data**:
  - `Slope Gradients`: Safe (<5°), Moderate (5-15°), and Steep Rim (>15°) polygons (`[SIMULATED MOCK DATA]`).
  - `Hazard Zones`: Loose Sand Ripple Corridor & Dense Boulder Outcrops (`[SIMULATED MOCK DATA]`).
  - `Mineral Units`: CRISM Sulfates, Clays, and Hematite overlays (`[SIMULATED MOCK DATA]`).
  - `Gale Rover Base`: Simulated Operations Point (`[SIMULATED MOCK DATA]`).

---

## 🚀 Quickstart

### Prerequisites
- Node.js (v18+)
- npm

### Development
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

### Dependency Audit
```bash
npm audit
```
*Current status: 0 vulnerabilities.*

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 6
- **Mapping**: MapLibre GL JS 6.18.0
- **Styling**: Tailwind CSS + Custom Mars Tactical Glassmorphism HUD
- **Icons**: Lucide React
- **Branch**: `feature/map-interface`
