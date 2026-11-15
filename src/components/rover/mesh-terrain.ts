import * as T from 'three'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'
import type { HeightSampler } from './traverse'

// Static meshes use a downward ray in scene coordinates. Each unique geometry
// shares its acceleration structure, including meshes with different transforms.
export function createMeshHeightSampler(root: T.Object3D, groundNodes?: readonly string[]) {
  root.updateMatrixWorld(true)
  const nodes = groundNodes?.length
    ? groundNodes.map(name => {
      const node = root.getObjectByName(name)
      if (!node) throw new Error('Terrain node "' + name + '" was not found in the model.')
      return node
    })
    : [root]
  const colliders = new Map<T.Object3D, T.Mesh>()
  const geometries = new Map<T.BufferGeometry, T.BufferGeometry>()
  const material = new T.MeshBasicMaterial({side: T.DoubleSide})
  for (const node of nodes) node.traverse(object => {
    if (!(object instanceof T.Mesh) || object instanceof T.InstancedMesh ||
      object instanceof T.SkinnedMesh || colliders.has(object)) return
    const source: T.BufferGeometry = object.geometry
    let geometry = geometries.get(source)
    if (!geometry) {
      if (!source.attributes.position?.count) return
      const copy = source.clone()
      copy.boundsTree = new MeshBVH(copy)
      geometries.set(source, copy)
      geometry = copy
    }
    const collider = new T.Mesh(geometry, material)
    collider.matrixWorld.copy(object.matrixWorld)
    collider.raycast = acceleratedRaycast
    colliders.set(object, collider)
  })
  const bounds = new T.Box3()
  const meshes = [...colliders.values()]
  const meshBounds = new T.Box3()
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox()
    bounds.union(meshBounds.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld))
  }
  if (bounds.isEmpty() || ![bounds.max.y, bounds.min.y].every(Number.isFinite)) {
    throw new Error('The terrain needs at least one static ground mesh.')
  }
  const ray = new T.Raycaster()
  ray.firstHitOnly = true
  ray.ray.direction.set(0, -1, 0)
  ray.far = bounds.max.y - bounds.min.y + 2
  const hits: T.Intersection[] = []
  const sampleHeight: HeightSampler = (x, z) => {
    if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) return undefined
    ray.ray.origin.set(x, bounds.max.y + 1, z)
    hits.length = 0
    ray.intersectObjects(meshes, false, hits)
    return hits[0]?.point.y
  }
  return sampleHeight
}
