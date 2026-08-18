/**
 * RailForge Studio: Lower Mainland BC GIS & Railway Workstation Controller
 */
import { RailGisEngine } from './map.js';

const PRESETS = {
  roberts_bank: {
    name: 'Roberts Bank Deltaport (BCRC / CN / CPKC / BNSF)',
    lat: 49.0205,
    lng: -123.1550,
    zoom: 15.2,
    bearing: 330,
    pitch: 55
  },
  poco_yard: {
    name: 'Port Coquitlam Yard (CPKC Major Yard)',
    lat: 49.2561,
    lng: -122.7594,
    zoom: 15.2,
    bearing: 105,
    pitch: 50
  },
  thornton_yard: {
    name: 'Thornton Classification Yard (CN Rail)',
    lat: 49.2065,
    lng: -122.8680,
    zoom: 15.0,
    bearing: 65,
    pitch: 45
  },
  burrard_inlet: {
    name: 'Burrard Waterfront & Grain Elevators (Port of Vancouver)',
    lat: 49.2880,
    lng: -123.0850,
    zoom: 15.5,
    bearing: 285,
    pitch: 50
  },
  brownsville: {
    name: 'Brownsville & S. Westminster Spurs (SRY / BNSF)',
    lat: 49.1950,
    lng: -122.8850,
    zoom: 15.4,
    bearing: 120,
    pitch: 45
  },
  calgary: {
    name: 'Calgary Logistics Hub (CPKC / CN)',
    lat: 50.9835,
    lng: -113.8820,
    zoom: 15.2,
    bearing: 42,
    pitch: 55
  },
  bailey: {
    name: 'Bailey Yard (Union Pacific, North Platte, NE)',
    lat: 41.1550,
    lng: -100.8250,
    zoom: 15.0,
    bearing: 90,
    pitch: 45
  },
  houston: {
    name: 'Houston Ship Channel Terminal (PTRA / UP, TX)',
    lat: 29.7420,
    lng: -95.2280,
    zoom: 15.8,
    bearing: 15,
    pitch: 50
  }
};

class RailStudioApp {
  constructor() {
    this.engine = null;
    this.toastTimer = null;
    this.init();
  }

  init() {
    // 1. Initialize MapLibre GIS Engine defaulting to Roberts Bank Deltaport (Lower Mainland BC)
    this.engine = new RailGisEngine('map-container', {
      lat: PRESETS.roberts_bank.lat,
      lng: PRESETS.roberts_bank.lng,
      zoom: PRESETS.roberts_bank.zoom
    });

    // 2. Setup Events & Callbacks
    this.setupDockControls();
    this.setupRibbonControls();
    this.setupGoogleMapsControls();
    this.setupEngineCallbacks();

    // 3. Prompt user location on start
    this.promptInitialLocation();
  }

  setupEngineCallbacks() {
    // Sync Camera properties to Right Properties Panel & Status Bar
    this.engine.onCameraChangeCallback = (cam) => {
      document.getElementById('prop-cam-center').textContent = `${cam.centerLat.toFixed(4)}, ${cam.centerLng.toFixed(4)}`;
      document.getElementById('prop-cam-zoom').textContent = cam.zoom;
      document.getElementById('prop-cam-pitch').textContent = `${cam.pitch}° (${cam.pitch > 20 ? '3D Mesh' : '2D Plan'})`;
      document.getElementById('prop-cam-bearing').textContent = `${cam.bearing}°`;

      document.getElementById('status-zoom').textContent = `ZOOM: ${cam.zoom}`;
    };

    // Sync Cursor Hover to Right Properties Panel & Status Bar
    this.engine.onHoverCallback = (cursor) => {
      const latStr = `${cursor.lat.toFixed(5)}° N`;
      const lngStr = `${Math.abs(cursor.lng).toFixed(5)}° W`;
      const elevFt = Math.round(cursor.elevationFt * 10) / 10;
      const elevM = Math.round(cursor.elevationMeters * 10) / 10;

      document.getElementById('prop-cur-lat').textContent = latStr;
      document.getElementById('prop-cur-lng').textContent = lngStr;
      document.getElementById('prop-cur-elev').textContent = `${elevFt.toLocaleString()} ft`;
      document.getElementById('prop-cur-elev-m').textContent = `${elevM.toLocaleString()} m (CGVD2013)`;

      const slope = (Math.abs(Math.sin(cursor.lat * 800) * 1.5)).toFixed(2);
      const slopeFeasible = parseFloat(slope) <= 1.5 ? '(Feasible)' : '(Steep)';
      document.getElementById('prop-cur-slope').textContent = `${slope}% ${slopeFeasible}`;

      document.getElementById('status-coords').textContent = `📍 LAT: ${cursor.lat.toFixed(5)}° | LNG: ${cursor.lng.toFixed(5)}°`;
      document.getElementById('status-elevation').textContent = `⛰️ ELEV: ${elevFt.toLocaleString()} ft (${elevM.toLocaleString()} m CGVD)`;
    };

    this.engine.onStatusToastCallback = (msg) => {
      this.showToast(msg);
    };
  }

