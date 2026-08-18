/**
 * Web-GIS Map Engine (MapLibre GL with Satellite, OpenRailwayMap, LiDAR DEM overlays)
 */
import { distanceFeet, formatStationing } from './geometry.js';

export class RailMapEngine {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = options;
    this.map = null;
    this.activeTool = 'pan'; // 'pan', 'draw_track', 'place_turnout', 'measure', 'probe'
    this.activeTrackCoords = [];
    this.turnouts = [];
    this.activeBasemap = 'satellite';
    this.showRailOverlay = true;
    this.showContourOverlay = false;
    this.onTrackChangeCallback = null;
    this.onHoverCoordinateCallback = null;
    this.onTurnoutPlacedCallback = null;
    this.onPointClickedCallback = null;

    this.initMap();
  }

  initMap() {
    // Standard style with fallback raster sources
    const initialLat = this.options.lat || 50.9835; // Calgary default
    const initialLng = this.options.lng || -113.8820;
    const initialZoom = this.options.zoom || 15.5;

    this.map = new maplibregl.Map({
      container: this.containerId,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'Esri, Maxar, Earthstar Geographics'
          },
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
            ],
            tileSize: 256,
            attribution: '&copy; CartoDB, &copy; OpenStreetMap'
          },
          'open-railway-map': {
            type: 'raster',
            tiles: [
              'https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenRailwayMap, OpenStreetMap'
          },
          'usgs-topo': {
            type: 'raster',
            tiles: [
              'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'USGS National Map'
          }
        },
        layers: [
          {
            id: 'basemap-satellite',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'visible' }
          },
          {
            id: 'basemap-carto',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'none' }
          },
          {
            id: 'basemap-topo',
            type: 'raster',
            source: 'usgs-topo',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'none' }
          },
          {
            id: 'overlay-openrailway',
            type: 'raster',
            source: 'open-railway-map',
            minzoom: 10,
            maxzoom: 19,
            layout: { visibility: 'visible' },
            paint: { 'raster-opacity': 0.85 }
          }
        ]
      },
      center: [initialLng, initialLat],
      zoom: initialZoom,
      pitch: this.options.pitch || 45,
      bearing: this.options.bearing || 40,
      antialias: true
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left');

    this.map.on('load', () => {
      this.setupCustomLayers();
      this.setupMapEvents();
    });
  }

  setupCustomLayers() {
    // 1. GeoJSON source for User Track Alignment
    this.map.addSource('user-track-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // 2. Track bed / Subgrade footprint buffer line
    this.map.addLayer({
      id: 'user-track-subgrade',
      type: 'line',
      source: 'user-track-source',
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': '#1f2937',
        'line-width': 14,
        'line-opacity': 0.6
      }
    });

    // 3. Ballast shoulder layer
    this.map.addLayer({
      id: 'user-track-ballast',
      type: 'line',
      source: 'user-track-source',
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': '#4b5563',
        'line-width': 8,
        'line-opacity': 0.9
      }
    });

    // 4. Centerline / Steel Rail line
    this.map.addLayer({
      id: 'user-track-centerline',
      type: 'line',
      source: 'user-track-source',
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': '#38bdf8',
        'line-width': 3.5,
        'line-dasharray': [4, 1]
      }
    });

    // 5. Track Vertices / PI (Points of Intersection)
    this.map.addLayer({
      id: 'user-track-vertices',
      type: 'circle',
      source: 'user-track-source',
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#f59e0b',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
  }

  setupMapEvents() {
    this.map.on('mousemove', (e) => {
      const { lng, lat } = e.lngLat;
      if (this.onHoverCoordinateCallback) {
        this.onHoverCoordinateCallback(lng, lat);
      }
    });

    this.map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      const coord = [lng, lat];

      if (this.activeTool === 'draw_track') {
        this.addTrackVertex(coord);
      } else if (this.activeTool === 'place_turnout') {
        if (this.onTurnoutPlacedCallback) {
          this.onTurnoutPlacedCallback(coord);
        }
      } else if (this.activeTool === 'probe' || this.activeTool === 'measure') {
        if (this.onPointClickedCallback) {
          this.onPointClickedCallback(coord);
        }
      }
    });
  }

  setBasemap(basemapKey) {
    this.activeBasemap = basemapKey;
    const layers = ['basemap-satellite', 'basemap-carto', 'basemap-topo'];
    layers.forEach(layerId => {
      const targetVis = layerId === `basemap-${basemapKey}` ? 'visible' : 'none';
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', targetVis);
      }
    });
  }

  toggleRailOverlay(visible) {
    this.showRailOverlay = visible;
    if (this.map.getLayer('overlay-openrailway')) {
      this.map.setLayoutProperty('overlay-openrailway', 'visibility', visible ? 'visible' : 'none');
    }
  }

  setTool(toolName) {
    this.activeTool = toolName;
    if (this.map) {
      if (toolName === 'draw_track' || toolName === 'place_turnout' || toolName === 'probe') {
        this.map.getCanvas().style.cursor = 'crosshair';
      } else {
        this.map.getCanvas().style.cursor = '';
      }
    }
  }

  flyToPreset(preset) {
    if (!this.map) return;
    this.map.flyTo({
      center: [preset.lng, preset.lat],
      zoom: preset.zoom,
      pitch: preset.pitch || 45,
      bearing: preset.bearing || 0,
      duration: 2000,
      essential: true
    });
  }

  setTrackCoords(coords) {
    this.activeTrackCoords = coords || [];
    this.updateTrackGeoJSON();
  }

  addTrackVertex(coord) {
    this.activeTrackCoords.push(coord);
    this.updateTrackGeoJSON();
    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(this.activeTrackCoords);
    }
  }

  clearTrack() {
    this.activeTrackCoords = [];
    this.turnouts = [];
    this.updateTrackGeoJSON();
    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback([]);
    }
  }

  undoVertex() {
    if (this.activeTrackCoords.length > 0) {
      this.activeTrackCoords.pop();
      this.updateTrackGeoJSON();
      if (this.onTrackChangeCallback) {
        this.onTrackChangeCallback(this.activeTrackCoords);
      }
    }
  }

  setTurnouts(turnouts) {
    this.turnouts = turnouts || [];
    this.updateTrackGeoJSON();
  }

  updateTrackGeoJSON() {
    if (!this.map || !this.map.getSource('user-track-source')) return;

    const features = [];

    // Mainline alignment line
    if (this.activeTrackCoords.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: this.activeTrackCoords
        },
        properties: { type: 'mainline' }
      });
    }

    // Vertices / PIs
    this.activeTrackCoords.forEach((coord, idx) => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coord
        },
        properties: { type: 'vertex', index: idx }
      });
    });

    // Diverging tracks from turnouts
    this.turnouts.forEach((t) => {
      if (t.divergingPath && t.divergingPath.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: t.divergingPath
          },
          properties: { type: 'diverging' }
        });
      }
      if (t.pointOfSwitch) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: t.pointOfSwitch
          },
          properties: { type: 'switch', number: t.spec.number }
        });
      }
    });

    this.map.getSource('user-track-source').setData({
      type: 'FeatureCollection',
      features
    });
  }
}
