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
  mode?: 'orbital' | 'surface';
  isDropModeActive?: boolean;
  onDropModeChange?: (active: boolean) => void;
  onModeChange?: (mode: 'orbital' | 'surface') => void;
  selectedBookmark?: MarsBookmark | null;
  onClearSelectedBookmark?: () => void;
  focusedCoordinates?: [number, number] | null;
  onClearFocusedCoordinates?: () => void;
}

export const Mars3DScene: React.FC<Mars3DSceneProps> = ({
  isEmergency,
  normalRoute,
  emergencyRoute,
  blockedHazardCells,
  mode: propMode = 'orbital',
  isDropModeActive = false,
  onDropModeChange,
  onModeChange,
  selectedBookmark,
  onClearSelectedBookmark,
  focusedCoordinates,
  onClearFocusedCoordinates
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const routeGraphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const markersGraphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const hazardGraphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const focusGraphicsLayerRef = useRef<GraphicsLayer | null>(null);

  // Application State
  const [mode, setMode] = useState<'orbital' | 'surface'>(propMode);
  const [isTerrainLoading, setIsTerrainLoading] = useState<boolean>(true);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);

  // Clicked Location / Landmark for Interactive Surface Actions
  const [clickedLocation, setClickedLocation] = useState<{
    name: string;
    description?: string;
    coordinates: [number, number];
    elevationM?: number;
    nearestLandmark?: { name: string; distanceM: number };
  } | null>(null);

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
    const hazardLayer = new GraphicsLayer({ id: 'hazardLayer', elevationInfo: { mode: 'relative-to-ground', offset: 2 } });
    const routeLayer = new GraphicsLayer({ id: 'routeLayer', elevationInfo: { mode: 'relative-to-ground', offset: 2.5 } });
    const markersLayer = new GraphicsLayer({ id: 'markersLayer', elevationInfo: { mode: 'relative-to-ground', offset: 4 } });
    const focusLayer = new GraphicsLayer({ id: 'focusLayer', elevationInfo: { mode: 'relative-to-ground', offset: 3 } });

    hazardGraphicsLayerRef.current = hazardLayer;
    routeGraphicsLayerRef.current = routeLayer;
    markersGraphicsLayerRef.current = markersLayer;
    focusGraphicsLayerRef.current = focusLayer;

    // 4. Construct Mars Map
    const map = new Map({
      basemap: marsBasemap,
      ground: {
        surfaceColor: [188, 107, 75], // Mars regolith terracotta
        layers: [marsElevation]
      },
      layers: [hazardLayer, routeLayer, markersLayer, focusLayer]
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
      popupEnabled: false,
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
          attributes: {
            id: bm.id,
            name: bm.name,
            description: bm.description,
            coordinates: bm.coordinates,
            groundElevationApproxM: bm.groundElevationApproxM
          },
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

    // Intercept default drag in surface mode so ArcGIS orbit navigation doesn't fight first-person look
    const dragHandle = view.on('drag', (event) => {
      if (modeRef.current === 'surface') {
        event.stopPropagation();

        if (event.action === 'start') {
          lastMousePosRef.current = { x: event.x, y: event.y };
          isMouseDownRef.current = true;
        } else if (event.action === 'update' && isMouseDownRef.current) {
          const deltaX = event.x - lastMousePosRef.current.x;
          const deltaY = event.y - lastMousePosRef.current.y;
          lastMousePosRef.current = { x: event.x, y: event.y };

          const cam = view.camera.clone();
          cam.heading = (cam.heading + deltaX * 0.22 + 360) % 360;
          cam.tilt = Math.max(35, Math.min(115, cam.tilt + deltaY * 0.22));
          view.camera = cam;

          setTelemetry((prev) => ({
            ...prev,
            headingDeg: cam.heading
          }));
        } else if (event.action === 'end') {
          isMouseDownRef.current = false;
        }
      }
    });

    const wheelHandle = view.on('mouse-wheel', (event) => {
      if (modeRef.current === 'surface') {
        event.stopPropagation();
        // Mouse wheel adjusts eye height in surface mode
        const delta = event.deltaY < 0 ? 0.3 : -0.3;
        setEyeHeightM((prev) => Math.max(0.6, Math.min(25.0, Number((prev + delta).toFixed(1)))));
      }
    });

    const dblClickHandle = view.on('double-click', (event) => {
      if (modeRef.current === 'surface') {
        event.stopPropagation();
      }
    });

    return () => {
      dragHandle.remove();
      wheelHandle.remove();
      dblClickHandle.remove();
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
              size: isEmergency ? 3 : 8,
              material: {
                color: isEmergency ? [14, 165, 233, 0.4] : [0, 240, 255, 1.0]
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
              size: isEmergency ? 10 : 3,
              material: {
                color: isEmergency ? [239, 68, 68, 1.0] : [239, 68, 68, 0.35]
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
      if (!view || !view.map?.ground) return;

      setIsTerrainLoading(true);

      try {
        // Query exact ground DEM elevation at this Martian coordinate
        const elevationResult = await view.map.ground.queryElevation(point);
        let surfaceElevation = (elevationResult?.geometry as Point)?.z;

        // If in Gale Crater area and query is undefined, default to Gale floor elevation (~ -3631m)
        if (surfaceElevation === undefined || isNaN(surfaceElevation)) {
          surfaceElevation = Math.abs(point.x - 137.38) < 0.3 && Math.abs(point.y - -4.805) < 0.3 ? -3631 : 0;
        }

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

        await view.goTo(firstPersonCamera, { duration: 2500, easing: 'in-out-cubic' as any });

        setMode('surface');
        if (onModeChange) onModeChange('surface');
        if (onDropModeChange) onDropModeChange(false);

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
    [onModeChange, onDropModeChange]
  );

  // Return to Orbital 3D Globe View
  const exitToOrbit = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    setMode('orbital');
    setClickedLocation(null);
    focusGraphicsLayerRef.current?.removeAll();
    if (onModeChange) onModeChange('orbital');
    if (onDropModeChange) onDropModeChange(false);

    const currentPos = view.camera.position;
    const orbitalCamera = new Camera({
      position: new Point({
        x: currentPos.x,
        y: currentPos.y - 0.05,
        z: Math.max(35000, (currentPos.z ?? 0) * 10),
        spatialReference: marsSpatialReference
      }),
      heading: view.camera.heading,
      tilt: 45
    });

    await view.goTo(orbitalCamera, { duration: 2000, easing: 'in-out-cubic' as any });
  }, [onModeChange, onDropModeChange]);

  // Focus directly on the 86m Gale Crater Route
  const focusGaleMissionRoute = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;

    const missionCamera = new Camera({
      position: new Point({
        x: 137.37984,
        y: -4.8070,
        z: -3440, // ~190m above -3631m Gale Crater floor
        spatialReference: marsSpatialReference
      }),
      heading: 355,
      tilt: 58
    });

    await view.goTo(missionCamera, { duration: 2200, easing: 'in-out-cubic' as any });
  }, []);

  // Respond to prop mode changes (e.g. Header button click)
  useEffect(() => {
    if (propMode && propMode !== mode) {
      setMode(propMode);
      if (propMode === 'surface') {
        const view = viewRef.current;
        if (view) {
          const currentZ = view.camera?.position?.z ?? 0;
          if (currentZ > -3000) {
            void dropToSurfaceAt(new Point({
              x: 137.38017231,
              y: -4.80425574,
              spatialReference: marsSpatialReference
            }));
          }
        }
      }
    }
  }, [propMode, mode, dropToSurfaceAt]);

  // Handle "Drop Me Here" and Interactive Click on Mars
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const clickHandle = view.on('click', async (event) => {
      // In surface mode, clicking engages pointer lock
      if (modeRef.current === 'surface') {
        if (!isPointerLockedRef.current && containerRef.current) {
          containerRef.current.requestPointerLock?.();
        }
        return;
      }

      // If user activated "Drop me anywhere on Mars" targeting mode
      if (isDropModeActive && event.mapPoint) {
        setClickedLocation(null);
        focusGraphicsLayerRef.current?.removeAll();
        void dropToSurfaceAt(event.mapPoint);
        return;
      }

      // In orbital mode: inspect the clicked spot and show interactive action card
      if (event.mapPoint) {
        const clickedPt = event.mapPoint;
        const lng = clickedPt.x;
        const lat = clickedPt.y;

        let locationName = '';
        let locationDesc = '';
        let knownElev: number | undefined;

        try {
          const hit = await view.hitTest(event);
          const graphicHit = hit.results?.find(
            (r) =>
              r.type === 'graphic' &&
              (r.graphic.layer === markersGraphicsLayerRef.current ||
                r.graphic.layer === routeGraphicsLayerRef.current)
          ) as { graphic: Graphic } | undefined;

          if (graphicHit && graphicHit.graphic.attributes) {
            locationName = graphicHit.graphic.attributes.name || '';
            locationDesc = graphicHit.graphic.attributes.description || '';
            knownElev = graphicHit.graphic.attributes.groundElevationApproxM;
          }
        } catch {
          // ignore hitTest failure
        }

        // Query ground elevation
        let elevation = knownElev ?? clickedPt.z;
        if (view.map?.ground && (elevation === undefined || isNaN(elevation))) {
          try {
            const elevRes = await view.map.ground.queryElevation(clickedPt);
            elevation = (elevRes?.geometry as Point)?.z ?? elevation;
          } catch {
            // fallback
          }
        }

        const nearest = findNearestLandmark(clickedPt);

        if (!locationName) {
          const matchedBookmark = MARS_BOOKMARKS.find(
            (b) => Math.abs(b.coordinates[0] - lng) < 0.05 && Math.abs(b.coordinates[1] - lat) < 0.05
          );

          if (matchedBookmark) {
            locationName = matchedBookmark.name;
            locationDesc = matchedBookmark.description;
            if (matchedBookmark.groundElevationApproxM !== undefined) {
              elevation = matchedBookmark.groundElevationApproxM;
            }
          } else {
            locationName = `Martian Surface Target`;
            locationDesc = `Sector ${lat < 0 ? `${Math.abs(lat).toFixed(3)}°S` : `${lat.toFixed(3)}°N`}, ${lng.toFixed(3)}°E`;
          }
        }

        setClickedLocation({
          name: locationName,
          description: locationDesc,
          coordinates: [lng, lat],
          elevationM: elevation,
          nearestLandmark: nearest
        });

        // Place a sleek, single focus reticle on the clicked spot
        const focusLayer = focusGraphicsLayerRef.current;
        if (focusLayer) {
          focusLayer.removeAll();
          focusLayer.add(
            new Graphic({
              geometry: clickedPt,
              symbol: {
                type: 'point-3d',
                symbolLayers: [
                  {
                    type: 'icon',
                    size: 18,
                    material: { color: [0, 240, 255] },
                    outline: { color: [255, 255, 255, 0.95], size: 2 },
                    resource: { primitive: 'circle' }
                  }
                ]
              } as any
            })
          );
        }
      }
    });

    return () => {
      clickHandle.remove();
    };
  }, [isDropModeActive, dropToSurfaceAt]);

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

    void view.goTo(cam, { duration: 2400, easing: 'in-out-cubic' as any });
  }, []);

  // Respond to bookmark selection from parent
  useEffect(() => {
    if (selectedBookmark) {
      handleFlyToBookmark(selectedBookmark);
      onClearSelectedBookmark?.();
    }
  }, [selectedBookmark, handleFlyToBookmark, onClearSelectedBookmark]);

  // Handle focusing landmark or coordinate (e.g. [Base], [Target], [Rover], or Waypoint)
  useEffect(() => {
    if (!focusedCoordinates) return;
    const view = viewRef.current;
    if (!view) return;

    const [targetLng, targetLat] = focusedCoordinates;
    const targetPoint = new Point({
      x: targetLng,
      y: targetLat,
      spatialReference: marsSpatialReference
    });

    if (mode === 'surface') {
      // In first-person mode: teleport observer directly to this landmark at 1.7m eye-level!
      void dropToSurfaceAt(targetPoint);
    } else {
      // In 3D orbital globe mode: fly smoothly to focus this target!
      const isGale = Math.abs(targetLng - 137.38) < 0.5 && Math.abs(targetLat - -4.805) < 0.5;
      const targetZ = isGale ? -3440 : 25000;
      const targetTilt = isGale ? 60 : 45;

      const targetCamera = new Camera({
        position: new Point({
          x: targetLng,
          y: targetLat - (isGale ? 0.002 : 0.05),
          z: targetZ,
          spatialReference: marsSpatialReference
        }),
        heading: 350,
        tilt: targetTilt
      });

      void view.goTo(targetCamera, { duration: 2000, easing: 'in-out-cubic' as any });
    }

    // Temporary highlight marker in dedicated focus layer (clearing previous so they never pile up)
    const focusLayer = focusGraphicsLayerRef.current;
    if (focusLayer) {
      focusLayer.removeAll();
      const focusGraphic = new Graphic({
        geometry: targetPoint,
        symbol: {
          type: 'point-3d',
          symbolLayers: [
            {
              type: 'icon',
              size: 20,
              material: { color: [249, 115, 22] },
              outline: { color: [255, 255, 255, 0.95], size: 2.5 },
              resource: { primitive: 'circle' }
            }
          ]
        } as any
      });
      focusLayer.add(focusGraphic);
    }

    const timer = setTimeout(() => {
      focusGraphicsLayerRef.current?.removeAll();
      onClearFocusedCoordinates?.();
    }, 6000);

    return () => clearTimeout(timer);
  }, [focusedCoordinates, mode, dropToSurfaceAt, onClearFocusedCoordinates]);

  // Pointer Lock Toggle & Event Handling
  const togglePointerLock = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    } else if (containerRef.current) {
      containerRef.current.requestPointerLock?.();
    }
  }, []);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      isPointerLockedRef.current = locked;
      setIsPointerLocked(locked);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

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
        if (!queryPending && view.map?.ground) {
          queryPending = true;
          view.map.ground
            .queryElevation(nextPoint)
            .then((res) => {
              queryPending = false;
              if (!isRunning || modeRef.current !== 'surface') return;
              const groundZ = (res?.geometry as Point)?.z ?? (nextPoint.z ?? 0) - eyeHeightRef.current;
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
      if (!isPointerLockedRef.current) return; // Free dragging without pointer lock is handled by view.on('drag')

      const view = viewRef.current;
      const deltaX = e.movementX;
      const deltaY = e.movementY;

      const camera = view.camera.clone();
      camera.heading = (camera.heading + deltaX * 0.16 + 360) % 360;
      // Clamp tilt between 35° (looking up) and 115° (looking down)
      camera.tilt = Math.max(35, Math.min(115, camera.tilt + deltaY * 0.16));
      view.camera = camera;

      setTelemetry((prev) => ({
        ...prev,
        headingDeg: camera.heading
      }));
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

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-orange-500/30 shadow-2xl bg-slate-950">
      {/* ArcGIS 3D Canvas Container */}
      <div
        ref={containerRef}
        onClick={() => {
          if (mode === 'surface' && !isPointerLocked) {
            togglePointerLock();
          }
        }}
        className={`absolute inset-0 w-full h-full ${
          isDropModeActive
            ? 'cursor-crosshair'
            : mode === 'surface'
            ? isPointerLocked
              ? 'cursor-none'
              : 'cursor-grab active:cursor-grabbing'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Quick Action: Focus Gale Mission Route in 3D */}
      {mode === 'orbital' && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            onClick={() => void focusGaleMissionRoute()}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 rounded-lg shadow-xl font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all backdrop-blur"
            title="Fly directly to Gale Crater and frame the 86m route"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>FOCUS GALE MISSION (86m ROUTE)</span>
          </button>
        </div>
      )}

      {/* Surface First-Person Mode HUD */}
      {mode === 'surface' && (
        <FirstPersonHUD
          telemetry={telemetry}
          onExit={() => void exitToOrbit()}
          isPointerLocked={isPointerLocked}
          onTogglePointerLock={togglePointerLock}
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-orange-950/95 border-2 border-orange-500 text-orange-200 font-mono text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur flex items-center gap-3 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
          <span className="font-bold tracking-wide">TARGETING ACTIVE — CLICK ANY POINT ON MARS TO LAND AT 1.7M EYE-LEVEL</span>
          <button
            onClick={() => onDropModeChange?.(false)}
            className="ml-2 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-mono border border-slate-700 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Click-to-Action Tactical Card on Mars Globe (Orbital Mode) */}
      {clickedLocation && mode === 'orbital' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border-2 border-cyan-500/80 rounded-xl p-4 shadow-2xl backdrop-blur max-w-md w-[92%] font-mono animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3 border-b border-cyan-500/30 pb-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold text-cyan-200 tracking-wider uppercase">{clickedLocation.name}</h3>
              </div>
              {clickedLocation.description && (
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{clickedLocation.description}</p>
              )}
            </div>
            <button
              onClick={() => {
                setClickedLocation(null);
                focusGraphicsLayerRef.current?.removeAll();
              }}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer text-xs"
              title="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-3 bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <div>
              <span className="text-slate-500 text-[10px] block font-semibold">COORDINATES</span>
              <span className="font-bold text-amber-300">
                {clickedLocation.coordinates[1] < 0 ? `${Math.abs(clickedLocation.coordinates[1]).toFixed(4)}°S` : `${clickedLocation.coordinates[1].toFixed(4)}°N`}, {clickedLocation.coordinates[0].toFixed(4)}°E
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block font-semibold">SURFACE ELEVATION</span>
              <span className="font-bold text-emerald-400">
                {clickedLocation.elevationM !== undefined ? `${clickedLocation.elevationM.toFixed(0)} m (Datum)` : 'Calibrating DEM…'}
              </span>
            </div>
            {clickedLocation.nearestLandmark && (
              <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">NEAREST LANDMARK:</span>
                <span className="text-slate-300 font-medium">
                  {clickedLocation.nearestLandmark.name} (~{clickedLocation.nearestLandmark.distanceM >= 1000 ? `${(clickedLocation.nearestLandmark.distanceM / 1000).toFixed(1)} km` : `${clickedLocation.nearestLandmark.distanceM} m`})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const pt = new Point({
                  x: clickedLocation.coordinates[0],
                  y: clickedLocation.coordinates[1],
                  spatialReference: marsSpatialReference
                });
                setClickedLocation(null);
                focusGraphicsLayerRef.current?.removeAll();
                void dropToSurfaceAt(pt);
              }}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all border border-orange-400/50"
            >
              <span>🚀 DROP & WALK HERE (1.7m AGL)</span>
            </button>

            <button
              onClick={() => {
                const view = viewRef.current;
                if (!view) return;
                const [lng, lat] = clickedLocation.coordinates;
                const isGale = Math.abs(lng - 137.38) < 0.5 && Math.abs(lat - -4.805) < 0.5;
                const targetZ = isGale ? -3440 : 15000;
                void view.goTo(
                  new Camera({
                    position: new Point({
                      x: lng,
                      y: lat - (isGale ? 0.002 : 0.02),
                      z: targetZ,
                      spatialReference: marsSpatialReference
                    }),
                    heading: view.camera.heading,
                    tilt: 60
                  }),
                  { duration: 1800, easing: 'in-out-cubic' as any }
                );
              }}
              className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold text-xs rounded-lg border border-cyan-500/40 hover:border-cyan-400 cursor-pointer transition-all"
            >
              🔍 FLY CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
