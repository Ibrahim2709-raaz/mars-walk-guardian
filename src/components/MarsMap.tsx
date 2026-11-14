import React, { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker, Popup, NavigationControl, ScaleControl } from 'maplibre-gl';
import {
  GALE_BASE_COORDINATES,
  BOXWORK_TARGET_COORDINATES,
  CURRENT_ASTRONAUT_COORDINATES,
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

    // Define Martian Style using OpenPlanetary Mars Basemap tiles
    const marsStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'mars-basemap': {
          type: 'raster',
          tiles: [
            'https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-2/all/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenPlanetary / USGS Astrogeology / NASA'
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

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: marsStyle,
      center: [137.405, -4.865],
      zoom: 12.6,
      minZoom: 9,
      maxZoom: 16,
      pitch: 25,
      bearing: -10,
      attributionControl: { compact: true }
    });

    mapRef.current = map;

    // Add UI Controls
    map.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 120 }), 'bottom-left');

    map.on('load', () => {
      map.resize();
      // 1. Add Slope Layer
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

      // 2. Add Hazards Layer
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

      // 3. Add Minerals Layer (CRISM Spectrometer)
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

      // 4. Add Normal Route Source & Layer
      map.addSource('route-normal-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: NORMAL_ROUTE.name },
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
          'line-opacity': isEmergency ? 0.2 : 0.45,
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

      // 5. Add Emergency Return Route Source & Layer
      map.addSource('route-emergency-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: EMERGENCY_ROUTE.name },
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
          'line-opacity': isEmergency ? 0.7 : 0.2,
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

      // Click event for interactive layers (hazards & minerals)
      map.on('click', 'hazards-fill', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        new Popup({ className: 'mars-tactical-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#131a28; color:#fff; padding:10px; border-radius:6px; border:1px solid #ef4444; font-family:sans-serif; max-width:240px;">
              <div style="color:#ef4444; font-weight:bold; font-size:12px; margin-bottom:4px;">⚠️ HAZARD ZONE: ${props?.type}</div>
              <div style="font-size:11px; color:#cbd5e1; line-height:1.4;">${props?.warning}</div>
            </div>
          `)
          .addTo(map);
      });

      map.on('click', 'minerals-fill', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        new Popup({ className: 'mars-tactical-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#131a28; color:#fff; padding:10px; border-radius:6px; border:1px solid ${props?.color || '#00e5ff'}; font-family:sans-serif; max-width:240px;">
              <div style="color:${props?.color || '#00e5ff'}; font-weight:bold; font-size:12px; margin-bottom:4px;">💎 CRISM: ${props?.mineral}</div>
              <div style="font-size:11px; color:#cbd5e1; line-height:1.4;"><strong>Unit:</strong> ${props?.deposit}<br/>${props?.description}</div>
            </div>
          `)
          .addTo(map);
      });
    });

    // 6. Create Custom HTML Markers

    // A. Gale Base Marker [137.419, -4.842]
    const galeBaseEl = document.createElement('div');
    galeBaseEl.className = 'mars-marker';
    galeBaseEl.innerHTML = `
      <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
        <div style="position:absolute; width:44px; height:44px; border-radius:50%; background:rgba(224,90,54,0.25); border:2px solid #ff5e36; animation:beaconPulse 2.2s infinite; pointer-events:none;"></div>
        <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, #ea580c, #c2410c); border:2px solid #fdba74; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px rgba(255,94,54,0.8); z-index:2;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"/>
            <path d="M5 21V7l7-4 7 4v14"/>
            <path d="M9 10h6v11H9z"/>
          </svg>
        </div>
        <div style="margin-top:6px; background:rgba(15,23,42,0.92); border:1px solid #f97316; color:#fdba74; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold; white-space:nowrap; font-family:'JetBrains Mono',monospace; box-shadow:0 4px 12px rgba(0,0,0,0.6);">
          [SIMULATED] GALE BASE ALPHA
        </div>
      </div>
    `;

    const galeBasePopup = new Popup({ offset: 25, closeButton: true })
      .setHTML(`
        <div style="background:#0c111d; color:#e2e8f0; padding:12px; border-radius:8px; border:1px solid #ff5e36; font-family:'JetBrains Mono',monospace; font-size:11px; max-width:260px;">
          <div style="display:inline-block; background:rgba(245,158,11,0.2); border:1px solid #f59e0b; color:#fbbf24; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-bottom:6px;">
            SIMULATED FACILITY
          </div>
          <div style="color:#fdba74; font-weight:bold; font-size:13px; font-family:'Chakra Petch',sans-serif; margin-bottom:4px;">
            GALE BASE ALPHA (HAB-1)
          </div>
          <div style="color:#94a3b8; font-size:11px; margin-bottom:6px;">
            Coordinates: <strong>137.419° E, 4.842° S</strong><br/>
            Elevation: <strong>-4,420 m</strong> (Datum)<br/>
            Life Support: <span style="color:#10b981;">NOMINAL 100%</span><br/>
            Airlocks: <strong>Airlock-1 READY</strong>
          </div>
          <div style="font-size:10px; color:#cbd5e1; border-top:1px solid #334155; pt-2; line-height:1.3;">
            Primary planetary habitation module with pressurized garage and solar-nuclear hybrid microgrid.
          </div>
        </div>
      `);

    const galeBaseMarker = new Marker({ element: galeBaseEl })
      .setLngLat(GALE_BASE_COORDINATES)
      .setPopup(galeBasePopup)
      .addTo(map);

    // B. Boxwork Science-Target Marker [137.382, -4.892]
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
        <div style="margin-top:6px; background:rgba(15,23,42,0.92); border:1px solid #06b6d4; color:#67e8f9; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold; white-space:nowrap; font-family:'JetBrains Mono',monospace; box-shadow:0 4px 12px rgba(0,0,0,0.6);">
          BOXWORK SCIENCE TARGET
        </div>
      </div>
    `;

    const boxworkPopup = new Popup({ offset: 25, closeButton: true })
      .setHTML(`
        <div style="background:#0c111d; color:#e2e8f0; padding:12px; border-radius:8px; border:1px solid #06b6d4; font-family:'JetBrains Mono',monospace; font-size:11px; max-width:270px;">
          <div style="display:inline-block; background:rgba(6,182,212,0.2); border:1px solid #06b6d4; color:#67e8f9; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-bottom:6px;">
            SCIENCE PRIORITY 1
          </div>
          <div style="color:#67e8f9; font-weight:bold; font-size:13px; font-family:'Chakra Petch',sans-serif; margin-bottom:4px;">
            MOUNT SHARP BOXWORK STRUCTURE
          </div>
          <div style="color:#94a3b8; font-size:11px; margin-bottom:6px;">
            Coordinates: <strong>137.382° E, 4.892° S</strong><br/>
            Elevation: <strong>-4,090 m</strong><br/>
            Formation: <strong>Mineralized Boxwork Ridges</strong><br/>
            Objective: <strong>Sample Core Extraction</strong>
          </div>
          <div style="font-size:10px; color:#cbd5e1; border-top:1px solid #334155; pt-2; line-height:1.3;">
            Curiosity rover discovery: Web-like polygonal ridges formed by hydrothermal/groundwater mineral crystallization in ancient subsurface cracks, standing relief after wind deflated softer bedrock.
          </div>
        </div>
      `);

    const boxworkMarker = new Marker({ element: boxworkEl })
      .setLngLat(BOXWORK_TARGET_COORDINATES)
      .setPopup(boxworkPopup)
      .addTo(map);

    // C. Astronaut EVA-1 Current Position Marker [137.396, -4.879]
    const astronautEl = document.createElement('div');
    astronautEl.className = 'mars-marker';
    astronautEl.innerHTML = `
      <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
        <div style="width:28px; height:28px; border-radius:50%; background:#059669; border:2px solid #34d399; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(16,185,129,0.9); z-index:2;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5">
            <circle cx="12" cy="7" r="4"/>
            <path d="M5.5 21v-3.5a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4V21"/>
          </svg>
        </div>
        <div style="margin-top:4px; background:rgba(6,78,59,0.9); border:1px solid #10b981; color:#a7f3d0; padding:1px 6px; border-radius:3px; font-size:9px; font-weight:bold; white-space:nowrap; font-family:'JetBrains Mono',monospace;">
          EVA-1 (WATNEY)
        </div>
      </div>
    `;

    const astronautPopup = new Popup({ offset: 20, closeButton: true })
      .setHTML(`
        <div style="background:#06261f; color:#e2e8f0; padding:10px; border-radius:8px; border:1px solid #10b981; font-family:'JetBrains Mono',monospace; font-size:11px;">
          <div style="color:#34d399; font-weight:bold; font-size:12px; margin-bottom:4px;">
            ASTRONAUT M. WATNEY (EVA-1)
          </div>
          <div style="color:#94a3b8; font-size:10px;">
            Position: 137.396° E, 4.879° S<br/>
            Station: Vera Rubin Ridge Saddle<br/>
            Elevation: -4,210 m
          </div>
        </div>
      `);

    const astronautMarker = new Marker({ element: astronautEl })
      .setLngLat(CURRENT_ASTRONAUT_COORDINATES)
      .setPopup(astronautPopup)
      .addTo(map);

    markersRef.current = [galeBaseMarker, boxworkMarker, astronautMarker];

    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    // Fire resize at 100ms, 300ms, 600ms to catch any layout paint delay
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

    // Optical Layer
    if (map.getLayer('mars-raster-layer')) {
      map.setLayoutProperty('mars-raster-layer', 'visibility', layers.optical ? 'visible' : 'none');
    }

    // Slope Layer
    if (map.getLayer('slopes-fill')) {
      map.setLayoutProperty('slopes-fill', 'visibility', layers.slope ? 'visible' : 'none');
      map.setLayoutProperty('slopes-line', 'visibility', layers.slope ? 'visible' : 'none');
    }

    // Hazard Layer
    if (map.getLayer('hazards-fill')) {
      map.setLayoutProperty('hazards-fill', 'visibility', layers.hazard ? 'visible' : 'none');
      map.setLayoutProperty('hazards-outline', 'visibility', layers.hazard ? 'visible' : 'none');
    }

    // Mineral Layer
    if (map.getLayer('minerals-fill')) {
      map.setLayoutProperty('minerals-fill', 'visibility', layers.mineral ? 'visible' : 'none');
      map.setLayoutProperty('minerals-outline', 'visibility', layers.mineral ? 'visible' : 'none');
    }
  }, [layers]);

  // Update Route Appearance when Emergency changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('route-normal-glow')) {
      map.setPaintProperty('route-normal-glow', 'line-opacity', isEmergency ? 0.15 : 0.45);
      map.setPaintProperty('route-normal-core', 'line-opacity', isEmergency ? 0.3 : 0.95);
      map.setPaintProperty('route-normal-core', 'line-dasharray', isEmergency ? [2, 3] : [1]);
    }

    if (map.getLayer('route-emergency-glow')) {
      map.setPaintProperty('route-emergency-glow', 'line-opacity', isEmergency ? 0.8 : 0.2);
      map.setPaintProperty('route-emergency-glow', 'line-width', isEmergency ? 14 : 5);
      map.setPaintProperty('route-emergency-core', 'line-opacity', isEmergency ? 1.0 : 0.4);
      map.setPaintProperty('route-emergency-core', 'line-width', isEmergency ? 5 : 2);
    }

    // Auto fit/pan to emergency route if emergency initiated
    if (isEmergency) {
      map.flyTo({
        center: [137.408, -4.860],
        zoom: 13.0,
        pitch: 35,
        bearing: 20,
        duration: 1500
      });
    }
  }, [isEmergency]);

  // Pan to focused coordinates if requested
  useEffect(() => {
    if (!focusedCoordinates || !mapRef.current) return;
    mapRef.current.flyTo({
      center: focusedCoordinates,
      zoom: 14.2,
      pitch: 30,
      duration: 1200
    });
    onClearFocus();
  }, [focusedCoordinates, onClearFocus]);

  return (
    <div
      className="rounded-xl overflow-hidden border border-orange-500/30 shadow-2xl bg-slate-950"
      style={{ position: 'absolute', inset: 0, minHeight: '480px' }}
    >
      {/* MapLibre DOM Container — must fill parent absolutely */}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Floating Tactical Overlay Compass & Coordinate Badge */}
      <div className="absolute top-3 left-3 z-10 tactical-panel rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-[10px] font-mono text-slate-300 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span>SECTOR: AEOLIS PALUS / MOUNT SHARP</span>
        <span className="text-slate-600">|</span>
        <span className="text-cyan-400">GALE CRATER GRID</span>
      </div>

      {/* Route Legend Indicator Overlay */}
      <div className="absolute bottom-3 right-3 z-10 tactical-panel rounded-lg px-3 py-2 text-xs font-mono select-none hidden sm:block">
        <div className="text-[10px] font-aerospace font-bold text-slate-400 mb-1">
          TRAVERSE VECTORS
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-1 rounded ${isEmergency ? 'bg-cyan-500/40' : 'bg-cyan-400 shadow-sm shadow-cyan-400'}`} />
            <span className={isEmergency ? 'text-slate-500' : 'text-cyan-300 font-semibold'}>
              Normal Route (Planned)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-1 rounded ${isEmergency ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-red-500/40'}`} />
            <span className={isEmergency ? 'text-red-400 font-bold emergency-flash' : 'text-slate-500'}>
              Emergency Return Vector
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
