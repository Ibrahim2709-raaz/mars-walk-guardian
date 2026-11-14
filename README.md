# Mars Walk Guardian - Frontend & Interactive Map

An aerospace tactical Mission Operations interface for Mars astronaut extravehicular activity (EVA) navigation and contingency management around Mount Sharp (Aeolis Mons) in Gale Crater.

Built with **React**, **TypeScript**, **Vite**, **MapLibre GL JS**, and **Tailwind CSS**.

---

## 🌟 Key Features

1. **Mount Sharp & Gale Crater Interactive Map**:
   - Centered on Mount Sharp in Gale Crater (`[137.405°E, -4.865°S]`).
   - Powered by **MapLibre GL JS** with OpenPlanetary USGS/NASA Mars Basemap raster tiles.
2. **Simulated Gale Base Marker**:
   - Geodesic habitat marker stationed at `[137.419°E, -4.842°S]` with beacon pulse animation and interactive airlock/life-support telemetry.
   - Clearly badged as **`[SIMULATED]`**.
3. **Boxwork Science-Target Marker**:
   - Positioned at `[137.382°E, -4.892°S]` on the slopes of Mount Sharp, highlighting ancient groundwater polygonal fracture mineralization.
4. **Dual Traverse Routes**:
   - **Planned Scientific Traverse (Normal Route)**: Traverses alluvial fans, Vera Rubin Ridge, and basalt hardpan corridors with elevation profiles and waypoint checkpoints.
   - **Emergency Return Vector**: Rapid downhill egress path bypassing loose Bagnold dunes and rockfalls.
5. **Simulate Emergency Action**:
   - Tactical HUD toggle triggering instant route recalculation, high-alert visual states, and life-support stress telemetry.
6. **Simulated Suit Telemetry HUD**:
   - **Oxygen**: Percentage, consumption rate (L/min), pressure (kPa), and remaining hours.
   - **Battery**: Percentage, voltage (V), power draw (W), and remaining hours.
   - **Temperature**: Core suit internal temp vs. cryogenic ambient Mars surface temp (-62°C).
   - **Daylight & Martian Sol**: Sol 424 countdown, local solar time (LMST), and solar elevation angle.
7. **Multi-Channel Layer Toggles**:
   - **Optical**: Planetary surface imagery.
   - **Slope**: Gradient hazard zones (Safe `<10°`, Moderate `10-25°`, Scarp `>25°`).
   - **Hazards**: High-slip Bagnold dune slipfaces and dense boulder clast fields.
   - **Minerals**: CRISM spectrometer heatmap (Sulfates, Clays, Hematite).
8. **Route Explanation & Waypoint Panel**:
   - Distance, travel time, elevation delta, maximum slope, terrain composition, and click-to-locate waypoints.

---

## 🚀 Quickstart

### Prerequisites
- Node.js (v18+)
- npm

### Development Server
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

---

## 🛰️ Architecture & Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Mapping**: MapLibre GL JS
- **Styling**: Tailwind CSS + Custom Mars HUD Glassmorphism
- **Icons**: Lucide React
- **Branch**: `feature/map-interface`
