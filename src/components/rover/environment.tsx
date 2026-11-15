import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { Box3, Object3D, Vector3 } from 'three';
import type { Traverse } from './traverse';

export function TerrainLighting({ traverse }: { traverse: Traverse }) {
  const { center, radius, target } = useMemo(() => {
    const bounds = new Box3().setFromPoints(traverse.points);
    const center = bounds.getCenter(new Vector3());
    const radius = Math.max(30, bounds.getSize(new Vector3()).length() * 0.65);
    const target = new Object3D();
    target.position.copy(center);
    return { center, radius, target };
  }, [traverse]);
  return <>
    <color attach="background" args={['#d3a582']} />
    <fogExp2 attach="fog" args={['#cb9575', 0.009]} />
    <hemisphereLight args={['#ffe3c4', '#633925', 2.05]} />
    <primitive object={target} />
    <directionalLight position={[center.x - radius, center.y + radius * 1.3, center.z + radius * 0.8]}
      color="#ffe0b4" intensity={2.5} target={target} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-radius} shadow-camera-right={radius} shadow-camera-top={radius}
      shadow-camera-bottom={-radius} shadow-camera-far={radius * 4} shadow-normalBias={0.035} />
  </>;
}

export function RouteOverlay({ traverse, emergency }: { traverse: Traverse; emergency: boolean }) {
  const path = useMemo(() => traverse.points.map(point => point.clone().add(new Vector3(0, 0.19, 0))), [traverse]);
  const end = path[path.length - 1];
  const color = emergency ? '#ff6666' : '#67e8f9';
  return <group>
    <Line points={path} color="#492c23" lineWidth={5} transparent opacity={0.65} />
    <Line points={path} color={color} lineWidth={2.6} />
    <mesh position={[end.x, end.y + 0.65, end.z]}>
      <cylinderGeometry args={[0.025, 0.025, 1.3, 8]} /><meshBasicMaterial color={color} />
    </mesh>
    <mesh position={[end.x, end.y + 1.31, end.z]}>
      <octahedronGeometry args={[0.18]} /><meshBasicMaterial color={color} />
    </mesh>
  </group>;
}
