// ============================================================
// Element Visual Renderers
// Draws each component type on the canvas
// ============================================================

import type { ICircuitElement } from '../engine/types';
import { voltageToColor } from './voltage-colors';
import { drawCurrentDots } from './current-dots';

const POST_RADIUS = 3.5;

/** Draw a connection post (circle) at world coordinates */
function drawPost(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, selected: boolean, hovered?: boolean): void {
  ctx.beginPath();
  ctx.arc(x, y, POST_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = selected ? '#818cf8' : voltageToColor(v);
  ctx.fill();
  if (selected || hovered) {
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    ctx.stroke();
  }

}

/** Draw a lead (wire segment) between two points with voltage color */
function drawLead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, v: number): void {
  ctx.strokeStyle = voltageToColor(v);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ---- Renderers ----

export function drawSwitch(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  const gap = 16;
  const leadLen = (len - gap) / 2;

  const bx1 = x1 + nx * leadLen;
  const by1 = y1 + ny * leadLen;
  const bx2 = x2 - nx * leadLen;
  const by2 = y2 - ny * leadLen;

  drawLead(ctx, x1, y1, bx1, by1, elm.volts[0]);
  drawLead(ctx, bx2, by2, x2, y2, elm.volts[1]);

  const closed = (elm as ICircuitElement & { closed?: boolean }).closed;
  ctx.strokeStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx1, by1);
  
  if (closed) {
    ctx.lineTo(bx2, by2);
  } else {
    // Open switch: pivot around (bx1, by1) by 30 degrees (Math.PI / 6)
    // using the local 2D normal (ny, -nx) to ensure it opens consistently outward.
    const angle = Math.PI / 6;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // The vector from bx1 to bx2 is (gap * nx, gap * ny)
    const px = gap * nx;
    const py = gap * ny;

    // Apply 2D rotation matrix:
    // x' = x*cos(A) - y*sin(A)
    // y' = x*sin(A) + y*cos(A)
    const openX = bx1 + px * cosA - py * sinA;
    const openY = by1 + px * sinA + py * cosA;

    ctx.lineTo(openX, openY);
  }
  ctx.stroke();

  // Draw two little poles for the switch
  ctx.fillStyle = selected ? '#a5b4fc' : '#e0e0e8';
  ctx.beginPath();
  ctx.arc(bx1, by1, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx2, by2, 3, 0, Math.PI * 2);
  ctx.fill();

  drawPost(ctx, x1, y1, elm.volts[0], selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, x2, y2, elm.volts[1], selected, hoveredNode === 1 || hoveredNode === null);
  if (closed) {
    drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
  }
}

export function drawDiode(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  const diodeLen = 16;
  const diodeWidth = 16;
  const leadLen = (len - diodeLen) / 2;

  const bx1 = x1 + nx * leadLen;
  const by1 = y1 + ny * leadLen;
  const bx2 = x2 - nx * leadLen;
  const by2 = y2 - ny * leadLen;

  drawLead(ctx, x1, y1, bx1, by1, elm.volts[0]);
  drawLead(ctx, bx2, by2, x2, y2, elm.volts[1]);

  const perpX = -ny;
  const perpY = nx;

  ctx.fillStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 2;
  
  // Triangle
  ctx.beginPath();
  ctx.moveTo(bx1 + perpX * (diodeWidth / 2), by1 + perpY * (diodeWidth / 2));
  ctx.lineTo(bx1 - perpX * (diodeWidth / 2), by1 - perpY * (diodeWidth / 2));
  ctx.lineTo(bx2, by2);
  ctx.closePath();
  ctx.fill();

  // Bar
  ctx.beginPath();
  ctx.moveTo(bx2 + perpX * (diodeWidth / 2), by2 + perpY * (diodeWidth / 2));
  ctx.lineTo(bx2 - perpX * (diodeWidth / 2), by2 - perpY * (diodeWidth / 2));
  ctx.stroke();

  drawPost(ctx, x1, y1, elm.volts[0], selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, x2, y2, elm.volts[1], selected, hoveredNode === 1 || hoveredNode === null);
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawLED(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  drawDiode(ctx, elm, selected, time, zoom, hoveredNode);

  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  const current = elm.getCurrent();
  // Turn on visual threshold
  const brightness = Math.min(1, Math.max(0, (current * 1000) / 10)); // max brightness at 10mA

  if (brightness > 0.05) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const perpX = -ny;
    const perpY = nx;
    
    // Draw arrows or glow
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(239, 68, 68, ${brightness * 0.5})`; // Glow
    ctx.fill();

    // Arrows
    const arrowDist = 12;
    const ax = cx + perpX * arrowDist;
    const ay = cy + perpY * arrowDist;
    
    ctx.strokeStyle = `rgba(239, 68, 68, ${brightness})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + perpX * 8 + nx * 8, ay + perpY * 8 + ny * 8);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(ax + nx * 5, ay + ny * 5);
    ctx.lineTo(ax + nx * 5 + perpX * 8 + nx * 8, ay + ny * 5 + perpY * 8 + ny * 8);
    ctx.stroke();
  }
}


