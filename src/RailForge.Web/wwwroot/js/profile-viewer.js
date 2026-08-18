/**
 * Plan & Profile Canvas Renderer
 */
export class ProfileViewer {
  constructor(canvasElement, tooltipElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tooltip = tooltipElement;
    this.profilePoints = [];
    this.pviNodes = [];
    this.turnouts = [];
    this.selectedPviIndex = -1;
    this.isDragging = false;
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

  setData(profilePoints, pviNodes = [], turnouts = []) {
    this.profilePoints = profilePoints || [];
    this.pviNodes = pviNodes || [];
    this.turnouts = turnouts || [];
    this.render();
  }

  setupEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const pviScreen = this.getPviScreenCoords();

      for (let i = 0; i < pviScreen.length; i++) {
        const dx = mouseX - pviScreen[i].x;
        const dy = mouseY - pviScreen[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < 12) {
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
    const padX = 70;
    const w = this.canvas.width - padX - 30;
    if (mouseX < padX || mouseX > padX + w) {
      this.tooltip.style.display = 'none';
      return;
    }

    const bounds = this.getBounds();
    const t = (mouseX - padX) / w;
    const station = bounds.minStation + t * (bounds.maxStation - bounds.minStation);

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
      const cutFill = closest.cutFt > 0
        ? `<span style="color:#e3b341">Cut: ${closest.cutFt.toFixed(1)} ft</span>`
        : `<span style="color:#3fb950">Fill: ${closest.fillFt.toFixed(1)} ft</span>`;

      const staFormatted = `Sta ${Math.floor(closest.stationFt / 100)}+${(closest.stationFt % 100).toFixed(2).padStart(5, '0')}`;

      this.tooltip.innerHTML = `
        <div style="font-weight:600; margin-bottom:2px;">${staFormatted}</div>
        <div style="font-size:11px; opacity:0.85">Ground: ${closest.groundElevFt.toFixed(1)} ft</div>
        <div style="font-size:11px; opacity:0.85">Design TOR: ${closest.designTorFt.toFixed(1)} ft</div>
        <div style="font-size:11px; font-weight:600">${cutFill}</div>
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
      if (pt.designTorFt < minElev) minElev = pt.designTorFt;
      if (pt.designTorFt > maxElev) maxElev = pt.designTorFt;
    }

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
      return { x: padX + tx * w, y: padY + ty * h, pvi };
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
      ctx.fillText('Draw track alignment to calculate Civil Plan & Profile', w / 2, h / 2);
      return;
    }

    const bounds = this.getBounds();
    const padX = 70;
    const padY = 30;
    const plotW = w - padX - 30;
    const plotH = h - padY * 2;

    const toX = (sta) => padX + ((sta - bounds.minStation) / (bounds.maxStation - bounds.minStation)) * plotW;
    const toY = (elev) => padY + ((bounds.maxElev - elev) / (bounds.maxElev - bounds.minElev)) * plotH;

    // Grid lines
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    const elevStep = (bounds.maxElev - bounds.minElev) > 50 ? 10 : 5;
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px Roboto Mono, monospace';
    ctx.textAlign = 'right';

    for (let e = Math.ceil(bounds.minElev / elevStep) * elevStep; e <= bounds.maxElev; e += elevStep) {
      const y = toY(e);
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + plotW, y);
      ctx.stroke();
      ctx.fillText(`${e} ft`, padX - 8, y + 3);
    }

    const staStep = (bounds.maxStation - bounds.minStation) > 3000 ? 500 : 200;
    ctx.textAlign = 'center';
    for (let s = 0; s <= bounds.maxStation; s += staStep) {
      const x = toX(s);
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, padY + plotH);
      ctx.stroke();
      ctx.fillText(`Sta ${s / 100}+00`, x, h - 10);
    }

    // Cut & Fill Shading
    for (let i = 0; i < this.profilePoints.length - 1; i++) {
      const p1 = this.profilePoints[i];
      const p2 = this.profilePoints[i + 1];
      ctx.beginPath();
      ctx.moveTo(toX(p1.stationFt), toY(p1.groundElevFt));
      ctx.lineTo(toX(p2.stationFt), toY(p2.groundElevFt));
      ctx.lineTo(toX(p2.stationFt), toY(p2.designTorFt));
      ctx.lineTo(toX(p1.stationFt), toY(p1.designTorFt));
      ctx.closePath();
      ctx.fillStyle = p1.designTorFt >= p1.groundElevFt ? 'rgba(63, 185, 80, 0.25)' : 'rgba(227, 179, 65, 0.30)';
      ctx.fill();
    }

    // Ground Profile
    ctx.beginPath();
    ctx.strokeStyle = '#8b949e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    this.profilePoints.forEach((pt, i) => {
      const x = toX(pt.stationFt);
      const y = toY(pt.groundElevFt);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Design TOR Profile
    ctx.beginPath();
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2.5;
    this.profilePoints.forEach((pt, i) => {
      const x = toX(pt.stationFt);
      const y = toY(pt.designTorFt);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // PVI Handles
    const pvis = this.getPviScreenCoords();
    pvis.forEach((node, i) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#58a6ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#c9d1d9';
      ctx.font = '10px Roboto Mono, monospace';
      ctx.fillText(`PVI ${i + 1}: ${node.pvi.elevFt.toFixed(1)}'`, node.x, node.y - 10);
    });
  }
}
