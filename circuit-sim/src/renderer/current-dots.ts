// ============================================================
// Animated Current Dots
// ============================================================

/** Draw animated dots along a path to visualize current flow.
 *  Dot speed and direction indicate magnitude and polarity. */
export function drawCurrentDots(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  current: number,
  time: number,
  zoom: number,
): void {
  if (Math.abs(current) < 1e-10) return;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  const nx = dx / len;
  const ny = dy / len;

  // Dot spacing adapts to zoom
  const spacing = Math.max(8, 12 / Math.max(zoom, 0.3));
  const count = Math.floor(len / spacing);
  if (count < 1) return;

  // Speed proportional to current magnitude, direction matches sign
  const speed = Math.sign(current) * Math.min(Math.abs(current) * 800, 200);
  const offset = ((time * speed) % spacing + spacing) % spacing;

  const dotRadius = Math.max(1.5, 2.2 * Math.min(zoom, 1.5));

  // Color: bright yellow-white
  ctx.fillStyle = 'rgba(255, 238, 100, 0.85)';

  for (let i = 0; i <= count; i++) {
    const d = offset + i * spacing;
    if (d > len) break;
    const px = x1 + nx * d;
    const py = y1 + ny * d;
    ctx.beginPath();
    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