  setupDockControls() {
    const leftDock = document.getElementById('dock-left-navigator');
    const rightDock = document.getElementById('dock-right-properties');

    const toggleLeft = () => leftDock.classList.toggle('collapsed-left');
    document.getElementById('btn-toggle-left-dock')?.addEventListener('click', toggleLeft);
    document.getElementById('btn-close-left')?.addEventListener('click', toggleLeft);

    const toggleRight = () => rightDock.classList.toggle('collapsed-right');
    document.getElementById('btn-toggle-right-dock')?.addEventListener('click', toggleRight);
    document.getElementById('btn-close-right')?.addEventListener('click', toggleRight);

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggleLeft();
      } else if (e.key === 'F4') {
        e.preventDefault();
        toggleRight();
      }
    });
  }

  setupRibbonControls() {
    // Location Select (Lower Mainland BC & North America)
    document.getElementById('ribbon-location-select')?.addEventListener('change', (e) => {
      const loc = PRESETS[e.target.value];
      if (loc) {
        this.engine.flyTo(loc.lng, loc.lat, loc.zoom, loc.bearing, loc.pitch);
        this.showToast(`Navigating to ${loc.name}`);
      }
    });

    // Basemap Select (DataBC Ortho, Esri Clarity HD, USGS)
    document.getElementById('ribbon-basemap-select')?.addEventListener('change', (e) => {
      this.engine.setBasemap(e.target.value);
      this.showToast(`Switched basemap: ${e.target.options[e.target.selectedIndex].text}`);
    });

    // 2D / 3D Toggle
    const btnRibbon3D = document.getElementById('btn-ribbon-toggle-3d');
    btnRibbon3D?.addEventListener('click', () => {
      const is3D = this.engine.toggle2D3D();
      btnRibbon3D.classList.toggle('active', is3D);
      document.getElementById('ribbon-3d-text').textContent = is3D ? '3D Terrain' : '2D Plan';
      this.showToast(is3D ? '3D Terrain Mesh Enabled (1m LiDAR DEM)' : '2D Top-Down Engineering Plan View');
    });

    // Locate Me
    document.getElementById('btn-ribbon-locate-me')?.addEventListener('click', () => {
      this.engine.locateUser();
    });

    // Layer Switches
    document.getElementById('btn-toggle-3d-mesh')?.addEventListener('click', (e) => {
      const isAct = e.currentTarget.classList.toggle('active');
      this.engine.enable3DTerrain(isAct);
      this.showToast(isAct ? '3D DEM Terrain Enabled' : '3D DEM Terrain Disabled');
    });

    document.getElementById('btn-toggle-parcelmap-bc')?.addEventListener('click', (e) => {
      const isAct = e.currentTarget.classList.toggle('active');
      this.engine.toggleLayer('parcelmap-bc', isAct);
      this.showToast(isAct ? 'ParcelMap BC (Cadastral & Rail ROW) Visible' : 'ParcelMap BC Hidden');
    });

    document.getElementById('btn-toggle-rail-overlay')?.addEventListener('click', (e) => {
      const isAct = e.currentTarget.classList.toggle('active');
      this.engine.toggleLayer('railway-network', isAct);
      this.showToast(isAct ? 'BC Rail Network (CN, CPKC, SRY, BCRC) Visible' : 'Rail Network Hidden');
    });

    // Tool placeholders
    const toolIds = ['btn-tool-track', 'btn-tool-turnout', 'btn-tool-car-spot', 'btn-tool-profile', 'btn-tool-grading', 'btn-ribbon-save', 'btn-ribbon-export-landxml', 'btn-ribbon-export-dxf'];
    toolIds.forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.showToast('Tool activated. Ready for design input.');
      });
    });
  }

  setupGoogleMapsControls() {
    document.getElementById('btn-gmap-locate')?.addEventListener('click', () => this.engine.locateUser());
    document.getElementById('btn-gmap-zoom-in')?.addEventListener('click', () => this.engine.zoomIn());
    document.getElementById('btn-gmap-zoom-out')?.addEventListener('click', () => this.engine.zoomOut());

    const btnGmap3D = document.getElementById('btn-gmap-3d-toggle');
    btnGmap3D?.addEventListener('click', () => {
      const is3D = this.engine.toggle2D3D();
      btnGmap3D.classList.toggle('active', is3D);
    });

    document.getElementById('btn-gmap-reset-north')?.addEventListener('click', () => {
      this.engine.resetNorth();
      this.showToast('Reset view North-Up (2D)');
    });
  }

  promptInitialLocation() {
    if ("geolocation" in navigator) {
      setTimeout(() => {
        this.showToast('Welcome to Lower Mainland BC Workstation. Click "Locate Me" to zoom to your GPS position.');
      }, 1200);
    }
  }

  showToast(msg) {
    const toast = document.getElementById('vs-toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.style.display = 'block';

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.railStudio = new RailStudioApp();
});
