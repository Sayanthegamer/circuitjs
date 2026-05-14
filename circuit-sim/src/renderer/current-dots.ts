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
  const spacing = Math.max(12, 16 / Math.max(zoom, 0.3));
  const count = Math.floor(len / spacing) + 1;
  if (count < 1) return;

  const dir = Math.sign(current);
  // Speed proportional to current magnitude, direction matches sign
  const speed = dir * Math.min(Math.abs(current) * 800, 200);
  const offset = ((time * speed) % spacing + spacing) % spacing;

  // Make dots significantly smaller
  const dotRadius = Math.max(0.8, 1.2 * Math.min(zoom, 1.5));

  const trailSteps = 6;
  const trailLength = 8; // length of the trail in pixels
  const stepDist = trailLength / trailSteps;

  for (let i = 0; i <= count + 1; i++) {
    // Start slightly before 0 and go slightly past len to handle wrapping smoothly
    const d = offset + (i - 1) * spacing;

    // If the leading dot is completely outside, don't draw its trail if the whole trail is outside
    // Actually simpler to just evaluate trail parts and clip them to the wire
    for (let t = 0; t < trailSteps; t++) {
      const td = d - dir * stepDist * t;
      if (td < 0 || td > len) continue;

      const trailX = x1 + nx * td;
      const trailY = y1 + ny * td;

      const tRadius = dotRadius * (1 - (t / trailSteps) * 0.7); // slightly smaller towards the end
      const tAlpha = 0.85 * Math.pow(1 - t / trailSteps, 1.5); // fade out quadratically

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 238, 100, ${tAlpha.toFixed(3)})`;
      ctx.arc(trailX, trailY, tRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
