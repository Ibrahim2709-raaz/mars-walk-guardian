# Merge: rover interface + live Python terrain routing

## Summary

This merge combines the updated rover mission interface from `feature/map-interface` with the Python weighted A* implementation on `feature/weighted-astar-routing`.

## Integration decisions

- Kept the updated responsive React/MapLibre rover UI, dependency upgrades, map resize handling, and provenance presentation.
- Replaced the frontend's hard-coded route service with `POST /terrain/route` from the FastAPI backend.
- Replaced provisional coordinates with the verified HiRISE-crop base and target cells.
- Kept physical route energy separate from the normalized route-risk score.
- Aligned simulated telemetry with the approved 100 Wh capacity, 10 Wh reserve, and 0.25 Wh/m energy model.
- Kept slope, hazard, and mineral polygons clearly labeled as illustrative simulated overlays; they are not inputs to the route engine.
- Relabeled the target as a Sol 4621 waypoint-linked science candidate because the exact boxwork ridge at that coordinate is unconfirmed.

## Emergency behavior

The emergency button no longer swaps to a precomputed line. It takes the midpoint cell of the outbound result, injects that cell as blocked, and requests a new target-to-base route from Python weighted A*.

## Verification

- React TypeScript production build
- 11 Python unit/integration tests, including the real 201 × 201 terrain crop and emergency reroute
- Conflict-marker, stale-coordinate, and stale-energy-value scans

## Known limitations

- The public raster basemap requires network access.
- Local CRISM overlap is not verified.
- Slip risk and default obstacle fields remain simulated placeholders.
- The production JavaScript bundle currently emits a non-blocking size warning.
