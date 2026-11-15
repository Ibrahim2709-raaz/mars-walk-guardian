import { useMemo, type ComponentProps } from 'react';
import { useGLTF } from '@react-three/drei';
import { Mesh } from 'three';
import type { GridPosition } from '../../services/routingApi';
import { RouteOverlay, TerrainLighting } from './environment';
import { createMeshHeightSampler } from './mesh-terrain';
import { Mission, MissionCamera, type CameraMode } from './mission';
import { createTraverse } from './traverse';

type Props = Omit<ComponentProps<typeof Mission>, 'traverse'> & {
  cells: readonly GridPosition[];
  emergency: boolean;
  cameraMode: CameraMode;
};

export function TraverseScene({ cells, emergency, cameraMode, ...mission }: Props) {
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'terrain/gale-hirise.glb');
  const { world, sampleHeight } = useMemo(() => {
    const world = scene.clone(true);
    world.traverse(object => {
      if (object instanceof Mesh) object.receiveShadow = true;
    });
    return { world, sampleHeight: createMeshHeightSampler(world, ['Ground']) };
  }, [scene]);
  const traverse = useMemo(() => createTraverse(cells, sampleHeight), [cells, sampleHeight]);

  return <>
    <primitive object={world} dispose={null} />
    <TerrainLighting traverse={traverse} />
    <RouteOverlay traverse={traverse} emergency={emergency} />
    <Mission {...mission} traverse={traverse} />
    <MissionCamera mode={cameraMode} controls={mission.controls} />
  </>;
}
