/**
 * RailForge Studio: High-Precision 2D/3D GIS & Geolocation Engine
 * Powered by MapLibre GL 3D with DataBC (Lower Mainland), ParcelMap BC, USGS 3DEP, and OpenRailwayMap.
 */

export class RailGisEngine {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = options;
    this.map = null;
    this.is3D = true;
    this.activeBasemap = 'esri-satellite';
    this.userLocationMarker = null;
    
    // Callbacks
    this.onCameraChangeCallback = null;
    this.onHoverCallback = null;
    this.onStatusToastCallback = null;

    this.initMap();
  }

  initMap() {
    // Default to Roberts Bank Deltaport (Lower Mainland BC)
    const initialLat = this.options.lat || 49.0205;
    const initialLng = this.options.lng || -123.1550;
    const initialZoom = this.options.zoom || 15.2;

    this.map = new maplibregl.Map({
      container: this.containerId,
      style: {
        version: 8,
        sources: {
          // 1. Esri World Imagery (High-Resolution Aerial Orthophoto)
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'Esri, Maxar, Earthstar Geographics'
          },
          // 2. DataBC High-Resolution Orthophoto WMS (Province of British Columbia)
          'databc-ortho': {
            type: 'raster',
            tiles: [
              'https://openmaps.gov.bc.ca/geo/pub/ows?service=WMS&version=1.3.0&request=GetMap&bbox={bbox-epsg-3857}&crs=EPSG:3857&width=256&height=256&layers=WHSE_IMAGERY_AND_BASE_MAPS.AERIAL_PHOTO_MOSAICS&styles=&format=image/jpeg'
            ],
            tileSize: 256,
            attribution: 'Province of British Columbia / DataBC'
          },
          // 3. ParcelMap BC (Official Cadastral Property & Railway Right-of-Way Fabric)
          'parcelmap-bc': {
            type: 'raster',
            tiles: [
              'https://openmaps.gov.bc.ca/geo/pub/ows?service=WMS&version=1.3.0&request=GetMap&bbox={bbox-epsg-3857}&crs=EPSG:3857&width=256&height=256&layers=WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW&styles=&format=image/png&transparent=true'
            ],
            tileSize: 256,
            attribution: 'ParcelMap BC / Land Title and Survey Authority'
          },
          // 4. USGS 3DEP / NAIP High-Resolution True Ortho (0.6m)
          'usgs-ortho': {
            type: 'raster',
            tiles: [
              'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'USGS National Map 3DEP'
          },
          // 5. USGS 3DEP Multi-Directional LiDAR Shaded Relief
          'usgs-lidar-relief': {
            type: 'raster',
            tiles: [
              'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'USGS 3DEP Multi-Directional Hillshade'
          },
          // 6. OpenRailwayMap Live Rail Network
          'open-railway-map': {
            type: 'raster',
            tiles: [
              'https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenRailwayMap, OpenStreetMap'
          },
          // 7. Global 3D Terrain DEM (Terrarium Elevation Mesh)
          'terrain-dem': {
            type: 'raster-dem',
            tiles: [
              'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
            ],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15
          },
          // 8. Carto Dark Basemap
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
            ],
            tileSize: 256,
            attribution: '&copy; CartoDB, &copy; OpenStreetMap'
          }
        },
        layers: [
          // Base imagery layers
          {
            id: 'layer-esri-satellite',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'visible' }
          },
          {
            id: 'layer-databc-ortho',
            type: 'raster',
            source: 'databc-ortho',
            minzoom: 10,
            maxzoom: 20,
            layout: { visibility: 'none' }
          },
          {
            id: 'layer-usgs-ortho',
            type: 'raster',
            source: 'usgs-ortho',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'none' }
          },
          {
            id: 'layer-carto-dark',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'none' }
          },
          // ParcelMap BC Cadastral & Rail Right-of-Way Overlay
          {
            id: 'layer-parcelmap-bc',
            type: 'raster',
            source: 'parcelmap-bc',
            minzoom: 13,
            maxzoom: 20,
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.80 }
          },
          // LiDAR Shaded Relief Overlay
          {
            id: 'layer-lidar-relief',
            type: 'raster',
            source: 'usgs-lidar-relief',
            minzoom: 0,
            maxzoom: 20,
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.65 }
          },
          // OpenRailwayMap Track Network
          {
            id: 'layer-railway-network',
            type: 'raster',
            source: 'open-railway-map',
            minzoom: 10,
            maxzoom: 19,
            layout: { visibility: 'visible' },
            paint: { 'raster-opacity': 0.90 }
          }
        ]
      },
      center: [initialLng, initialLat],
      zoom: initialZoom,
      pitch: 55,
      bearing: 330,
      maxPitch: 85,
      antialias: true
    });

    this.map.on('load', () => {
      this.enable3DTerrain(true);
      this.setupMapEvents();
    });
  }

  enable3DTerrain(enable) {
    if (!this.map) return;
    this.is3D = enable;
    if (enable) {
      this.map.setTerrain({ source: 'terrain-dem', exaggeration: 1.25 });
      this.map.setSky({
        'sky-color': '#0f172a',
        'sky-horizon-blend': 0.5,
        'horizon-color': '#1e293b',
        'horizon-fog-blend': 0.5,
        'fog-color': '#020617',
        'fog-ground-blend': 0.5
      });
    } else {
      this.map.setTerrain(null);
    }
  }

  toggle2D3D() {
    this.is3D = !this.is3D;
    if (this.is3D) {
      this.enable3DTerrain(true);
      this.map.easeTo({ pitch: 55, duration: 1200 });
    } else {
      this.enable3DTerrain(false);
      this.map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
    }
    return this.is3D;
  }

  zoomIn() {
    if (this.map) this.map.zoomIn({ duration: 300 });
  }

  zoomOut() {
    if (this.map) this.map.zoomOut({ duration: 300 });
  }

  resetNorth() {
    if (this.map) {
      this.map.easeTo({ bearing: 0, pitch: 0, duration: 1000 });
    }
  }

  locateUser() {
    if (!navigator.geolocation) {
      this.showToast('Geolocation is not supported by your browser.');
      return;
    }

    this.showToast('Locating your position in Lower Mainland BC...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        this.map.flyTo({
          center: [longitude, latitude],
          zoom: 16.5,
          pitch: 50,
          bearing: 0,
          duration: 3000,
          essential: true
        });

        if (!this.userLocationMarker) {
          const el = document.createElement('div');
          el.className = 'user-gps-marker';
          el.title = 'Your Current Position';
          this.userLocationMarker = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(this.map);
        } else {
          this.userLocationMarker.setLngLat([longitude, latitude]);
        }

        this.showToast(`Located position (±${Math.round(accuracy)}m accuracy)`);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.showToast('Location access denied by user.');
            break;
          default:
            this.showToast('Could not retrieve your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  showToast(message) {
    if (this.onStatusToastCallback) {
      this.onStatusToastCallback(message);
    }
  }

  setupMapEvents() {
    const notifyCamera = () => {
      if (!this.map || !this.onCameraChangeCallback) return;
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      const pitch = this.map.getPitch();
      const bearing = this.map.getBearing();

      this.onCameraChangeCallback({
        centerLat: center.lat,
        centerLng: center.lng,
        zoom: zoom.toFixed(2),
        pitch: Math.round(pitch),
        bearing: Math.round(bearing)
      });
    };

    this.map.on('move', notifyCamera);
    this.map.on('zoom', notifyCamera);
    this.map.on('pitch', notifyCamera);
    this.map.on('rotate', notifyCamera);

    this.map.on('mousemove', (e) => {
      const { lng, lat } = e.lngLat;
      let elevationFt = 0;

      if (this.map.queryTerrainElevation) {
        const elevM = this.map.queryTerrainElevation([lng, lat]);
        if (elevM !== null && !isNaN(elevM)) {
          elevationFt = elevM * 3.28084;
        }
      }

      if (this.onHoverCallback) {
        this.onHoverCallback({
          lat,
          lng,
          elevationFt,
          elevationMeters: elevationFt * 0.3048
        });
      }
    });
  }

  setBasemap(basemapId) {
    this.activeBasemap = basemapId;
    const baseLayers = ['layer-esri-satellite', 'layer-databc-ortho', 'layer-usgs-ortho', 'layer-carto-dark'];
    baseLayers.forEach(id => {
      const target = id === `layer-${basemapId}` ? 'visible' : 'none';
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', target);
      }
    });
  }

  toggleLayer(layerId, isVisible) {
    const fullId = `layer-${layerId}`;
    if (this.map.getLayer(fullId)) {
      this.map.setLayoutProperty(fullId, 'visibility', isVisible ? 'visible' : 'none');
    }
  }

  flyTo(lng, lat, zoom = 15.5, bearing = 40, pitch = 50) {
    if (!this.map) return;
    this.map.flyTo({
      center: [lng, lat],
      zoom,
      bearing,
      pitch,
      duration: 2500,
      essential: true
    });
  }
}
