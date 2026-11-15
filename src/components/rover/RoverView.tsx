import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { OrbitControls } from 'three-stdlib';
import type { RouteResult } from '../../services/routingApi';
import type { RoverTelemetry } from '../../types';
import { type CameraMode, type Command, type Playback } from './mission';
import { TraverseScene } from './traverse-scene';

const VISUAL_TIME_ACCELERATION = 40;
const button = 'rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40';

interface RoverViewProps {
  result: RouteResult | null;
  isEmergency: boolean;
  isRouting: boolean;
  routingError: string | null;
  telemetry: RoverTelemetry;
  onReset: () => void;
}

function Message({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div role={error ? 'alert' : 'status'} className="grid h-full place-items-center bg-slate-900 p-6 text-center text-sm text-slate-200">{children}</div>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { message: error.message || 'The rover scene could not be initialized.' };
  }
  render() {
    return this.state.message
      ? <Message error>3D Rover is unavailable. Check WebGL 2 and the model assets. {this.state.message}</Message>
      : this.props.children;
  }
}

function PlaybackView({
  result, isEmergency, isRouting, telemetry, onReset
}: Omit<RoverViewProps, 'result' | 'routingError'> & { result: RouteResult }) {
  const [playing, setPlaying] = useState(isEmergency);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const controls = useRef<OrbitControls | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const command = useRef<Command>({ playing: isEmergency, progressPerSecond: 0, reset: 0, mode: 'follow' });
  const stop = useCallback(() => {
    command.current.playing = false;
    setPlaying(false);
  }, []);
  const progress = playback?.progress ?? 0;

  useEffect(() => {
    const element = viewport.current;
    const loseContext = () => { setContextLost(true); stop(); };
    element?.addEventListener('webglcontextlost', loseContext, true);
    return () => element?.removeEventListener('webglcontextlost', loseContext, true);
  }, [stop]);

  useEffect(() => {
    command.current.playing = playing && !isRouting && !contextLost;
    command.current.progressPerSecond = telemetry.speedCmPerSec / 100 * VISUAL_TIME_ACCELERATION / result.distance_m;
    command.current.mode = cameraMode;
  }, [playing, isRouting, contextLost, telemetry.speedCmPerSec, result.distance_m, cameraMode]);

  function reset() {
    stop();
    command.current.reset += 1;
    setPlayback(null);
    onReset();
  }

  function togglePlayback() {
    if (!playing && (progress === 1 || playback?.terrainBlocked)) {
      command.current.reset += 1;
      setPlayback(null);
    }
    setPlaying(!playing);
  }

  return <section className="absolute inset-0 flex flex-col bg-slate-950 text-slate-100" aria-label="3D rover traverse">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
      <h2 className={isEmergency ? 'text-sm font-bold text-red-300' : 'text-sm font-bold text-cyan-300'}>
        {isEmergency ? 'Emergency return to Gale Base' : 'Gale Base to Sol 4621 candidate'}
      </h2>
      <span className="font-mono text-xs text-slate-300">{result.distance_m.toFixed(2)} m · Python route</span>
    </div>
    <div ref={viewport} className="relative min-h-0 flex-1">
      {contextLost ? <Message error>WebGL context lost. Switch views and return to retry.</Message> :
        <SceneBoundary>
          <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 49, near: 0.1, far: 530 }}
            fallback={<Message error>WebGL 2 is unavailable in this browser. The other views remain available.</Message>}>
            <Suspense fallback={null}>
              <TraverseScene cells={result.path} emergency={isEmergency} cameraMode={cameraMode}
                command={command} controls={controls} onPlayback={setPlayback} onStop={stop} />
            </Suspense>
          </Canvas>
        </SceneBoundary>}
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-700 p-2">
      <button type="button" className={button} onClick={togglePlayback} disabled={!playback || isRouting || contextLost}>
        {playing ? 'Pause' : progress === 1 || playback?.terrainBlocked ? 'Replay' : 'Start'}
      </button>
      <button type="button" className={button} onClick={reset} disabled={isRouting}>Reset</button>
      <label className="flex items-center gap-2 text-xs text-slate-300">Camera
        <select className={button} value={cameraMode} onChange={event => setCameraMode(event.target.value as CameraMode)}>
          <option value="follow">Follow</option><option value="free">Free</option><option value="cinematic">Cinematic</option>
        </select>
      </label>
      <span className="ml-auto text-xs text-slate-300" role="status">
        {contextLost ? 'WebGL unavailable' : isRouting ? 'Requesting route…' : playback?.terrainBlocked ? 'Playback stopped at a terrain gap' :
          playback ? `${Math.round(progress * 100)}% playback` : 'Loading terrain and rover…'}
      </span>
    </div>
    <p className="px-3 pb-1 text-xs text-slate-300">Visual time acceleration: {VISUAL_TIME_ACCELERATION}× · Simulated rover speed: {telemetry.speedCmPerSec} cm/s</p>
    <p className="px-3 pb-2 text-[11px] text-slate-400">
      Measured NASA-derived HiRISE elevation. Illustrative terrain colors. Simulated slip, blockage, and telemetry.
      {' '}The science target is a Sol 4621 waypoint-linked candidate with unconfirmed geology.
    </p>
  </section>;
}

export default function RoverView(props: RoverViewProps) {
  const { result, isEmergency, isRouting, routingError } = props;
  if (!result || !result.feasible || result.path.length < 2 || !(result.distance_m > 0)) {
    return <Message error={Boolean(routingError)}>{routingError || (isRouting
      ? 'Waiting for the Python routing service…'
      : 'A feasible Python route is required to show the rover traverse.')}</Message>;
  }
  return <PlaybackView {...props} result={result} key={isEmergency ? 'emergency' : 'nominal'} />;
}
