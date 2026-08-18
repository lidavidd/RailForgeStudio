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
    this.sideSlope = 2.0;
    this.cutOrFillFt = 2.0;
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
    const scale = Math.min(w / 45, 10);

    // Existing Ground
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
    ctx.fillText('Existing Ground (LiDAR DEM)', 25, baseGroundY - 6);

    // Subgrade Embankment
    const subgradeHalfWidthPx = (this.roadbedWidthFt / 2) * scale;
    const fillHeightPx = this.cutOrFillFt * scale;
    const subgradeTopY = baseGroundY - fillHeightPx;

    ctx.fillStyle = '#21262d';
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - subgradeHalfWidthPx, subgradeTopY + 3);
    ctx.lineTo(centerX, subgradeTopY);
    ctx.lineTo(centerX + subgradeHalfWidthPx, subgradeTopY + 3);
    const daylightOffsetPx = Math.abs(fillHeightPx) * this.sideSlope;
    ctx.lineTo(centerX + subgradeHalfWidthPx + daylightOffsetPx, baseGroundY);
    ctx.lineTo(centerX - subgradeHalfWidthPx - daylightOffsetPx, baseGroundY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sub-Ballast
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

    // Ballast
    const ballastHeightPx = (this.ballastDepthIn / 12) * scale;
    const ballastTopY = subBallastTopY - ballastHeightPx;
    const ballastTopHalfWidthPx = (8.5 / 2 + 1.0) * scale;

    ctx.fillStyle = '#484f58';
    ctx.beginPath();
    ctx.moveTo(centerX - ballastTopHalfWidthPx, ballastTopY);
    ctx.lineTo(centerX + ballastTopHalfWidthPx, ballastTopY);
    ctx.lineTo(centerX + subBallastHalfWidthPx, subBallastTopY);
    ctx.lineTo(centerX - subBallastHalfWidthPx, subBallastTopY);
    ctx.closePath();
    ctx.fill();

    // Tie
    const tieHalfWidthPx = (8.5 / 2) * scale;
    const tieHeightPx = (7 / 12) * scale;
    const tieTopY = ballastTopY - tieHeightPx;

    ctx.fillStyle = '#8b949e';
    ctx.fillRect(centerX - tieHalfWidthPx, tieTopY, tieHalfWidthPx * 2, tieHeightPx);
    ctx.strokeStyle = '#c9d1d9';
    ctx.strokeRect(centerX - tieHalfWidthPx, tieTopY, tieHalfWidthPx * 2, tieHeightPx);

    // Rails
    const trackGaugePx = (4.708 / 2) * scale;
    const railHeightPx = (7.3 / 12) * scale;
    const railTopY = tieTopY - railHeightPx;

    ctx.fillStyle = '#58a6ff';
    ctx.fillRect(centerX - trackGaugePx - 2, railTopY, 4, railHeightPx);
    ctx.fillRect(centerX + trackGaugePx - 2, railTopY, 4, railHeightPx);

    ctx.fillStyle = '#8b949e';
    ctx.textAlign = 'center';
    ctx.fillText(`Roadbed: ${this.roadbedWidthFt}' | Ballast: ${this.ballastDepthIn}" | Sub-ballast: ${this.subBallastDepthIn}"`, centerX, h - 8);
  }
}
