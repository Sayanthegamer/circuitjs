// ============================================================
// Camera — Pan/Zoom with smooth interpolation
// ============================================================

export class Camera {
  // Current state
  x = 0;
  y = 0;
  zoom = 1;

  // Target state (for smooth interpolation)
  private targetX = 0;
  private targetY = 0;
  private targetZoom = 1;

  // Constraints
  private minZoom = 0.15;
  private maxZoom = 5;

  // Panning state
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panOriginX = 0;
  private panOriginY = 0;

  /** Convert screen coordinates to world coordinates */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.x) / this.zoom,
      y: (sy - this.y) / this.zoom,
    };
  }

  /** Convert world coordinates to screen coordinates */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.zoom + this.x,
      y: wy * this.zoom + this.y,
    };
  }

  /** Handle scroll for zoom (zoom toward mouse position) */
  handleWheel(e: WheelEvent, canvasRect: DOMRect): void {
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    const worldBefore = this.screenToWorld(mouseX, mouseY);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * factor));

    // Adjust position so zoom centers on mouse
    this.targetX = mouseX - worldBefore.x * this.targetZoom;
    this.targetY = mouseY - worldBefore.y * this.targetZoom;
  }

  /** Start panning */
  startPan(screenX: number, screenY: number): void {
    this.isPanning = true;
    this.panStartX = screenX;
    this.panStartY = screenY;
    this.panOriginX = this.targetX;
    this.panOriginY = this.targetY;
  }

  /** Continue panning */
  updatePan(screenX: number, screenY: number): void {
    if (!this.isPanning) return;
    this.targetX = this.panOriginX + (screenX - this.panStartX);
    this.targetY = this.panOriginY + (screenY - this.panStartY);
  }

  /** Stop panning */
  endPan(): void {
    this.isPanning = false;
  }

  get panning(): boolean { return this.isPanning; }

  /** Smooth interpolation — call every frame */
  update(): void {
    const lerp = 0.25;
    this.x += (this.targetX - this.x) * lerp;
    this.y += (this.targetY - this.y) * lerp;
    this.zoom += (this.targetZoom - this.zoom) * lerp;
  }

  /** Apply camera transform to a canvas context */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.x, this.y);
    ctx.scale(this.zoom, this.zoom);
  }

  /** Center the view on a given world rectangle */
  centerOn(wx: number, wy: number, ww: number, wh: number, canvasW: number, canvasH: number): void {
    const padFactor = 0.8;
    const zx = (canvasW * padFactor) / ww;
    const zy = (canvasH * padFactor) / wh;
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.min(zx, zy)));
    this.targetX = canvasW / 2 - (wx + ww / 2) * this.targetZoom;
    this.targetY = canvasH / 2 - (wy + wh / 2) * this.targetZoom;
    // Snap immediately
    this.x = this.targetX;
    this.y = this.targetY;
    this.zoom = this.targetZoom;
  }
}
