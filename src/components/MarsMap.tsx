import React, { useEffect, useRef } from 'react';
import {
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  StyleSpecification,
  setWorkerUrl
} from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  BOXWORK_TARGET_COORDINATES,
  CURRENT_ROVER_COORDINATES,
  GALE_BASE_COORDINATES,
  HAZARDS_GEOJSON,
  MINERALS_GEOJSON,
  SLOPES_GEOJSON
} from '../data/marsGeoData';
import { cellToLngLat } from '../data/terrainSites';
import { LatLng, LayerVisibility, RouteData } from '../types';

// Vite's default blob worker is blocked in embedded browser contexts. Point
// MapLibre at its packaged module worker so GeoJSON route layers render there.
setWorkerUrl(mapLibreWorkerUrl);

interface MarsMapProps {
  layers: LayerVisibility;
  isEmergency: boolean;
  normalRoute: RouteData | null;
  emergencyRoute: RouteData | null;
  blockedHazardCells: { row: number; column: number }[] | null;
  focusedCoordinates: LatLng | null;
  onClearFocus: () => void;
}

const routeFeature = (route: RouteData | null, fallback: LatLng) => ({
  type: 'Feature' as const,
  properties: {
    name: route?.name ?? 'Waiting for Python route',
    provenance: 'SYSTEM-DERIVED'
  },
  geometry: {
    type: 'LineString' as const,
    coordinates: route?.coordinates.length ? route.coordinates : [fallback, fallback]
  }
});

