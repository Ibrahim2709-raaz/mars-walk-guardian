import { useEffect, useMemo, useRef } from 'react'
import * as T from 'three'
import { Line } from '@react-three/drei'
import { GROUND, noiseSequence, relief, terrainHeight } from './terrain'
import type { Traverse } from './traverse'

function groundMesh(){
  const {width,depth,xSegments,zSegments,centerZ}=GROUND
  const geometry=new T.PlaneGeometry(width,depth,xSegments,zSegments).rotateX(-Math.PI/2).translate(0,0,centerZ)
  const coords=geometry.attributes.position, colors=new Float32Array(coords.count*3)
  const random=noiseSequence(7401), color=new T.Color()
  const lo=new T.Color('#723b29'), mid=new T.Color('#b77a51'), hi=new T.Color('#cf9566')
  for(let i=0;i<coords.count;i++){
    const x=coords.getX(i), z=coords.getZ(i)
    coords.setY(i,relief(x,z))
    const mix=.54+.17*Math.sin(x*.23+z*.31)+.16*Math.sin(x*.67-z*.32)+.24*(random()-.5)
    color.copy(mix<.5?lo:mid).lerp(mix<.5?mid:hi,mix<.5?mix*2:(mix-.5)*2)
    color.toArray(colors,i*3)
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3))
  geometry.computeVertexNormals()
  return geometry
}
function sandTexture(){
  const canvas=document.createElement('canvas')
  canvas.width=canvas.height=256
  const context=canvas.getContext('2d')!
  const data=context.createImageData(256,256)
  const random=noiseSequence(129)
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*256+x)*4, grit=191+38*random()+16*Math.sin(x*.36+y*.51)
    data.data.set([grit,grit,grit,255],i)
  }
  context.putImageData(data,0,0)
  const texture=new T.CanvasTexture(canvas)
  texture.wrapS=texture.wrapT=T.RepeatWrapping
  texture.repeat.set(88,96)
  texture.anisotropy=4
  return texture
}
function RockField({traverse}:{traverse:Traverse}){
  const inst=useRef<T.InstancedMesh>(null)
  const geometry=useMemo(()=>{
    const g=new T.IcosahedronGeometry(1,1), p=g.attributes.position
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i)
      const d=.84+.20*Math.sin(x*15.1+y*9.7+z*13.6)
      p.setXYZ(i,x*d,y*d,z*d)
    }
    g.computeVertexNormals(); return g
  },[])
  useEffect(()=>{
    const mesh=inst.current
    if(!mesh)return
    const random=noiseSequence(8171), dummy=new T.Object3D(), color=new T.Color()
    const points=traverse.points
    for(let i=0;i<1500;i++){
      let x:number,z:number
      do {
        x=(random()-.5)*145; z=random()*112-24
      } while(points.some(p=>Math.hypot(p.x-x,p.z-z)<1.65))
      const size=.04+random()**4*(i<220?1.30:.54)
      dummy.position.set(x,terrainHeight(x,z)+size*.13,z)
      dummy.rotation.set(random()*.6,random()*6.28,random()*.5)
      dummy.scale.set(size*(.68+random()*.66),size*(.37+random()*.42),size*(.75+random()*.64))
      dummy.updateMatrix()
      mesh.setMatrixAt(i,dummy.matrix)
      color.set(['#6e3d2d','#91624a','#af7957','#754a37','#bd8f72'][Math.floor(random()*5)])
      mesh.setColorAt(i,color)
    }
    mesh.instanceMatrix.needsUpdate=true
  },[traverse])
  return <instancedMesh ref={inst} args={[geometry,undefined,1500]} receiveShadow><meshStandardMaterial roughness={.94} flatShading/></instancedMesh>
}
function ridges(){
  const g=new T.PlaneGeometry(540,330,176,108).rotateX(-Math.PI/2).translate(0,0,24)
  const p=g.attributes.position, colors=new Float32Array(p.count*3)
  const random=noiseSequence(411)
  const peaks=Array.from({length:32},(_,i)=>{
    const a=i*Math.PI*2/32, radius=89+random()*32
    return [Math.cos(a)*radius,24+Math.sin(a)*radius,14+random()*21,15+random()*14]
  })
  const low=new T.Color('#6e392c'), high=new T.Color('#b97a62')
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i)
    let h=-5
    for(const [cx,cz,height,radius] of peaks){
      const d=Math.hypot(x-cx,(z-cz)*1.27)/radius
      h=Math.max(h,height*Math.max(0,1-d)**1.17-3.2)
    }
    h+=Math.sin(x*.55+z*.24)*Math.sin(z*.38)*Math.max(0,h)*.13
    p.setY(i,h)
    low.clone().lerp(high,T.MathUtils.clamp(.13+h*.018+random()*.2,0,1)).toArray(colors,i*3)
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeVertexNormals();return g
}
export function TerrainLighting({traverse}:{traverse:Traverse}){
  const {center,radius,target}=useMemo(()=>{
    const bounds=new T.Box3().setFromPoints(traverse.points)
    const center=bounds.getCenter(new T.Vector3())
    const radius=Math.max(30,bounds.getSize(new T.Vector3()).length()*.65)
    const target=new T.Object3D()
    target.position.copy(center)
    return {center,radius,target}
  },[traverse])
  return <>
    <color attach="background" args={['#d3a582']}/>
    <fogExp2 attach="fog" args={['#cb9575',.009]}/>
    <hemisphereLight args={['#ffe3c4','#633925',2.05]}/>
    <primitive object={target}/>
    <directionalLight position={[center.x-radius,center.y+radius*1.3,center.z+radius*.8]} color="#ffe0b4" intensity={2.5} target={target} castShadow shadow-mapSize={[2048,2048]}
      shadow-camera-left={-radius} shadow-camera-right={radius} shadow-camera-top={radius} shadow-camera-bottom={-radius} shadow-camera-near={1} shadow-camera-far={radius*4} shadow-normalBias={.035}/>
  </>
}
export function Landscape({traverse}:{traverse:Traverse}){
  const geometry=useMemo(groundMesh,[])
  const texture=useMemo(sandTexture,[])
  const far=useMemo(ridges,[])
  return <>
    <mesh geometry={far}><meshStandardMaterial vertexColors flatShading roughness={1}/></mesh>
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors map={texture} roughness={.98}/></mesh>
    <RockField traverse={traverse}/>
  </>
}
export function RouteOverlay({traverse}:{traverse:Traverse}){
  const path=useMemo(()=>traverse.points.map(p=>p.clone().add(new T.Vector3(0,.17,0))),[traverse])
  const finish=path.at(-1)!
  return <group>
      <Line points={path} color="#492c23" lineWidth={5} transparent opacity={.63}/>
      <Line points={path} color="#ffd192" lineWidth={2.3} dashed dashSize={.55} gapSize={.31}/>
      <mesh position={finish} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.69,.8,40]}/><meshBasicMaterial color="#ffe0a6" side={T.DoubleSide}/></mesh>
      <mesh position={[finish.x,finish.y+.65,finish.z]}>
        <cylinderGeometry args={[.025,.025,1.3,8]}/><meshBasicMaterial color="#ffe0a6"/>
      </mesh>
      <mesh position={[finish.x,finish.y+1.31,finish.z]}><octahedronGeometry args={[.18]}/><meshBasicMaterial color="#ffdfab"/></mesh>
  </group>
}
