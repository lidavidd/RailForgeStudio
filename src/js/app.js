/**
 * RailForge Studio: Main Application Controller
 */
import { RAIL_PRESETS } from './presets.js';
import { RailMapEngine } from './map.js';
import { ElevationEngine } from './elevation.js';
import { ProfileViewer } from './profile-viewer.js';
import { CrossSectionViewer } from './cross-section.js';
import { analyzeTrackAlignment, formatStationing } from './geometry.js';
import { generateTurnoutGeometry, TURNOUT_SPECS } from './turnouts.js';
import { validateAlignmentCompliance, STANDARDS_PROFILES } from './rules.js';
import { exportLandXML, exportDXF, exportGeoJSON, downloadFile } from './exporters.js';

class RailForgeApp {
  constructor() {
    this.currentPreset = RAIL_PRESETS[0]; // Calgary CPKC
    this.activeStandards = 'CN_CPKC';
    this.isMetric = false;
    this.activeTool = 'pan';
    this.selectedTurnoutNumber = 11;
    this.selectedTurnoutHand = 'Right';

    // State
    this.trackCoords = [];
    this.profilePoints = [];
    this.pviNodes = [];
    this.turnouts = [];
    this.alignmentAnalysis = null;
    this.complianceResults = null;
    this.earthworkVolumes = null;

    // Roadbed cross-section parameters
    this.roadbedWidthFt = 24.0;
    this.ballastDepthIn = 12.0;
    this.subBallastDepthIn = 8.0;

    this.elevationEngine = new ElevationEngine(this.currentPreset.baseElevation * 3.28084);
    this.init();
  }

  init() {
    this.setupMap();
    this.setupProfileViewer();
    this.setupCrossSectionViewer();
    this.setupUIEvents();
    this.loadPresetDemoTrack(this.currentPreset);
  }

  setupMap() {
    this.mapEngine = new RailMapEngine('map-container', {
      lat: this.currentPreset.lat,
      lng: this.currentPreset.lng,
      zoom: this.currentPreset.zoom,
      pitch: this.currentPreset.pitch,
      bearing: this.currentPreset.bearing
    });

    this.mapEngine.onTrackChangeCallback = (coords) => this.handleTrackUpdated(coords);
    this.mapEngine.onHoverCoordinateCallback = (lng, lat) => this.handleCoordinateHover(lng, lat);
    this.mapEngine.onTurnoutPlacedCallback = (coord) => this.handleTurnoutPlacedAtCoord(coord);
    this.mapEngine.onPointClickedCallback = (coord) => this.handleMapPointClicked(coord);
  }

  setupProfileViewer() {
    const canvas = document.getElementById('profile-canvas');
    const tooltip = document.getElementById('profile-tooltip');
    if (canvas) {
      this.profileViewer = new ProfileViewer(canvas, tooltip);
      this.profileViewer.setCallback((pviNodes) => {
        this.pviNodes = pviNodes;
        this.recalculateTORFromPVI();
      });
    }
  }

  setupCrossSectionViewer() {
    const canvas = document.getElementById('cross-section-canvas');
    if (canvas) {
      this.crossSectionViewer = new CrossSectionViewer(canvas);
      this.crossSectionViewer.setParams(this.roadbedWidthFt, this.ballastDepthIn, this.subBallastDepthIn, 2.0);
    }
  }