export function drawWire(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const v = elm.volts[0] || 0;
  ctx.strokeStyle = selected ? '#818cf8' : voltageToColor(v);
  ctx.lineWidth = selected ? 3 : 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(elm.x, elm.y);
  ctx.lineTo(elm.x2, elm.y2);
  ctx.stroke();
  drawPost(ctx, elm.x, elm.y, v, selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, elm.x2, elm.y2, v, selected, hoveredNode === 1 || hoveredNode === null);
  drawCurrentDots(ctx, elm.x, elm.y, elm.x2, elm.y2, elm.getCurrent(), time, zoom);
}

export function drawResistor(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  // Lead length on each side
  const bodyLen = Math.min(40, len * 0.55);
  const leadLen = (len - bodyLen) / 2;

  // Lead start/end points
  const bx1 = x1 + nx * leadLen;
  const by1 = y1 + ny * leadLen;
  const bx2 = x2 - nx * leadLen;
  const by2 = y2 - ny * leadLen;

  // Draw leads
  drawLead(ctx, x1, y1, bx1, by1, elm.volts[0]);
  drawLead(ctx, bx2, by2, x2, y2, elm.volts[1]);

  // Draw zigzag body
  const segments = 6;
  const perpX = -ny;
  const perpY = nx;
  const amplitude = 6;

  ctx.strokeStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(bx1, by1);

  for (let i = 0; i < segments; i++) {
    const t1 = (i + 0.5) / segments;
    const sign = i % 2 === 0 ? 1 : -1;
    const mx = bx1 + (bx2 - bx1) * t1 + perpX * amplitude * sign;
    const my = by1 + (by2 - by1) * t1 + perpY * amplitude * sign;
    ctx.lineTo(mx, my);
    if (i === segments - 1) {
      ctx.lineTo(bx2, by2);
    }
  }
  ctx.stroke();

  // Posts
  drawPost(ctx, x1, y1, elm.volts[0], selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, x2, y2, elm.volts[1], selected, hoveredNode === 1 || hoveredNode === null);

  // Current dots
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawVoltageSource(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const radius = Math.min(16, len * 0.25);
  const leadLen = (len - radius * 2) / 2;

  // Leads
  const lx1 = x1 + nx * leadLen;
  const ly1 = y1 + ny * leadLen;
  const lx2 = x2 - nx * leadLen;
  const ly2 = y2 - ny * leadLen;

  drawLead(ctx, x1, y1, lx1, ly1, elm.volts[0]);
  drawLead(ctx, lx2, ly2, x2, y2, elm.volts[1]);

  // Circle
  ctx.strokeStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Plus sign (near post 1 = positive terminal)
  const perpX = -ny;
  const perpY = nx;
  const plusOff = radius * 0.45;
  const plusSize = 4;
  const plusX = cx + nx * plusOff;
  const plusY = cy + ny * plusOff;

  ctx.strokeStyle = selected ? '#a5b4fc' : '#22c55e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(plusX - perpX * plusSize, plusY - perpY * plusSize);
  ctx.lineTo(plusX + perpX * plusSize, plusY + perpY * plusSize);
  ctx.moveTo(plusX - nx * plusSize, plusY - ny * plusSize);
  ctx.lineTo(plusX + nx * plusSize, plusY + ny * plusSize);
  ctx.stroke();

  // Minus sign (near post 0 = negative terminal)
  const minX = cx - nx * plusOff;
  const minY = cy - ny * plusOff;
  ctx.strokeStyle = selected ? '#a5b4fc' : '#ef4444';
  ctx.beginPath();
  ctx.moveTo(minX - perpX * plusSize, minY - perpY * plusSize);
  ctx.lineTo(minX + perpX * plusSize, minY + perpY * plusSize);
  ctx.stroke();

  // Posts
  drawPost(ctx, x1, y1, elm.volts[0], selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, x2, y2, elm.volts[1], selected, hoveredNode === 1 || hoveredNode === null);

  // Current dots
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawGround(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, _time: number, _zoom: number, hoveredNode?: number | null
): void {
  const { x, y } = elm;
  const size = 12;

  // Vertical lead downward
  drawLead(ctx, x, y, x, y + size, 0);

  // Three horizontal lines (getting smaller)
  ctx.strokeStyle = selected ? '#818cf8' : '#888';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const w = size - i * 3.5;
    const ly = y + size + i * 4;
    ctx.beginPath();
    ctx.moveTo(x - w, ly);
    ctx.lineTo(x + w, ly);
    ctx.stroke();
  }

  drawPost(ctx, x, y, 0, selected, hoveredNode === 0 || hoveredNode === null);
}

export function drawCapacitor(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  // Plates gap and size
  const gap = 6;
  const plateSize = 10;
  const leadLen = (len - gap) / 2;

  const bx1 = x1 + nx * leadLen;
  const by1 = y1 + ny * leadLen;
  const bx2 = x2 - nx * leadLen;
  const by2 = y2 - ny * leadLen;

  drawLead(ctx, x1, y1, bx1, by1, elm.volts[0]);
  drawLead(ctx, bx2, by2, x2, y2, elm.volts[1]);

  const perpX = -ny;
  const perpY = nx;

  ctx.strokeStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.lineWidth = 3;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  
  // Plate 1
  ctx.moveTo(bx1 - perpX * plateSize, by1 - perpY * plateSize);
  ctx.lineTo(bx1 + perpX * plateSize, by1 + perpY * plateSize);
  
  // Plate 2
  ctx.moveTo(bx2 - perpX * plateSize, by2 - perpY * plateSize);
  ctx.lineTo(bx2 + perpX * plateSize, by2 + perpY * plateSize);
  ctx.stroke();

  drawPost(ctx, x1, y1, elm.volts[0], selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, x2, y2, elm.volts[1], selected, hoveredNode === 1 || hoveredNode === null);
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawInductor(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  const bodyLen = Math.min(40, len * 0.55);
  const leadLen = (len - bodyLen) / 2;

  const bx1 = x1 + nx * leadLen;
  const by1 = y1 + ny * leadLen;
  const bx2 = x2 - nx * leadLen;
  const by2 = y2 - ny * leadLen;

  drawLead(ctx, x1, y1, bx1, by1, elm.volts[0]);
  drawLead(ctx, bx2, by2, x2, y2, elm.volts[1]);

  const coils = 4;
  const coilLen = bodyLen / coils;
  const coilRad = 6;
  const perpX = -ny;
  const perpY = nx;

  ctx.strokeStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(bx1, by1);

  for (let i = 0; i < coils; i++) {
    const cx1 = bx1 + nx * (i * coilLen + coilLen * 0.25);
    const cy1 = by1 + ny * (i * coilLen + coilLen * 0.25);
    const cx2 = bx1 + nx * (i * coilLen + coilLen * 0.75);
    const cy2 = by1 + ny * (i * coilLen + coilLen * 0.75);
    const endX = bx1 + nx * ((i + 1) * coilLen);
    const endY = by1 + ny * ((i + 1) * coilLen);

    ctx.bezierCurveTo(
      cx1 + perpX * coilRad * 2, cy1 + perpY * coilRad * 2,
      cx2 + perpX * coilRad * 2, cy2 + perpY * coilRad * 2,
      endX, endY
    );
  }
  ctx.stroke();

  drawPost(ctx, x1, y1, elm.volts[0], selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, x2, y2, elm.volts[1], selected, hoveredNode === 1 || hoveredNode === null);
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawBJT(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const cPos = elm.getPost(0);
  const bPos = elm.getPost(1);
  const ePos = elm.getPost(2);

  const midCE = { x: (cPos.x + ePos.x) / 2, y: (cPos.y + ePos.y) / 2 };
  const vCE = { x: cPos.x - ePos.x, y: cPos.y - ePos.y };
  const lenCE = Math.hypot(vCE.x, vCE.y);
  if (lenCE < 1) return;
  const uCE = { x: vCE.x / lenCE, y: vCE.y / lenCE };

  const vB = { x: midCE.x - bPos.x, y: midCE.y - bPos.y };
  const lenB = Math.hypot(vB.x, vB.y);
  if (lenB < 1) return;
  const uB = { x: vB.x / lenB, y: vB.y / lenB };

  const baseBarCenter = { x: bPos.x + uB.x * (lenB - 12), y: bPos.y + uB.y * (lenB - 12) };

  // 1. Draw base lead
  drawLead(ctx, bPos.x, bPos.y, baseBarCenter.x, baseBarCenter.y, elm.volts[1]);

  // 2. Draw base plate
  ctx.strokeStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(baseBarCenter.x - uCE.x * 12, baseBarCenter.y - uCE.y * 12);
  ctx.lineTo(baseBarCenter.x + uCE.x * 12, baseBarCenter.y + uCE.y * 12);
  ctx.stroke();

  // 3. Draw Collector and Emitter leads
  const colStart = { x: baseBarCenter.x + uCE.x * 6, y: baseBarCenter.y + uCE.y * 6 };
  const emitStart = { x: baseBarCenter.x - uCE.x * 6, y: baseBarCenter.y - uCE.y * 6 };

  drawLead(ctx, colStart.x, colStart.y, cPos.x, cPos.y, elm.volts[0]);
  drawLead(ctx, emitStart.x, emitStart.y, ePos.x, ePos.y, elm.volts[2]);

  // 4. Draw Emitter Arrow
  const isNpn = (elm as any).isNpn;
  ctx.fillStyle = selected ? '#818cf8' : voltageToColor(elm.volts[2]);
  
  const arrowStart = isNpn ? emitStart : ePos;
  const arrowEnd = isNpn ? ePos : emitStart;
  drawBJTArrow(ctx, arrowStart.x, arrowStart.y, arrowEnd.x, arrowEnd.y, 6);

  // 5. Draw posts
  drawPost(ctx, cPos.x, cPos.y, elm.volts[0], selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, bPos.x, bPos.y, elm.volts[1], selected, hoveredNode === 1 || hoveredNode === null);
  drawPost(ctx, ePos.x, ePos.y, elm.volts[2], selected, hoveredNode === 2 || hoveredNode === null);

  // 6. Current dots
  const ic = elm.getCurrentIntoNode(0);
  const ib = elm.getCurrentIntoNode(1);

  if (Math.abs(ic) > 1e-12) {
    drawCurrentDots(ctx, cPos.x, cPos.y, colStart.x, colStart.y, ic, time, zoom);
    drawCurrentDots(ctx, emitStart.x, emitStart.y, ePos.x, ePos.y, ic, time, zoom);
  }
  if (Math.abs(ib) > 1e-12) {
    drawCurrentDots(ctx, bPos.x, bPos.y, baseBarCenter.x, baseBarCenter.y, ib, time, zoom);
    drawCurrentDots(ctx, emitStart.x, emitStart.y, ePos.x, ePos.y, ib, time, zoom);
  }
}

function drawBJTArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size = 6) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;
  
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const ax = mx + nx * 2;
  const ay = my + ny * 2;
  const perpX = -ny;
  const perpY = nx;
  
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - nx * size + perpX * (size / 1.6), ay - ny * size + perpY * (size / 1.6));
  ctx.lineTo(ax - nx * size - perpX * (size / 1.6), ay - ny * size - perpY * (size / 1.6));
  ctx.closePath();
  ctx.fill();
}

