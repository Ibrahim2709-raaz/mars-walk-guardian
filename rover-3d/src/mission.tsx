import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import type { OrbitControls as OrbitController } from 'three-stdlib'
import * as T from 'three'
import { noiseSequence } from './terrain'
import { sampleWheelGround, type Traverse } from './traverse'
import { wheelRadius, wheelStations } from './rover-model.mjs'

export type CameraMode='free'|'follow'|'cinematic'
export type Telemetry={speed:number,distance:number,progress:number,arrived:boolean,routeLength?:number,terrainBlocked?:boolean}
export type Command={playing:boolean,speed:number,reset:number,mode:CameraMode,zoom:number}
const asset=import.meta.env.BASE_URL+'models/mwg-rover.glb'
const travel=new T.Vector3(), ahead=new T.Vector3(), tangent=new T.Vector3()
const up=new T.Vector3(0,1,0)
const damp=T.MathUtils.damp
const mix=T.MathUtils.lerp

export function Mission({command,onTelemetry,onArrival,controls,traverse}:{
  command:MutableRefObject<Command>,onTelemetry:(data:Telemetry)=>void,onArrival:()=>void,
  controls:MutableRefObject<OrbitController|null>,traverse:Traverse
}){
  const routeLength=traverse.length
  const wheelGround=useRef<number[]>([])
  const {scene}=useGLTF(asset)
  const rig=useMemo(()=>{
    const root=scene.clone(true)
    root.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=o.receiveShadow=true})
    const required=(name:string)=>{
      const node=root.getObjectByName(name)
      if(!node)throw new Error('Missing rover joint '+name)
      return node
    }
    const chassis=required('chassis')
    const bodyJoints=wheelStations.map(([x,z],i)=>{
      const mount=required('wheel_mount_'+i)
      const steer=required('steer_'+i)
      const spin=required('spin_'+i)
      return {x,z,mount,steer,spin}
    })
    const suspension=[-1,1].map(sign=>{
      const prefix=sign<0?'suspension_left':'suspension_right'
      const links=Array.from({length:5},(_,i)=>required(prefix+'_link_'+i))
      const joints=Array.from({length:4},(_,i)=>required(prefix+'_joint_'+i))
      return {sign,links,joints}
    })
    return {root,chassis,mast:required('mast_head'),arm:required('arm_shoulder'),bodyJoints,suspension}
  },[scene])
  const dustRef=useRef<T.Points>(null)
  const dust=useMemo(()=>{
    const points=new Float32Array(90*3).fill(-1000)
    return {points,ages:new Float32Array(90),max:new Float32Array(90),velocity:new Float32Array(90*3),random:noiseSequence(4743),next:0,carry:0}
  },[])
  const clock=useRef({distance:0,speed:0,rotation:0,reset:-1,elapsed:0,tick:0,yaw:0,arrived:false,terrainBlocked:false,mode:'free' as CameraMode})
  const focus=useMemo(()=>new T.Vector3(),[])
  const cameraGoal=useMemo(()=>new T.Vector3(),[])
  const previousFocus=useMemo(()=>new T.Vector3(),[])
  const a=useMemo(()=>new T.Vector3(),[]), b=useMemo(()=>new T.Vector3(),[]), axis=useMemo(()=>new T.Vector3(),[])
  function setLink(mesh:T.Object3D, start:T.Vector3,end:T.Vector3){
    axis.copy(end).sub(start)
    mesh.position.copy(start).lerp(end,.5)
    mesh.scale.y=axis.length()
    mesh.quaternion.setFromUnitVectors(up,axis.normalize())
  }
  useFrame(({camera}, frameDelta)=>{
    const dt=Math.min(frameDelta,.043)
    const c=command.current, sim=clock.current
    const reset=sim.reset!==c.reset
    if(reset){
      Object.assign(sim,{distance:0,speed:0,rotation:0,elapsed:0,arrived:false,terrainBlocked:false,reset:c.reset})
      dust.ages.fill(0);dust.max.fill(0);dust.points.fill(-1000)
    }
    sim.elapsed+=dt
    const previousDistance=sim.distance
    const remaining=Math.max(0,routeLength-previousDistance)
    const targetSpeed=c.playing&&!sim.arrived?Math.min(c.speed,Math.sqrt(2*1.25*remaining)):0
    const initialSpeed=sim.speed
    sim.speed+=T.MathUtils.clamp(targetSpeed-sim.speed,-1.45*dt,1.05*dt)
    const step=Math.min(remaining,(initialSpeed+sim.speed)*.5*dt)
    sim.distance+=step
    const arriving=remaining-step<.008&&c.playing&&!sim.arrived
    if(arriving)sim.distance=routeLength
    const progress=sim.distance/routeLength
    const hasGround=traverse.poseAt(sim.distance,travel,tangent)
    ahead.copy(tangent)
    traverse.poseAt(sim.distance+routeLength*.026,b,ahead)
    const heading=Math.atan2(tangent.x,tangent.z)
    const nextHeading=Math.atan2(ahead.x,ahead.z)
    const difference=Math.atan2(Math.sin(heading-sim.yaw),Math.cos(heading-sim.yaw))
    const yaw=reset?heading:sim.yaw+difference*(1-Math.exp(-dt*8))
    if(!hasGround||!sampleWheelGround(traverse.sampleHeight,travel.x,travel.z,yaw,wheelGround.current)){
      sim.distance=previousDistance
      sim.speed=0
      if(!sim.terrainBlocked){
        sim.terrainBlocked=true;onArrival()
        onTelemetry({speed:0,distance:sim.distance,progress:sim.distance/routeLength,arrived:false,routeLength,terrainBlocked:true})
      }
      return
    }
    if(arriving){sim.speed=0;sim.arrived=true;onArrival()}
    sim.yaw=yaw
    const turn=Math.atan2(Math.sin(nextHeading-heading),Math.cos(nextHeading-heading))
    rig.root.position.copy(travel)
    rig.root.rotation.y=sim.yaw
    const sin=Math.sin(sim.yaw),cos=Math.cos(sim.yaw)
    let front=0,back=0,left=0,right=0,total=0
    for(const [index,w] of rig.bodyJoints.entries()){
      const y=wheelGround.current[index]-travel.y+wheelRadius
      w.mount.position.set(w.x,y,w.z)
      if(w.z>.5)front+=y/2
      if(w.z<-.5)back+=y/2
      if(w.x<0)left+=y/3
      else right+=y/3
      total+=y/6
      const steering=(index%3===1?0:index%3===0?1:-.55)*T.MathUtils.clamp(turn*2.45,-.46,.46)
      w.steer.rotation.y=reset?0:damp(w.steer.rotation.y,steering,8,dt)
      w.spin.rotation.x=sim.rotation+step/wheelRadius
    }
    sim.rotation=(sim.rotation+step/wheelRadius)%(Math.PI*2)
    rig.chassis.position.y=reset?total+.44:damp(rig.chassis.position.y,total+.44,8,dt)
    rig.chassis.rotation.x=reset?0:damp(rig.chassis.rotation.x,-Math.atan2(front-back,1.97),7,dt)
    rig.chassis.rotation.z=reset?0:damp(rig.chassis.rotation.z,Math.atan2(right-left,1.90),7,dt)
    rig.mast.rotation.y=Math.sin(sim.elapsed*.82)*mix(.25,.055,Math.min(1,sim.speed))
    rig.arm.rotation.x=.035+Math.sin(sim.elapsed*1.12)*.022*Math.exp(-sim.speed)
    rig.chassis.updateMatrix()
    for(const [index,side] of rig.suspension.entries()){
      const [frontMount,middleMount,rearMount]=rig.bodyJoints.slice(index*3,index*3+3)
      const rocker=new T.Vector3(side.sign*.699,-.104,-.04).applyMatrix4(rig.chassis.matrix)
      const bogie=new T.Vector3(side.sign*.785,(middleMount.mount.position.y+rearMount.mount.position.y)*.5+.21,-.43)
      const frontPoint=frontMount.mount.position.clone().setX(side.sign*.80)
      const middlePoint=middleMount.mount.position.clone().setX(side.sign*.80)
      const rearPoint=rearMount.mount.position.clone().setX(side.sign*.80)
      setLink(side.links[0],rocker,frontPoint);setLink(side.links[1],rocker,bogie)
      setLink(side.links[2],bogie,middlePoint);setLink(side.links[3],bogie,rearPoint)
      a.copy(rocker).add(new T.Vector3(0,.19,.13))
      b.copy(frontPoint).lerp(rocker,.34)
      setLink(side.links[4],a,b)
      for(const [i,point] of [rocker,bogie,frontPoint,rearPoint].entries())side.joints[i].position.copy(point)
    }
    dust.carry+=step*17
    for(;dust.carry>=1;dust.carry--){
      const i=dust.next++%90,j=i*3,offset=dust.random()<.5?-.91:.91
      dust.points[j]=travel.x+cos*offset-sin*.94
      dust.points[j+1]=travel.y+.18
      dust.points[j+2]=travel.z-sin*offset-cos*.94
      dust.velocity[j]=(dust.random()-.5)*.49-sin*.48
      dust.velocity[j+1]=.10+dust.random()*.24
      dust.velocity[j+2]=(dust.random()-.5)*.49-cos*.48
      dust.ages[i]=0;dust.max[i]=.50+dust.random()*.80
    }
    for(let i=0;i<90;i++){
      dust.ages[i]+=dt
      for(let j=0;j<3;j++)dust.points[i*3+j]=dust.ages[i]>=dust.max[i]?-1000:dust.points[i*3+j]+dust.velocity[i*3+j]*dt
    }
    if(dustRef.current)dustRef.current.geometry.attributes.position.needsUpdate=true
    focus.copy(travel).y+=1.05
    const orbit=controls.current, switchMode=sim.mode!==c.mode
    if(orbit&&c.mode==='free'){
      if(reset||switchMode){
        orbit.target.copy(focus)
        if(reset)camera.position.set(travel.x-5.5,travel.y+3.25,travel.z+6.7)
        orbit.update()
      }
    }else if(orbit){
      const radius=(c.mode==='follow'?8:9.6)*c.zoom
      const azimuth=sim.yaw+(c.mode==='follow'?.57:-.86+Math.sin(sim.elapsed*.21)*.94)
      const height=(c.mode==='follow'?3.9:3.4+1.35*Math.sin(sim.elapsed*.19))*c.zoom
      cameraGoal.copy(focus).add(new T.Vector3(Math.sin(azimuth)*radius,height,Math.cos(azimuth)*radius))
      if(reset)camera.position.copy(cameraGoal)
      else camera.position.lerp(cameraGoal,1-Math.exp(-dt*(c.mode==='follow'?3.5:1.6)))
      if(reset||switchMode)previousFocus.copy(focus)
      previousFocus.lerp(focus,1-Math.exp(-dt*5))
      orbit.target.copy(previousFocus)
      camera.lookAt(previousFocus)
    }
    sim.mode=c.mode
    sim.tick+=dt
    if(sim.tick>.105||reset){
      sim.tick=0
      onTelemetry({speed:sim.speed,distance:sim.distance,progress,arrived:sim.arrived,routeLength,terrainBlocked:sim.terrainBlocked})
    }
  })
  return <>
    <primitive object={rig.root} dispose={null}/>
    <points ref={dustRef} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[dust.points,3]} usage={T.DynamicDrawUsage}/></bufferGeometry>
      <pointsMaterial size={.09} color="#d7a681" transparent opacity={.35} depthWrite={false}/>
    </points>
  </>
}

export function MissionCamera({mode,controls}:{mode:CameraMode,controls:MutableRefObject<OrbitController|null>}){
  return <OrbitControls ref={controls} enabled={mode==='free'} enableDamping enablePan={false}
    minDistance={2.6} maxDistance={40} minPolarAngle={.18} maxPolarAngle={Math.PI*.48} makeDefault/>
}
useGLTF.preload(asset)
