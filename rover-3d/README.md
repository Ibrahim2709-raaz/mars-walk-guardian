# Mars Walk Guardian — Rover Traverse

A real-time React and TypeScript demo built with Three.js, React Three Fiber, Drei, and Vite. The Curiosity-inspired rover was reconstructed from the supplied photo. Hidden geometry is approximate. The active terrain uses the measured HiRISE elevations, with illustrative surface colors and a simulated rover route.

## Run locally

Install Node.js 22.12 or later, extract the source ZIP, and open its folder in VS Code. In the terminal, run:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite in a WebGL 2 browser. Use **Start**, then switch between **Free**, **Follow**, and **Cinematic**. In Free mode, drag or swipe to rotate and scroll or pinch to zoom. The viewport also has zoom buttons. Keyboard shortcuts are Space to play/pause, R to reset, 1–3 for camera modes, and plus/minus to zoom. With the scene focused, arrow keys orbit in Free mode.

## Connect your own terrain

The included `public/terrain/gale-hirise.glb` is built from the project's 201 × 201 elevation grid sampled from [HiRISE DTEEC_009149_1750_009294_1750_U01](https://www.uahirise.org/dtm/dtm.php?ID=PSP_009149_1750). The mesh uses metres relative to the simulated Gale Base. The approximately 80 m demo spline ends at the Sol 4621 waypoint-linked science-target candidate. That waypoint alone does not establish the identity of a local geological feature.

To regenerate the included terrain with the source handoff, run:

```sh
node scripts/export-hirise-terrain.mjs /path/to/terrain_grid.csv /path/to/terrain_metadata.json
```

To switch to a different model:

1. Export your static terrain as a `.glb` and put it in `public/terrain/`. A `.gltf` also works if its textures and binary files are available relative to it.
2. Open `src/terrain-config.ts` and set `model.url` to the asset path relative to `public/`.
3. Set the waypoints as `[x, z]` offsets in world metres after applying the model transform. The app uses +Y up, +X east, and +Z north.

```ts
model: {
  url: 'terrain/team-terrain.glb',
  scale: 1,
  rotationDegrees: [0, 0, 0],
  offset: [0, 0, 0],
  groundNodes: ['Ground'],
},
waypoints: [[2, 2], [3, 9], [5, 15]],
```

`groundNodes` is optional. Name the mesh or group that represents the drive surface if the model also contains props, sky geometry, or decorative rocks. The sampler takes the highest hit among the selected ground triangles. For overlapping elevations such as a bridge over a road, select the ground nodes for the intended level. Every wheel needs ground beneath it, including around the start and finish. A route that crosses an uncovered spot reports the offending area before driving. If a wheel loses its surface between validation samples, the rover stops at the last valid pose.

The adapter works with irregular ground meshes and keeps terrain rendering separate from movement. The motion is a visual simulation based on ground height, with no traction, obstacle avoidance, or automatic path planning. Pick driveable waypoints. To plug in a heightmap or another terrain format, supply a `HeightSampler` to `createTraverse()`. The sampler takes world X and Z in metres and returns ground Y or `undefined` outside coverage.

## Change the route or rover

| File | Purpose |
| --- | --- |
| `src/terrain-config.ts` | Select the terrain asset and set the route waypoints. |
| `src/mesh-terrain.ts` | Sample the imported ground triangles using a bounding volume hierarchy. |
| `src/traverse.ts` | Validate the path and wheel coverage, then map distance along the route to a pose. |
| `src/terrain.ts` | Built-in demo terrain and its height sampler. |
| `src/rover-model.mjs` | Adjust the rover geometry, materials, and rig. The chassis, steering pivots, wheel spinners, suspension links, mast, and arm have named nodes. |
| `src/mission.tsx` | Frame-time animation, distance-driven wheel rotation, ground contact, suspension pose, dust, and cameras. The suspension uses terrain sampling and visual linkages. Speeds are scaled for the demo. |
| `src/environment.tsx` | Procedural Mars terrain, instanced rocks, crater rims, lighting, atmospheric haze, and route overlay. |
| `public/models/mwg-rover.glb` | Reusable static rover pose and articulation hierarchy. The website drives the rig at runtime. |

After changing the model, run `npm run export:rover` to regenerate the GLB. The export combines static geometry by material within each rigid assembly to reduce draw calls.

## Deploy online

```sh
npm ci
npm run build
npm run preview
```

The build regenerates the GLB, checks TypeScript, and writes a static site to `dist/`. Preview locally before uploading the contents of `dist/` to a static web host. If using Git-based deployment, set the build command to `npm run build` and the publish directory to `dist`. The default Vite configuration assumes the site is hosted at the root of its domain. For a subfolder deployment, set Vite's `base` accordingly before building.
