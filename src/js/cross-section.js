/**
 * Parametric 2D Rail Roadbed Cross-Section Renderer
 */

export class CrossSectionViewer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.roadbedWidthFt = 24.0;
    this.ballastDepthIn = 12.0;
    this.subBallastDepthIn = 8.0;
    this.sideSlope = 2.0; // 2:1
    this.cutOrFillFt = 2.0; // +2.0 ft fill
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height || 180;
    this.render();
  }

  setParams(roadbedWidthFt = 24.0, ballastDepthIn = 12.0, subBallastDepthIn = 8.0, cutOrFillFt = 2.0) {
    this.roadbedWidthFt = roadbedWidthFt;
    this.ballastDepthIn = ballastDepthIn;
    this.subBallastDepthIn = subBallastDepthIn;
    this.cutOrFillFt = cutOrFillFt;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const baseGroundY = h * 0.70;
    const scale = Math.min(w / 45, 10); // pixels per foot

    // 1. Draw Existing Ground Line
    ctx.strokeStyle = '#484f58';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, baseGroundY);
    ctx.lineTo(w - 20, baseGroundY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#8b949e';
    ctx.font = '10px Roboto Mono, monospace';
    ctx.fillText('Existing Ground (LiDAR)', 25, baseGroundY - 6);

    // 2. Subgrade Embankment / Crown
    const subgradeHalfWidthPx = (this.roadbedWidthFt / 2) * scale;
    const fillHeightPx = this.cutOrFillFt * scale;
    const subgradeTopY = baseGroundY - fillHeightPx;

    ctx.fillStyle = '#21262d';
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    // Subgrade crown with 2% cross slope
    ctx.moveTo(centerX - subgradeHalfWidthPx, subgradeTopY + 3);
    ctx.lineTo(centerX, subgradeTopY);
    ctx.lineTo(centerX + subgradeHalfWidthPx, subgradeTopY + 3);
    // Daylight side slopes (2:1)
    const daylightOffsetPx = Math.abs(fillHeightPx) * this.sideSlope;
    ctx.lineTo(centerX + subgradeHalfWidthPx + daylightOffsetPx, baseGroundY);
    ctx.lineTo(centerX - subgradeHalfWidthPx - daylightOffsetPx, baseGroundY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Sub-Ballast Layer (6"-12" Aggregate)
    const subBallastHeightPx = (this.subBallastDepthIn / 12) * scale;
    const subBallastTopY = subgradeTopY - subBallastHeightPx;
    const subBallastHalfWidthPx = (this.roadbedWidthFt / 2 - 2) * scale;

    ctx.fillStyle = '#30363d';
    ctx.beginPath();
    ctx.moveTo(centerX - subBallastHalfWidthPx, subBallastTopY);
    ctx.lineTo(centerX + subBallastHalfWidthPx, subBallastTopY);
    ctx.lineTo(centerX + subgradeHalfWidthPx, subgradeTopY);
    ctx.lineTo(centerX - subgradeHalfWidthPx, subgradeTopY);
    ctx.closePath();
    ctx.fill();

    // 4. Mainline Ballast Layer (Crushed Stone Granite)
    const ballastHeightPx = (this.ballastDepthIn / 12) * scale;
    const ballastTopY = subBallastTopY - ballastHeightPx;
    const ballastTopHalfWidthPx = (8.5 / 2 + 1.0) * scale; // Tie length 8.5' + 12" shoulder

    ctx.fillStyle = '#484f58';
    ctx.beginPath();
    ctx.moveTo(centerX - ballastTopHalfWidthPx, ballastTopY);
    ctx.lineTo(centerX + ballastTopHalfWidthPx, ballastTopY);
    ctx.lineTo(centerX + subBallastHalfWidthPx, subBallastTopY);
    ctx.lineTo(centerX - subBallastHalfWidthPx, subBallastTopY);
    ctx.closePath();
    ctx.fill();

    // 5. Timber/Concrete Cross Tie (8'-6" Length x 7" Height)
    const tieHalfWidthPx = (8.5 / 2) * scale;
    const tieHeightPx = (7 / 12) * scale;
    const tieTopY = ballastTopY - tieHeightPx;

    ctx.fillStyle = '#8b949e';
    ctx.fillRect(centerX - tieHalfWidthPx, tieTopY, tieHalfWidthPx * 2, tieHeightPx);
    ctx.strokeStyle = '#c9d1d9';
    ctx.strokeRect(centerX - tieHalfWidthPx, tieTopY, tieHalfWidthPx * 2, tieHeightPx);

    // 6. Steel Rails (Standard 4'-8.5" Gauge)
    const trackGaugePx = (4.708 / 2) * scale;
    const railHeightPx = (7.3 / 12) * scale; // 136 RE rail height ~7.3"
    const railTopY = tieTopY - railHeightPx;

    // Left Rail
    ctx.fillStyle = '#58a6ff';
    ctx.fillRect(centerX - trackGaugePx - 2, railTopY, 4, railHeightPx);
    // Right Rail
    ctx.fillRect(centerX + trackGaugePx - 2, railTopY, 4, railHeightPx);

    // TOR Dimension line
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 30, railTopY);
    ctx.lineTo(centerX + 30, railTopY);
    ctx.stroke();

    ctx.fillStyle = '#58a6ff';
    ctx.font = '10px Roboto Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Top of Rail (TOR)', centerX, railTopY - 6);

    // Dimension labels
    ctx.fillStyle = '#8b949e';
    ctx.fillText(`Roadbed: ${this.roadbedWidthFt}' | Ballast: ${this.ballastDepthIn}" | Sub-ballast: ${this.subBallastDepthIn}"`, centerX, h - 8);
  }
}
