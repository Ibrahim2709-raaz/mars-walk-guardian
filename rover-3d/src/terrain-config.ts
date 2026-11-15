import type { Waypoint } from './traverse'

export type TerrainConfig = {
  label: string
  location: string
  destination: string
  waypoints: readonly Waypoint[]
  model?: {
    url: string
    scale?: number
    rotationDegrees?: readonly [number, number, number]
    offset?: readonly [number, number, number]
    groundNodes?: readonly string[]
  }
}

// Swap the model and waypoints here to use a new terrain.
export const terrainConfig: TerrainConfig = {
  label: 'HiRISE elevation · illustrative color',
  location: 'MOUNT SHARP / GALE CRATER',
  destination: 'Gale Base to Sol 4621 candidate',
  model: {url: 'terrain/gale-hirise.glb', groundNodes: ['Ground']},
  waypoints: [[0,0],[-11.302,-16.354],[-20.191,-34.094],[-30.034,-51.286],[-39.319494,-68.798782]],
}
