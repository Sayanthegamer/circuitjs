// ============================================================
// Grid — Dot grid with configurable spacing and snap
// ============================================================

const GRID_SIZE = 16;

/** Draw the dot grid */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewLeft: number,
  viewTop: number,
  viewRight: number,
  viewBottom: number,
  zoom: number,
): void {
  // Adaptive grid: skip dots when very zoomed out
  let step = GRID_SIZE;
  if (zoom < 0.35) step = GRID_SIZE * 4;
  else if (zoom < 0.7) step = GRID_SIZE * 2;

  const dotSize = Math.max(0.8, 1.2 * zoom);

  const startX = Math.floor(viewLeft / step) * step;
  const startY = Math.floor(viewTop / step) * step;
  const endX = Math.ceil(viewRight / step) * step;
  const endY = Math.ceil(viewBottom / step) * step;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  for (let x = startX; x <= endX; x += step) {
    for (let y = startY; y <= endY; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw origin crosshair
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(viewLeft, 0);
  ctx.lineTo(viewRight, 0);
  ctx.moveTo(0, viewTop);
  ctx.lineTo(0, viewBottom);
  ctx.stroke();
}

export { GRID_SIZE };