export function drawCurrentSource(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number, hoveredNode?: number | null
): void {
  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const radius = Math.min(16, len * 0.25);
  const leadLen = (len - radius * 2) / 2;

  // Leads
  const lx1 = x1 + nx * leadLen;
  const ly1 = y1 + ny * leadLen;
  const lx2 = x2 - nx * leadLen;
  const ly2 = y2 - ny * leadLen;

  drawLead(ctx, x1, y1, lx1, ly1, elm.volts[0]);
  drawLead(ctx, lx2, ly2, x2, y2, elm.volts[1]);

  // Circle
  ctx.strokeStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw arrow inside circle pointing from positive to negative terminal
  const arrowSize = radius * 0.55;
  const arrowHeadX = cx + nx * arrowSize;
  const arrowHeadY = cy + ny * arrowSize;
  const arrowTailX = cx - nx * arrowSize;
  const arrowTailY = cy - ny * arrowSize;

  ctx.beginPath();
  ctx.moveTo(arrowTailX, arrowTailY);
  ctx.lineTo(arrowHeadX, arrowHeadY);
  ctx.stroke();

  const perpX = -ny;
  const perpY = nx;
  const headSize = 4;
  ctx.fillStyle = selected ? '#a5b4fc' : '#22c55e';
  ctx.beginPath();
  ctx.moveTo(arrowHeadX, arrowHeadY);
  ctx.lineTo(arrowHeadX - nx * headSize + perpX * (headSize / 1.5), arrowHeadY - ny * headSize + perpY * (headSize / 1.5));
  ctx.lineTo(arrowHeadX - nx * headSize - perpX * (headSize / 1.5), arrowHeadY - ny * headSize - perpY * (headSize / 1.5));
  ctx.closePath();
  ctx.fill();

  // Posts
  drawPost(ctx, x1, y1, elm.volts[0], selected, hoveredNode === 0 || hoveredNode === null);
  drawPost(ctx, x2, y2, elm.volts[1], selected, hoveredNode === 1 || hoveredNode === null);

  // Current dots
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawLogicGate(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, _time: number, _zoom: number, hoveredNode?: number | null
): void {
  const gate = elm as any;
  const { x: x1, y: y1, x2, y2 } = elm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const nx = dx / len;
  const ny = dy / len;
  const perpX = -ny;
  const perpY = nx;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  const getPt = (u: number, v: number) => ({
    x: cx + nx * u + perpX * v,
    y: cy + ny * u + perpY * v
  });

  const gateType = gate.gateType || 'AND';
  const outVal = gate.lastOutVal || 0;
  const isHigh = outVal >= (gate.vThreshold ?? 2.5);

  const strokeColor = selected ? '#818cf8' : '#e0e0e8';
  const fillColor = isHigh ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.04)';

  ctx.save();

  if (gateType === 'NOT') {
    const inStart = getPt(-len / 2, 0);
    const inBody = getPt(-12, 0);
    drawLead(ctx, inStart.x, inStart.y, inBody.x, inBody.y, elm.volts[0]);

    const outBody = getPt(13, 0);
    const outEnd = getPt(len / 2, 0);
    drawLead(ctx, outBody.x, outBody.y, outEnd.x, outEnd.y, elm.volts[1]);
  } else {
    const in1Start = getPt(-len / 2, -10);
    const in2Start = getPt(-len / 2, 10);
    const uBodyStart = gateType === 'OR' ? -10 : -12;
    const in1Body = getPt(uBodyStart, -10);
    const in2Body = getPt(uBodyStart, 10);

    drawLead(ctx, in1Start.x, in1Start.y, in1Body.x, in1Body.y, elm.volts[0]);
    drawLead(ctx, in2Start.x, in2Start.y, in2Body.x, in2Body.y, elm.volts[1]);

    const outBody = getPt(12, 0);
    const outEnd = getPt(len / 2, 0);
    drawLead(ctx, outBody.x, outBody.y, outEnd.x, outEnd.y, elm.volts[2]);
  }

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.5;
  ctx.fillStyle = fillColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (gateType === 'AND') {
    ctx.beginPath();
    let pt = getPt(-12, -12);
    ctx.moveTo(pt.x, pt.y);
    pt = getPt(0, -12);
    ctx.lineTo(pt.x, pt.y);
    for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 0.1) {
      pt = getPt(12 * Math.cos(a), 12 * Math.sin(a));
      ctx.lineTo(pt.x, pt.y);
    }
    pt = getPt(-12, 12);
    ctx.lineTo(pt.x, pt.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (gateType === 'OR') {
    ctx.beginPath();
    const pStart = getPt(-12, -12);
    ctx.moveTo(pStart.x, pStart.y);
    
    const pCtrlTop = getPt(2, -12);
    const pTip = getPt(12, 0);
    ctx.quadraticCurveTo(pCtrlTop.x, pCtrlTop.y, pTip.x, pTip.y);
    
    const pCtrlBot = getPt(2, 12);
    const pBot = getPt(-12, 12);
    ctx.quadraticCurveTo(pCtrlBot.x, pCtrlBot.y, pBot.x, pBot.y);
    
    const pCtrlBack = getPt(-6, 0);
    ctx.quadraticCurveTo(pCtrlBack.x, pCtrlBack.y, pStart.x, pStart.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (gateType === 'NOT') {
    ctx.beginPath();
    const pTL = getPt(-12, -10);
    ctx.moveTo(pTL.x, pTL.y);
    const pTip = getPt(6, 0);
    ctx.lineTo(pTip.x, pTip.y);
    const pBL = getPt(-12, 10);
    ctx.lineTo(pBL.x, pBL.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    const pBubble = getPt(10, 0);
    ctx.arc(pBubble.x, pBubble.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0f';
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  if (gateType === 'NOT') {
    drawPost(ctx, x1, y1, elm.volts[0], selected, hoveredNode === 0);
    drawPost(ctx, x2, y2, elm.volts[1], selected, hoveredNode === 1);
  } else {
    const p0 = getPt(-len / 2, -10);
    const p1 = getPt(-len / 2, 10);
    const p2 = getPt(len / 2, 0);
    drawPost(ctx, p0.x, p0.y, elm.volts[0], selected, hoveredNode === 0);
    drawPost(ctx, p1.x, p1.y, elm.volts[1], selected, hoveredNode === 0);
    drawPost(ctx, p2.x, p2.y, elm.volts[2], selected, hoveredNode === 1);
  }
}

/** Dispatch to the correct renderer based on element type */

export function drawElement(
  ctx: CanvasRenderingContext2D,
  elm: ICircuitElement,
  selected: boolean,
  time: number,
  zoom: number,
  hoveredNode?: number | null
): void {
  if (hoveredNode === null) {
    ctx.save();
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.4)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(elm.x, elm.y);
    ctx.lineTo(elm.x2, elm.y2);
    ctx.stroke();
    ctx.restore();
  }

  switch (elm.type) {
    case 'wire':     drawWire(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'resistor': drawResistor(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'voltage':  drawVoltageSource(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'ground':   drawGround(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'capacitor': drawCapacitor(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'inductor': drawInductor(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'switch': drawSwitch(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'diode': drawDiode(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'led': drawLED(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'bjt': drawBJT(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'current_source': drawCurrentSource(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'logic_gate': drawLogicGate(ctx, elm, selected, time, zoom, hoveredNode); break;
    case 'mutual': drawMutualCoupling(ctx, elm, selected, time, zoom, hoveredNode); break;
    default:
      drawLead(ctx, elm.x, elm.y, elm.x2, elm.y2, elm.volts[0] || 0);
      drawPost(ctx, elm.x, elm.y, elm.volts[0] || 0, selected, hoveredNode === 0 || hoveredNode === null);
      drawPost(ctx, elm.x2, elm.y2, elm.volts[1] || 0, selected, hoveredNode === 1 || hoveredNode === null);
  }
}

export function drawMutualCoupling(
  ctx: CanvasRenderingContext2D,
  elm: any,
  selected: boolean,
  _time: number,
  _zoom: number,
  _hoveredNode?: number | null
): void {
  const { x, y, x2, y2 } = elm;
  const cx = (x + x2) / 2;
  const cy = (y + y2) / 2;

  ctx.save();

  // Draw target connection lines if inductors are assigned
  if (elm.ind1 || elm.ind2) {
    ctx.strokeStyle = selected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(156, 163, 175, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    if (elm.ind1) {
      const idx = (elm.ind1.x + elm.ind1.x2) / 2;
      const idy = (elm.ind1.y + elm.ind1.y2) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(idx, idy);
      ctx.stroke();
    }
    if (elm.ind2) {
      const idx = (elm.ind2.x + elm.ind2.x2) / 2;
      const idy = (elm.ind2.y + elm.ind2.y2) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(idx, idy);
      ctx.stroke();
    }
  }

  // Draw the mutual coupling element card/symbol
  const size = 20;
  ctx.strokeStyle = selected ? '#6366f1' : '#9ca3af';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.fillStyle = '#0f172a'; // dark theme premium fill
  ctx.setLineDash([]);

  // Draw box
  ctx.beginPath();
  ctx.roundRect(cx - size, cy - size, size * 2, size * 2, 4);
  ctx.fill();
  ctx.stroke();

  // Draw transformer style winding indicators (two curves/arcs and a core line)
  ctx.strokeStyle = '#38bdf8'; // Sky blue for transformer/inductor lines
  ctx.lineWidth = 1.5;
  
  // Left winding line
  ctx.beginPath();
  ctx.arc(cx - 6, cy - 6, 4, -Math.PI / 2, Math.PI / 2);
  ctx.arc(cx - 6, cy + 2, 4, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Right winding line
  ctx.beginPath();
  ctx.arc(cx + 6, cy - 6, 4, Math.PI / 2, -Math.PI / 2);
  ctx.arc(cx + 6, cy + 2, 4, Math.PI / 2, -Math.PI / 2);
  ctx.stroke();

  // Core lines in the middle
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(cx - 1, cy - 8);
  ctx.lineTo(cx - 1, cy + 8);
  ctx.moveTo(cx + 1, cy - 8);
  ctx.lineTo(cx + 1, cy + 8);
  ctx.stroke();

  // Draw label below
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const k = elm.couplingCoefficient !== undefined ? elm.couplingCoefficient : 0.99;
  ctx.fillText(`k = ${k.toFixed(2)}`, cx, cy + size + 4);

  ctx.restore();
}
