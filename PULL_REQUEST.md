# Pull Request: Frontend & Interactive Map for Mars Walk Guardian

- **Source Branch**: `feature/map-interface`
- **Target Branch**: `main`

## Summary of Changes

Implements the complete interactive map, suit telemetry HUD, tactical layer controls, and emergency evacuation workflow for **Mars Walk Guardian** centered on Mount Sharp in Gale Crater.

### Implemented Requirements
1. **Interactive Map around Mount Sharp in Gale Crater**:
   - Integrated MapLibre GL JS with OpenPlanetary USGS/NASA Mars Basemap.
   - Interactive zoom, pitch, bearing rotation, metric scale, and waypoint centering.
2. **Simulated Gale Base Marker**:
   - Positioned at `[137.419, -4.842]`.
   - Distinctive geodesic dome with beacon pulse animation and interactive popup.
   - Prominently badged as `[SIMULATED]`.
3. **Boxwork Science-Target Marker**:
   - Positioned at `[137.382, -4.892]` (Mount Sharp Boxwork unit).
   - Hexagonal crystal reticle with geological metadata on Curiosity rover boxwork findings.
4. **Planned vs. Emergency Routes**:
   - **Planned Traverse (Normal)**: 4.85 km scientific route through Vera Rubin Ridge to Boxwork Target.
   - **Emergency Return Vector**: 3.92 km rapid egress corridor through hardpan basalt bedrock directly back to Gale Base Airlock-1.
5. **Simulated Suit Telemetry Indicators**:
   - Oxygen (86.4% nominal / 64.1% emergency, consumption rate, hours remaining, pressure).
   - Battery (81.2% nominal / 72.8% emergency, power draw, voltage, runtime).
   - Temperature (internal suit +21°C vs. ambient surface -62°C, heater duty cycle).
   - Daylight (Sol 424, LMST solar time, solar elevation angle, hours remaining).
   - All suit telemetry prominently marked as `[SIMULATED]`.
6. **Simulate Emergency Action**:
   - Tactical toggle triggering instant route recalculation to Gale Base, audio/visual alarm cues, and life support stress telemetry.
7. **Route Explanation & Waypoint Panel**:
   - Distance, estimated traversal time, elevation gain/loss, max slope, terrain rationale, and clickable waypoints.
8. **Layer Toggles**:
   - Optical, Slope (<10°, 10-25°, >25°), Hazard (Bagnold active sand dunes, boulder clasts), and Mineral (CRISM Spectrometer Sulfates, Clays, Hematite).

## Verification
- `npm run build`: Zero errors, production build generated.
- Tested on local Vite dev server at `http://localhost:5173/`.
