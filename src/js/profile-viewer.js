/**
 * Interactive Civil Plan & Profile Engine (Canvas & SVG Renderer)
 */
import { formatStationing } from './geometry.js';

export class ProfileViewer {
  constructor(canvasElement, tooltipElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tooltip = tooltipElement;
    this.profilePoints = [];
    this.pviNodes = [];
    this.turnoutMarkers = [];
    this.selectedPviIndex = -1;
    this.isDragging = false;
    this.isMetric = false;
    this.onPviChangeCallback = null;

    this.setupEvents();
    this.resize();
  }

  setCallback(cb) {
    this.onPviChangeCallback = cb;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height || 220;
    this.render();
  }

  setData(profilePoints, pviNodes = [], turnoutMarkers = [], isMetric = false) {
    this.profilePoints = profilePoints || [];
    this.pviNodes = pviNodes || [];
    this.turnoutMarkers = turnoutMarkers || [];
    this.isMetric = isMetric;
    this.render();
  }

  setupEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if clicked near a PVI node
      const pviScreen = this.getPviScreenCoords();
      for (let i = 0; i < pviScreen.length; i++) {
        const dx = mouseX - pviScreen[i].x;
        const dy = mouseY - pviScreen[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          this.selectedPviIndex = i;
          this.isDragging = true;
          return;
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.selectedPviIndex === -1) {
        this.handleHover(e);
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const bounds = this.getBounds();

      // Invert Y to elevation
      const padY = 30;
      const h = this.canvas.height - padY * 2;
      const elev = bounds.maxElev - ((mouseY - padY) / h) * (bounds.maxElev - bounds.minElev);

      this.pviNodes[this.selectedPviIndex].elevFt = Math.round(elev * 10) / 10;
      if (this.onPviChangeCallback) {
        this.onPviChangeCallback(this.pviNodes);
      }
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.selectedPviIndex = -1;
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.tooltip) this.tooltip.style.display = 'none';
    });
  }

  handleHover(e) {
    if (!this.tooltip || this.profilePoints.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padX = 70;
    const padY = 30;
    const w = this.canvas.width - padX - 30;
    if (mouseX < padX || mouseX > padX + w) {
      this.tooltip.style.display = 'none';
      return;
    }

    const bounds = this.getBounds();
    const t = (mouseX - padX) / w;
    const station = bounds.minStation + t * (bounds.maxStation - bounds.minStation);

    // Find closest point
    let closest = this.profilePoints[0];
    let minDiff = Infinity;
    for (const pt of this.profilePoints) {
      const diff = Math.abs(pt.stationFt - station);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }

    if (closest) {
      this.tooltip.style.display = 'block';
      this.tooltip.style.left = `${e.clientX + 12}px`;
      this.tooltip.style.top = `${e.clientY - 40}px`;
      const cutFillText = closest.cutFt > 0
        ? `<span style="color:#e3b341">Cut: ${closest.cutFt.toFixed(1)} ft</span>`
        : `<span style="color:#3fb950">Fill: ${closest.fillFt.toFixed(1)} ft</span>`;

      this.tooltip.innerHTML = `
        <div style="font-weight:600; margin-bottom:2px;">${formatStationing(closest.stationFt, this.isMetric)}</div>
        <div style="font-size:11px; opacity:0.85">Ground: ${closest.groundElevFt.toFixed(1)} ft</div>
        <div style="font-size:11px; opacity:0.85">Design TOR: ${closest.designTORFt.toFixed(1)} ft</div>
        <div style="font-size:11px; font-weight:600">${cutFillText}</div>
      `;
    }
  }

  getBounds() {
    if (this.profilePoints.length === 0) {
      return { minStation: 0, maxStation: 1000, minElev: 980, maxElev: 1020 };
    }

    let minStation = 0;
    let maxStation = this.profilePoints[this.profilePoints.length - 1].stationFt;
    let minElev = Infinity;
    let maxElev = -Infinity;

    for (const pt of this.profilePoints) {
      if (pt.groundElevFt < minElev) minElev = pt.groundElevFt;
      if (pt.groundElevFt > maxElev) maxElev = pt.groundElevFt;
      if (pt.designTORFt < minElev) minElev = pt.designTORFt;
      if (pt.designTORFt > maxElev) maxElev = pt.designTORFt;
    }

    // Add 10% elevation padding for nice graph margins
    const range = Math.max(10, maxElev - minElev);
    minElev = Math.floor(minElev - range * 0.15);
    maxElev = Math.ceil(maxElev + range * 0.2);

    return { minStation, maxStation: Math.max(100, maxStation), minElev, maxElev };
  }

  getPviScreenCoords() {
    const bounds = this.getBounds();
    const padX = 70;
    const padY = 30;
    const w = this.canvas.width - padX - 30;
    const h = this.canvas.height - padY * 2;

    return this.pviNodes.map(pvi => {
      const tx = (pvi.stationFt - bounds.minStation) / (bounds.maxStation - bounds.minStation);
      const ty = (bounds.maxElev - pvi.elevFt) / (bounds.maxElev - bounds.minElev);
      return {
        x: padX + tx * w,
        y: padY + ty * h,
        pvi
      };
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (this.profilePoints.length < 2) {
      ctx.fillStyle = '#6e7681';
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Draw track alignment or select a preset to generate Civil Profile', w / 2, h / 2);
      return;
    }

    const bounds = this.getBounds();
    const padX = 70;
    const padY = 30;
    const plotW = w - padX - 30;
    const plotH = h - padY * 2;

    const toScreenX = (stationFt) => padX + ((stationFt - bounds.minStation) / (bounds.maxStation - bounds.minStation)) * plotW;
    const toScreenY = (elevFt) => padY + ((bounds.maxElev - elevFt) / (bounds.maxElev - bounds.minElev)) * plotH;

    // 1. Draw Grid Lines
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;

    // Elevation Horizontal Ticks (every 5 or 10 ft)
    const elevStep = (bounds.maxElev - bounds.minElev) > 50 ? 10 : 5;
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px Roboto Mono, monospace';
    ctx.textAlign = 'right';

    for (let e = Math.ceil(bounds.minElev / elevStep) * elevStep; e <= bounds.maxElev; e += elevStep) {
      const y = toScreenY(e);
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + plotW, y);
      ctx.stroke();
      ctx.fillText(`${e} ft`, padX - 8, y + 3);
    }

    // Station Vertical Ticks (every 200 or 500 ft)
    const staStep = (bounds.maxStation - bounds.minStation) > 3000 ? 500 : 200;
    ctx.textAlign = 'center';
    for (let s = 0; s <= bounds.maxStation; s += staStep) {
      const x = toScreenX(s);
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, padY + plotH);
      ctx.stroke();
      ctx.fillText(formatStationing(s, this.isMetric), x, h - 10);
    }

    // 2. Draw Cut & Fill Shading Between Ground & TOR
    ctx.save();
    for (let i = 0; i < this.profilePoints.length - 1; i++) {
      const pt1 = this.profilePoints[i];
      const pt2 = this.profilePoints[i + 1];

      const x1 = toScreenX(pt1.stationFt);
      const x2 = toScreenX(pt2.stationFt);
      const yg1 = toScreenY(pt1.groundElevFt);
      const yg2 = toScreenY(pt2.groundElevFt);
      const yt1 = toScreenY(pt1.designTORFt);
      const yt2 = toScreenY(pt2.designTORFt);

      ctx.beginPath();
      ctx.moveTo(x1, yg1);
      ctx.lineTo(x2, yg2);
      ctx.lineTo(x2, yt2);
      ctx.lineTo(x1, yt1);
      ctx.closePath();

      if (pt1.designTORFt >= pt1.groundElevFt) {
        ctx.fillStyle = 'rgba(63, 185, 80, 0.25)'; // Fill (Green)
      } else {
        ctx.fillStyle = 'rgba(227, 179, 65, 0.30)'; // Cut (Amber)
      }
      ctx.fill();
    }
    ctx.restore();

    // 3. Draw Ground Profile Line (Dashed Brown/Grey)
    ctx.beginPath();
    ctx.strokeStyle = '#8b949e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    for (let i = 0; i < this.profilePoints.length; i++) {
      const pt = this.profilePoints[i];
      const x = toScreenX(pt.stationFt);
      const y = toScreenY(pt.groundElevFt);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Draw Proposed Top of Rail (TOR) Line (Solid Bright Cyan/Blue)
    ctx.beginPath();
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < this.profilePoints.length; i++) {
      const pt = this.profilePoints[i];
      const x = toScreenX(pt.stationFt);
      const y = toScreenY(pt.designTORFt);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 5. Draw Turnout & Fouling Point Markers
    for (const t of this.turnoutMarkers) {
      if (t.switchStationFt >= bounds.minStation && t.switchStationFt <= bounds.maxStation) {
        const xPs = toScreenX(t.switchStationFt);
        ctx.strokeStyle = '#d29922';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xPs, padY);
        ctx.lineTo(xPs, padY + plotH);
        ctx.stroke();

        ctx.fillStyle = '#d29922';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillText(`PS (#${t.spec.number})`, xPs, padY + 12);
      }
      if (t.foulingStationFt && t.foulingStationFt <= bounds.maxStation) {
        const xFoul = toScreenX(t.foulingStationFt);
        ctx.strokeStyle = '#f85149';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(xFoul, padY);
        ctx.lineTo(xFoul, padY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f85149';
        ctx.fillText(`Clear Point`, xFoul, padY + 24);
      }
    }

    // 6. Draw Interactive PVI Handles
    const pviScreen = this.getPviScreenCoords();
    for (let i = 0; i < pviScreen.length; i++) {
      const node = pviScreen[i];
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#58a6ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // PVI label
      ctx.fillStyle = '#c9d1d9';
      ctx.font = '10px Roboto Mono, monospace';
      ctx.fillText(`PVI ${i + 1}: ${node.pvi.elevFt.toFixed(1)}'`, node.x, node.y - 10);
    }
  }
}
