import React, { useEffect, useRef } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  StyleSpecification,
  MapLayerMouseEvent
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  GALE_BASE_COORDINATES,
  BOXWORK_TARGET_COORDINATES,
  CURRENT_ROVER_COORDINATES,
  NORMAL_ROUTE,
  EMERGENCY_ROUTE,
  SLOPES_GEOJSON,
  HAZARDS_GEOJSON,
  MINERALS_GEOJSON
} from '../data/marsGeoData';
import { LayerVisibility, LatLng } from '../types';

interface MarsMapProps {
  layers: LayerVisibility;
  isEmergency: boolean;
  focusedCoordinates: LatLng | null;
  onClearFocus: () => void;
}

export const MarsMap: React.FC<MarsMapProps> = ({
  layers,
  isEmergency,
  focusedCoordinates,
  onClearFocus
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Martian Style using OpenPlanetary Mars Basemap tiles (NASA/USGS Derived)
    const marsStyle: StyleSpecification = {
      version: 8,
      sources: {
        'mars-basemap': {
          type: 'raster',
          tiles: [
            'https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-2/all/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenPlanetary / USGS Astrogeology / NASA [NASA-DERIVED]'
        }
      },
      layers: [
        {
          id: 'mars-background',
          type: 'background',
          paint: {
            'background-color': '#110b0a'
          }
        },
        {
          id: 'mars-raster-layer',
          type: 'raster',
          source: 'mars-basemap',
          paint: {
            'raster-opacity': 0.88,
            'raster-contrast': 0.15,
            'raster-brightness-min': 0.05
          }
        }
      ]
    };

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: marsStyle,
      center: [137.41955, -4.84245],
      zoom: 17.2,
      minZoom: 14,
      maxZoom: 20,
      pitch: 35,
      bearing: -15,
      attributionControl: { compact: true }
    });

    mapRef.current = map;

    // Add UI Controls
    map.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 120 }), 'bottom-left');

    map.on('load', () => {
      map.resize();

      // 1. Add Slope Layer (Simulated Mock Data)
      map.addSource('slopes-source', {
        type: 'geojson',
        data: SLOPES_GEOJSON
      });

      map.addLayer({
        id: 'slopes-fill',
        type: 'fill',
        source: 'slopes-source',
        layout: {
          visibility: layers.slope ? 'visible' : 'none'
        },
        paint: {
          'fill-color': [
            'match',
            ['get', 'grade'],
            'steep', '#ef4444',
            'moderate', '#f59e0b',
            'gentle', '#10b981',
            '#64748b'
          ],
          'fill-opacity': 0.38
        }
      });

      map.addLayer({
        id: 'slopes-line',
        type: 'line',
        source: 'slopes-source',
        layout: {
          visibility: layers.slope ? 'visible' : 'none'
        },
        paint: {
          'line-color': [
            'match',
            ['get', 'grade'],
            'steep', '#dc2626',
            'moderate', '#d97706',
            'gentle', '#059669',
            '#475569'
          ],
          'line-width': 1.5,
          'line-dasharray': [2, 2]
        }
      });

      // 2. Add Hazards Layer (Simulated Mock Data)
      map.addSource('hazards-source', {
        type: 'geojson',
        data: HAZARDS_GEOJSON
      });

      map.addLayer({
        id: 'hazards-fill',
        type: 'fill',
        source: 'hazards-source',
        layout: {
          visibility: layers.hazard ? 'visible' : 'none'
        },
        paint: {
          'fill-color': '#e11d48',
          'fill-opacity': 0.42
        }
      });

      map.addLayer({
        id: 'hazards-outline',
        type: 'line',
        source: 'hazards-source',
        layout: {
          visibility: layers.hazard ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#fb7185',
          'line-width': 2.5,
          'line-dasharray': [3, 2]
        }
      });

      // 3. Add Minerals Layer (Simulated Mock Data)
      map.addSource('minerals-source', {
        type: 'geojson',
        data: MINERALS_GEOJSON
      });

      map.addLayer({
        id: 'minerals-fill',
        type: 'fill',
        source: 'minerals-source',
        layout: {
          visibility: layers.mineral ? 'visible' : 'none'
        },
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.45
        }
      });

      map.addLayer({
        id: 'minerals-outline',
        type: 'line',
        source: 'minerals-source',
        layout: {
          visibility: layers.mineral ? 'visible' : 'none'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2
        }
      });

      // 4. Add Planned Normal Route Source & Layer (System-Derived: 86.3m)
      map.addSource('route-normal-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: NORMAL_ROUTE.name, provenance: 'SYSTEM-DERIVED' },
          geometry: {
            type: 'LineString',
            coordinates: NORMAL_ROUTE.coordinates
          }
        }
      });

      map.addLayer({
        id: 'route-normal-glow',
        type: 'line',
        source: 'route-normal-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#00e5ff',
          'line-width': 8,
          'line-opacity': isEmergency ? 0.2 : 0.5,
          'line-blur': 4
        }
      });

      map.addLayer({
        id: 'route-normal-core',
        type: 'line',
        source: 'route-normal-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3.5,
          'line-opacity': isEmergency ? 0.35 : 0.95,
          'line-dasharray': isEmergency ? [2, 3] : [1]
        }
      });

      // 5. Add Emergency Return Route Source & Layer (System-Derived: 79.4m)
      map.addSource('route-emergency-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: EMERGENCY_ROUTE.name, provenance: 'SYSTEM-DERIVED' },
          geometry: {
            type: 'LineString',
            coordinates: EMERGENCY_ROUTE.coordinates
          }
        }
      });

      map.addLayer({
        id: 'route-emergency-glow',
        type: 'line',
        source: 'route-emergency-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#ef4444',
          'line-width': isEmergency ? 12 : 5,
          'line-opacity': isEmergency ? 0.75 : 0.2,
          'line-blur': isEmergency ? 6 : 2
        }
      });

      map.addLayer({
        id: 'route-emergency-core',
        type: 'line',
        source: 'route-emergency-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#f87171',
          'line-width': isEmergency ? 4.5 : 2,
          'line-dasharray': [3, 2],
          'line-opacity': isEmergency ? 1.0 : 0.4
        }
      });

      // Interactive Click Handlers for Polygons (Exposing Provenance)
      map.on('click', 'hazards-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        new Popup({ className: 'mars-tactical-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#131a28; color:#fff; padding:10px; border-radius:6px; border:1px solid #ef4444; font-family:sans-serif; max-width:250px;">
              <div style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-bottom:5px;">
                [SIMULATED MOCK DATA]
              </div>
              <div style="color:#ef4444; font-weight:bold; font-size:12px; margin-bottom:4px;">⚠️ HAZARD ZONE: ${props?.type}</div>
              <div style="font-size:11px; color:#cbd5e1; line-height:1.4;">${props?.warning}</div>
            </div>
          `)
          .addTo(map);
      });

      map.on('click', 'minerals-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        new Popup({ className: 'mars-tactical-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#131a28; color:#fff; padding:10px; border-radius:6px; border:1px solid ${props?.color || '#00e5ff'}; font-family:sans-serif; max-width:250px;">
              <div style="background:rgba(245,158,11,0.2); border:1px solid #f59e0b; color:#fbbf24; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-bottom:5px;">
                [SIMULATED MOCK DATA]
              </div>
              <div style="color:${props?.color || '#00e5ff'}; font-weight:bold; font-size:12px; margin-bottom:4px;">💎 CRISM: ${props?.mineral}</div>
              <div style="font-size:11px; color:#cbd5e1; line-height:1.4;"><strong>Deposit:</strong> ${props?.deposit}<br/>${props?.description}</div>
            </div>
          `)
          .addTo(map);
      });

      map.on('click', 'slopes-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        new Popup({ className: 'mars-tactical-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#131a28; color:#fff; padding:10px; border-radius:6px; border:1px solid #f59e0b; font-family:sans-serif; max-width:250px;">
              <div style="background:rgba(245,158,11,0.2); border:1px solid #f59e0b; color:#fbbf24; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-bottom:5px;">
                [SIMULATED MOCK DATA]
              </div>
              <div style="color:#fbbf24; font-weight:bold; font-size:12px; margin-bottom:4px;">📐 SLOPE GRADIENT: ${props?.slopeDeg}°</div>
              <div style="font-size:11px; color:#cbd5e1; line-height:1.4;">${props?.label}</div>
            </div>
          `)
          .addTo(map);
      });
    });

    // 6. Create Custom HTML Markers

    // A. Gale Rover Base — Simulated Operations Point [137.41900, -4.84200]
    const galeBaseEl = document.createElement('div');
    galeBaseEl.className = 'mars-marker';
    galeBaseEl.innerHTML = `
      <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
        <div style="position:absolute; width:44px; height:44px; border-radius:50%; background:rgba(224,90,54,0.25); border:2px solid #ff5e36; animation:beaconPulse 2.2s infinite; pointer-events:none;"></div>
        <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, #ea580c, #c2410c); border:2px solid #fdba74; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px rgba(255,94,54,0.8); z-index:2;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9h6v6H9z"/>
            <path d="M12 3v6"/>
            <path d="M12 15v6"/>
            <path d="M3 12h6"/>
            <path d="M15 12h6"/>
          </svg>
        </div>
        <div style="margin-top:6px; background:rgba(15,23,42,0.95); border:1px solid #f97316; color:#fdba74; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold; white-space:nowrap; font-family:'JetBrains Mono',monospace; box-shadow:0 4px 12px rgba(0,0,0,0.6);">
          [SIMULATED] GALE ROVER BASE
        </div>
      </div>
    `;

    const galeBasePopup = new Popup({ offset: 25, closeButton: true })
      .setHTML(`
        <div style="background:#0c111d; color:#e2e8f0; padding:12px; border-radius:8px; border:1px solid #ff5e36; font-family:'JetBrains Mono',monospace; font-size:11px; max-width:270px;">
          <div style="display:inline-block; background:rgba(245,158,11,0.2); border:1px solid #f59e0b; color:#fbbf24; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-bottom:6px;">
            [SIMULATED MOCK DATA]
          </div>
          <div style="color:#fdba74; font-weight:bold; font-size:13px; font-family:'Chakra Petch',sans-serif; margin-bottom:4px;">
            GALE ROVER BASE — SIMULATED OPERATIONS POINT
          </div>
          <div style="color:#94a3b8; font-size:11px; margin-bottom:6px;">
            Coordinates: <strong>137.41900° E, 4.84200° S</strong><br/>
            Elevation: <strong>-4,420 m</strong> (Datum)<br/>
            Operations: <span style="color:#10b981;">NOMINAL 100%</span><br/>
            Docking Berth: <strong>Berth 1 READY</strong>
          </div>
          <div style="font-size:10px; color:#cbd5e1; border-top:1px solid #334155; padding-top:6px; line-height:1.3;">
            Primary robotic rover staging and recharge center situated on consolidated Aeolis Palus sedimentary plain.
          </div>
        </div>
      `);

    const galeBaseMarker = new Marker({ element: galeBaseEl })
      .setLngLat(GALE_BASE_COORDINATES)
      .setPopup(galeBasePopup)
      .addTo(map);

    // B. Boxwork Science-Target Marker [137.42010, -4.84295]
    const boxworkEl = document.createElement('div');
    boxworkEl.className = 'mars-marker';
    boxworkEl.innerHTML = `
      <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
        <div style="position:absolute; width:40px; height:40px; border-radius:50%; background:rgba(6,182,212,0.25); border:2px dashed #06b6d4; animation:spin 12s linear infinite; pointer-events:none;"></div>
        <div style="width:32px; height:32px; border-radius:6px; background:linear-gradient(135deg, #0891b2, #0e7490); border:2px solid #67e8f9; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px rgba(6,182,212,0.8); z-index:2;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 8.5 19 15.5 12 22 5 15.5 5 8.5 12 2"/>
            <line x1="12" y1="22" x2="12" y2="15.5"/>
            <polyline points="22 8.5 12 15.5 2 8.5"/>
          </svg>
        </div>
        <div style="margin-top:6px; background:rgba(15,23,42,0.95); border:1px solid #06b6d4; color:#67e8f9; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold; white-space:nowrap; font-family:'JetBrains Mono',monospace; box-shadow:0 4px 12px rgba(0,0,0,0.6);">
          BOXWORK SCIENCE TARGET
        </div>
      </div>
    `;

    const boxworkPopup = new Popup({ offset: 25, closeButton: true })
      .setHTML(`
        <div style="background:#0c111d; color:#e2e8f0; padding:12px; border-radius:8px; border:1px solid #06b6d4; font-family:'JetBrains Mono',monospace; font-size:11px; max-width:270px;">
          <div style="display:inline-block; background:rgba(6,182,212,0.2); border:1px solid #06b6d4; color:#67e8f9; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-bottom:6px;">
            [NASA-DERIVED TARGET]
          </div>
          <div style="color:#67e8f9; font-weight:bold; font-size:13px; font-family:'Chakra Petch',sans-serif; margin-bottom:4px;">
            MOUNT SHARP BOXWORK TARGET
          </div>
          <div style="color:#94a3b8; font-size:11px; margin-bottom:6px;">
            Coordinates: <strong>137.42010° E, 4.84295° S</strong><br/>
            Elevation: <strong>-4,416.9 m</strong><br/>
            Target Type: <strong>Mineralized Polygonal Ridges</strong><br/>
            Traverse Range: <strong>~86.3 m from Base</strong>
          </div>
          <div style="font-size:10px; color:#cbd5e1; border-top:1px solid #334155; padding-top:6px; line-height:1.3;">
            Curiosity rover discovery: Web-like polygonal ridges formed by ancient mineral-rich groundwater filling subsurface cracks, exposed after billions of years of wind erosion.
          </div>
        </div>
      `);

    const boxworkMarker = new Marker({ element: boxworkEl })
      .setLngLat(BOXWORK_TARGET_COORDINATES)
      .setPopup(boxworkPopup)
      .addTo(map);

    // C. Robotic Rover Marker [137.41952, -4.84235]
    const roverEl = document.createElement('div');
    roverEl.className = 'mars-marker';
    roverEl.innerHTML = `
      <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
        <div style="width:30px; height:30px; border-radius:6px; background:#059669; border:2px solid #34d399; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(16,185,129,0.9); z-index:2;">
          <!-- Rover SVG with chassis, mast and wheels -->
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="8" width="16" height="7" rx="2"/>
            <circle cx="6" cy="18" r="2"/>
            <circle cx="12" cy="18" r="2"/>
            <circle cx="18" cy="18" r="2"/>
            <path d="M12 8V4"/>
            <circle cx="12" cy="3" r="1"/>
          </svg>
        </div>
        <div style="margin-top:4px; background:rgba(6,78,59,0.95); border:1px solid #10b981; color:#a7f3d0; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:bold; white-space:nowrap; font-family:'JetBrains Mono',monospace;">
          AER-1 ROVER
        </div>
      </div>
    `;

    const roverPopup = new Popup({ offset: 20, closeButton: true })
      .setHTML(`
        <div style="background:#06261f; color:#e2e8f0; padding:10px; border-radius:8px; border:1px solid #10b981; font-family:'JetBrains Mono',monospace; font-size:11px;">
          <div style="display:inline-block; background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#34d399; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-bottom:5px;">
            [SYSTEM-DERIVED POSITION]
          </div>
          <div style="color:#34d399; font-weight:bold; font-size:12px; margin-bottom:4px;">
            AUTONOMOUS EXPLORATION ROVER (AER-1)
          </div>
          <div style="color:#94a3b8; font-size:10px; line-height:1.4;">
            Position: <strong>137.41952° E, 4.84235° S</strong><br/>
            Current Station: <strong>Bedrock Saddle (Station 2)</strong><br/>
            Elevation: <strong>-4,418.6 m</strong><br/>
            Battery: <strong>2,850 Wh</strong> | Slip Risk: <strong>4.2%</strong>
          </div>
        </div>
      `);

    const roverMarker = new Marker({ element: roverEl })
      .setLngLat(CURRENT_ROVER_COORDINATES)
      .setPopup(roverPopup)
      .addTo(map);

    markersRef.current = [galeBaseMarker, boxworkMarker, roverMarker];

    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 300);
    const timeoutId = setTimeout(handleResize, 600);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(timeoutId);
      markersRef.current.forEach(m => m.remove());
      map.remove();
    };
  }, []);

  // Update Layer Visibility dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Optical Layer (NASA-Derived)
    if (map.getLayer('mars-raster-layer')) {
      map.setLayoutProperty('mars-raster-layer', 'visibility', layers.optical ? 'visible' : 'none');
    }

    // Slope Layer (Simulated Mock Data)
    if (map.getLayer('slopes-fill')) {
      map.setLayoutProperty('slopes-fill', 'visibility', layers.slope ? 'visible' : 'none');
      map.setLayoutProperty('slopes-line', 'visibility', layers.slope ? 'visible' : 'none');
    }

    // Hazard Layer (Simulated Mock Data)
    if (map.getLayer('hazards-fill')) {
      map.setLayoutProperty('hazards-fill', 'visibility', layers.hazard ? 'visible' : 'none');
      map.setLayoutProperty('hazards-outline', 'visibility', layers.hazard ? 'visible' : 'none');
    }

    // Mineral Layer (Simulated Mock Data)
    if (map.getLayer('minerals-fill')) {
      map.setLayoutProperty('minerals-fill', 'visibility', layers.mineral ? 'visible' : 'none');
      map.setLayoutProperty('minerals-outline', 'visibility', layers.mineral ? 'visible' : 'none');
    }
  }, [layers]);

  // Update Route Appearance when Emergency State changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('route-normal-glow')) {
      map.setPaintProperty('route-normal-glow', 'line-opacity', isEmergency ? 0.15 : 0.5);
      map.setPaintProperty('route-normal-core', 'line-opacity', isEmergency ? 0.3 : 0.95);
      map.setPaintProperty('route-normal-core', 'line-dasharray', isEmergency ? [2, 3] : [1]);
    }

    if (map.getLayer('route-emergency-glow')) {
      map.setPaintProperty('route-emergency-glow', 'line-opacity', isEmergency ? 0.8 : 0.2);
      map.setPaintProperty('route-emergency-glow', 'line-width', isEmergency ? 14 : 5);
      map.setPaintProperty('route-emergency-core', 'line-opacity', isEmergency ? 1.0 : 0.4);
      map.setPaintProperty('route-emergency-core', 'line-width', isEmergency ? 5 : 2);
    }

    // Auto pan/fly to contingency route if emergency state is active
    if (isEmergency) {
      map.flyTo({
        center: [137.41955, -4.84245],
        zoom: 17.5,
        pitch: 40,
        bearing: 25,
        duration: 1200
      });
    }
  }, [isEmergency]);

  // Pan to focused coordinates if requested
  useEffect(() => {
    if (!focusedCoordinates || !mapRef.current) return;
    mapRef.current.flyTo({
      center: focusedCoordinates,
      zoom: 18.0,
      pitch: 30,
      duration: 1000
    });
    onClearFocus();
  }, [focusedCoordinates, onClearFocus]);

  return (
    <div
      className="rounded-xl overflow-hidden border border-orange-500/30 shadow-2xl bg-slate-950"
      style={{ position: 'absolute', inset: 0, minHeight: '480px' }}
    >
      {/* MapLibre DOM Container */}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Floating Tactical Overlay Badge */}
      <div className="absolute top-3 left-3 z-10 tactical-panel rounded-lg px-2.5 py-1.5 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-300 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span>GALE CRATER ROBOTIC TEST RANGE (75–100m)</span>
        <span className="text-slate-600">|</span>
        <span className="text-cyan-400">PROVENANCE: NASA / SYSTEM / SIMULATED</span>
      </div>

      {/* Route Legend Indicator Overlay */}
      <div className="absolute bottom-3 right-3 z-10 tactical-panel rounded-lg px-3 py-2 text-xs font-mono select-none hidden sm:block">
        <div className="text-[10px] font-aerospace font-bold text-slate-400 mb-1 flex items-center justify-between">
          <span>ROVER VECTORS</span>
          <span className="text-[9px] text-cyan-400">[SYSTEM-DERIVED]</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-1 rounded ${
                isEmergency ? 'bg-cyan-500/40' : 'bg-cyan-400 shadow-sm shadow-cyan-400'
              }`}
            />
            <span className={isEmergency ? 'text-slate-500' : 'text-cyan-300 font-semibold'}>
              Planned Traverse (86.3 m)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-1 rounded ${
                isEmergency ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-red-500/40'
              }`}
            />
            <span className={isEmergency ? 'text-red-400 font-bold emergency-flash' : 'text-slate-500'}>
              Contingency Return Vector (79.4 m)
            </span>
          </div>
        </div>
        <div className="mt-1 pt-1 border-t border-slate-800 text-[9px] text-slate-400">
          Basemap: [NASA-DERIVED] • Polygons: [SIMULATED MOCK DATA]
        </div>
      </div>
    </div>
  );
};
