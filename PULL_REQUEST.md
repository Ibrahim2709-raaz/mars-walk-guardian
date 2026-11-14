# Pull Request: Robotic Rover Exploration & Tactical Map Interface

- **Source Branch**: `feature/map-interface`
- **Target Branch**: `main`

## Summary of Changes

Refactors and converts the tactical mission interface from astronaut EVA to **robotic rover exploration** around Mount Sharp in Gale Crater, incorporating true robotic telemetry, 75–100 metre mock routes, clear data provenance tracking, and the prepared `calculateRoute` pathfinding interface.

---

### Key Corrections Implemented

1. **Full Robotic Rover Conversion**:
   - Eliminated all legacy astronaut EVA, suit, oxygen, heart-rate, habitat, airlock, walking, and daylight-reserve terminology across all components, types, mock data, and documentation.
   - Reframed the platform as **Mars Rover Guardian**: Gale Crater Robotic Rover Mission Control.
   - Replaced astronaut markers with the **AER-1 Autonomous Exploration Rover** marker (featuring a custom 6-wheel rover chassis icon, Station 2 coordinates, and robotic telemetry popup).

2. **Comprehensive Rover Telemetry HUD**:
   - **Battery remaining in Wh**: Remaining Watt-hours and percentage (2,850 Wh / 3,200 Wh, 89.1% nominal; 2,180 Wh / 3,200 Wh contingency).
   - **Energy consumption**: Real-time draw in Watts (185 W nominal, 340 W emergency) and traverse efficiency (1.65 Wh/m).
   - **Rover temperature**: Internal avionics / Warm Electronics Box (+14.2°C) vs. external surface ambient (-64.0°C).
   - **Wheel-slip risk**: Visual odometry slip estimation (4.2% LOW nominal vs. 18.5% ELEVATED in loose sand drift).
   - **Communication status**: MRO Direct UHF Relay (100% signal, 16.0 kbps bandwidth, 14.2 min latency).
   - **Speed**: Ground velocity in cm/s (3.8 cm/s nominal, 5.0 cm/s emergency pace).
   - **Mission time**: Sol 424, local solar time (14:38 LMST), and Mission Elapsed Time (MET 184:22:15).
   - **Fault status**: System diagnostic reporting (`F-00: NOMINAL` vs. `F-12: SIMULATED CONTINGENCY`).

3. **Renamed Base Facility**:
   - Renamed base to **“Gale Rover Base — Simulated Operations Point”** across markers, popups, waypoints, controls, and headers. Positioned at `[137.41900°E, -4.84200°S]`.
   - Updated operational designation to **Berth 1 (Docking & Recharge Apron)**.

4. **Simulated Emergency State Clarification**:
   - Re-labeled emergency controls to clearly state that the button activates a **simulated emergency state** by switching between hard-coded mock route lines.
   - Explicitly clarified that real-time dynamic route recalculation is not yet connected, but the interface contract is prepared.

5. **Prepared `calculateRoute(grid, start, target, roverState)` Interface**:
   - Implemented modular `calculateRoute` function in `src/services/routingService.ts` matching the exact specified signature:
     ```typescript
     calculateRoute(grid, start, target, roverState)
     ```
   - Bound the interface to ingest and display all 7 returned properties:
     - `path`: Array of coordinate waypoints [lng, lat].
     - `distanceM`: Distance formatted in meters (86.3 m nominal / 79.4 m contingency).
     - `energyWh`: Total predicted energy consumption in Watt-hours (142.8 Wh / 188.5 Wh).
     - `riskScore`: Terrain difficulty index (0.18 nominal / 0.32 contingency).
     - `batteryRemainingWh`: Projected remaining battery after traverse (2,707 Wh).
     - `warnings`: Detailed array of terrain, slope, and wheel-slip warning strings.
     - `feasible`: Boolean traverse feasibility badge (`TRAVERSE FEASIBLE`).

6. **75–100 Metre Mock Routes**:
   - Replaced multi-kilometre routes with realistic localized test routes:
     - **Planned Science Traverse**: 86.3 m across alluvial hardpan and bedrock to Boxwork Target (`[137.42010°E, -4.84295°S]`).
     - **Contingency Recovery Vector**: 79.4 m downhill hardpan retreat corridor back to Gale Rover Base Berth 1.
   - Updated map default center and zoom (`z=17.2`) to perfectly frame the 75–100m operations sector.

7. **Data Provenance Badging**:
   - Clearly categorized every layer in the UI, map popups, and layer toggles:
     - **`[NASA-DERIVED]`**: OpenPlanetary USGS/NASA Mars Basemap, Boxwork Science Target.
     - **`[SYSTEM-DERIVED]`**: Traversal route vectors, AER-1 rover station tracking, telemetry analytics.
     - **`[SIMULATED MOCK DATA]`**: Slope gradient polygons, hazard zones (sand slip & boulder clasts), mineral deposits (CRISM sulfates, clays, hematite), and Gale Rover Base.

8. **Dependency Audit Warnings Resolved**:
   - Upgraded `maplibre-gl` to `^6.18.0` (resolves GHSA-jrc7-96c5-q579).
   - Upgraded `postcss` to `^8.5.33` (resolves GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849).
   - `npm audit`: **0 vulnerabilities** reported.

---

## Verification & Build Status

- `npm audit`: 0 vulnerabilities (clean).
- `npm run build`: Zero errors (`tsc && vite build` built production bundle in ~8s).
- All changes kept strictly on `feature/map-interface` without merging to `main`.
