import { Vector3 } from 'three';
import metadata from '../../../backend/data/terrain_metadata.json';
import type { GridPosition } from '../../services/routingApi';
import { wheelStations } from './rover-model';

export type HeightSampler = (x: number, z: number) => number | undefined;
export type Traverse = ReturnType<typeof createTraverse>;

// Same projection and origin as the GLB exporter on the source branch.
const northSouthSpacing = metadata.grid.cell_size_m;
const eastWestSpacing = northSouthSpacing * Math.cos(metadata.base.latitude * Math.PI / 180);

export function toTerrainLocal({ row, column }: GridPosition): [number, number] {
  return [(column - metadata.base.column) * eastWestSpacing, (metadata.base.row - row) * northSouthSpacing];
}

export function sampleWheelGround(sampleHeight: HeightSampler, x: number, z: number, yaw: number, result: number[]) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  for (const [i, [lateral, longitudinal]] of wheelStations.entries()) {
    const height = sampleHeight(x + lateral * cos + longitudinal * sin, z + longitudinal * cos - lateral * sin);
    if (height === undefined || !Number.isFinite(height)) return false;
    result[i] = height;
  }
  return true;
}

export function createTraverse(cells: readonly GridPosition[], sampleHeight: HeightSampler) {
  const points: Vector3[] = [];
  const cumulative = [0];
  for (const cell of cells) {
    const [x, z] = toTerrainLocal(cell);
    const previous = points[points.length - 1];
    if (previous?.x === x && previous.z === z) continue;
    const y = sampleHeight(x, z);
    if (y === undefined || !Number.isFinite(y)) {
      throw new Error(`The route cell (${cell.row}, ${cell.column}) is outside the 3D terrain.`);
    }
    points.push(new Vector3(x, y, z));
    // Arc length here is exclusively for rendering and wheel rotation.
    // Route statistics and playback duration use the API distance.
    if (previous) cumulative.push(cumulative[cumulative.length - 1] + Math.hypot(x - previous.x, z - previous.z));
  }
  if (points.length < 2) throw new Error('The 3D route needs at least two distinct path cells.');
  const visualLength = cumulative[cumulative.length - 1];

  function poseAt(progress: number, position: Vector3, direction: Vector3) {
    const offset = visualLength * Math.max(0, Math.min(1, progress));
    let first = 0, last = cumulative.length - 1;
    while (last - first > 1) {
      const middle = (first + last) >> 1;
      if (offset < cumulative[middle]) last = middle;
      else first = middle;
    }
    position.copy(points[first]).lerp(points[last], (offset - cumulative[first]) / (cumulative[last] - cumulative[first]));
    direction.subVectors(points[last], points[first]).normalize();
    const ground = sampleHeight(position.x, position.z);
    if (ground === undefined || !Number.isFinite(ground)) return false;
    position.y = ground;
    return true;
  }
  return { points, visualLength, sampleHeight, poseAt };
}
