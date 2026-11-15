import { useMemo } from 'react';
import { Billboard, Line } from '@react-three/drei';
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
    <color attach="background" args={['#1d1c24']} />
    <fogExp2 attach="fog" args={['#26252e', 0.005]} />
    <hemisphereLight args={['#dbe4ff', '#49404b', 1.35]} />
    <primitive object={target} />
    <directionalLight position={[center.x - radius, center.y + radius * 0.8, center.z + radius * 0.8]}
      color="#f0d9c9" intensity={2.0} target={target} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-radius} shadow-camera-right={radius} shadow-camera-top={radius}
      shadow-camera-bottom={-radius} shadow-camera-far={radius * 4} shadow-normalBias={0.035} />
  </>;
}

export function RouteOverlay({ traverse, emergency }: { traverse: Traverse; emergency: boolean }) {
  const path = useMemo(() => traverse.points.map(point => point.clone().add(new Vector3(0, 0.19, 0))), [traverse]);
  const start = path[0];
  const end = path[path.length - 1];
  const color = emergency ? '#ff6666' : '#67e8f9';
  return <group>
    <Line points={path} color="#15131a" lineWidth={5} transparent opacity={0.65} />
    <Line points={path} color={color} lineWidth={2.6} />
    <WaypointPin point={start} color="#fb923c" />
    <WaypointPin point={end} color={emergency ? '#ff6666' : '#34d6af'} />
  </group>;
}

function WaypointPin({ point, color }: { point: Vector3; color: string }) {
  return <group position={point}>
    <mesh position={[0, 0.85, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 1.7, 8]} />
      <meshBasicMaterial color="#fff4e9" toneMapped={false} />
    </mesh>
    <Billboard position={[0, 1.7, 0]}>
      <mesh>
        <circleGeometry args={[0.27, 24]} />
        <meshBasicMaterial color="#fff4e9" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[0.21, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </Billboard>
  </group>;
}