  setupUIEvents() {
    // Preset Dropdown
    const presetSelect = document.getElementById('preset-selector');
    if (presetSelect) {
      RAIL_PRESETS.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.operator})`;
        presetSelect.appendChild(opt);
      });
      presetSelect.addEventListener('change', (e) => {
        const found = RAIL_PRESETS.find(p => p.id === e.target.value);
        if (found) this.switchPreset(found);
      });
    }

    // Standards Profile Dropdown
    const stdSelect = document.getElementById('standards-selector');
    if (stdSelect) {
      stdSelect.addEventListener('change', (e) => {
        this.activeStandards = e.target.value;
        this.updateCompliance();
      });
    }

    // Units Toggle
    const unitToggle = document.getElementById('btn-toggle-units');
    if (unitToggle) {
      unitToggle.addEventListener('click', () => {
        this.isMetric = !this.isMetric;
        unitToggle.textContent = this.isMetric ? 'Metric (m, km/h)' : 'US (ft, mph)';
        this.updateUI();
      });
    }

    // Left Tool Palette Buttons
    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        this.setTool(tool);
      });
    });

    // Undo & Clear buttons
    document.getElementById('btn-undo-vertex')?.addEventListener('click', () => {
      this.mapEngine.undoVertex();
    });
    document.getElementById('btn-clear-track')?.addEventListener('click', () => {
      if (confirm('Clear current track alignment and restart?')) {
        this.mapEngine.clearTrack();
      }
    });

    // Turnout selection buttons
    const turnoutSelect = document.getElementById('turnout-num-select');
    if (turnoutSelect) {
      turnoutSelect.addEventListener('change', (e) => {
        this.selectedTurnoutNumber = parseInt(e.target.value, 10);
      });
    }
    const handSelect = document.getElementById('turnout-hand-select');
    if (handSelect) {
      handSelect.addEventListener('change', (e) => {
        this.selectedTurnoutHand = e.target.value;
      });
    }

    // Inspector Tabs
    const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
        const targetPane = document.getElementById(`tab-pane-${targetTab}`);
        if (targetPane) targetPane.style.display = 'flex';
      });
    });

    // Basemap Layer Switcher
    const basemapSelect = document.getElementById('basemap-selector');
    if (basemapSelect) {
      basemapSelect.addEventListener('change', (e) => {
        this.mapEngine.setBasemap(e.target.value);
      });
    }

    // Overlay Toggles
    document.getElementById('btn-toggle-rail-overlay')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const isVis = btn.classList.toggle('active');
      this.mapEngine.toggleRailOverlay(isVis);
    });

    // Export Modal Buttons
    document.getElementById('btn-open-export')?.addEventListener('click', () => {
      document.getElementById('export-modal').style.display = 'flex';
    });
    document.getElementById('btn-close-export')?.addEventListener('click', () => {
      document.getElementById('export-modal').style.display = 'none';
    });

    document.getElementById('btn-export-landxml')?.addEventListener('click', () => {
      const xml = exportLandXML(this.currentPreset.name, this.trackCoords, this.profilePoints, this.pviNodes);
      downloadFile(xml, `${this.currentPreset.id}_alignment.xml`, 'application/xml');
    });

    document.getElementById('btn-export-dxf')?.addEventListener('click', () => {
      const dxf = exportDXF(this.currentPreset.name, this.trackCoords);
      downloadFile(dxf, `${this.currentPreset.id}_track.dxf`, 'application/dxf');
    });

    document.getElementById('btn-export-geojson')?.addEventListener('click', () => {
      const geo = exportGeoJSON(this.currentPreset.name, this.trackCoords, this.turnouts);
      downloadFile(geo, `${this.currentPreset.id}_alignment.geojson`, 'application/json');
    });

    document.getElementById('btn-print-report')?.addEventListener('click', () => {
      window.print();
    });
  }

  setTool(toolName) {
    this.activeTool = toolName;
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tool') === toolName);
    });
    this.mapEngine.setTool(toolName);

    const hint = document.getElementById('map-action-hint');
    if (hint) {
      switch (toolName) {
        case 'draw_track':
          hint.textContent = 'Click on map to place track Point of Intersection (PI) vertices. Double-click or switch tool when done.';
          break;
        case 'place_turnout':
          hint.textContent = `Click along track to snap No. ${this.selectedTurnoutNumber} Turnout (${this.selectedTurnoutHand} hand).`;
          break;
        case 'probe':
          hint.textContent = 'Click anywhere on terrain to probe LiDAR DEM ground elevation.';
          break;
        case 'measure':
          hint.textContent = 'Click two points to measure linear distance, track curvature, and grade.';
          break;
        default:
          hint.textContent = 'Navigate & inspect terrain. Select Draw Track tool to begin layout.';
      }
    }
  }

  switchPreset(preset) {
    this.currentPreset = preset;
    this.activeStandards = preset.standardsProfile || 'AREMA';
    const stdSelect = document.getElementById('standards-selector');
    if (stdSelect) stdSelect.value = this.activeStandards;

    document.getElementById('project-name-display').textContent = preset.name;
    document.getElementById('project-operator-display').textContent = `${preset.operator} • ${preset.region}`;
    this.elevationEngine.setBaseElevation(preset.baseElevation * 3.28084);
    this.mapEngine.flyToPreset(preset);
    this.loadPresetDemoTrack(preset);
  }

  loadPresetDemoTrack(preset) {
    // Generate realistic initial demo siding alignment for the selected rail hub
    const centerLng = preset.lng;
    const centerLat = preset.lat;

    let demoCoords = [];
    if (preset.id === 'calgary-cpkc') {
      demoCoords = [
        [centerLng - 0.008, centerLat - 0.003],
        [centerLng - 0.003, centerLat - 0.001],
        [centerLng + 0.002, centerLat + 0.002],
        [centerLng + 0.007, centerLat + 0.004]
      ];
    } else if (preset.id === 'north-platte-up') {
      demoCoords = [
        [centerLng - 0.010, centerLat],
        [centerLng - 0.004, centerLat],
        [centerLng + 0.004, centerLat + 0.0005],
        [centerLng + 0.010, centerLat + 0.0008]
      ];
    } else {
      demoCoords = [
        [centerLng - 0.006, centerLat - 0.002],
        [centerLng - 0.001, centerLat],
        [centerLng + 0.004, centerLat + 0.002],
        [centerLng + 0.008, centerLat + 0.003]
      ];
    }

    this.mapEngine.setTrackCoords(demoCoords);
    this.handleTrackUpdated(demoCoords);
  }

  async handleTrackUpdated(coords) {
    this.trackCoords = coords;
    this.alignmentAnalysis = analyzeTrackAlignment(coords);

    if (coords.length >= 2) {
      // Sample LiDAR DEM ground profile
      const baseElevFt = this.currentPreset.baseElevation * 3.28084;
      this.profilePoints = await this.elevationEngine.generateProfile(coords, 50, baseElevFt);

      // Generate default PVI nodes
      if (this.profilePoints.length > 0) {
        const startPt = this.profilePoints[0];
        const midPt = this.profilePoints[Math.floor(this.profilePoints.length / 2)];
        const endPt = this.profilePoints[this.profilePoints.length - 1];

        this.pviNodes = [
          { stationFt: startPt.stationFt, elevFt: startPt.groundElevFt + 2.5 },
          { stationFt: midPt.stationFt, elevFt: midPt.groundElevFt + 2.5 },
          { stationFt: endPt.stationFt, elevFt: endPt.groundElevFt + 2.5 }
        ];

        this.recalculateTORFromPVI();
      }

      // Add default demo turnout on first tangent
      if (this.turnouts.length === 0 && this.alignmentAnalysis.totalLengthFt > 400) {
        const demoTurnout = generateTurnoutGeometry(coords, 250, this.selectedTurnoutNumber, this.selectedTurnoutHand);
        this.turnouts = [demoTurnout];
        this.mapEngine.setTurnouts(this.turnouts);
      }
    } else {
      this.profilePoints = [];
      this.pviNodes = [];
      this.turnouts = [];
      this.mapEngine.setTurnouts([]);
      this.earthworkVolumes = null;
    }

    this.updateUI();
  }

  recalculateTORFromPVI() {
    if (this.profilePoints.length > 0 && this.pviNodes.length >= 2) {
      this.profilePoints = this.elevationEngine.applyPVIProfile(this.profilePoints, this.pviNodes);
      this.earthworkVolumes = this.elevationEngine.calculateEarthworkVolumes(
        this.profilePoints,
        this.roadbedWidthFt,
        2.0
      );
    }
    this.updateCompliance();
    this.renderProfile();
    this.updateMetricsUI();
  }

  handleTurnoutPlacedAtCoord(coord) {
    if (this.trackCoords.length < 2) return;
    // Snap to closest track segment
    const stationFt = Math.min(this.alignmentAnalysis.totalLengthFt * 0.4, 300);
    const turnout = generateTurnoutGeometry(this.trackCoords, stationFt, this.selectedTurnoutNumber, this.selectedTurnoutHand);
    this.turnouts.push(turnout);
    this.mapEngine.setTurnouts(this.turnouts);
    this.updateUI();
    this.setTool('pan');
  }

  handleMapPointClicked(coord) {
    this.elevationEngine.sampleElevation(coord[0], coord[1]).then(elev => {
      const badge = document.getElementById('probe-readout');
      if (badge) {
        badge.textContent = `Probe: ${coord[1].toFixed(5)}°N, ${coord[0].toFixed(5)}°W • Elev: ${elev.toFixed(1)} ft (${(elev * 0.3048).toFixed(1)} m)`;
        badge.style.display = 'inline-flex';
      }
    });
  }

  handleCoordinateHover(lng, lat) {
    const coordDisplay = document.getElementById('statusbar-coords');
    if (coordDisplay) {
      coordDisplay.textContent = `LAT: ${lat.toFixed(5)}° | LNG: ${lng.toFixed(5)}°`;
    }
  }

  updateCompliance() {
    if (this.alignmentAnalysis) {
      this.complianceResults = validateAlignmentCompliance(
        this.alignmentAnalysis,
        this.profilePoints,
        this.activeStandards
      );
    }
  }

  renderProfile() {
    if (this.profileViewer) {
      this.profileViewer.setData(this.profilePoints, this.pviNodes, this.turnouts, this.isMetric);
    }
    if (this.crossSectionViewer) {
      const avgCutFill = this.profilePoints.length > 0 ? (this.profilePoints[0].designTORFt - this.profilePoints[0].groundElevFt) : 2.0;
      this.crossSectionViewer.setParams(this.roadbedWidthFt, this.ballastDepthIn, this.subBallastDepthIn, avgCutFill);
    }
  }

  updateUI() {
    this.updateCompliance();
    this.renderProfile();
    this.updateMetricsUI();
    this.updateTurnoutsListUI();
    this.updateComplianceUI();
  }

  updateMetricsUI() {
    if (!this.alignmentAnalysis) return;

    const lenFt = this.alignmentAnalysis.totalLengthFt;
    document.getElementById('metric-total-length').textContent = this.isMetric
      ? `${(lenFt * 0.3048).toFixed(1)} m`
      : `${lenFt.toFixed(0)} ft (${(lenFt / 5280).toFixed(2)} mi)`;

    document.getElementById('metric-max-curve').textContent = `${this.alignmentAnalysis.maxDegreeOfCurve.toFixed(1)}°`;
    document.getElementById('metric-min-radius').textContent = this.alignmentAnalysis.minRadiusFt > 0
      ? `${this.alignmentAnalysis.minRadiusFt.toFixed(0)} ft`
      : 'Tangent';

    // Earthwork Metrics
    if (this.earthworkVolumes) {
      document.getElementById('metric-cut-vol').textContent = `${this.earthworkVolumes.totalCutCuYd.toLocaleString()} yd³`;
      document.getElementById('metric-fill-vol').textContent = `${this.earthworkVolumes.totalFillCuYd.toLocaleString()} yd³`;
      document.getElementById('metric-ballast-tons').textContent = `${this.earthworkVolumes.ballastTons.toLocaleString()} tons`;
      
      // Ballpark Civil Cost estimate: $15/yd cut, $18/yd fill, $45/ton ballast, $160/track-ft steel/ties
      const totalCost =
        this.earthworkVolumes.totalCutCuYd * 15 +
        this.earthworkVolumes.totalFillCuYd * 18 +
        this.earthworkVolumes.ballastTons * 45 +
        lenFt * 160;
      document.getElementById('metric-civil-cost').textContent = `$${Math.round(totalCost).toLocaleString()}`;
    }

    // Car Spotting Capacity (past turnout fouling point)
    let usableStorageFt = lenFt;
    if (this.turnouts.length > 0) {
      usableStorageFt = Math.max(0, lenFt - this.turnouts[0].foulingStationFt);
    }
    const spots50 = Math.floor(usableStorageFt / 55); // 50' car + 5' coupler spacing
    const spots60 = Math.floor(usableStorageFt / 65); // 60' hopper
    const spots85 = Math.floor(usableStorageFt / 90); // 85' flat

    document.getElementById('metric-car-spots').textContent = `${spots60} spots`;
    document.getElementById('metric-car-details').textContent = `50' Boxcars: ${spots50} | 60' Hoppers: ${spots60} | 85' Flats: ${spots85}`;
  }

  updateTurnoutsListUI() {
    const listContainer = document.getElementById('turnouts-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (this.turnouts.length === 0) {
      listContainer.innerHTML = '<div style="color:var(--text-muted); font-size:12px;">No turnouts placed. Use "Snap Turnout" tool to insert.</div>';
      return;
    }

    this.turnouts.forEach((t, i) => {
      const card = document.createElement('div');
      card.className = 'rule-card';
      card.innerHTML = `
        <div class="rule-title" style="color:var(--text-main);">
          <span>🔀 Turnout #${t.spec.number} (${t.hand} Hand)</span>
          <span class="badge-tag">${formatStationing(t.switchStationFt, this.isMetric)}</span>
        </div>
        <div class="rule-desc">
          Lead Length: ${t.spec.leadLengthFt}' | Frog Angle: ${t.spec.frogAngleDeg}°<br/>
          Fouling Point (Clear): ${formatStationing(t.foulingStationFt, this.isMetric)} (${t.foulingDistanceFt.toFixed(0)}' lead)
        </div>
      `;
      listContainer.appendChild(card);
    });
  }

  updateComplianceUI() {
    const container = document.getElementById('compliance-list');
    const badge = document.getElementById('compliance-status-badge');
    if (!container || !this.complianceResults) return;

    container.innerHTML = '';

    if (badge) {
      if (this.complianceResults.overallStatus === 'PASS') {
        badge.textContent = 'AREMA COMPLIANT';
        badge.style.background = '#15803d';
        badge.style.color = '#fff';
      } else if (this.complianceResults.overallStatus === 'WARN') {
        badge.textContent = 'REVIEW FLAGS';
        badge.style.background = '#d29922';
        badge.style.color = '#000';
      } else {
        badge.textContent = 'CRITICAL VIOLATION';
        badge.style.background = '#ef4444';
        badge.style.color = '#fff';
      }
    }

    this.complianceResults.issues.forEach(issue => {
      const card = document.createElement('div');
      card.className = `rule-card ${issue.severity === 'CRITICAL' ? 'crit' : 'warn'}`;
      card.innerHTML = `
        <div class="rule-title" style="color:${issue.severity === 'CRITICAL' ? 'var(--accent-danger)' : 'var(--accent-warning)'}">
          <span>${issue.severity === 'CRITICAL' ? '⛔' : '⚠️'} ${issue.title}</span>
        </div>
        <div class="rule-desc">${issue.desc}</div>
        <div style="font-size:10px; color:var(--text-dim); margin-top:4px;">Ref: ${issue.reference}</div>
      `;
      container.appendChild(card);
    });

    this.complianceResults.passes.forEach(pass => {
      const card = document.createElement('div');
      card.className = 'rule-card pass';
      card.innerHTML = `
        <div class="rule-title" style="color:var(--accent-success)">
          <span>✅ ${pass.title}</span>
        </div>
        <div class="rule-desc">${pass.desc}</div>
      `;
      container.appendChild(card);
    });
  }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.railForgeApp = new RailForgeApp();
});
