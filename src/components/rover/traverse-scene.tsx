import { useEffect, useMemo, type ComponentProps } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { Float32BufferAttribute, Mesh, MeshStandardMaterial, SRGBColorSpace } from 'three';
import type { GridPosition } from '../../services/routingApi';
import { RouteOverlay, TerrainLighting } from './environment';
import { createMeshHeightSampler } from './mesh-terrain';
import { Mission, MissionCamera, type CameraMode } from './mission';
import { createTraverse } from './traverse';
import metadata from '../../../backend/data/terrain_metadata.json';

type Props = Omit<ComponentProps<typeof Mission>, 'traverse'> & {
  cells: readonly GridPosition[];
  emergency: boolean;
  cameraMode: CameraMode;
};

export function TraverseScene({ cells, emergency, cameraMode, ...mission }: Props) {
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'terrain/gale-hirise.glb');
  const ortho = useTexture(import.meta.env.BASE_URL + 'terrain/gale-hirise-ortho.jpg');
  const { world, sampleHeight, geometry, material } = useMemo(() => {
    const world = scene.clone(true);
    const ground = world.getObjectByName('Ground');
    if (!(ground instanceof Mesh)) throw new Error('The HiRISE terrain mesh is missing.');
    const sampleHeight = createMeshHeightSampler(world, ['Ground']);
    const geometry = ground.geometry.clone();
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox!;
    const positions = geometry.getAttribute('position');
    const uv = new Float32Array(positions.count * 2);
    const { width_cells: columns, height_cells: rows } = metadata.grid;
    // Map posts to cell centers. The image includes half a grid cell beyond each edge.
    for (let i = 0; i < positions.count; i++) {
      const east = (positions.getX(i) - min.x) / (max.x - min.x);
      const north = (positions.getZ(i) - min.z) / (max.z - min.z);
      uv[i * 2] = (east * (columns - 1) + 0.5) / columns;
      uv[i * 2 + 1] = (north * (rows - 1) + 0.5) / rows;
    }
    geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    ortho.colorSpace = SRGBColorSpace;
    ortho.anisotropy = 8;
    ortho.needsUpdate = true;
    const material = new MeshStandardMaterial({ map: ortho, color: '#aea0a2', roughness: 1 });
    ground.geometry = geometry;
    ground.material = material;
    ground.receiveShadow = true;
    return { world, sampleHeight, geometry, material };
  }, [scene, ortho]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);
  const traverse = useMemo(() => createTraverse(cells, sampleHeight), [cells, sampleHeight]);

  return <>
    <primitive object={world} dispose={null} />
    <TerrainLighting traverse={traverse} />
    <RouteOverlay traverse={traverse} emergency={emergency} />
    <Mission {...mission} traverse={traverse} />
    <MissionCamera mode={cameraMode} controls={mission.controls} />
  </>;
}