const markerElement = (icon: string, label: string, color: string) => {
  const element = document.createElement('div');
  element.className = 'mars-marker';
  element.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px">
      <div style="width:34px;height:34px;border-radius:50%;background:#0f172a;border:2px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px ${color}99;font-size:17px">${icon}</div>
      <div style="padding:2px 7px;border:1px solid ${color};border-radius:4px;background:rgba(15,23,42,.95);color:${color};font:700 9px 'JetBrains Mono',monospace;white-space:nowrap">${label}</div>
    </div>`;
  return element;
};

const popupHtml = (badge: string, title: string, details: string, color: string) => `
  <div style="background:#0c111d;color:#e2e8f0;padding:12px;border-radius:8px;border:1px solid ${color};font:11px 'JetBrains Mono',monospace;max-width:285px">
    <div style="display:inline-block;color:${color};border:1px solid ${color};border-radius:3px;padding:2px 6px;font-size:9px;font-weight:700;margin-bottom:7px">${badge}</div>
    <div style="color:${color};font-weight:700;font-size:13px;margin-bottom:6px">${title}</div>
    <div style="color:#94a3b8;line-height:1.55">${details}</div>
  </div>`;

export const MarsMap: React.FC<MarsMapProps> = ({
  layers,
  isEmergency,
  normalRoute,
  emergencyRoute,
  blockedHazardCells,
  focusedCoordinates,
  onClearFocus
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const marsStyle: StyleSpecification = {
      version: 8,
      sources: {
        'mars-basemap': {
          type: 'raster',
          tiles: ['https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-2/all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: 'OpenPlanetary / USGS Astrogeology / NASA'
        }
      },
      layers: [
        { id: 'mars-background', type: 'background', paint: { 'background-color': '#110b0a' } },
        {
          id: 'mars-raster-layer',
          type: 'raster',
          source: 'mars-basemap',
          paint: { 'raster-opacity': 0.9, 'raster-contrast': 0.15, 'raster-brightness-min': 0.05 }
        }
      ]
    };

    const center: LatLng = [
      (GALE_BASE_COORDINATES[0] + BOXWORK_TARGET_COORDINATES[0]) / 2,
      (GALE_BASE_COORDINATES[1] + BOXWORK_TARGET_COORDINATES[1]) / 2
    ];
    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: marsStyle,
      center,
      zoom: 17.2,
      minZoom: 12,
      maxZoom: 20,
      pitch: 35,
      bearing: -15,
      attributionControl: { compact: true }
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 120 }), 'bottom-left');

    map.on('load', () => {
      map.resize();
      map.addSource('slopes-source', { type: 'geojson', data: SLOPES_GEOJSON });
      map.addLayer({
        id: 'slopes-fill', type: 'fill', source: 'slopes-source',
        layout: { visibility: layers.slope ? 'visible' : 'none' },
        paint: {
          'fill-color': ['match', ['get', 'grade'], 'moderate', '#f59e0b', 'steep', '#ef4444', '#10b981'],
          'fill-opacity': 0.36
        }
      });
      map.addLayer({
        id: 'slopes-line', type: 'line', source: 'slopes-source',
        layout: { visibility: layers.slope ? 'visible' : 'none' },
        paint: { 'line-color': '#f59e0b', 'line-width': 1.5, 'line-dasharray': [2, 2] }
      });

      map.addSource('hazards-source', { type: 'geojson', data: HAZARDS_GEOJSON });
      map.addLayer({
        id: 'hazards-fill', type: 'fill', source: 'hazards-source',
        layout: { visibility: layers.hazard ? 'visible' : 'none' },
        paint: { 'fill-color': '#e11d48', 'fill-opacity': 0.42 }
      });
      map.addLayer({
        id: 'hazards-outline', type: 'line', source: 'hazards-source',
        layout: { visibility: layers.hazard ? 'visible' : 'none' },
        paint: { 'line-color': '#fb7185', 'line-width': 2.5, 'line-dasharray': [3, 2] }
      });

      map.addSource('minerals-source', { type: 'geojson', data: MINERALS_GEOJSON });
      map.addLayer({
        id: 'minerals-fill', type: 'fill', source: 'minerals-source',
        layout: { visibility: layers.mineral ? 'visible' : 'none' },
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.4 }
      });
      map.addLayer({
        id: 'minerals-outline', type: 'line', source: 'minerals-source',
        layout: { visibility: layers.mineral ? 'visible' : 'none' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 2 }
      });

      // Blocked hazard zone polygon (placed underneath route lines)
      map.addSource('blocked-hazard-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'blocked-hazard-fill', type: 'fill', source: 'blocked-hazard-source',
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.15 }
      });
      map.addLayer({
        id: 'blocked-hazard-outline', type: 'line', source: 'blocked-hazard-source',
        paint: { 'line-color': '#ef4444', 'line-width': 1.5, 'line-dasharray': [4, 3] }
      });

      map.addSource('route-normal-source', {
        type: 'geojson', data: routeFeature(normalRoute, GALE_BASE_COORDINATES)
      });
      map.addLayer({
        id: 'route-normal-glow', type: 'line', source: 'route-normal-source',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#00e5ff', 'line-width': 13, 'line-opacity': 0.6, 'line-blur': 5 }
      });
      map.addLayer({
        id: 'route-normal-core', type: 'line', source: 'route-normal-source',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#22d3ee', 'line-width': 5, 'line-opacity': 1 }
      });

      map.addSource('route-emergency-source', {
        type: 'geojson', data: routeFeature(emergencyRoute, BOXWORK_TARGET_COORDINATES)
      });
      map.addLayer({
        id: 'route-emergency-glow', type: 'line', source: 'route-emergency-source',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ff2d55', 'line-width': 16, 'line-opacity': 0.22, 'line-blur': 5 }
      });
      map.addLayer({
        id: 'route-emergency-core', type: 'line', source: 'route-emergency-source',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ff334f', 'line-width': 5.5, 'line-opacity': 0, 'line-dasharray': [3, 2] }
      });

      const showOverlayPopup = (event: MapLayerMouseEvent) => {
        const properties = event.features?.[0]?.properties;
        if (!properties) return;
        const title = properties.type ?? properties.mineral ?? `Slope ${properties.slopeDeg ?? ''}°`;
        const description = properties.warning ?? properties.description ?? properties.label ?? '';
        new Popup({ className: 'mars-tactical-popup' })
          .setLngLat(event.lngLat)
          .setHTML(popupHtml('[SIMULATED MOCK DATA]', String(title), String(description), '#f59e0b'))
          .addTo(map);
      };
      map.on('click', 'hazards-fill', showOverlayPopup);
      map.on('click', 'minerals-fill', showOverlayPopup);
      map.on('click', 'slopes-fill', showOverlayPopup);
      map.on('click', 'blocked-hazard-fill', showOverlayPopup);

      const bounds = new LngLatBounds(GALE_BASE_COORDINATES, GALE_BASE_COORDINATES)
        .extend(BOXWORK_TARGET_COORDINATES);
      map.fitBounds(bounds, { padding: 120, maxZoom: 18.2, duration: 0 });
    });

    const baseMarker = new Marker({
      element: markerElement('⌂', '[SIMULATED] GALE ROVER BASE', '#fb923c')
    })
      .setLngLat(GALE_BASE_COORDINATES)
      .setPopup(new Popup({ offset: 25 }).setHTML(popupHtml(
        '[SIMULATED OPERATIONS POINT]',
        'GALE ROVER BASE',
        '137.38017231° E, 4.80425574° S<br/>DTM elevation: about -3,631.27 m<br/>Base cell: row 32, column 139',
        '#fb923c'
      )))
      .addTo(map);

    const targetMarker = new Marker({
      element: markerElement('◆', 'SCIENCE TARGET CANDIDATE', '#22d3ee')
    })
      .setLngLat(BOXWORK_TARGET_COORDINATES)
      .setPopup(new Popup({ offset: 25 }).setHTML(popupHtml(
        '[WAYPOINT-LINKED CANDIDATE]',
        'SOL 4621 SCIENCE-TARGET CANDIDATE',
        '137.37950662° E, 4.80541641° S<br/>DTM elevation: about -3,622.49 m<br/>Exact ridge formation at this coordinate is not confirmed. Connected to Sol 4621 waypoint.',
        '#22d3ee'
      )))
      .addTo(map);

    const roverMarker = new Marker({
      element: markerElement('◈', '[SIMULATED] AER-1', '#34d399')
    })
      .setLngLat(CURRENT_ROVER_COORDINATES)
      .setPopup(new Popup({ offset: 25 }).setHTML(popupHtml(
        '[SIMULATED ROVER POSITION]',
        'AUTONOMOUS EXPLORATION ROVER AER-1',
        'Demo position is colocated with the science-target candidate. Telemetry and rover state are simulated.',
        '#34d399'
      )))
      .addTo(map);

    markersRef.current = [baseMarker, targetMarker, roverMarker];

    const resize = () => map.resize();
    window.addEventListener('resize', resize);
    const resizeTimers = [50, 250, 700].map((delay) => window.setTimeout(resize, delay));

    return () => {
      resizeTimers.forEach(window.clearTimeout);
      window.removeEventListener('resize', resize);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // Route source updates are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = (): boolean => {
      const normalSource = map.getSource('route-normal-source') as GeoJSONSource | undefined;
      const emergencySource = map.getSource('route-emergency-source') as GeoJSONSource | undefined;
      const hazardSource = map.getSource('blocked-hazard-source') as GeoJSONSource | undefined;
      if (!normalSource || !emergencySource || !hazardSource) return false;

      normalSource.setData(routeFeature(normalRoute, GALE_BASE_COORDINATES));
      emergencySource.setData(routeFeature(emergencyRoute, BOXWORK_TARGET_COORDINATES));

      if (isEmergency && blockedHazardCells && blockedHazardCells.length > 0) {
          // Bounding box of blocked cells
          let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
          for (const cell of blockedHazardCells) {
            if (cell.row < minRow) minRow = cell.row;
            if (cell.row > maxRow) maxRow = cell.row;
            if (cell.column < minCol) minCol = cell.column;
            if (cell.column > maxCol) maxCol = cell.column;
          }
          // Get corner coordinates (expand slightly by half cell for full coverage)
          const nw = cellToLngLat(minRow, minCol);
          const ne = cellToLngLat(minRow, maxCol + 1);
          const se = cellToLngLat(maxRow + 1, maxCol + 1);
          const sw = cellToLngLat(maxRow + 1, minCol);

        hazardSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                type: 'Simulated Emergency Hazard Zone',
                warning: 'Simulated obstacle grid (rows 62–72, cols 115–135) forcing contingency detour.'
              },
              geometry: {
                type: 'Polygon',
                coordinates: [[nw, ne, se, sw, nw]]
              }
            }
          ]
        });
      } else {
        hazardSource.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      return true;
    };

    const updateWhenReady = () => {
      if (update()) {
        map.off('load', updateWhenReady);
        map.off('styledata', updateWhenReady);
      }
    };
    if (!update()) {
      map.on('load', updateWhenReady);
      map.on('styledata', updateWhenReady);
    }
    return () => {
      map.off('load', updateWhenReady);
      map.off('styledata', updateWhenReady);
    };
  }, [normalRoute, emergencyRoute, isEmergency, blockedHazardCells]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateVisibility = (): boolean => {
      if (!map.getLayer('mars-raster-layer') || !map.getLayer('slopes-fill')) return false;
      const setVisibility = (ids: string[], visible: boolean) => ids.forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      });
      setVisibility(['mars-raster-layer'], layers.optical);
      setVisibility(['slopes-fill', 'slopes-line'], layers.slope);
      setVisibility(['hazards-fill', 'hazards-outline'], layers.hazard);
      setVisibility(['minerals-fill', 'minerals-outline'], layers.mineral);
      return true;
    };
    const updateWhenReady = () => {
      if (updateVisibility()) {
        map.off('load', updateWhenReady);
        map.off('styledata', updateWhenReady);
      }
    };
    if (!updateVisibility()) {
      map.on('load', updateWhenReady);
      map.on('styledata', updateWhenReady);
    }
    return () => {
      map.off('load', updateWhenReady);
      map.off('styledata', updateWhenReady);
    };
  }, [layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = (): boolean => {
      if (!map.getLayer('route-normal-core') || !map.getLayer('route-emergency-core')) return false;

      // Normal route: solid cyan when nominal, dim dashed cyan when in emergency
      map.setPaintProperty('route-normal-glow', 'line-opacity', isEmergency ? 0.08 : 0.6);
      map.setPaintProperty('route-normal-core', 'line-opacity', isEmergency ? 0.18 : 1);
      map.setPaintProperty('route-normal-core', 'line-dasharray', isEmergency ? [2, 3] : [1]);

      // Emergency route: faint dashed when nominal, bold solid glowing red when in emergency
      map.setPaintProperty('route-emergency-glow', 'line-opacity', isEmergency ? 0.9 : 0);
      map.setPaintProperty('route-emergency-glow', 'line-width', isEmergency ? 18 : 1);
      map.setPaintProperty('route-emergency-core', 'line-opacity', isEmergency ? 1 : 0);
      map.setPaintProperty('route-emergency-core', 'line-width', isEmergency ? 6.5 : 1);
      map.setPaintProperty('route-emergency-core', 'line-dasharray', isEmergency ? [1] : [3, 2]);

      const coordinates = isEmergency ? emergencyRoute?.coordinates : normalRoute?.coordinates;
      if (coordinates && coordinates.length >= 2) {
        const bounds = coordinates.reduce(
          (current, coordinate) => current.extend(coordinate),
          new LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, { padding: 120, maxZoom: 18.4, duration: 900 });
      }
      return true;
    };

    const updateWhenReady = () => {
      if (update()) {
        map.off('load', updateWhenReady);
        map.off('styledata', updateWhenReady);
      }
    };
    if (!update()) {
      map.on('load', updateWhenReady);
      map.on('styledata', updateWhenReady);
    }
    return () => {
      map.off('load', updateWhenReady);
      map.off('styledata', updateWhenReady);
    };
  }, [isEmergency, normalRoute, emergencyRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedCoordinates) return;
    map.flyTo({ center: focusedCoordinates, zoom: 19, pitch: 42, duration: 900 });
    onClearFocus();
  }, [focusedCoordinates, onClearFocus]);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl border border-orange-500/25 bg-slate-950">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="absolute left-3 top-3 z-10 max-w-[280px] rounded-lg border border-slate-700 bg-slate-950/90 p-2.5 font-mono text-[10px] shadow-xl backdrop-blur">
        <div className="mb-1 font-aerospace text-xs font-bold text-orange-300">GALE CRATER ROUTING DEMO</div>
        <div className="text-slate-300">HiRISE crop: 201 × 201 cells • 1.012 m/cell</div>
        <div className="text-slate-400">Route: live Python weighted A*</div>
        <div className="mt-1 border-t border-slate-800 pt-1 text-slate-500">Basemap: NASA/USGS-derived • Polygons: simulated</div>
      </div>
      <div className="absolute bottom-8 right-3 z-10 rounded-lg border border-slate-700 bg-slate-950/90 p-2.5 font-mono text-[10px] shadow-xl backdrop-blur">
        <div className={isEmergency ? 'text-slate-500' : 'font-semibold text-cyan-300'}>
          <span className="mr-2 inline-block h-1 w-3.5 rounded bg-cyan-400" />
          Planned traverse ({normalRoute ? `${normalRoute.distanceM.toFixed(1)} m` : 'loading'})
        </div>
        <div className={isEmergency ? 'mt-1 font-bold text-red-400' : 'mt-1 text-slate-500'}>
          <span className="mr-2 inline-block h-1 w-3.5 rounded bg-red-500" />
          Contingency return ({emergencyRoute ? `${emergencyRoute.distanceM.toFixed(1)} m` : 'not calculated'})
        </div>
      </div>
    </div>
  );
};
