// ============================================================
// Element Visual Renderers
// Draws each component type on the canvas
// ============================================================

import type { ICircuitElement } from '../engine/types';
import { voltageToColor } from './voltage-colors';
import { drawCurrentDots } from './current-dots';

const POST_RADIUS = 3.5;

/** Draw a connection post (circle) at world coordinates */
function drawPost(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, selected: boolean): void {
  ctx.beginPath();
  ctx.arc(x, y, POST_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = selected ? '#818cf8' : voltageToColor(v);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = 1.5;
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
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number,
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

  const closed = (elm as any).closed;
  ctx.strokeStyle = selected ? '#818cf8' : '#e0e0e8';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx1, by1);
  
  if (closed) {
    ctx.lineTo(bx2, by2);
  } else {
    // Open switch: tilted up by 30 degrees
    const perpX = -ny;
    const perpY = nx;
    const tiltOffset = 12; // tilt amount
    ctx.lineTo(bx2 + perpX * tiltOffset - nx * 2, by2 + perpY * tiltOffset - ny * 2);
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

  drawPost(ctx, x1, y1, elm.volts[0], selected);
  drawPost(ctx, x2, y2, elm.volts[1], selected);
  if (closed) {
    drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
  }
}

export function drawDiode(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number,
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

  drawPost(ctx, x1, y1, elm.volts[0], selected);
  drawPost(ctx, x2, y2, elm.volts[1], selected);
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawLED(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number,
): void {
  drawDiode(ctx, elm, selected, time, zoom);

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
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number,
): void {
  const v = elm.volts[0] || 0;
  ctx.strokeStyle = selected ? '#818cf8' : voltageToColor(v);
  ctx.lineWidth = selected ? 3 : 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(elm.x, elm.y);
  ctx.lineTo(elm.x2, elm.y2);
  ctx.stroke();
  drawPost(ctx, elm.x, elm.y, v, selected);
  drawPost(ctx, elm.x2, elm.y2, v, selected);
  drawCurrentDots(ctx, elm.x, elm.y, elm.x2, elm.y2, elm.getCurrent(), time, zoom);
}

export function drawResistor(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number,
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
    const t2 = (i + 1) / segments;
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
  drawPost(ctx, x1, y1, elm.volts[0], selected);
  drawPost(ctx, x2, y2, elm.volts[1], selected);

  // Current dots
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawVoltageSource(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number,
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
  drawPost(ctx, x1, y1, elm.volts[0], selected);
  drawPost(ctx, x2, y2, elm.volts[1], selected);

  // Current dots
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawGround(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, _time: number, _zoom: number,
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

  drawPost(ctx, x, y, 0, selected);
}

export function drawCapacitor(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number,
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

  drawPost(ctx, x1, y1, elm.volts[0], selected);
  drawPost(ctx, x2, y2, elm.volts[1], selected);
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

export function drawInductor(
  ctx: CanvasRenderingContext2D, elm: ICircuitElement, selected: boolean, time: number, zoom: number,
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

  drawPost(ctx, x1, y1, elm.volts[0], selected);
  drawPost(ctx, x2, y2, elm.volts[1], selected);
  drawCurrentDots(ctx, x1, y1, x2, y2, elm.getCurrent(), time, zoom);
}

/** Dispatch to the correct renderer based on element type */
export function drawElement(
  ctx: CanvasRenderingContext2D,
  elm: ICircuitElement,
  selected: boolean,
  time: number,
  zoom: number,
): void {
  switch (elm.type) {
    case 'wire':     drawWire(ctx, elm, selected, time, zoom); break;
    case 'resistor': drawResistor(ctx, elm, selected, time, zoom); break;
    case 'voltage':  drawVoltageSource(ctx, elm, selected, time, zoom); break;
    case 'ground':   drawGround(ctx, elm, selected, time, zoom); break;
    case 'capacitor': drawCapacitor(ctx, elm, selected, time, zoom); break;
    case 'inductor': drawInductor(ctx, elm, selected, time, zoom); break;
    case 'switch': drawSwitch(ctx, elm, selected, time, zoom); break;
    case 'diode': drawDiode(ctx, elm, selected, time, zoom); break;
    case 'led': drawLED(ctx, elm, selected, time, zoom); break;
    default:
      // Fallback: draw as a line
      drawLead(ctx, elm.x, elm.y, elm.x2, elm.y2, elm.volts[0] || 0);
      drawPost(ctx, elm.x, elm.y, elm.volts[0] || 0, selected);
      drawPost(ctx, elm.x2, elm.y2, elm.volts[1] || 0, selected);
  }
}

/** Draw a ghost preview of an element being placed */
export function drawGhost(
  ctx: CanvasRenderingContext2D,
  type: string,
  x1: number, y1: number,
  x2: number, y2: number,
): void {
  ctx.globalAlpha = 0.4;
  const mockElm = {
    type, x: x1, y: y1, x2, y2,
    volts: [0, 0], nodes: [0, 0],
    getCurrent: () => 0,
  } as unknown as ICircuitElement;
  drawElement(ctx, mockElm, false, 0, 1);
  ctx.globalAlpha = 1;
}
