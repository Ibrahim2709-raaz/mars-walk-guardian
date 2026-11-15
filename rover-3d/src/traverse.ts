import * as T from 'three'
import { wheelStations } from './rover-model.mjs'

export type Waypoint = readonly [number, number]
export type HeightSampler = (x: number, z: number) => number | undefined
export type Traverse = ReturnType<typeof createTraverse>

export function sampleWheelGround(sampleHeight: HeightSampler, x: number, z: number, yaw: number, result: number[]) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw)
  for (const [i, [lateral, longitudinal]] of wheelStations.entries()) {
    const y = sampleHeight(x + lateral * cos + longitudinal * sin, z + longitudinal * cos - lateral * sin)
    if (y === undefined || !Number.isFinite(y)) return false
    result[i] = y
  }
  return true
}

export function createTraverse(waypoints: readonly Waypoint[], sampleHeight: HeightSampler) {
  if (waypoints.length < 2 || waypoints.some(p => !p.every(Number.isFinite))) {
    throw new Error('The route needs at least two finite X/Z waypoints.')
  }
  const path = new T.CatmullRomCurve3(waypoints.map(([x, z]) => new T.Vector3(x, 0, z)))
  const divisions = Math.max(16, Math.ceil(path.getLength() / .25))
  const points = path.getSpacedPoints(divisions)
  const tangent = new T.Vector3(), heights: number[] = []
  for (const [i, point] of points.entries()) {
    const t = i / divisions
    const ground = sampleHeight(point.x, point.z)
    path.getTangentAt(t, tangent)
    const yaw = Math.atan2(tangent.x, tangent.z)
    if (ground === undefined || !Number.isFinite(ground) || !sampleWheelGround(sampleHeight, point.x, point.z, yaw, heights)) {
      throw new Error('The route or a wheel leaves the terrain near X ' + point.x.toFixed(2) + ', Z ' + point.z.toFixed(2) + '. Move the waypoints away from holes and edges.')
    }
    point.y = ground
  }
  // Follow the smooth horizontal spline and use the surveyed ground profile for arc length.
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + points[i].distanceTo(points[i - 1]))
  const length = cumulative[divisions]
  if (length < .01 || !Number.isFinite(length)) throw new Error('The route must have a nonzero length.')
  function parameterAt(distance: number) {
    const d = T.MathUtils.clamp(distance, 0, length)
    let lo = 0, hi = divisions
    while (hi - lo > 1) {
      const mid = (hi + lo) >> 1
      if (cumulative[mid] > d) hi = mid
      else lo = mid
    }
    const span = cumulative[hi] - cumulative[lo]
    return (lo + (span > 0 ? (d - cumulative[lo]) / span : 0)) / divisions
  }
  function poseAt(distance: number, position: T.Vector3, direction: T.Vector3) {
    const t = parameterAt(distance)
    path.getPointAt(t, position)
    path.getTangentAt(t, direction)
    const ground = sampleHeight(position.x, position.z)
    if (ground === undefined || !Number.isFinite(ground)) return false
    position.y = ground
    return true
  }
  return {points, length, sampleHeight, poseAt}
}
