import React, { useEffect, useRef, useState, useCallback } from 'react';
import SceneView from '@arcgis/core/views/SceneView';
import Map from '@arcgis/core/Map';
import Camera from '@arcgis/core/Camera';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import Polygon from '@arcgis/core/geometry/Polygon';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import ElevationLayer from '@arcgis/core/layers/ElevationLayer';
import TileLayer from '@arcgis/core/layers/TileLayer';
import Basemap from '@arcgis/core/Basemap';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import '@arcgis/core/assets/esri/themes/dark/main.css';

import {
  marsSpatialReference,
  MARS_BOOKMARKS,
  MarsBookmark,
  metersToDegreesOnMars,
  findNearestLandmark
} from '../data/mars3DData';
import { RouteData } from '../types';
import { FirstPersonHUD, FirstPersonTelemetry } from './FirstPersonHUD';

interface Mars3DSceneProps {
  isEmergency: boolean;
  normalRoute: RouteData | null;
  emergencyRoute: RouteData | null;
  blockedHazardCells: { row: number; column: number }[] | null;
  initialMode?: 'orbital' | 'surface';
  onModeChange?: (mode: 'orbital' | 'surface') => void;
}

export const Mars3DScene: React.FC<Mars3DSceneProps> = ({
  isEmergency,
  normalRoute,
  emergencyRoute,
  blockedHazardCells,
  initialMode = 'orbital',
  onModeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const routeGraphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const markersGraphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const hazardGraphicsLayerRef = useRef<GraphicsLayer | null>(null);

  // Application State
  const [mode, setMode] = useState<'orbital' | 'surface'>(initialMode);
  const [isTerrainLoading, setIsTerrainLoading] = useState<boolean>(true);
  const [isDropModeActive, setIsDropModeActive] = useState<boolean>(false);

  // First-Person Controller State
  const [eyeHeightM, setEyeHeightM] = useState<number>(1.7);
  const [telemetry, setTelemetry] = useState<FirstPersonTelemetry>({
    latitude: -4.80426,
    longitude: 137.38017,
    elevationM: -3631,
    headingDeg: 0,
    eyeHeightM: 1.7,
    isSprinting: false,
    isMoving: false,
    nearestLandmark: { name: 'Gale Rover Base Alpha', distanceM: 0 }
  });

  // Key tracking & animation frame references
  const keysDownRef = useRef<Record<string, boolean>>({});
  const animationFrameRef = useRef<number | null>(null);
  const isPointerLockedRef = useRef<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Keep references updated for frame loop
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const eyeHeightRef = useRef(eyeHeightM);
  eyeHeightRef.current = eyeHeightM;

  // Initialize ArcGIS 3D SceneView
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Configure Mars 2000 Spatial Reference & Elevation
    const marsElevation = new ElevationLayer({
      id: 'marsElevation',
      title: 'Mars MOLA / HRSC 200M DEM Elevation',
      url: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/MDEM200M/ImageServer',
      copyright: 'NASA, ESA, HRSC, Goddard Space Flight Center, USGS Astrogeology, Esri'
    });

    // 2. Configure Mars 2000 Basemap Imagery
    const marsImagery = new TileLayer({
      id: 'marsImagery',
      portalItem: { id: '1efb16809db84f0c892b9b0662dab0c8' },
      title: 'Mars Global Color Imagery',
      copyright: 'USGS Astrogeology Science Center, NASA, JPL, Esri'
    });

    const marsHiRise = new TileLayer({
      id: 'marsHiRise',
      portalItem: { id: 'c1c4c750a2154842ae523c984cc14fa5' },
      title: 'Mars HiRISE High-Resolution Surface Imagery',
      visible: true
    });

    const marsBasemap = new Basemap({
      id: 'marsBasemap',
      title: 'Mars 2000 Basemap',
      baseLayers: [marsImagery, marsHiRise]
    });

    // 3. Create Graphics Layers
    const hazardLayer = new GraphicsLayer({ id: 'hazardLayer', elevationInfo: { mode: 'on-the-ground' } });
    const routeLayer = new GraphicsLayer({ id: 'routeLayer', elevationInfo: { mode: 'on-the-ground' } });
    const markersLayer = new GraphicsLayer({ id: 'markersLayer', elevationInfo: { mode: 'relative-to-ground', offset: 3 } });

    hazardGraphicsLayerRef.current = hazardLayer;
    routeGraphicsLayerRef.current = routeLayer;
    markersGraphicsLayerRef.current = markersLayer;

    // 4. Construct Mars Map
    const map = new Map({
      basemap: marsBasemap,
      ground: {
        surfaceColor: [188, 107, 75], // Mars regolith terracotta
        layers: [marsElevation]
      },
      layers: [hazardLayer, routeLayer, markersLayer]
    });

    // 5. Construct Global SceneView
    const view = new SceneView({
      container: containerRef.current,
      map,
      viewingMode: 'global',
      qualityProfile: 'high',
      spatialReference: marsSpatialReference,
      environment: {
        atmosphereEnabled: false, // True Mars vacuum/thin CO2 - no blue Earth atmosphere!
        starsEnabled: true,       // Cosmic deep space starfield
        lighting: {
          type: 'sun',
          directShadowsEnabled: true,
          date: new Date('2026-11-14T14:30:00Z')
        }
      },
      camera: {
        position: {
          x: 137.38017,
          y: -4.85,
          z: 38000,
          spatialReference: marsSpatialReference
        },
        heading: 350,
        tilt: 62
      },
      popup: { dockEnabled: true, dockOptions: { position: 'top-right' } },
      ui: { components: ['compass', 'navigation-toggle'] }
    });

    viewRef.current = view;

    // Monitor terrain tile loading state
    reactiveUtils.watch(
      () => view.updating,
      (updating) => {
        setIsTerrainLoading(updating);
      }
    );

    // Populate landmark & mission markers
    const addMarkers = () => {
      markersLayer.removeAll();

      // Bookmarks & Major Landing Sites
      MARS_BOOKMARKS.forEach((bm) => {
        const isBase = bm.category === 'base';
        const isMission = bm.category === 'mission';

        const color = isBase ? [249, 115, 22] : isMission ? [16, 185, 129] : [6, 182, 212];

        const markerGraphic = new Graphic({
          geometry: new Point({
            x: bm.coordinates[0],
            y: bm.coordinates[1],
            spatialReference: marsSpatialReference
          }),
          symbol: {
            type: 'point-3d',
            symbolLayers: [
              {
                type: 'icon',
                size: isBase ? 18 : 14,
                material: { color },
                outline: { color: [255, 255, 255, 0.9], size: 1.5 },
                resource: { primitive: isBase ? 'diamond' : 'circle' }
              }
            ],
            verticalOffset: {
              screenLength: 28,
              maxWorldLength: 150000,
              minWorldLength: 25
            },
            callout: {
              type: 'line',
              size: 1.5,
              color: [255, 255, 255, 0.7]
            }
          } as any,
          popupTemplate: {
            title: bm.name,
            content: `
              <div style="font-family:'JetBrains Mono',monospace; font-size:12px; color:#e2e8f0;">
                <p style="margin-bottom:6px;">${bm.description}</p>
                <p><strong>Coordinates:</strong> ${bm.coordinates[0].toFixed(4)}°E, ${bm.coordinates[1].toFixed(4)}°N</p>
                ${bm.groundElevationApproxM !== undefined ? `<p><strong>Elevation:</strong> ${bm.groundElevationApproxM} m (Datum)</p>` : ''}
              </div>
            `
          }
        });

        markersLayer.add(markerGraphic);
      });
    };

    void view.when(() => {
      addMarkers();
    });

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update 3D Routes on Terrain
  useEffect(() => {
    const routeLayer = routeGraphicsLayerRef.current;
    if (!routeLayer) return;

    routeLayer.removeAll();

    // Normal Planned Route
    if (normalRoute && normalRoute.coordinates.length >= 2) {
      const normalPolyline = new Polyline({
        paths: [normalRoute.coordinates],
        spatialReference: marsSpatialReference
      });

      const normalGraphic = new Graphic({
        geometry: normalPolyline,
        symbol: {
          type: 'line-3d',
          symbolLayers: [
            {
              type: 'line',
              size: isEmergency ? 2 : 4,
              material: {
                color: isEmergency ? [14, 165, 233, 0.35] : [56, 189, 248, 0.95]
              }
            }
          ]
        } as any
      });

      routeLayer.add(normalGraphic);
    }

    // Emergency Contingency Return Route
    if (emergencyRoute && emergencyRoute.coordinates.length >= 2) {
      const emergencyPolyline = new Polyline({
        paths: [emergencyRoute.coordinates],
        spatialReference: marsSpatialReference
      });

      const emergencyGraphic = new Graphic({
        geometry: emergencyPolyline,
        symbol: {
          type: 'line-3d',
          symbolLayers: [
            {
              type: 'line',
              size: isEmergency ? 5.5 : 2,
              material: {
                color: isEmergency ? [239, 68, 68, 1.0] : [239, 68, 68, 0.3]
              }
            }
          ]
        } as any
      });

      routeLayer.add(emergencyGraphic);
    }
  }, [normalRoute, emergencyRoute, isEmergency]);

  // Update Blocked Hazard Area Polygon
  useEffect(() => {
    const hazardLayer = hazardGraphicsLayerRef.current;
    if (!hazardLayer) return;

    hazardLayer.removeAll();

    if (isEmergency && blockedHazardCells && blockedHazardCells.length > 0) {
      // Calculate bounds for rows 62-72 and cols 115-135
      const originLng = 137.3801723062723 - 139 * ((137.37950662383716 - 137.3801723062723) / (100 - 139));
      const originLat = -4.804255737466637 - 32 * ((-4.805416414533008 - -4.804255737466637) / (100 - 32));
      const lngStep = (137.37950662383716 - 137.3801723062723) / -39;
      const latStep = (-4.805416414533008 - -4.804255737466637) / 68;

      const minCol = 115;
      const maxCol = 135;
      const minRow = 62;
      const maxRow = 72;

      const nw = [originLng + minCol * lngStep, originLat + minRow * latStep];
      const ne = [originLng + (maxCol + 1) * lngStep, originLat + minRow * latStep];
      const se = [originLng + (maxCol + 1) * lngStep, originLat + (maxRow + 1) * latStep];
      const sw = [originLng + minCol * lngStep, originLat + (maxRow + 1) * latStep];

      const hazardPolygon = new Polygon({
        rings: [[nw, ne, se, sw, nw]],
        spatialReference: marsSpatialReference
      });

      const hazardGraphic = new Graphic({
        geometry: hazardPolygon,
        symbol: {
          type: 'polygon-3d',
          symbolLayers: [
            {
              type: 'fill',
              material: { color: [239, 68, 68, 0.2] },
              outline: { color: [239, 68, 68, 0.8], size: 1.5 }
            }
          ]
        } as any
      });

      hazardLayer.add(hazardGraphic);
    }
  }, [isEmergency, blockedHazardCells]);

  // Transition to First-Person Surface Mode at a specific Point
  const dropToSurfaceAt = useCallback(
    async (point: Point) => {
      const view = viewRef.current;
      if (!view) return;

      setIsTerrainLoading(true);

      try {
        // Query exact ground DEM elevation at this Martian coordinate
        const elevationResult = await view.map.ground.queryElevation(point);
        const surfaceElevation = (elevationResult?.geometry as Point)?.z ?? 0;

        const currentHeading = view.camera?.heading ?? 0;

        // Position camera exactly at human eye level (~1.7 m above surface)
        const firstPersonCamera = new Camera({
          position: new Point({
            x: point.x,
            y: point.y,
            z: surfaceElevation + eyeHeightRef.current,
            spatialReference: marsSpatialReference
          }),
          heading: currentHeading,
          tilt: 82 // Looking towards the horizon
        });

        await view.goTo(firstPersonCamera, { duration: 2500, easing: 'in-out-cubic' });

        setMode('surface');
        if (onModeChange) onModeChange('surface');
        setIsDropModeActive(false);

        const nearest = findNearestLandmark(point);
        setTelemetry({
          latitude: point.y,
          longitude: point.x,
          elevationM: surfaceElevation,
          headingDeg: currentHeading,
          eyeHeightM: eyeHeightRef.current,
          isSprinting: false,
          isMoving: false,
          nearestLandmark: nearest
        });
      } catch (err) {
        console.warn('Surface descent elevation query:', err);
      } finally {
        setIsTerrainLoading(false);
      }
    },
    [onModeChange]
  );

  // Return to Orbital 3D Globe View
  const exitToOrbit = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    setMode('orbital');
    if (onModeChange) onModeChange('orbital');

    const currentPos = view.camera.position;
    const orbitalCamera = new Camera({
      position: new Point({
        x: currentPos.x,
        y: currentPos.y - 0.05,
        z: Math.max(35000, currentPos.z * 10),
        spatialReference: marsSpatialReference
      }),
      heading: view.camera.heading,
      tilt: 45
    });

    await view.goTo(orbitalCamera, { duration: 2000, easing: 'in-out-cubic' });
  }, [onModeChange]);

  // Handle "Drop Me Here" map click
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const clickHandle = view.on('click', (event) => {
      if (isDropModeActive && event.mapPoint) {
        void dropToSurfaceAt(event.mapPoint);
      }
    });

    return () => {
      clickHandle.remove();
    };
  }, [isDropModeActive, dropToSurfaceAt]);

  // First-Person Frame Loop (WASD Movement & Eye-Level Tracking)
  useEffect(() => {
    if (mode !== 'surface') {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const view = viewRef.current;
    if (!view) return;

    let isRunning = true;
    let queryPending = false;

    const frameLoop = () => {
      if (!isRunning || modeRef.current !== 'surface' || !view) return;

      const keys = keysDownRef.current;
      const isSprinting = Boolean(keys['ShiftLeft'] || keys['ShiftRight'] || keys['Shift']);

      // Base speeds: Walking ~3 m/s, Sprinting ~12 m/s
      const moveSpeed = isSprinting ? 12 : 3.5;

      let forward = 0;
      let strafe = 0;

      if (keys['KeyW'] || keys['ArrowUp']) forward += 1;
      if (keys['KeyS'] || keys['ArrowDown']) forward -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) strafe += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) strafe -= 1;

      // Eye-height adjustment (Q = lower, E = raise)
      if (keys['KeyQ']) {
        setEyeHeightM((prev) => Math.max(0.6, Number((prev - 0.05).toFixed(2))));
      }
      if (keys['KeyE']) {
        setEyeHeightM((prev) => Math.min(12.0, Number((prev + 0.05).toFixed(2))));
      }

      const isMoving = forward !== 0 || strafe !== 0;

      if (isMoving) {
        const camera = view.camera.clone();
        const headingRad = (camera.heading * Math.PI) / 180;

        // Delta in meters relative to camera heading
        const deltaNorthM = (forward * Math.cos(headingRad) - strafe * Math.sin(headingRad)) * moveSpeed * 0.035;
        const deltaEastM = (forward * Math.sin(headingRad) + strafe * Math.cos(headingRad)) * moveSpeed * 0.035;

        // Convert meter delta to Martian degree delta
        const { dLat, dLng } = metersToDegreesOnMars(deltaNorthM, deltaEastM, camera.position.y);

        const nextPoint = new Point({
          x: camera.position.x + dLng,
          y: camera.position.y + dLat,
          z: camera.position.z,
          spatialReference: marsSpatialReference
        });

        // Fast terrain query to keep camera strictly at eye-height above Martian surface
        if (!queryPending) {
          queryPending = true;
          view.map.ground
            .queryElevation(nextPoint)
            .then((res) => {
              queryPending = false;
              if (!isRunning || modeRef.current !== 'surface') return;
              const groundZ = (res?.geometry as Point)?.z ?? nextPoint.z - eyeHeightRef.current;
              camera.position = new Point({
                x: nextPoint.x,
                y: nextPoint.y,
                z: groundZ + eyeHeightRef.current,
                spatialReference: marsSpatialReference
              });
              view.camera = camera;

              setTelemetry({
                latitude: camera.position.y,
                longitude: camera.position.x,
                elevationM: groundZ,
                headingDeg: camera.heading,
                eyeHeightM: eyeHeightRef.current,
                isSprinting,
                isMoving,
                nearestLandmark: findNearestLandmark(camera.position)
              });
            })
            .catch(() => {
              queryPending = false;
            });
        }
      }

      animationFrameRef.current = requestAnimationFrame(frameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(frameLoop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mode]);

  // Keyboard & Mouse Listeners for First-Person Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = true;
      if (e.code === 'Escape' && modeRef.current === 'surface') {
        void exitToOrbit();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (modeRef.current === 'surface') {
        isMouseDownRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (modeRef.current !== 'surface' || !viewRef.current) return;

      const view = viewRef.current;

      // Rotate camera via Pointer Lock or Click-Drag
      if (isPointerLockedRef.current || isMouseDownRef.current) {
        const deltaX = isPointerLockedRef.current ? e.movementX : e.clientX - lastMousePosRef.current.x;
        const deltaY = isPointerLockedRef.current ? e.movementY : e.clientY - lastMousePosRef.current.y;

        lastMousePosRef.current = { x: e.clientX, y: e.clientY };

        const camera = view.camera.clone();
        camera.heading = (camera.heading + deltaX * 0.18 + 360) % 360;
        // Clamp tilt so user cannot flip upside down
        camera.tilt = Math.max(35, Math.min(115, camera.tilt + deltaY * 0.18));
        view.camera = camera;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [exitToOrbit]);

  // Fly to Bookmark Handler
  const handleFlyToBookmark = useCallback((bookmark: MarsBookmark) => {
    const view = viewRef.current;
    if (!view) return;

    const cam = new Camera({
      position: new Point({
        x: bookmark.camera.position.x,
        y: bookmark.camera.position.y,
        z: bookmark.camera.position.z,
        spatialReference: marsSpatialReference
      }),
      heading: bookmark.camera.heading,
      tilt: bookmark.camera.tilt
    });

    void view.goTo(cam, { duration: 2400, easing: 'in-out-cubic' });
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-orange-500/30 shadow-2xl bg-slate-950">
      {/* ArcGIS 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Surface First-Person Mode HUD */}
      {mode === 'surface' && (
        <FirstPersonHUD
          telemetry={telemetry}
          onExit={() => void exitToOrbit()}
          onVirtualMove={(dir) => {
            if (dir === 'forward') keysDownRef.current['KeyW'] = true;
            if (dir === 'backward') keysDownRef.current['KeyS'] = true;
            if (dir === 'left') keysDownRef.current['KeyA'] = true;
            if (dir === 'right') keysDownRef.current['KeyD'] = true;
            if (dir === 'stop') {
              keysDownRef.current['KeyW'] = false;
              keysDownRef.current['KeyS'] = false;
              keysDownRef.current['KeyA'] = false;
              keysDownRef.current['KeyD'] = false;
            }
          }}
        />
      )}

      {/* Terrain Streaming Loading Spinner */}
      {isTerrainLoading && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-950/80 border border-slate-700 text-slate-300 font-mono text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl backdrop-blur">
          <div className="w-2.5 h-2.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span>STREAMING MARS DEM TILES…</span>
        </div>
      )}

      {/* Drop Me Here Helper Callout Banner */}
      {isDropModeActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-emerald-950/90 border border-emerald-500 text-emerald-200 font-mono text-xs px-4 py-2 rounded-xl shadow-2xl backdrop-blur flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Click any point on the Martian surface to land at 1.7 m eye-level</span>
          <button
            onClick={() => setIsDropModeActive(false)}
            className="ml-2 text-slate-400 hover:text-white text-xs underline cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
