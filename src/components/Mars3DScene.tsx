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
import {
  GALE_BASE_COORDINATES,
  BOXWORK_TARGET_COORDINATES,
  CURRENT_ROVER_COORDINATES,
  SLOPES_GEOJSON,
  HAZARDS_GEOJSON,
  MINERALS_GEOJSON
} from '../data/marsGeoData';
import { cellToLngLat } from '../data/terrainSites';
import { LayerVisibility, RouteData } from '../types';
import { FirstPersonHUD, FirstPersonTelemetry } from './FirstPersonHUD';

interface Mars3DSceneProps {
  layers?: LayerVisibility;
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
  onSelectWaypoint?: (coords: [number, number]) => void;
  onSelectTargetLocation?: (target: { id?: string; name: string; coordinates: [number, number]; groundElevationM?: number; description?: string }) => void;
}

export const Mars3DScene: React.FC<Mars3DSceneProps> = ({
  layers,
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
  onClearFocusedCoordinates,
  onSelectWaypoint,
  onSelectTargetLocation
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

  // Clicked Location / Landmark for Interactive Surface Actions (Opened exclusively on double-click in orbital mode)
  const [clickedLocation, setClickedLocation] = useState<{
    name: string;
    description?: string;
    coordinates: [number, number];
    elevationM?: number;
    nearestLandmark?: { name: string; distanceM: number };
  } | null>(null);

  // First-Person Controller State
  const [eyeHeightM, setEyeHeightM] = useState<number>(1.7);
  const cachedGroundZRef = useRef<number>(-3631);
  const frameCountRef = useRef<number>(0);
  const queryPendingRef = useRef<boolean>(false);

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

  // Route and focus tracking references to prevent unwanted re-animations
  const normalRouteRef = useRef(normalRoute);
  normalRouteRef.current = normalRoute;
  const emergencyRouteRef = useRef(emergencyRoute);
  emergencyRouteRef.current = emergencyRoute;
  const lastFocusedCoordRef = useRef<string | null>(null);
  const initialFocusDoneRef = useRef(false);

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
      url: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/MDIM/MapServer',
      title: 'Mars Global Color Imagery',
      copyright: 'USGS Astrogeology Science Center, NASA, JPL, Esri'
    });

    const marsHiRise = new TileLayer({
      id: 'marsHiRise',
      url: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/HiRISE/MapServer',
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
    const routeLayer = new GraphicsLayer({ id: 'routeLayer', elevationInfo: { mode: 'relative-to-ground', offset: 2.5 } });
    const markersLayer = new GraphicsLayer({ id: 'markersLayer', elevationInfo: { mode: 'relative-to-ground', offset: 3 } });
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
        position: new Point({
          x: 137.37984,
          y: -4.8070,
          z: -3440,
          spatialReference: marsSpatialReference
        }),
        heading: 355,
        tilt: 58
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

    // Populate landmark & mission markers strictly synchronized with 2D Tactical Map
    const addMarkers = () => {
      markersLayer.removeAll();

      // 1. Core Tactical Mission Sites strictly synchronized with 2D Tactical Map
      const tacticalSites = [
        {
          id: 'gale-base',
          name: '[SIMULATED] GALE ROVER BASE',
          label: '⌂ GALE ROVER BASE',
          description: '137.38017231° E, 4.80425574° S • DTM elevation: about -3,631.27 m • Base cell: row 32, column 139',
          coordinates: GALE_BASE_COORDINATES,
          groundElevationApproxM: -3631,
          color: [251, 146, 60], // #fb923c Orange/Amber (100% synchronized with 2D)
          calloutHeight: 46
        },
        {
          id: 'science-target',
          name: 'SCIENCE TARGET CANDIDATE',
          label: '◆ SCIENCE TARGET',
          description: '137.37950662° E, 4.80541641° S • DTM elevation: about -3,622.49 m • Target cell: row 100, column 100',
          coordinates: BOXWORK_TARGET_COORDINATES,
          groundElevationApproxM: -3622,
          color: [34, 211, 238], // #22d3ee Cyan (100% synchronized with 2D)
          calloutHeight: 28
        },
        {
          id: 'curiosity-sol-point',
          name: '[SIMULATED] AER-1',
          label: '◈ [SIMULATED] AER-1',
          description: 'Autonomous surface rover platform standing at active waypoint coordinates in Gale Crater.',
          coordinates: CURRENT_ROVER_COORDINATES,
          groundElevationApproxM: -3622,
          color: [52, 211, 153], // #34d399 Emerald/Green (100% synchronized with 2D)
          calloutHeight: 64
        }
      ];

      tacticalSites.forEach((site) => {
        const pointGeometry = new Point({
          x: site.coordinates[0],
          y: site.coordinates[1],
          spatialReference: marsSpatialReference
        });

        const graphic = new Graphic({
          geometry: pointGeometry,
          attributes: {
            id: site.id,
            name: site.name,
            description: site.description,
            coordinates: site.coordinates,
            groundElevationApproxM: site.groundElevationApproxM
          },
          symbol: {
            type: 'point-3d',
            symbolLayers: [
              {
                type: 'icon',
                size: 20,
                material: { color: site.color },
                outline: { color: [255, 255, 255, 0.95], size: 2 },
                resource: { primitive: 'circle' }
              },
              {
                type: 'text',
                text: site.label,
                size: 10,
                material: { color: [255, 255, 255] },
                halo: { color: [15, 23, 42, 0.95], size: 2 }
              }
            ],
            verticalOffset: {
              screenLength: site.calloutHeight,
              maxWorldLength: 150000,
              minWorldLength: 20
            },
            callout: {
              type: 'line',
              size: 2,
              color: [255, 255, 255, 0.85]
            }
          } as any
        });

        markersLayer.add(graphic);
      });

      // 2. Martian landmarks & historical rovers
      MARS_BOOKMARKS.forEach((bm) => {
        // Skip duplicate Gale base/target
        if (bm.id === 'gale-base' || bm.id === 'science-candidate' || bm.id === 'rover-aer1') return;

        const pointGeometry = new Point({
          x: bm.coordinates[0],
          y: bm.coordinates[1],
          spatialReference: marsSpatialReference
        });

        let color = [249, 115, 22]; // Orange for features
        if (bm.category === 'mission') color = [20, 184, 166]; // Cyan for missions

        const markerGraphic = new Graphic({
          geometry: pointGeometry,
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
                size: 14,
                material: { color },
                outline: { color: [255, 255, 255, 0.9], size: 1.5 },
                resource: { primitive: 'circle' }
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
          } as any
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

    // Intercept key events on ArcGIS SceneView in surface mode so default map navigation doesn't fight WASD
    const keyDownHandle = view.on('key-down', (event) => {
      if (modeRef.current === 'surface') {
        const key = event.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e', 'shift'].includes(key)) {
          event.stopPropagation();
        }
      }
    });

    return () => {
      dragHandle.remove();
      wheelHandle.remove();
      keyDownHandle.remove();
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

      // Intermediate route waypoint checkpoints (stations 2, 3, 4, 5...)
      if (normalRoute.waypoints && normalRoute.waypoints.length > 2) {
        normalRoute.waypoints.slice(1, -1).forEach((wp, idx) => {
          const stationNumber = idx + 2;
          const wpPt = new Point({
            x: wp.coordinates[0],
            y: wp.coordinates[1],
            spatialReference: marsSpatialReference
          });

          const isMed = wp.hazardLevel === 'MEDIUM';
          const color = isMed ? [245, 158, 11] : [34, 197, 94];

          routeLayer.add(
            new Graphic({
              geometry: wpPt,
              attributes: {
                id: wp.id,
                name: wp.name,
                description: wp.description,
                coordinates: wp.coordinates,
                elevationM: wp.elevationMeters,
                slopeDeg: wp.slopeGradeDeg,
                hazardLevel: wp.hazardLevel
              },
              symbol: {
                type: 'point-3d',
                symbolLayers: [
                  {
                    type: 'icon',
                    size: 15,
                    material: { color },
                    outline: { color: [255, 255, 255, 0.95], size: 1.5 },
                    resource: { primitive: 'circle' }
                  },
                  {
                    type: 'text',
                    text: String(stationNumber),
                    size: 9,
                    material: { color: [255, 255, 255] },
                    halo: { color: [15, 23, 42, 0.95], size: 1.5 }
                  }
                ],
                verticalOffset: {
                  screenLength: 24,
                  maxWorldLength: 150000,
                  minWorldLength: 15
                },
                callout: {
                  type: 'line',
                  size: 1.5,
                  color: [255, 255, 255, 0.75]
                }
              } as any
            })
          );
        });
      }
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

      // Intermediate emergency route waypoint checkpoints (stations 2, 3, 4, 5...) when emergency active
      if (isEmergency && emergencyRoute.waypoints && emergencyRoute.waypoints.length > 2) {
        emergencyRoute.waypoints.slice(1, -1).forEach((wp, idx) => {
          const stationNumber = idx + 2;
          const wpPt = new Point({
            x: wp.coordinates[0],
            y: wp.coordinates[1],
            spatialReference: marsSpatialReference
          });

          const isMed = wp.hazardLevel === 'MEDIUM';
          const color = isMed ? [245, 158, 11] : [239, 68, 68];

          routeLayer.add(
            new Graphic({
              geometry: wpPt,
              attributes: {
                id: wp.id,
                name: wp.name,
                description: wp.description,
                coordinates: wp.coordinates,
                elevationM: wp.elevationMeters,
                slopeDeg: wp.slopeGradeDeg,
                hazardLevel: wp.hazardLevel
              },
              symbol: {
                type: 'point-3d',
                symbolLayers: [
                  {
                    type: 'icon',
                    size: 15,
                    material: { color },
                    outline: { color: [255, 255, 255, 0.95], size: 1.5 },
                    resource: { primitive: 'circle' }
                  },
                  {
                    type: 'text',
                    text: String(stationNumber),
                    size: 9,
                    material: { color: [255, 255, 255] },
                    halo: { color: [15, 23, 42, 0.95], size: 1.5 }
                  }
                ],
                verticalOffset: {
                  screenLength: 24,
                  maxWorldLength: 150000,
                  minWorldLength: 15
                },
                callout: {
                  type: 'line',
                  size: 1.5,
                  color: [255, 255, 255, 0.75]
                }
              } as any
            })
          );
        });
      }
    }
  }, [normalRoute, emergencyRoute, isEmergency]);

  // Update Blocked Hazard Area Polygon and 2D Terrain Overlays in 3D
  useEffect(() => {
    const hazardLayer = hazardGraphicsLayerRef.current;
    if (!hazardLayer) return;

    hazardLayer.removeAll();

    // 1. Add 2D simulated slope zones (green and amber) to 3D terrain
    if (!layers || layers.slope) {
      SLOPES_GEOJSON.features.forEach((feature) => {
        const coords = feature.geometry.coordinates[0];
        const isGentle = feature.properties.grade === 'gentle';
        hazardLayer.add(
          new Graphic({
            geometry: new Polygon({
              rings: [coords],
              spatialReference: marsSpatialReference
            }),
            symbol: {
              type: 'polygon-3d',
              symbolLayers: [
                {
                  type: 'fill',
                  material: { color: isGentle ? [34, 197, 94, 0.22] : [245, 158, 11, 0.22] },
                  outline: { color: isGentle ? [34, 197, 94, 0.75] : [245, 158, 11, 0.75], size: 1.5 }
                }
              ]
            } as any
          })
        );
      });
    }

    // 2. Add 2D simulated rock/slip hazard zones (rose/red) to 3D terrain
    if (!layers || layers.hazard) {
      HAZARDS_GEOJSON.features.forEach((feature) => {
        const coords = feature.geometry.coordinates[0];
        hazardLayer.add(
          new Graphic({
            geometry: new Polygon({
              rings: [coords],
              spatialReference: marsSpatialReference
            }),
            symbol: {
              type: 'polygon-3d',
              symbolLayers: [
                {
                  type: 'fill',
                  material: { color: [244, 63, 94, 0.25] },
                  outline: { color: [244, 63, 94, 0.8], size: 1.5 }
                }
              ]
            } as any
          })
        );
      });
    }

    // 3. Add 2D simulated spectral mineral zone (purple) to 3D terrain
    if (!layers || layers.mineral) {
      MINERALS_GEOJSON.features.forEach((feature) => {
        const coords = feature.geometry.coordinates[0];
        hazardLayer.add(
          new Graphic({
            geometry: new Polygon({
              rings: [coords],
              spatialReference: marsSpatialReference
            }),
            symbol: {
              type: 'polygon-3d',
              symbolLayers: [
                {
                  type: 'fill',
                  material: { color: [168, 85, 247, 0.3] },
                  outline: { color: [168, 85, 247, 0.85], size: 1.5 }
                }
              ]
            } as any
          })
        );
      });
    }

    // 4. Add Dynamic Simulated Emergency Hazard Polygon when active (exact cellToLngLat matching 2D)
    if (isEmergency && blockedHazardCells && blockedHazardCells.length > 0 && (!layers || layers.hazard)) {
      let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
      for (const cell of blockedHazardCells) {
        if (cell.row < minRow) minRow = cell.row;
        if (cell.row > maxRow) maxRow = cell.row;
        if (cell.column < minCol) minCol = cell.column;
        if (cell.column > maxCol) maxCol = cell.column;
      }
      const nw = cellToLngLat(minRow, minCol);
      const ne = cellToLngLat(minRow, maxCol + 1);
      const se = cellToLngLat(maxRow + 1, maxCol + 1);
      const sw = cellToLngLat(maxRow + 1, minCol);

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
              material: { color: [239, 68, 68, 0.28] },
              outline: { color: [239, 68, 68, 0.95], size: 2.0 }
            }
          ]
        } as any
      });

      hazardLayer.add(hazardGraphic);
    }
  }, [isEmergency, blockedHazardCells, layers?.slope, layers?.hazard, layers?.mineral]);

  // Toggle optical layer on 3D globe
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !view.map?.basemap) return;
    const marsHiRise = view.map.basemap.baseLayers.find((l) => l.id === 'marsHiRise');
    if (marsHiRise) {
      marsHiRise.visible = layers ? layers.optical : true;
    }
  }, [layers?.optical]);

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
        cachedGroundZRef.current = surfaceElevation;
        containerRef.current?.focus();
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
        z: -3440,
        spatialReference: marsSpatialReference
      }),
      heading: 355,
      tilt: 58
    });

    await view.goTo(missionCamera, { duration: 1800, easing: 'in-out-cubic' as any });
  }, []);

  // Auto-focus on the mission route on initial load once normalRoute is available
  useEffect(() => {
    if (normalRoute && normalRoute.coordinates.length >= 2 && !initialFocusDoneRef.current) {
      initialFocusDoneRef.current = true;
      const timer = setTimeout(() => {
        void focusGaleMissionRoute();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [normalRoute, focusGaleMissionRoute]);

  // Respond to prop mode changes (e.g. Header button click)
  useEffect(() => {
    if (propMode && propMode !== mode) {
      setMode(propMode);
      if (propMode === 'surface') {
        const view = viewRef.current;
        if (view) {
          const currentCenter = view.camera?.position;
          const targetPt =
            currentCenter && Math.abs(currentCenter.x) <= 180 && Math.abs(currentCenter.y) <= 90
              ? new Point({ x: currentCenter.x, y: currentCenter.y, spatialReference: marsSpatialReference })
              : new Point({ x: 137.38017231, y: -4.80425574, spatialReference: marsSpatialReference });
          void dropToSurfaceAt(targetPt);
        }
      }
    }
  }, [propMode, mode, dropToSurfaceAt]);

  // Handle User Clicks & Double-Clicks
  // RULE: The Tactical Action Card opens ONLY ON DOUBLE-CLICK in orbital mode!
  // Single click does NOT open the card. Pressing close dismisses it immediately.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Single-click interaction handler
    const clickHandle = view.on('click', (event) => {
      // In surface mode: click engages pointer lock for mouse look
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

      // In orbital mode, check if a tactical checkpoint or marker was clicked
      void (async () => {
        try {
          const hit = await view.hitTest(event);
          const graphicHit = hit.results?.find(
            (r) =>
              r.type === 'graphic' &&
              (r.graphic.layer === markersGraphicsLayerRef.current ||
                r.graphic.layer === routeGraphicsLayerRef.current)
          ) as { graphic: Graphic } | undefined;

          if (graphicHit && graphicHit.graphic.attributes) {
            const attrs = graphicHit.graphic.attributes;
            const coords: [number, number] =
              attrs.coordinates ||
              (graphicHit.graphic.geometry?.type === 'point'
                ? [(graphicHit.graphic.geometry as Point).x, (graphicHit.graphic.geometry as Point).y]
                : null);

            if (coords) {
              onSelectWaypoint?.(coords);
              setClickedLocation({
                name: attrs.name || 'Martian Checkpoint',
                description: attrs.description,
                coordinates: coords,
                elevationM: attrs.elevationM ?? attrs.groundElevationApproxM
              });
              return;
            }
          }
        } catch {
          // ignore hitTest failure
        }

        // In orbital mode, clicking empty space closes the card if it was open
        if (clickedLocation) {
          setClickedLocation(null);
          focusGraphicsLayerRef.current?.removeAll();
        }
      })();
    });

    // Double-click interaction handler: ONLY trigger to open the Tactical Action Card!
    const dblClickHandle = view.on('double-click', async (event) => {
      event.stopPropagation(); // Stop default ArcGIS double-click zoom!

      if (modeRef.current === 'surface') {
        return;
      }

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

        // Query ground DEM elevation
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

        // Place a sleek, single focus reticle on the double-clicked spot
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
      dblClickHandle.remove();
    };
  }, [isDropModeActive, dropToSurfaceAt, clickedLocation]);

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
    if (!focusedCoordinates) {
      lastFocusedCoordRef.current = null;
      return;
    }
    const [targetLng, targetLat] = focusedCoordinates;
    const coordKey = `${targetLng.toFixed(5)},${targetLat.toFixed(5)}`;
    if (coordKey === lastFocusedCoordRef.current) return;
    lastFocusedCoordRef.current = coordKey;

    const view = viewRef.current;
    if (!view) return;

    const targetPoint = new Point({
      x: targetLng,
      y: targetLat,
      spatialReference: marsSpatialReference
    });

    if (mode === 'surface') {
      // In 1st-person surface mode: smoothly descend/teleport to the target location at 1.7m AGL!
      void dropToSurfaceAt(targetPoint);
    } else {
      // In 3D orbital globe mode: center directly and accurately on targetPoint
      const isGale = Math.abs(targetLng - 137.38) < 0.5 && Math.abs(targetLat - -4.805) < 0.5;

      if (isGale) {
        const targetCamera = new Camera({
          position: new Point({
            x: targetLng,
            y: targetLat - 0.002,
            z: -3440,
            spatialReference: marsSpatialReference
          }),
          heading: 350,
          tilt: 58
        });

        void view.goTo(targetCamera, { duration: 1600, easing: 'in-out-cubic' as any });
      } else {
        const targetCamera = new Camera({
          position: new Point({
            x: targetLng,
            y: targetLat - 0.04,
            z: 25000,
            spatialReference: marsSpatialReference
          }),
          heading: 350,
          tilt: 45
        });

        void view.goTo(targetCamera, { duration: 2000, easing: 'in-out-cubic' as any });
      }
    }

    // Match waypoint / landmark name for prominent focus beacon
    let focusLabel = 'TARGET LOCATION';
    if (Math.abs(targetLng - GALE_BASE_COORDINATES[0]) < 0.0001 && Math.abs(targetLat - GALE_BASE_COORDINATES[1]) < 0.0001) {
      focusLabel = '⌂ GALE ROVER BASE';
    } else if (Math.abs(targetLng - BOXWORK_TARGET_COORDINATES[0]) < 0.0001 && Math.abs(targetLat - BOXWORK_TARGET_COORDINATES[1]) < 0.0001) {
      focusLabel = '◆ SCIENCE TARGET CANDIDATE';
    } else {
      const matchedWp =
        normalRouteRef.current?.waypoints.find(
          (w) => Math.abs(w.coordinates[0] - targetLng) < 0.0001 && Math.abs(w.coordinates[1] - targetLat) < 0.0001
        ) ||
        emergencyRouteRef.current?.waypoints.find(
          (w) => Math.abs(w.coordinates[0] - targetLng) < 0.0001 && Math.abs(w.coordinates[1] - targetLat) < 0.0001
        );
      if (matchedWp) {
        focusLabel = matchedWp.name;
      } else {
        const nearest = findNearestLandmark(targetPoint);
        focusLabel = nearest.name;
      }
    }

    // Prominent focus beacon with callout line and label in 3D
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
              size: 26,
              material: { color: [0, 240, 255] },
              outline: { color: [255, 255, 255, 0.95], size: 2.5 },
              resource: { primitive: 'diamond' }
            },
            {
              type: 'text',
              text: `📍 ${focusLabel}`,
              size: 11,
              material: { color: [255, 255, 255] },
              halo: { color: [15, 23, 42, 0.95], size: 2 }
            }
          ],
          verticalOffset: {
            screenLength: 68,
            maxWorldLength: 150000,
            minWorldLength: 25
          },
          callout: {
            type: 'line',
            size: 2.5,
            color: [0, 240, 255, 0.95]
          }
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

  // First-Person Frame Loop (WASD & Arrow Movement & Eye-Level Tracking) - ZERO LAG SYNCHRONOUS
  useEffect(() => {
    if (mode !== 'surface') {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const view = viewRef.current;
    if (!view) return;

    let isRunning = true;

    const frameLoop = () => {
      if (!isRunning || modeRef.current !== 'surface' || !view) return;

      const keys = keysDownRef.current;
      const isForward = Boolean(keys['KeyW'] || keys['w'] || keys['W'] || keys['ArrowUp'] || keys['arrowup']);
      const isBackward = Boolean(keys['KeyS'] || keys['s'] || keys['S'] || keys['ArrowDown'] || keys['arrowdown']);
      const isLeft = Boolean(keys['KeyA'] || keys['a'] || keys['A'] || keys['ArrowLeft'] || keys['arrowleft']);
      const isRight = Boolean(keys['KeyD'] || keys['d'] || keys['D'] || keys['ArrowRight'] || keys['arrowright']);
      const isSprinting = Boolean(
        keys['ShiftLeft'] || keys['ShiftRight'] || keys['Shift'] || keys['shift']
      );

      let forward = 0;
      let strafe = 0;

      if (isForward) forward += 1;
      if (isBackward) forward -= 1;
      if (isRight) strafe += 1;
      if (isLeft) strafe -= 1;

      // Eye-height adjustment (Q = lower, E = raise)
      if (keys['KeyQ'] || keys['q'] || keys['Q']) {
        setEyeHeightM((prev) => Math.max(0.6, Number((prev - 0.05).toFixed(2))));
      }
      if (keys['KeyE'] || keys['e'] || keys['E']) {
        setEyeHeightM((prev) => Math.min(12.0, Number((prev + 0.05).toFixed(2))));
      }

      const isMoving = forward !== 0 || strafe !== 0;

      if (isMoving) {
        const camera = view.camera.clone();
        const headingRad = (camera.heading * Math.PI) / 180;

        // Base speeds: Walking ~8.0 m/s (~29 km/h), Sprinting ~24.0 m/s
        const moveSpeed = isSprinting ? 24.0 : 8.0;
        const dt = 0.016; // approx 60 FPS

        // Delta in meters relative to camera heading
        const deltaNorthM =
          (forward * Math.cos(headingRad) - strafe * Math.sin(headingRad)) * moveSpeed * dt;
        const deltaEastM =
          (forward * Math.sin(headingRad) + strafe * Math.cos(headingRad)) * moveSpeed * dt;

        // Convert meter delta to Martian degree delta
        const { dLat, dLng } = metersToDegreesOnMars(deltaNorthM, deltaEastM, camera.position.y);

        const nextPoint = new Point({
          x: camera.position.x + dLng,
          y: camera.position.y + dLat,
          z: cachedGroundZRef.current + eyeHeightRef.current,
          spatialReference: marsSpatialReference
        });

        // Immediately update camera every single frame - ZERO LAG!
        camera.position = nextPoint;
        view.camera = camera;

        // Smoothly update telemetry
        setTelemetry({
          latitude: camera.position.y,
          longitude: camera.position.x,
          elevationM: cachedGroundZRef.current,
          headingDeg: camera.heading,
          eyeHeightM: eyeHeightRef.current,
          isSprinting,
          isMoving: true,
          nearestLandmark: findNearestLandmark(camera.position)
        });

        // Update ground DEM elevation throttled every 8 frames in the background
        frameCountRef.current += 1;
        if (frameCountRef.current % 8 === 0 && !queryPendingRef.current && view.map?.ground) {
          queryPendingRef.current = true;
          view.map.ground
            .queryElevation(nextPoint)
            .then((res) => {
              queryPendingRef.current = false;
              if (!isRunning || modeRef.current !== 'surface') return;
              const groundZ = (res?.geometry as Point)?.z;
              if (groundZ !== undefined && !isNaN(groundZ)) {
                cachedGroundZRef.current = groundZ;
              }
            })
            .catch(() => {
              queryPendingRef.current = false;
            });
        }
      } else {
        setTelemetry((prev) => (prev.isMoving ? { ...prev, isMoving: false, isSprinting: false } : prev));
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
      keysDownRef.current[e.key.toLowerCase()] = true;
      keysDownRef.current[e.key] = true;

      // Prevent page scrolling on Arrow keys / Space / WASD while in surface mode
      if (modeRef.current === 'surface') {
        if (
          [
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Space',
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD'
          ].includes(e.code)
        ) {
          e.preventDefault();
        }
      }

      if (e.code === 'Escape' && modeRef.current === 'surface') {
        void exitToOrbit();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
      keysDownRef.current[e.key.toLowerCase()] = false;
      keysDownRef.current[e.key] = false;
    };

    const handleBlur = () => {
      keysDownRef.current = {};
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
      if (!isPointerLockedRef.current) return;

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
    window.addEventListener('blur', handleBlur);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
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
        tabIndex={0}
        onClick={() => {
          if (mode === 'surface' && !isPointerLocked) {
            togglePointerLock();
          }
        }}
        className={`absolute inset-0 w-full h-full focus:outline-none ${
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
            if (dir === 'forward') {
              keysDownRef.current['KeyW'] = true;
              keysDownRef.current['w'] = true;
            }
            if (dir === 'backward') {
              keysDownRef.current['KeyS'] = true;
              keysDownRef.current['s'] = true;
            }
            if (dir === 'left') {
              keysDownRef.current['KeyA'] = true;
              keysDownRef.current['a'] = true;
            }
            if (dir === 'right') {
              keysDownRef.current['KeyD'] = true;
              keysDownRef.current['d'] = true;
            }
            if (dir === 'stop') {
              keysDownRef.current['KeyW'] = false;
              keysDownRef.current['KeyS'] = false;
              keysDownRef.current['KeyA'] = false;
              keysDownRef.current['KeyD'] = false;
              keysDownRef.current['w'] = false;
              keysDownRef.current['s'] = false;
              keysDownRef.current['a'] = false;
              keysDownRef.current['d'] = false;
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

      {/* Click-to-Action Tactical Card on Mars Globe (Opens ONLY on Double-Click in Orbital Mode) */}
      {clickedLocation && mode === 'orbital' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border-2 border-cyan-500/80 rounded-xl p-4 shadow-2xl backdrop-blur max-w-md w-[92%] font-mono animate-in fade-in duration-200"
        >
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
                onSelectTargetLocation?.({
                  name: clickedLocation.name,
                  coordinates: clickedLocation.coordinates,
                  groundElevationM: clickedLocation.elevationM,
                  description: clickedLocation.description
                });
                setClickedLocation(null);
                focusGraphicsLayerRef.current?.removeAll();
              }}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-cyan-400/50"
              title="Calculate rover route and mission profile to this destination"
            >
              <span>🧭 ROUTE TO TARGET</span>
            </button>

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
              className="py-2 px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-1 cursor-pointer transition-all border border-orange-400/50"
            >
              <span>🚀 WALK</span>
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
              className="py-2 px-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold text-xs rounded-lg border border-cyan-500/40 hover:border-cyan-400 cursor-pointer transition-all"
            >
              🔍 FLY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
