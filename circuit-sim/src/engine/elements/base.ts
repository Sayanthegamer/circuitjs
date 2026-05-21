// ============================================================
// Abstract Base Class for all Circuit Elements
// ============================================================

import type { ICircuitElement, IStamper, Point, ElementId } from '../types';

export abstract class CircuitElement implements ICircuitElement {
  id: ElementId;
  x: number;
  y: number;
  x2: number;
  y2: number;
  abstract type: string;

  nodes: number[] = [];
  volts: number[] = [];
  current = 0;

  protected voltSource = -1;

  constructor(x: number, y: number, x2?: number, y2?: number) {
    this.id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `elm_${crypto.randomUUID()}`
      : `elm_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    this.x = x;
    this.y = y;
    this.x2 = x2 ?? x;
    this.y2 = y2 ?? y;
    this.allocNodes();
  }

  protected allocNodes(): void {
    const count = this.getPostCount() + this.getInternalNodeCount();
    this.nodes = new Array(count).fill(0);
    this.volts = (new Float64Array(count) as unknown) as number[];
  }

  // --- Geometry ---

  getPost(n: number): Point {
    return n === 0
      ? { x: this.x, y: this.y }
      : { x: this.x2, y: this.y2 };
  }

  // --- Node management ---

  getPostCount(): number { return 2; }
  getInternalNodeCount(): number { return 0; }
  getVoltageSourceCount(): number { return 0; }

  setNode(j: number, nodeIndex: number): void { this.nodes[j] = nodeIndex; }
  getNode(j: number): number { return this.nodes[j]; }

  setNodeVoltage(n: number, v: number): void { this.volts[n] = v; }

  getVoltageSource(): number { return this.voltSource; }
  setVoltageSource(_j: number, vs: number): void { this.voltSource = vs; }

  setCurrent(_vsIndex: number, current: number): void { this.current = current; }

  // --- Simulation ---

  abstract stamp(stamper: IStamper): void;

  doStep(_stamper: IStamper): void { /* default: no-op for linear elements */ }
  startIteration(): void { /* default: no-op */ }
  stepFinished(): void { this.calculateCurrent(); }

  nonLinear(): boolean { return false; }
  isWire(): boolean { return false; }

  calculateCurrent(): void { /* subclasses override */ }
  getCurrent(): number { return this.current; }

  // --- Topology ---

  getConnectionNodeCount(): number { return this.getPostCount(); }
  getConnectionNode(j: number): number { return this.nodes[j]; }

  getConnection(_n1: number, _n2: number): boolean { return true; }
  hasGroundConnection(_n: number): boolean { return false; }

  getCurrentIntoNode(n: number): number {
    if (this.getPostCount() === 2) {
      return n === 0 ? -this.current : this.current;
    }
    return 0;
  }

  // --- State ---

  reset(): void {
    this.volts.fill(0);
    this.current = 0;
  }

  /** Get voltage difference across element (post 1 - post 0) */
  getVoltageDiff(): number {
    return this.volts[1] - this.volts[0];
  }

  /** Get power dissipated */
  getPower(): number {
    return -this.getVoltageDiff() * this.current;
  }
}
