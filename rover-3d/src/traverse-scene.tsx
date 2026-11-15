import { useMemo, type ComponentProps } from 'react'
import { useGLTF } from '@react-three/drei'
import * as T from 'three'
import { Landscape, RouteOverlay, TerrainLighting } from './environment'
import { Mission, MissionCamera, type CameraMode } from './mission'
import { createMeshHeightSampler } from './mesh-terrain'
import { terrainHeight } from './terrain'
import { terrainConfig, type TerrainConfig } from './terrain-config'
import { createTraverse, type Traverse } from './traverse'

type MissionProps = Omit<ComponentProps<typeof Mission>, 'traverse'> & {showRoute: boolean; mode: CameraMode}

function DriveScene({traverse, showRoute, mode, ...mission}: MissionProps & {traverse: Traverse}) {
  return <>
    <TerrainLighting traverse={traverse}/>
    {showRoute && <RouteOverlay traverse={traverse}/>}
    <Mission {...mission} traverse={traverse}/>
    <MissionCamera mode={mode} controls={mission.controls}/>
  </>
}

function DemoTerrain(props: MissionProps) {
  const traverse = useMemo(() => createTraverse(terrainConfig.waypoints, terrainHeight), [])
  return <>
    <Landscape traverse={traverse}/>
    <DriveScene {...props} traverse={traverse}/>
  </>
}

function ImportedTerrain({model, ...props}: MissionProps & {model: NonNullable<TerrainConfig['model']>}) {
  const publicRoot = new URL(import.meta.env.BASE_URL, document.baseURI)
  const {scene} = useGLTF(new URL(model.url, publicRoot).href)
  const {world, traverse} = useMemo(() => {
    const world = new T.Group()
    const scale = model.scale ?? 1
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('Terrain scale must be positive.')
    world.scale.setScalar(scale)
    const [x, y, z] = (model.rotationDegrees ?? [0,0,0]).map(T.MathUtils.degToRad)
    world.rotation.set(x, y, z)
    world.position.set(...(model.offset ?? [0,0,0]))
    const visual = scene.clone(true)
    visual.traverse(object => {
      if (object instanceof T.Mesh) object.receiveShadow = true
    })
    world.add(visual)
    const height = createMeshHeightSampler(world, model.groundNodes)
    return {world, traverse: createTraverse(terrainConfig.waypoints, height)}
  }, [model, scene])
  return <>
    <primitive object={world}/>
    <DriveScene {...props} traverse={traverse}/>
  </>
}

export function TraverseScene(props: MissionProps) {
  return terrainConfig.model ? <ImportedTerrain {...props} model={terrainConfig.model}/> : <DemoTerrain {...props}/>
}
