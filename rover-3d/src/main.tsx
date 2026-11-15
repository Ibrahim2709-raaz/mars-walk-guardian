import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import type { OrbitControls as OrbitController } from 'three-stdlib'
import { type CameraMode, type Command, type Telemetry } from './mission'
import { terrainConfig } from './terrain-config'
import { TraverseScene } from './traverse-scene'
import './styles.css'

type IconName='play'|'pause'|'reset'|'route'|'free'|'follow'|'cinematic'|'minus'|'plus'|'expand'
const paths:Record<IconName,ReactNode>={
  play:<path d="M8 5v14l12-7z" fill="currentColor" stroke="none"/>,
  pause:<path d="M9 5v14M15 5v14"/>,
  reset:<><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/></>,
  route:<><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h8a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h8"/></>,
  free:<><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-30 12 12)"/></>,
  follow:<><path d="M8 4H4v4m12-4h4v4m0 8v4h-4m-8 0H4v-4"/><circle cx="12" cy="12" r="3"/></>,
  cinematic:<><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></>,
  minus:<path d="M5 12h14"/>, plus:<path d="M5 12h14m-7-7v14"/>,
  expand:<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>
}
function Icon({name,size=19}:{name:IconName,size?:number}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
class SceneBoundary extends Component<{children:ReactNode},{message:string|null}>{
  state={message:null as string|null}
  static getDerivedStateFromError(error:Error){return {message:error.message||'Scene initialization failed.'}}
  render(){return this.state.message?<SceneMessage error message={this.state.message}/>:this.props.children}
}
function SceneMessage({error=false,message}:{error?:boolean,message?:string}){
  return <div className="scene-message">{message??(error?'3D scene unavailable. Reload with WebGL enabled.':'Loading Mars terrain and rover…')}</div>
}
function App(){
  const [playing,setPlaying]=useState(false)
  const [mode,setMode]=useState<CameraMode>('free')
  const [routeVisible,setRoute]=useState(true)
  const [speed,setSpeed]=useState(1.4)
  const [data,setData]=useState<Telemetry>({speed:0,distance:0,progress:0,arrived:false})
  const [ready,setReady]=useState(false)
  const command=useRef<Command>({playing:false,speed:1.4,reset:0,mode:'free',zoom:1})
  const orbit=useRef<OrbitController|null>(null)
  const viewport=useRef<HTMLElement>(null)
  const stage=useRef<HTMLDivElement>(null)
  const arrival=useCallback(()=>{command.current.playing=false;setPlaying(false)},[])
  const telemetry=useCallback((value:Telemetry)=>{setReady(true);setData(value)},[])
  const reset=useCallback(()=>{
    Object.assign(command.current,{playing:false,reset:command.current.reset+1,zoom:1})
    setPlaying(false);setData(previous=>({speed:0,distance:0,progress:0,arrived:false,routeLength:previous.routeLength}))
  },[])
  const toggle=useCallback(()=>{
    if(!ready)return
    if(data.arrived||data.terrainBlocked){command.current.reset++;setData(previous=>({speed:0,distance:0,progress:0,arrived:false,routeLength:previous.routeLength}))}
    command.current.playing=!command.current.playing
    setPlaying(command.current.playing)
  },[data.arrived,data.terrainBlocked,ready])
  function changeCamera(next:CameraMode){command.current.mode=next;setMode(next)}
  const zoom=useCallback((factor:number)=>{
    const control=orbit.current
    if(command.current.mode!=='free')command.current.zoom=Math.min(2.2,Math.max(.45,command.current.zoom*factor))
    else if(control){
      const offset=control.object.position.clone().sub(control.target)
      offset.setLength(Math.min(40,Math.max(2.6,offset.length()*factor)))
      control.object.position.copy(control.target).add(offset)
      control.update()
    }
  },[])
  function fullscreen(){
    const action=document.fullscreenElement?document.exitFullscreen():viewport.current?.requestFullscreen()
    action?.catch(()=>{})
  }
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.repeat||(e.target instanceof HTMLElement&&e.target.closest('button,input,select,a')))return
      if(e.code==='Space'){e.preventDefault();toggle()}
      if(e.key.toLowerCase()==='r')reset()
      if(e.key==='1')changeCamera('free')
      if(e.key==='2')changeCamera('follow')
      if(e.key==='3')changeCamera('cinematic')
      if(e.key==='+'||e.key==='=')zoom(.82)
      if(e.key==='-')zoom(1.22)
      if(e.key.startsWith('Arrow')&&command.current.mode==='free'&&document.activeElement===stage.current){
        const controls=orbit.current
        if(!controls)return
        e.preventDefault()
        const vector=controls.object.position.clone().sub(controls.target)
        const vertical=Math.acos(vector.y/vector.length())
        const azimuth=Math.atan2(vector.x,vector.z)+(e.key==='ArrowLeft'?.11:e.key==='ArrowRight'?-.11:0)
        const polar=Math.min(controls.maxPolarAngle,Math.max(controls.minPolarAngle,vertical+(e.key==='ArrowUp'?-.10:e.key==='ArrowDown'?.10:0)))
        vector.setFromSphericalCoords(vector.length(),polar,azimuth)
        controls.object.position.copy(controls.target).add(vector)
        controls.update()
      }
    }
    window.addEventListener('keydown',key)
    return ()=>window.removeEventListener('keydown',key)
  },[reset,toggle,zoom])
  const percent=Math.round(data.progress*100)
  const status=data.terrainBlocked?'Stopped · terrain gap':data.arrived?'Target reached':playing?'Traversing':data.speed>.03?'Braking':data.distance>0?'Paused':'Standby'
  return <main className="dashboard">
    <header className="masthead">
      <div className="brand"><span className="brand-mark"><Icon name="free" size={23}/></span><div>MARS WALK <strong>GUARDIAN</strong></div></div>
      <span className="simulation"><span/> Mission simulation</span>
    </header>
    <div className="heading">
      <div><div className="kicker">{terrainConfig.location}</div><h1>Rover traverse<span>.</span></h1></div>
      <div className="mission-id"><span>MISSION ROUTE</span><strong>{terrainConfig.destination}</strong></div>
    </div>
    <section ref={viewport} className="viewport" aria-label="Mars mission viewport">
      <div className="canvas-shell" tabIndex={0} ref={stage} aria-label="3D scene. Drag or use arrow keys to orbit in free camera. Use plus and minus to zoom.">
        <SceneBoundary><Canvas shadows dpr={[1,1.6]} camera={{position:[-4.5,4,10.7],fov:49,near:.10,far:530}} fallback={<SceneMessage error/>}>
          <Suspense fallback={null}>
            <TraverseScene showRoute={routeVisible} mode={mode} command={command} controls={orbit} onTelemetry={telemetry} onArrival={arrival}/>
          </Suspense>
        </Canvas></SceneBoundary>
      </div>
      <div className="view-top">
        <div className={'state '+(playing?'active':'')}><span/>{status}</div>
        <button className="square" title="Toggle fullscreen" aria-label="Toggle fullscreen" onClick={fullscreen}><Icon name="expand"/></button>
      </div>
      <div className="view-bottom">
        <div className="camera-group" aria-label="Camera mode">
          {(['free','follow','cinematic'] as const).map(camera=><button key={camera} aria-pressed={camera===mode} onClick={()=>changeCamera(camera)}><Icon name={camera} size={16}/><span>{camera}</span></button>)}
        </div>
        <div className="view-tools">
          <button className="square route-button" aria-pressed={routeVisible} onClick={()=>setRoute(!routeVisible)} title="Toggle planned route" aria-label="Toggle planned route"><Icon name="route" size={17}/></button>
          <button className="square" title="Zoom out" aria-label="Zoom out" onClick={()=>zoom(1.22)}><Icon name="minus" size={17}/></button>
          <button className="square" title="Zoom in" aria-label="Zoom in" onClick={()=>zoom(.82)}><Icon name="plus" size={17}/></button>
        </div>
      </div>
      {!ready&&<div className="loading">Preparing rover scene…</div>}
    </section>
    <section className="dock" aria-label="Mission controls and telemetry">
      <div className="transport">
        <button className="start" onClick={toggle} disabled={!ready}><Icon name={playing?'pause':'play'} size={18}/>{data.arrived||data.terrainBlocked?'Restart':playing?'Pause':'Start'}</button>
        <button className="reset" onClick={reset} disabled={!ready}><Icon name="reset" size={16}/>Reset</button>
      </div>
      <label className="speed"><span>Target speed <b>{speed.toFixed(1)} m/s</b></span><input type="range" min=".4" max="3.2" step=".1" value={speed} onChange={e=>{const value=+e.target.value;setSpeed(value);command.current.speed=value}}/></label>
      <div className="stat"><span>Live speed</span><strong>{data.speed.toFixed(1)} <small>m/s</small></strong></div>
      <div className="stat"><span>Distance</span><strong>{data.distance.toFixed(1)} <small>m</small></strong></div>
      <div className="stat progress"><span>Progress</span><strong>{percent}<small>%</small></strong><progress value={data.progress} max={1} aria-label="Route progress"/></div>
    </section>
    <footer><span>{terrainConfig.label}{data.routeLength!==undefined&&<> <i/> {data.routeLength.toFixed(1)} m planned route</>}</span><span>Drag to orbit <i/> Scroll to zoom <i/> Space to play / pause</span></footer>
  </main>
}
createRoot(document.getElementById('root')!).render(<App/>)
