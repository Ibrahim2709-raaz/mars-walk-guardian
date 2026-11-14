# Mars Walk Guardian

Mars Walk Guardian is a NASA Space Apps MVP concept for safety-first robotic rover mission planning in the boxwork terrain of the Mount Sharp region of Gale Crater, Mars.

The concept centers on **Gale Rover Base — Simulated Operations Point** near the provisional coordinate **4.842° S, 137.419° E** (latitude `-4.842`, longitude `137.419`). It combines NASA-derived datasets to help plan safer, scientifically useful rover traverses:

- HiRISE or CTX optical imagery for surface context
- MOLA elevation and derived slope information for terrain risk
- CRISM mineral context for identifying potential science targets
- Weighted route planning that balances science value with distance, slope, terrain roughness, wheel-slip or entrapment risk, rover energy, thermal state, mission time, and communications constraints
- Fault and safe-mode rerouting to the simulated operations point or a designated safe zone when rover telemetry or terrain conditions become unsafe

## Safety and data disclaimer

Mars Walk Guardian is an educational MVP and decision-support concept, not operational flight software. **The Gale Rover Base operations point and its coordinate are simulated and do not represent NASA-approved mission infrastructure. All rover telemetry—including energy, battery, thermal state, wheel-slip or entrapment risk, mission time, and communications status—is simulated and is not NASA operational data.** Routes and risk estimates must not be interpreted as NASA-approved rover mission plans.

NASA-derived imagery and planetary datasets remain subject to their respective source metadata, attribution guidance, and usage terms.

## Project status

This repository currently contains the project description and configuration groundwork only. The React, TypeScript, and Vite application has not yet been scaffolded.
